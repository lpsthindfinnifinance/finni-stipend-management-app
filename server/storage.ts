import {
  users,
  portfolios,
  practices,
  practiceMetrics,
  practiceLedger,
  stipendRequests,
  interPsmAllocations,
  payPeriods,
  practiceReassignments,
  type User,
  type UpsertUser,
  type Portfolio,
  type InsertPortfolio,
  type Practice,
  type InsertPractice,
  type PracticeMetrics,
  type InsertPracticeMetrics,
  type PracticeLedger,
  type InsertPracticeLedger,
  type StipendRequest,
  type InsertStipendRequest,
  type InterPsmAllocation,
  type InsertInterPsmAllocation,
  type PayPeriod,
  type InsertPayPeriod,
  type PracticeReassignment,
  type InsertPracticeReassignment,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string, portfolioId?: string): Promise<User>;
  
  // Portfolio operations
  getPortfolios(): Promise<Portfolio[]>;
  getPortfolioById(id: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  
  // Practice operations
  getPractices(filters?: { search?: string; portfolio?: string }): Promise<any[]>;
  getPracticeById(id: string): Promise<any | undefined>;
  createPractice(practice: InsertPractice): Promise<Practice>;
  updatePracticePortfolio(id: string, portfolioId: string): Promise<Practice>;
  
  // Practice metrics operations
  getPracticeMetrics(practiceId: string, payPeriod?: number): Promise<PracticeMetrics[]>;
  upsertPracticeMetrics(metrics: InsertPracticeMetrics): Promise<PracticeMetrics>;
  getCurrentMetrics(practiceId: string, payPeriod: number): Promise<PracticeMetrics | undefined>;
  
  // Practice ledger operations
  getPracticeLedger(practiceId: string): Promise<any[]>;
  createLedgerEntry(entry: InsertPracticeLedger): Promise<PracticeLedger>;
  getPracticeBalance(practiceId: string): Promise<number>;
  
  // Stipend request operations
  getStipendRequests(filters?: { status?: string; practiceId?: string; requestorId?: string }): Promise<any[]>;
  getStipendRequestById(id: number): Promise<any | undefined>;
  createStipendRequest(request: InsertStipendRequest): Promise<StipendRequest>;
  updateStipendRequestStatus(id: number, status: string, userId: string, notes?: string): Promise<StipendRequest>;
  
  // Inter-PSM allocation operations
  getInterPsmAllocations(filters?: { donorId?: string; recipientId?: string }): Promise<InterPsmAllocation[]>;
  createInterPsmAllocation(allocation: InsertInterPsmAllocation): Promise<InterPsmAllocation>;
  updateAllocationStatus(id: number, status: string): Promise<InterPsmAllocation>;
  
  // Pay period operations
  getCurrentPayPeriod(): Promise<PayPeriod | undefined>;
  getPayPeriods(): Promise<PayPeriod[]>;
  createPayPeriod(period: InsertPayPeriod): Promise<PayPeriod>;
  advancePayPeriod(currentId: number, nextId: number): Promise<void>;
  
  // Practice reassignment operations
  createPracticeReassignment(reassignment: InsertPracticeReassignment): Promise<PracticeReassignment>;
  getPracticeReassignments(practiceId: string): Promise<PracticeReassignment[]>;
  
  // Dashboard/reporting operations
  getDashboardSummary(userId: string, role: string, portfolioId?: string): Promise<any>;
  getPortfolioSummaries(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First try to find existing user by email
    if (userData.email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);
      
      if (existingUser) {
        // Update existing user but KEEP the existing ID to preserve foreign key relationships
        const { id: _, ...updateData } = userData;
        const [updated] = await db
          .update(users)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        
        return updated;
      }
    }

    // If no existing user, insert new one
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string, portfolioId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, portfolioId, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // ============================================================================
  // PORTFOLIO OPERATIONS
  // ============================================================================
  
  async getPortfolios(): Promise<Portfolio[]> {
    return await db.select().from(portfolios);
  }

  async getPortfolioById(id: string): Promise<Portfolio | undefined> {
    const [portfolio] = await db.select().from(portfolios).where(eq(portfolios.id, id));
    return portfolio;
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const [created] = await db.insert(portfolios).values(portfolio).returning();
    return created;
  }

  // ============================================================================
  // PRACTICE OPERATIONS
  // ============================================================================
  
  async getPractices(filters?: { search?: string; portfolio?: string }): Promise<any[]> {
    let query = db.select({
      id: practices.id,
      name: practices.name,
      portfolioId: practices.portfolioId,
      createdAt: practices.createdAt,
      updatedAt: practices.updatedAt,
    }).from(practices);

    const conditions = [];
    if (filters?.portfolio && filters.portfolio !== "all") {
      conditions.push(eq(practices.portfolioId, filters.portfolio));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = await query;
    
    // Filter by search on the client side if needed
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      return result.filter(p => 
        p.id.toLowerCase().includes(searchLower) ||
        p.name.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }

  async getPracticeById(id: string): Promise<any | undefined> {
    const [practice] = await db.select().from(practices).where(eq(practices.id, id));
    return practice;
  }

  async createPractice(practice: InsertPractice): Promise<Practice> {
    const [created] = await db.insert(practices).values(practice).returning();
    return created;
  }

  async updatePracticePortfolio(id: string, portfolioId: string): Promise<Practice> {
    const [updated] = await db
      .update(practices)
      .set({ portfolioId, updatedAt: new Date() })
      .where(eq(practices.id, id))
      .returning();
    return updated;
  }

  // ============================================================================
  // PRACTICE METRICS OPERATIONS
  // ============================================================================
  
  async getPracticeMetrics(practiceId: string, payPeriod?: number): Promise<PracticeMetrics[]> {
    if (payPeriod) {
      return await db
        .select()
        .from(practiceMetrics)
        .where(and(
          eq(practiceMetrics.practiceId, practiceId),
          eq(practiceMetrics.payPeriod, payPeriod)
        ));
    }
    return await db
      .select()
      .from(practiceMetrics)
      .where(eq(practiceMetrics.practiceId, practiceId))
      .orderBy(desc(practiceMetrics.payPeriod));
  }

  async upsertPracticeMetrics(metrics: InsertPracticeMetrics): Promise<PracticeMetrics> {
    const [result] = await db
      .insert(practiceMetrics)
      .values(metrics)
      .onConflictDoUpdate({
        target: [practiceMetrics.practiceId, practiceMetrics.payPeriod],
        set: {
          grossMarginPercent: metrics.grossMarginPercent,
          collectionsPercent: metrics.collectionsPercent,
          stipendCap: metrics.stipendCap,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getCurrentMetrics(practiceId: string, payPeriod: number): Promise<PracticeMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(practiceMetrics)
      .where(and(
        eq(practiceMetrics.practiceId, practiceId),
        eq(practiceMetrics.payPeriod, payPeriod)
      ));
    return metrics;
  }

  // ============================================================================
  // PRACTICE LEDGER OPERATIONS
  // ============================================================================
  
  async getPracticeLedger(practiceId: string): Promise<any[]> {
    return await db
      .select()
      .from(practiceLedger)
      .where(eq(practiceLedger.practiceId, practiceId))
      .orderBy(desc(practiceLedger.createdAt));
  }

  async createLedgerEntry(entry: InsertPracticeLedger): Promise<PracticeLedger> {
    const [created] = await db.insert(practiceLedger).values(entry).returning();
    return created;
  }

  async getPracticeBalance(practiceId: string): Promise<number> {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${practiceLedger.amount} AS DECIMAL)), 0)`,
      })
      .from(practiceLedger)
      .where(eq(practiceLedger.practiceId, practiceId));
    
    return result[0]?.total || 0;
  }

  // ============================================================================
  // STIPEND REQUEST OPERATIONS
  // ============================================================================
  
  async getStipendRequests(filters?: { status?: string; practiceId?: string; requestorId?: string }): Promise<any[]> {
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(stipendRequests.status, filters.status));
    }
    if (filters?.practiceId) {
      conditions.push(eq(stipendRequests.practiceId, filters.practiceId));
    }
    if (filters?.requestorId) {
      conditions.push(eq(stipendRequests.requestorId, filters.requestorId));
    }

    let query = db.select().from(stipendRequests);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(stipendRequests.createdAt));
  }

  async getStipendRequestById(id: number): Promise<any | undefined> {
    const [request] = await db.select().from(stipendRequests).where(eq(stipendRequests.id, id));
    return request;
  }

  async createStipendRequest(request: InsertStipendRequest): Promise<StipendRequest> {
    const [created] = await db.insert(stipendRequests).values(request).returning();
    return created;
  }

  async updateStipendRequestStatus(id: number, status: string, userId: string, notes?: string): Promise<StipendRequest> {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (status.includes("approved")) {
      if (status === "pending_lead_psm") {
        updateData.psmApprovedAt = new Date();
        updateData.psmApprovedBy = userId;
      } else if (status === "pending_finance") {
        updateData.leadPsmApprovedAt = new Date();
        updateData.leadPsmApprovedBy = userId;
      } else if (status === "approved") {
        updateData.financeApprovedAt = new Date();
        updateData.financeApprovedBy = userId;
      }
    } else if (status === "rejected") {
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = userId;
      if (notes) {
        updateData.rejectionReason = notes;
      }
    }

    const [updated] = await db
      .update(stipendRequests)
      .set(updateData)
      .where(eq(stipendRequests.id, id))
      .returning();
    return updated;
  }

  // ============================================================================
  // INTER-PSM ALLOCATION OPERATIONS
  // ============================================================================
  
  async getInterPsmAllocations(filters?: { donorId?: string; recipientId?: string }): Promise<InterPsmAllocation[]> {
    const conditions = [];
    
    if (filters?.donorId) {
      conditions.push(eq(interPsmAllocations.donorPsmId, filters.donorId));
    }
    if (filters?.recipientId) {
      conditions.push(eq(interPsmAllocations.recipientPsmId, filters.recipientId));
    }

    let query = db.select().from(interPsmAllocations);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(interPsmAllocations.createdAt));
  }

  async createInterPsmAllocation(allocation: InsertInterPsmAllocation): Promise<InterPsmAllocation> {
    const [created] = await db.insert(interPsmAllocations).values(allocation).returning();
    return created;
  }

  async updateAllocationStatus(id: number, status: string): Promise<InterPsmAllocation> {
    const updateData: any = { status };
    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(interPsmAllocations)
      .set(updateData)
      .where(eq(interPsmAllocations.id, id))
      .returning();
    return updated;
  }

  // ============================================================================
  // PAY PERIOD OPERATIONS
  // ============================================================================
  
  async getCurrentPayPeriod(): Promise<PayPeriod | undefined> {
    const [period] = await db
      .select()
      .from(payPeriods)
      .where(eq(payPeriods.isCurrent, 1))
      .limit(1);
    return period;
  }

  async getPayPeriods(): Promise<PayPeriod[]> {
    return await db.select().from(payPeriods).orderBy(payPeriods.id);
  }

  async createPayPeriod(period: InsertPayPeriod): Promise<PayPeriod> {
    const [created] = await db.insert(payPeriods).values(period).returning();
    return created;
  }

  async advancePayPeriod(currentId: number, nextId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Mark current period as not current
      await tx
        .update(payPeriods)
        .set({ isCurrent: 0 })
        .where(eq(payPeriods.id, currentId));

      // Mark next period as current
      await tx
        .update(payPeriods)
        .set({ isCurrent: 1 })
        .where(eq(payPeriods.id, nextId));
    });
  }

  // ============================================================================
  // PRACTICE REASSIGNMENT OPERATIONS
  // ============================================================================
  
  async createPracticeReassignment(reassignment: InsertPracticeReassignment): Promise<PracticeReassignment> {
    const [created] = await db.insert(practiceReassignments).values(reassignment).returning();
    return created;
  }

  async getPracticeReassignments(practiceId: string): Promise<PracticeReassignment[]> {
    return await db
      .select()
      .from(practiceReassignments)
      .where(eq(practiceReassignments.practiceId, practiceId))
      .orderBy(desc(practiceReassignments.createdAt));
  }

  // ============================================================================
  // DASHBOARD/REPORTING OPERATIONS
  // ============================================================================
  
  async getDashboardSummary(userId: string, role: string, portfolioId?: string): Promise<any> {
    // This is a placeholder implementation - will be enhanced with actual data
    return {
      totalCap: 0,
      allocated: 0,
      available: 0,
      pendingApprovals: 0,
      utilizationPercent: 0,
    };
  }

  async getPortfolioSummaries(): Promise<any[]> {
    // This is a placeholder implementation - will be enhanced with actual data
    const portfolioList = await this.getPortfolios();
    return portfolioList.map(p => ({
      id: p.id,
      name: p.name,
      psmName: null,
      totalCap: 0,
      allocated: 0,
      remaining: 0,
    }));
  }
}

export const storage = new DatabaseStorage();

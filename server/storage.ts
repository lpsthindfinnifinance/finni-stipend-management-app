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
  negativeEarningsCapRequests,
  type User,
  type UpsertUser,
  type InsertUser,
  type UpdateUser,
  type Portfolio,
  type InsertPortfolio,
  type UpdatePortfolio,
  type Practice,
  type InsertPractice,
  type UpdatePractice,
  type PracticeMetrics,
  type InsertPracticeMetrics,
  type PracticeLedger,
  type InsertPracticeLedger,
  type StipendRequest,
  type InsertStipendRequest,
  type StipendRequestWithDetails,
  type InterPsmAllocation,
  type InsertInterPsmAllocation,
  type PayPeriod,
  type InsertPayPeriod,
  type PracticeReassignment,
  type InsertPracticeReassignment,
  type NegativeEarningsCapRequest,
  type InsertNegativeEarningsCapRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, or } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string, portfolioId?: string): Promise<User>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<UpdateUser>): Promise<User>;
  deleteUser(id: string): Promise<{ success: boolean; message?: string }>;
  
  // Portfolio operations
  getPortfolios(): Promise<Portfolio[]>;
  getPortfolioById(id: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: string, portfolio: Partial<UpdatePortfolio>): Promise<Portfolio>;
  deletePortfolio(id: string): Promise<{ success: boolean; message?: string }>;
  
  // Practice operations
  getPractices(filters?: { search?: string; portfolio?: string }): Promise<any[]>;
  getPracticeById(id: string): Promise<any | undefined>;
  getPracticeByClinicName(clinicName: string): Promise<Practice | undefined>;
  createPractice(practice: InsertPractice): Promise<Practice>;
  updatePracticePortfolio(id: string, portfolioId: string): Promise<Practice>;
  updatePractice(id: string, practice: Partial<UpdatePractice>): Promise<Practice>;
  deletePractice(id: string): Promise<{ success: boolean; message?: string }>;
  
  // Practice metrics operations
  getPracticeMetrics(practiceId: string, payPeriod?: number): Promise<PracticeMetrics[]>;
  upsertPracticeMetrics(metrics: InsertPracticeMetrics): Promise<PracticeMetrics>;
  getCurrentMetrics(practiceId: string, payPeriod: number): Promise<PracticeMetrics | undefined>;
  getPreviousMetricsByClinicName(clinicName: string, payPeriod: number): Promise<PracticeMetrics | undefined>;
  
  // Practice ledger operations
  getPracticeLedger(practiceId: string): Promise<any[]>;
  createLedgerEntry(entry: InsertPracticeLedger): Promise<PracticeLedger>;
  getPracticeBalance(practiceId: string): Promise<number>;
  getStipendPaid(practiceId: string): Promise<number>;
  getStipendCommitted(practiceId: string): Promise<number>;
  getUnapprovedStipend(practiceId: string): Promise<number>;
  getAllocatedIn(practiceId: string): Promise<number>;
  getAllocatedOut(practiceId: string): Promise<number>;
  
  // Stipend request operations
  getStipendRequests(filters?: { status?: string; practiceId?: string; requestorId?: string }): Promise<any[]>;
  getPendingStipendRequestsForPractice(practiceId: string): Promise<StipendRequest[]>;
  getStipendRequestById(id: number): Promise<StipendRequestWithDetails | undefined>;
  createStipendRequest(request: InsertStipendRequest): Promise<StipendRequest>;
  updateStipendRequestStatus(id: number, status: string, userId: string, notes?: string): Promise<StipendRequest>;
  getPayPeriodBreakdown(requestId: number): Promise<any[]>;
  cancelCommittedPeriod(requestId: number, payPeriod: number): Promise<void>;
  
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
  
  // Negative Earnings Cap operations
  getNegativeEarningsSummary(payPeriod: number): Promise<any[]>;
  getNegativeEarningsCapRequests(filters?: { status?: string; practiceId?: string; requestorId?: string }): Promise<any[]>;
  createNegativeEarningsCapRequest(request: InsertNegativeEarningsCapRequest): Promise<NegativeEarningsCapRequest>;
  updateNegativeEarningsCapRequestStatus(id: number, status: string, userId: string, approvedAmount?: string, notes?: string): Promise<NegativeEarningsCapRequest>;
  
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

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
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

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpdateUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<{ success: boolean; message?: string }> {
    // Check if user has any stipend requests
    const requests = await db
      .select({ count: sql`count(*)` })
      .from(stipendRequests)
      .where(eq(stipendRequests.requestorId, id));
    
    if (Number(requests[0].count) > 0) {
      return { 
        success: false, 
        message: `Cannot delete user. User has ${requests[0].count} associated stipend requests.` 
      };
    }

    // Check if user has any negative earnings cap requests
    const negEarningsRequests = await db
      .select({ count: sql`count(*)` })
      .from(negativeEarningsCapRequests)
      .where(eq(negativeEarningsCapRequests.requestorId, id));
    
    if (Number(negEarningsRequests[0].count) > 0) {
      return { 
        success: false, 
        message: `Cannot delete user. User has ${negEarningsRequests[0].count} associated negative earnings requests.` 
      };
    }

    await db.delete(users).where(eq(users.id, id));
    return { success: true };
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

  async updatePortfolio(id: string, portfolioData: Partial<UpdatePortfolio>): Promise<Portfolio> {
    const [portfolio] = await db
      .update(portfolios)
      .set({ ...portfolioData, updatedAt: new Date() })
      .where(eq(portfolios.id, id))
      .returning();
    return portfolio;
  }

  async deletePortfolio(id: string): Promise<{ success: boolean; message?: string }> {
    // Check if portfolio has any practices
    const practiceCount = await db
      .select({ count: sql`count(*)` })
      .from(practices)
      .where(eq(practices.portfolioId, id));
    
    if (Number(practiceCount[0].count) > 0) {
      return { 
        success: false, 
        message: `Cannot delete portfolio. Portfolio has ${practiceCount[0].count} associated practices.` 
      };
    }

    // Check if portfolio has any users assigned
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.portfolioId, id));
    
    if (Number(userCount[0].count) > 0) {
      return { 
        success: false, 
        message: `Cannot delete portfolio. Portfolio has ${userCount[0].count} assigned users.` 
      };
    }

    await db.delete(portfolios).where(eq(portfolios.id, id));
    return { success: true };
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

  async getPracticeByClinicName(clinicName: string): Promise<Practice | undefined> {
    // ClinicName in CSV is the practice ID (e.g., 'abaco', 'nm-lc'), not the display name
    const [practice] = await db.select().from(practices).where(eq(practices.id, clinicName));
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

  async updatePractice(id: string, practiceData: Partial<UpdatePractice>): Promise<Practice> {
    const [practice] = await db
      .update(practices)
      .set({ ...practiceData, updatedAt: new Date() })
      .where(eq(practices.id, id))
      .returning();
    return practice;
  }

  async deletePractice(id: string): Promise<{ success: boolean; message?: string }> {
    // Check if practice has any metrics
    const metricsCount = await db
      .select({ count: sql`count(*)` })
      .from(practiceMetrics)
      .where(eq(practiceMetrics.clinicName, id));
    
    if (Number(metricsCount[0].count) > 0) {
      return { 
        success: false, 
        message: `Cannot delete practice. Practice has ${metricsCount[0].count} associated metric records.` 
      };
    }

    // Check if practice has any ledger entries
    const ledgerCount = await db
      .select({ count: sql`count(*)` })
      .from(practiceLedger)
      .where(eq(practiceLedger.practiceId, id));
    
    if (Number(ledgerCount[0].count) > 0) {
      return { 
        success: false, 
        message: `Cannot delete practice. Practice has ${ledgerCount[0].count} ledger entries.` 
      };
    }

    // Check if practice has any stipend requests
    const requestCount = await db
      .select({ count: sql`count(*)` })
      .from(stipendRequests)
      .where(eq(stipendRequests.practiceId, id));
    
    if (Number(requestCount[0].count) > 0) {
      return { 
        success: false, 
        message: `Cannot delete practice. Practice has ${requestCount[0].count} stipend requests.` 
      };
    }

    await db.delete(practices).where(eq(practices.id, id));
    return { success: true };
  }

  // ============================================================================
  // PRACTICE METRICS OPERATIONS
  // ============================================================================
  
  async getPracticeMetrics(practiceId: string, payPeriod?: number): Promise<PracticeMetrics[]> {
    // Note: This method is deprecated as the new schema uses clinicName instead of practiceId
    // Keeping for backward compatibility - returns all metrics
    if (payPeriod) {
      return await db
        .select()
        .from(practiceMetrics)
        .where(eq(practiceMetrics.currentPayPeriodNumber, payPeriod));
    }
    return await db
      .select()
      .from(practiceMetrics)
      .orderBy(desc(practiceMetrics.currentPayPeriodNumber));
  }

  async upsertPracticeMetrics(metrics: InsertPracticeMetrics): Promise<PracticeMetrics> {
    // Upsert based on clinicName + currentPayPeriodNumber (unique combination)
    const [result] = await db
      .insert(practiceMetrics)
      .values(metrics)
      .onConflictDoUpdate({
        target: [practiceMetrics.clinicName, practiceMetrics.currentPayPeriodNumber],
        set: {
          ...metrics,
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
        eq(practiceMetrics.clinicName, practiceId),
        eq(practiceMetrics.currentPayPeriodNumber, payPeriod)
      ));
    return metrics;
  }

  async getPreviousMetricsByClinicName(clinicName: string, payPeriod: number): Promise<PracticeMetrics | undefined> {
    const [metrics] = await db
      .select()
      .from(practiceMetrics)
      .where(and(
        eq(practiceMetrics.clinicName, clinicName),
        eq(practiceMetrics.currentPayPeriodNumber, payPeriod)
      ));
    return metrics;
  }

  // ============================================================================
  // PRACTICE LEDGER OPERATIONS
  // ============================================================================
  
  async getPracticeLedger(practiceId: string): Promise<any[]> {
    return await db
      .select({
        id: practiceLedger.id,
        practiceId: practiceLedger.practiceId,
        payPeriod: practiceLedger.payPeriod,
        transactionType: practiceLedger.transactionType,
        amount: practiceLedger.amount,
        description: practiceLedger.description,
        relatedRequestId: practiceLedger.relatedRequestId,
        relatedAllocationId: practiceLedger.relatedAllocationId,
        createdAt: practiceLedger.createdAt,
        stipendType: stipendRequests.stipendType,
        stipendDescription: stipendRequests.stipendDescription,
      })
      .from(practiceLedger)
      .leftJoin(
        stipendRequests,
        eq(practiceLedger.relatedRequestId, stipendRequests.id)
      )
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
    
    // Drizzle returns numeric sums as strings, so convert to number
    return Number(result[0]?.total ?? 0);
  }

  async getStipendPaid(practiceId: string): Promise<number> {
    // Sum all 'paid' transactions from the ledger (these are negative, so we take absolute value for display)
    const result = await db
      .select({
        total: sql<number>`COALESCE(ABS(SUM(CAST(${practiceLedger.amount} AS DECIMAL))), 0)`,
      })
      .from(practiceLedger)
      .where(
        and(
          eq(practiceLedger.practiceId, practiceId),
          eq(practiceLedger.transactionType, 'paid')
        )
      );
    
    return Number(result[0]?.total ?? 0);
  }

  async getStipendCommitted(practiceId: string): Promise<number> {
    // Sum all 'committed' transactions from the ledger (these are negative, so we take absolute value for display)
    const result = await db
      .select({
        total: sql<number>`COALESCE(ABS(SUM(CAST(${practiceLedger.amount} AS DECIMAL))), 0)`,
      })
      .from(practiceLedger)
      .where(
        and(
          eq(practiceLedger.practiceId, practiceId),
          eq(practiceLedger.transactionType, 'committed')
        )
      );
    
    return Number(result[0]?.total ?? 0);
  }

  async getUnapprovedStipend(practiceId: string): Promise<number> {
    // Unapproved stipend = sum of all pending requests (not yet approved)
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${stipendRequests.amount} AS DECIMAL)), 0)`,
      })
      .from(stipendRequests)
      .where(
        and(
          eq(stipendRequests.practiceId, practiceId),
          inArray(stipendRequests.status, ['pending_lead_psm', 'pending_finance'])
        )
      );
    
    return Number(result[0]?.total ?? 0);
  }

  async getAllocatedIn(practiceId: string): Promise<number> {
    // Sum all allocation_in transactions from the ledger
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${practiceLedger.amount} AS DECIMAL)), 0)`,
      })
      .from(practiceLedger)
      .where(
        and(
          eq(practiceLedger.practiceId, practiceId),
          eq(practiceLedger.transactionType, 'allocation_in')
        )
      );
    
    return Number(result[0]?.total ?? 0);
  }

  async getAllocatedOut(practiceId: string): Promise<number> {
    // Sum all allocation_out transactions from the ledger (these are negative, so we'll take absolute value)
    const result = await db
      .select({
        total: sql<number>`COALESCE(ABS(SUM(CAST(${practiceLedger.amount} AS DECIMAL))), 0)`,
      })
      .from(practiceLedger)
      .where(
        and(
          eq(practiceLedger.practiceId, practiceId),
          eq(practiceLedger.transactionType, 'allocation_out')
        )
      );
    
    return Number(result[0]?.total ?? 0);
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

  async getPendingStipendRequestsForPractice(practiceId: string): Promise<StipendRequest[]> {
    // Get all pending requests for a specific practice
    return await db
      .select()
      .from(stipendRequests)
      .where(
        and(
          eq(stipendRequests.practiceId, practiceId),
          inArray(stipendRequests.status, ['pending_lead_psm', 'pending_finance'])
        )
      )
      .orderBy(desc(stipendRequests.createdAt));
  }

  async getStipendRequestById(id: number): Promise<StipendRequestWithDetails | undefined> {
    const [request] = await db.select().from(stipendRequests).where(eq(stipendRequests.id, id));
    
    if (!request) {
      return undefined;
    }

    // Get requestor information
    const [requestor] = await db
      .select({
        id: users.id,
        name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, request.requestorId));

    // Get Lead PSM approver information
    let leadPsmApprover = null;
    if (request.leadPsmApprovedBy) {
      const [approver] = await db
        .select({
          id: users.id,
          name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, request.leadPsmApprovedBy));
      leadPsmApprover = approver;
    }

    // Get Finance approver information
    let financeApprover = null;
    if (request.financeApprovedBy) {
      const [approver] = await db
        .select({
          id: users.id,
          name: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, request.financeApprovedBy));
      financeApprover = approver;
    }

    // Get practice information
    const [practice] = await db
      .select({
        id: practices.id,
        clinicName: practices.name,
      })
      .from(practices)
      .where(eq(practices.id, request.practiceId));

    return {
      ...request,
      requestor,
      leadPsmApprover,
      financeApprover,
      practice,
    };
  }

  async createStipendRequest(request: InsertStipendRequest): Promise<StipendRequest> {
    const [created] = await db.insert(stipendRequests).values(request).returning();
    return created;
  }

  async updateStipendRequestStatus(id: number, status: string, userId: string, notes?: string): Promise<StipendRequest> {
    const updateData: any = { status, updatedAt: new Date() };
    
    if (status === "pending_finance") {
      // Lead PSM approved, moving to Finance review
      updateData.leadPsmApprovedAt = new Date();
      updateData.leadPsmApprovedBy = userId;
      if (notes) {
        updateData.leadPsmComment = notes;
      }
    } else if (status === "approved") {
      // Finance approved, request is fully approved
      updateData.financeApprovedAt = new Date();
      updateData.financeApprovedBy = userId;
      if (notes) {
        updateData.financeComment = notes;
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

  async getPayPeriodBreakdown(requestId: number): Promise<any[]> {
    // Get the stipend request
    const [request] = await db
      .select()
      .from(stipendRequests)
      .where(eq(stipendRequests.id, requestId));

    if (!request) {
      return [];
    }

    const breakdown: any[] = [];
    const startPeriod = request.effectivePayPeriod;
    const endPeriod = request.requestType === 'recurring' && request.recurringEndPeriod
      ? request.recurringEndPeriod
      : startPeriod;

    // Generate breakdown for each pay period
    for (let period = startPeriod; period <= endPeriod; period++) {
      // Check ledger for this period's entry
      const ledgerEntries = await db
        .select()
        .from(practiceLedger)
        .where(
          and(
            eq(practiceLedger.relatedRequestId, requestId),
            eq(practiceLedger.payPeriod, period)
          )
        );

      let status = 'pending'; // Default if no ledger entry found
      let ledgerEntry = null;

      if (ledgerEntries.length > 0) {
        // Find the most recent relevant entry (paid takes precedence over committed)
        const paidEntry = ledgerEntries.find(e => e.transactionType === 'paid');
        const committedEntries = ledgerEntries.filter(e => e.transactionType === 'committed');
        
        if (paidEntry) {
          status = 'paid';
          ledgerEntry = paidEntry;
        } else if (committedEntries.length > 0) {
          // Sum all committed entries to account for cancellations (negative amounts)
          const committedSum = committedEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
          
          // If sum is effectively zero (cancelled), status is pending; otherwise committed
          if (Math.abs(committedSum) < 0.01) {
            status = 'pending';
          } else {
            status = 'committed';
            ledgerEntry = committedEntries[0]; // Use first entry for reference
          }
        }
      }

      breakdown.push({
        payPeriod: period,
        amount: request.amount,
        status: status,
        ledgerEntryId: ledgerEntry?.id,
      });
    }

    return breakdown;
  }

  async cancelCommittedPeriod(requestId: number, payPeriod: number): Promise<void> {
    // Find the committed ledger entry for this request and pay period
    const [ledgerEntry] = await db
      .select()
      .from(practiceLedger)
      .where(
        and(
          eq(practiceLedger.relatedRequestId, requestId),
          eq(practiceLedger.payPeriod, payPeriod),
          eq(practiceLedger.transactionType, 'committed')
        )
      );

    if (!ledgerEntry) {
      throw new Error('No committed entry found for this pay period');
    }

    // Create a reversal entry (negative amount to cancel the commitment)
    // Use 'committed' type with negative amount to maintain proper transaction type
    const reversalAmount = -Number(ledgerEntry.amount);
    
    await db.insert(practiceLedger).values({
      practiceId: ledgerEntry.practiceId,
      payPeriod: payPeriod,
      transactionType: 'committed',
      amount: reversalAmount.toString(),
      description: `Cancelled: Stipend commitment reversal for PP${payPeriod} (Request #${requestId})`,
      relatedRequestId: requestId,
    });
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
  // NEGATIVE EARNINGS CAP OPERATIONS
  // ============================================================================
  
  async getNegativeEarningsSummary(payPeriod: number): Promise<any[]> {
    // Get all practices with their current period metrics
    // Note: practiceMetrics.clinicName (from BigQuery) matches practices.id (e.g., "P001")
    const result = await db
      .select({
        practiceId: practices.id,
        practiceName: practices.name,
        clinicName: practiceMetrics.clinicName,
        portfolioId: practices.portfolioId,
        portfolioName: portfolios.name,
        negativeEarningsCap: practiceMetrics.negativeEarningsCap,
        group: practiceMetrics.group,
        metricsId: practiceMetrics.id,
      })
      .from(practices)
      .leftJoin(portfolios, eq(practices.portfolioId, portfolios.id))
      .leftJoin(
        practiceMetrics,
        and(
          eq(practiceMetrics.clinicName, practices.id),
          eq(practiceMetrics.currentPayPeriodNumber, payPeriod)
        )
      );

    // Get approved negative earnings cap requests for CURRENT pay period only
    const requests = await db
      .select({
        practiceId: negativeEarningsCapRequests.practiceId,
        amount: negativeEarningsCapRequests.approvedAmount,
      })
      .from(negativeEarningsCapRequests)
      .where(
        and(
          eq(negativeEarningsCapRequests.status, 'approved'),
          eq(negativeEarningsCapRequests.payPeriod, payPeriod)
        )
      );

    // Calculate utilized amounts per practice for current pay period
    const utilizedByPractice = new Map<string, number>();
    for (const req of requests) {
      if (req.amount) {
        const current = utilizedByPractice.get(req.practiceId) || 0;
        utilizedByPractice.set(req.practiceId, current + Number(req.amount));
      }
    }

    // Build summary - only include practices with metrics data (practices that have BigQuery data)
    return result
      .filter((row) => row.metricsId !== null) // Only practices with current period metrics
      .map((row) => ({
        practiceId: row.practiceId,
        practiceName: row.practiceName,
        clinicName: row.clinicName,
        portfolioId: row.portfolioId,
        portfolioName: row.portfolioName,
        group: row.group,
        negativeEarningsCap: row.negativeEarningsCap ? Number(row.negativeEarningsCap) : 0,
        utilized: utilizedByPractice.get(row.practiceId) || 0,
        available: (row.negativeEarningsCap ? Number(row.negativeEarningsCap) : 0) - (utilizedByPractice.get(row.practiceId) || 0),
      }));
  }

  async getNegativeEarningsCapRequests(filters?: { status?: string; practiceId?: string; requestorId?: string }): Promise<any[]> {
    let query = db
      .select({
        id: negativeEarningsCapRequests.id,
        practiceId: negativeEarningsCapRequests.practiceId,
        practiceName: practices.name,
        requestorId: negativeEarningsCapRequests.requestorId,
        requestorName: users.name,
        payPeriod: negativeEarningsCapRequests.payPeriod,
        requestedAmount: negativeEarningsCapRequests.requestedAmount,
        approvedAmount: negativeEarningsCapRequests.approvedAmount,
        justification: negativeEarningsCapRequests.justification,
        status: negativeEarningsCapRequests.status,
        approvedBy: negativeEarningsCapRequests.approvedBy,
        rejectionReason: negativeEarningsCapRequests.rejectionReason,
        createdAt: negativeEarningsCapRequests.createdAt,
        updatedAt: negativeEarningsCapRequests.updatedAt,
      })
      .from(negativeEarningsCapRequests)
      .leftJoin(practices, eq(negativeEarningsCapRequests.practiceId, practices.id))
      .leftJoin(users, eq(negativeEarningsCapRequests.requestorId, users.id));

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(negativeEarningsCapRequests.status, filters.status));
    }
    if (filters?.practiceId) {
      conditions.push(eq(negativeEarningsCapRequests.practiceId, filters.practiceId));
    }
    if (filters?.requestorId) {
      conditions.push(eq(negativeEarningsCapRequests.requestorId, filters.requestorId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return await query.orderBy(desc(negativeEarningsCapRequests.createdAt));
  }

  async createNegativeEarningsCapRequest(request: InsertNegativeEarningsCapRequest): Promise<NegativeEarningsCapRequest> {
    const [created] = await db.insert(negativeEarningsCapRequests).values(request).returning();
    return created;
  }

  async updateNegativeEarningsCapRequestStatus(id: number, status: string, userId: string, approvedAmount?: string, notes?: string): Promise<NegativeEarningsCapRequest> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };

    // If Finance is approving, track approval details
    if (status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
      if (approvedAmount) {
        updateData.approvedAmount = approvedAmount;
      } else {
        // If no approved amount specified, use the requested amount
        const [request] = await db
          .select({ requestedAmount: negativeEarningsCapRequests.requestedAmount })
          .from(negativeEarningsCapRequests)
          .where(eq(negativeEarningsCapRequests.id, id));
        if (request) {
          updateData.approvedAmount = request.requestedAmount;
        }
      }
    }

    // If Finance is rejecting, track rejection details
    if (status === 'rejected') {
      updateData.rejectedBy = userId;
      updateData.rejectedAt = new Date();
      if (notes) {
        updateData.rejectionReason = notes;
      }
    }

    const [updated] = await db
      .update(negativeEarningsCapRequests)
      .set(updateData)
      .where(eq(negativeEarningsCapRequests.id, id))
      .returning();
    return updated;
  }

  // ============================================================================
  // DASHBOARD/REPORTING OPERATIONS
  // ============================================================================
  
  async getDashboardSummary(userId: string, role: string, portfolioId?: string): Promise<any> {
    // Get current pay period
    const currentPeriod = await this.getCurrentPayPeriod();
    const currentPeriodNumber = currentPeriod?.id || 21;

    // Get practices based on role
    let practicesList: Practice[] = [];
    if (role === "PSM" && portfolioId) {
      practicesList = await db.select().from(practices).where(eq(practices.portfolioId, portfolioId));
    } else {
      practicesList = await db.select().from(practices);
    }

    // Calculate metrics
    let totalStipendCap = 0;
    let totalStipendPaid = 0;
    let totalStipendCommitted = 0;

    for (const practice of practicesList) {
      // Get stipend cap from current period metrics
      const metrics = await db.select()
        .from(practiceMetrics)
        .where(
          and(
            eq(practiceMetrics.clinicName, practice.id),
            eq(practiceMetrics.currentPayPeriodNumber, currentPeriodNumber)
          )
        )
        .limit(1);
      
      if (metrics[0]?.stipendCapAvgFinal) {
        totalStipendCap += parseFloat(metrics[0].stipendCapAvgFinal);
      }

      // Calculate Stipend Paid and Committed from ledger entries
      // Paid = ledger entries with transactionType "paid" (these are negative debits, so take absolute value)
      // Committed = ledger entries with transactionType "committed" (also negative debits)
      const ledgerEntries = await db.select()
        .from(practiceLedger)
        .where(eq(practiceLedger.practiceId, practice.id));
      
      for (const entry of ledgerEntries) {
        const amount = parseFloat(entry.amount);
        if (entry.transactionType === 'paid') {
          // Paid entries are negative (debits), so take absolute value
          totalStipendPaid += Math.abs(amount);
        } else if (entry.transactionType === 'committed') {
          // Committed entries are also negative (debits), so take absolute value
          totalStipendCommitted += Math.abs(amount);
        }
      }
    }

    // Calculate Available Balance
    const availableBalanceTillPP26 = totalStipendCap - totalStipendPaid - totalStipendCommitted;
    const remainingPeriods = Math.max(26 - currentPeriodNumber, 1);
    const availableBalancePerPP = availableBalanceTillPP26 / remainingPeriods;

    // Get pending approvals count (requests NOT fully approved)
    let pendingCount = 0;
    if (role === "PSM" && portfolioId) {
      const pending = await db.select().from(stipendRequests)
        .leftJoin(practices, eq(stipendRequests.practiceId, practices.id))
        .where(
          and(
            eq(practices.portfolioId, portfolioId),
            or(
              eq(stipendRequests.status, 'pending_lead_psm'),
              eq(stipendRequests.status, 'pending_finance')
            )
          )
        );
      pendingCount = pending.length;
    } else if (role === "Lead PSM") {
      const pending = await db.select().from(stipendRequests)
        .where(
          or(
            eq(stipendRequests.status, 'pending_lead_psm'),
            eq(stipendRequests.status, 'pending_finance')
          )
        );
      pendingCount = pending.length;
    } else if (role === "Finance") {
      const pending = await db.select().from(stipendRequests)
        .where(eq(stipendRequests.status, 'pending_finance'));
      pendingCount = pending.length;
    } else if (role === "Admin") {
      const pending = await db.select().from(stipendRequests)
        .where(or(
          eq(stipendRequests.status, 'pending_lead_psm'),
          eq(stipendRequests.status, 'pending_finance')
        ));
      pendingCount = pending.length;
    }

    return {
      totalCap: totalStipendCap,
      stipendPaid: totalStipendPaid,
      stipendCommitted: totalStipendCommitted,
      availableBalanceTillPP26: availableBalanceTillPP26,
      availableBalancePerPP: availableBalancePerPP,
      pendingApprovals: pendingCount,
      currentPeriodNumber: currentPeriodNumber,
    };
  }

  async getPortfolioSummaries(): Promise<any[]> {
    const portfolioList = await this.getPortfolios();
    const currentPeriod = await this.getCurrentPayPeriod();
    const currentPeriodNumber = currentPeriod?.id || 21;
    
    const summaries = [];
    for (const portfolio of portfolioList) {
      // Get all practices in this portfolio
      const portfolioPractices = await db.select()
        .from(practices)
        .where(eq(practices.portfolioId, portfolio.id));
      
      // Calculate portfolio metrics
      let totalCap = 0;
      let stipendPaid = 0;
      let stipendCommitted = 0;

      for (const practice of portfolioPractices) {
        // Get stipend cap from current period metrics
        const metrics = await db.select()
          .from(practiceMetrics)
          .where(
            and(
              eq(practiceMetrics.clinicName, practice.id),
              eq(practiceMetrics.currentPayPeriodNumber, currentPeriodNumber)
            )
          )
          .limit(1);
        
        if (metrics[0]?.stipendCapAvgFinal) {
          totalCap += parseFloat(metrics[0].stipendCapAvgFinal);
        }

        // Use storage methods to calculate paid and committed
        const paid = await this.getStipendPaid(practice.id);
        const committed = await this.getStipendCommitted(practice.id);
        
        stipendPaid += paid;
        stipendCommitted += committed;
      }

      // Calculate derived metrics
      const remaining = totalCap - stipendPaid - stipendCommitted;
      const remainingPeriods = Math.max(26 - currentPeriodNumber, 1);
      const remainingPerPP = remaining / remainingPeriods;
      const utilizationPercent = totalCap > 0 ? ((stipendPaid + stipendCommitted) / totalCap) * 100 : 0;
      
      // Get PSM name
      let psmName = null;
      const [psm] = await db.select().from(users)
        .where(eq(users.portfolioId, portfolio.id))
        .limit(1);
      if (psm) {
        psmName = psm.firstName && psm.lastName 
          ? `${psm.firstName} ${psm.lastName}` 
          : psm.email;
      }
      
      summaries.push({
        id: portfolio.id,
        name: portfolio.name,
        psmName,
        totalCap,
        utilized: stipendPaid,
        committed: stipendCommitted,
        remaining,
        remainingPerPP,
        utilizationPercent,
        practiceCount: portfolioPractices.length,
      });
    }
    
    return summaries;
  }
}

export const storage = new DatabaseStorage();

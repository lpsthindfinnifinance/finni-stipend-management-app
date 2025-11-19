import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  decimal,
  text,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// SESSION & USER TABLES (Required for Replit Auth)
// ============================================================================

// Session storage table (MANDATORY for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (MANDATORY for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sub: varchar("sub").unique(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("PSM"), // Current active role
  roles: text("roles").array().notNull().default(sql`ARRAY['PSM']::text[]`), // All assigned roles
  portfolioId: varchar("portfolio_id"), // G1-G5, null for Finance and Admin roles
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
  role: z.enum(["PSM", "Lead PSM", "Finance", "Admin"], { required_error: "Role is required" }),
  roles: z.array(z.enum(["PSM", "Lead PSM", "Finance", "Admin"])).min(1, "At least one role is required").default(["PSM"]),
  portfolioId: z.string().nullable().optional(),
});

export const updateUserSchema = insertUserSchema.partial().extend({
  id: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// ============================================================================
// PORTFOLIO TABLES
// ============================================================================

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey(), // G1, G2, G3, G4, G5
  name: varchar("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().regex(/^G[1-5]$/, "Portfolio ID must be G1, G2, G3, G4, or G5"),
  name: z.string().min(3, "Name must be at least 3 characters"),
});

export const updatePortfolioSchema = insertPortfolioSchema.partial().extend({
  id: z.string(),
});

export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type UpdatePortfolio = z.infer<typeof updatePortfolioSchema>;
export type Portfolio = typeof portfolios.$inferSelect;

// ============================================================================
// PRACTICE TABLES
// ============================================================================

export const practices = pgTable("practices", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  portfolioId: varchar("portfolio_id").notNull(), // Current portfolio assignment
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPracticeSchema = createInsertSchema(practices).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().min(1, "Practice ID is required"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  portfolioId: z.string().regex(/^G[1-5]$/, "Portfolio must be G1, G2, G3, G4, or G5"),
});

export const updatePracticeSchema = insertPracticeSchema.partial().extend({
  id: z.string(),
});

export type InsertPractice = z.infer<typeof insertPracticeSchema>;
export type UpdatePractice = z.infer<typeof updatePracticeSchema>;
export type Practice = typeof practices.$inferSelect;

// ============================================================================
// PRACTICE METRICS TABLE (BigQuery Import Data - Full Table)
// ============================================================================

export const practiceMetrics = pgTable("practice_metrics", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // Practice identification
  clinicName: varchar("clinic_name").notNull(),
  displayName: varchar("display_name"),
  group: varchar("group"), // G1, G2, G3, G4, G5
  practiceDisplayNameGroup: varchar("practice_display_name_group"),
  isActivePractice: integer("is_active_practice"), // NULLABLE in BigQuery
  
  // Pay period
  currentPayPeriodNumber: integer("current_pay_period_number").notNull(), // Required for upsert
  year: integer("year").notNull(), // 2025, 2026, etc.
  
  // YTD (Year-to-date) metrics
  billedPpsYtd: integer("billed_pps_ytd"),
  netRevenueSubTotalYtd: decimal("net_revenue_sub_total_ytd", { precision: 12, scale: 2 }),
  rentLeaseStipendYtd: decimal("rent_lease_stipend_ytd", { precision: 12, scale: 2 }),
  staffTrainingCostYtd: decimal("staff_training_cost_ytd", { precision: 12, scale: 2 }),
  totalStaffCostYtd: decimal("total_staff_cost_ytd", { precision: 12, scale: 2 }),
  miscellaneousYtd: decimal("miscellaneous_ytd", { precision: 12, scale: 2 }),
  hqErrorsStipendYtd: decimal("hq_errors_stipend_ytd", { precision: 12, scale: 2 }),
  poErrorsStipendYtd: decimal("po_errors_stipend_ytd", { precision: 12, scale: 2 }),
  negativeEarningsYtd: decimal("negative_earnings_ytd", { precision: 12, scale: 2 }),
  brexExpensesReimbursementMktYtd: decimal("brex_expenses_reimbursement_mkt_ytd", { precision: 12, scale: 2 }),
  coveredBenefitsYtd: decimal("covered_benefits_ytd", { precision: 12, scale: 2 }),
  salesMarketingSubTotalYtd: decimal("sales_marketing_sub_total_ytd", { precision: 12, scale: 2 }),
  grossMarginSubTotalYtd: decimal("gross_margin_sub_total_ytd", { precision: 12, scale: 2 }),
  totalPromotionalSpendYtd: decimal("total_promotional_spend_ytd", { precision: 12, scale: 2 }),
  grossMarginBeforePromSpendYtd: decimal("gross_margin_before_prom_spend_ytd", { precision: 12, scale: 2 }),
  promotionalSpendExclHqErrNegErnsYtd: decimal("promotional_spend_excl_hq_err_neg_erns_ytd", { precision: 12, scale: 2 }),
  
  // Revenue projections
  netRevenueFy: decimal("net_revenue_fy", { precision: 12, scale: 2 }),
  
  // Stipend caps
  stipendCapRateFy: decimal("stipend_cap_rate_fy", { precision: 5, scale: 2 }),
  stipendCapRateAnnual: decimal("stipend_cap_rate_annual", { precision: 5, scale: 2 }),
  stipendCapFy: decimal("stipend_cap_fy", { precision: 12, scale: 2 }),
  stipendCapAnnualizedAdj: decimal("stipend_cap_annualized_adj", { precision: 12, scale: 2 }),
  stipendCapAvgFinal: decimal("stipend_cap_avg_final", { precision: 12, scale: 2 }), // NULLABLE in BigQuery, USED FOR REMEASUREMENT
  
  // Negative earnings cap
  negativeEarningsCap: decimal("negative_earnings_cap", { precision: 12, scale: 2 }),
  negativeEarningsUtilized: decimal("negative_earnings_utilized", { precision: 12, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint on clinicName + year + currentPayPeriodNumber for upsert
  uniqueClinicPeriod: unique("unique_clinic_period").on(table.clinicName, table.year, table.currentPayPeriodNumber),
}));

export const insertPracticeMetricsSchema = createInsertSchema(practiceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export type InsertPracticeMetrics = z.infer<typeof insertPracticeMetricsSchema>;
export type PracticeMetrics = typeof practiceMetrics.$inferSelect;

// ============================================================================
// PRACTICE LEDGER TABLE (Transaction History)
// ============================================================================

export const practiceLedger = pgTable("practice_ledger", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: varchar("practice_id").notNull(),
  payPeriod: integer("pay_period").notNull(),
  year: integer("year").notNull(), // 2025, 2026, etc.
  transactionType: varchar("transaction_type").notNull(), // opening_balance, opening_balance_stipend_paid, remeasurement, paid, committed, allocation_in, allocation_out, suspense_in, suspense_out
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(), // Can be positive or negative
  description: text("description"),
  relatedRequestId: integer("related_request_id"), // Reference to stipend_requests.id if applicable
  relatedAllocationId: integer("related_allocation_id"), // Reference to inter_psm_allocations.id if applicable
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPracticeLedgerSchema = createInsertSchema(practiceLedger).omit({
  id: true,
  createdAt: true,
} as any);

export type InsertPracticeLedger = z.infer<typeof insertPracticeLedgerSchema>;
export type PracticeLedger = typeof practiceLedger.$inferSelect;

// ============================================================================
// STIPEND REQUEST TABLE
// ============================================================================

export const stipendRequests = pgTable("stipend_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: varchar("practice_id").notNull(),
  requestorId: varchar("requestor_id").notNull(), // PSM who submitted
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  stipendType: varchar("stipend_type").notNull().default("other"), // lease_stipend, staff_cost_reimbursement, marketing, equipment, training, other
  stipendDescription: text("stipend_description"), // Description of the stipend
  staffEmails: text("staff_emails"), // Email IDs of staff (for staff_cost_reimbursement only)
  requestType: varchar("request_type").notNull(), // one_time, recurring
  effectivePayPeriod: integer("effective_pay_period").notNull(), // Pay period when stipend takes effect (1-26)
  effectiveYear: integer("effective_year").notNull(), // Year when stipend takes effect (2025, 2026, etc.)
  recurringEndPeriod: integer("recurring_end_period"), // Only for recurring, ending pay period (1-26)
  recurringEndYear: integer("recurring_end_year"), // Only for recurring, ending year (2025, 2026, etc.)
  justification: text("justification").notNull(),
  status: varchar("status").notNull().default("pending_lead_psm"), // pending_lead_psm, pending_finance, approved, rejected
  leadPsmApprovedAt: timestamp("lead_psm_approved_at"),
  leadPsmApprovedBy: varchar("lead_psm_approved_by"),
  financeApprovedAt: timestamp("finance_approved_at"),
  financeApprovedBy: varchar("finance_approved_by"),
  rejectedAt: timestamp("rejected_at"),
  rejectedBy: varchar("rejected_by"),
  rejectionReason: text("rejection_reason"),
  leadPsmComment: text("lead_psm_comment"), // Comment when Lead PSM approves/rejects
  financeComment: text("finance_comment"), // Comment when Finance approves/rejects
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

const baseStipendRequestSchema = createInsertSchema(stipendRequests).omit({
  id: true,
  status: true,
  leadPsmApprovedAt: true,
  leadPsmApprovedBy: true,
  financeApprovedAt: true,
  financeApprovedBy: true,
  rejectedAt: true,
  rejectedBy: true,
  rejectionReason: true,
  leadPsmComment: true,
  financeComment: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStipendRequestSchema = baseStipendRequestSchema.refine(
  (data: any) => {
    if (typeof data.amount === 'string') {
      const numAmount = parseFloat(data.amount);
      return !isNaN(numAmount) && numAmount > 0;
    }
    return data.amount > 0;
  },
  { message: "Amount must be greater than 0", path: ["amount"] }
).refine(
  (data: any) => data.justification && data.justification.length >= 10,
  { message: "Justification must be at least 10 characters", path: ["justification"] }
).refine(
  (data: any) => data.effectivePayPeriod >= 1 && data.effectivePayPeriod <= 26,
  { message: "Pay period must be between 1 and 26", path: ["effectivePayPeriod"] }
).refine(
  (data: any) => data.effectiveYear >= 2025,
  { message: "Year must be 2025 or later", path: ["effectiveYear"] }
).refine(
  (data: any) => data.stipendDescription && data.stipendDescription.trim().length >= 5,
  { message: "Stipend description must be at least 5 characters", path: ["stipendDescription"] }
);

export type InsertStipendRequest = z.infer<typeof insertStipendRequestSchema>;
export type StipendRequest = typeof stipendRequests.$inferSelect;

// Extended type for request details with related entities
export type StipendRequestWithDetails = StipendRequest & {
  requestor: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  leadPsmApprover: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  financeApprover: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  practice: {
    id: string;
    clinicName: string;
  } | null;
};

// ============================================================================
// INTER-PSM ALLOCATION TABLE
// ============================================================================

export const interPsmAllocations = pgTable("inter_psm_allocations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  donorPsmId: varchar("donor_psm_id").notNull(),
  recipientPracticeIds: text("recipient_practice_ids").array().notNull(), // Array of recipient practice IDs
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  donorPracticeIds: text("donor_practice_ids").array().notNull(), // Array of donor practice IDs
  status: varchar("status").notNull().default("completed"), // All allocations are completed immediately
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").notNull(),
  payPeriod: integer("payperiod").notNull(),
  year: integer("year").notNull(),
  comment: text("comment")
});

export const insertInterPsmAllocationSchema = createInsertSchema(interPsmAllocations).omit({
  id: true,
  status: true,
  createdAt: true,
  completedAt: true,
} as any);

export type InsertInterPsmAllocation = z.infer<typeof insertInterPsmAllocationSchema>;
export type InterPsmAllocation = typeof interPsmAllocations.$inferSelect;

// ============================================================================
// PAY PERIOD TABLE
// ============================================================================

export const payPeriods = pgTable("pay_periods", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  payPeriodNumber: integer("pay_period_number").notNull(), // 1-26
  year: integer("year").notNull(), // 2025, 2026, etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isCurrent: integer("is_current").notNull().default(0), // 0 or 1 (boolean)
  remeasurementCompleted: integer("remeasurement_completed").notNull().default(0),
  csvData: text("csv_data"), // Stores the uploaded CSV data for this pay period
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint on year + payPeriodNumber
  uniqueYearPeriod: unique("unique_year_period").on(table.year, table.payPeriodNumber),
}));

export const insertPayPeriodSchema = createInsertSchema(payPeriods).omit({
  createdAt: true,
});

export type InsertPayPeriod = z.infer<typeof insertPayPeriodSchema>;
export type PayPeriod = typeof payPeriods.$inferSelect;

// ============================================================================
// PRACTICE REASSIGNMENT HISTORY TABLE
// ============================================================================

export const practiceReassignments = pgTable("practice_reassignments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: varchar("practice_id").notNull(),
  fromPortfolioId: varchar("from_portfolio_id").notNull(),
  toPortfolioId: varchar("to_portfolio_id").notNull(),
  effectivePayPeriod: integer("effective_pay_period").notNull(),
  effectiveYear: integer("effective_year").notNull(), // 2025, 2026, etc.
  reassignedBy: varchar("reassigned_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPracticeReassignmentSchema = createInsertSchema(practiceReassignments).omit({
  id: true,
  createdAt: true,
} as any);

export type InsertPracticeReassignment = z.infer<typeof insertPracticeReassignmentSchema>;
export type PracticeReassignment = typeof practiceReassignments.$inferSelect;

// ============================================================================
// NEGATIVE EARNINGS CAP REQUESTS TABLE
// ============================================================================

export const negativeEarningsCapRequests = pgTable("negative_earnings_cap_requests", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  practiceId: varchar("practice_id").notNull(),
  requestorId: varchar("requestor_id").notNull(), // PSM who submitted
  payPeriod: integer("pay_period").notNull(), // Pay period this request applies to (1-26)
  year: integer("year").notNull(), // Year this request applies to (2025, 2026, etc.)
  requestedAmount: decimal("requested_amount", { precision: 12, scale: 2 }).notNull(),
  justification: text("justification").notNull(),
  status: varchar("status").notNull().default("pending_finance"), // pending_finance, approved, rejected
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by"),
  rejectedAt: timestamp("rejected_at"),
  rejectedBy: varchar("rejected_by"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNegativeEarningsCapRequestSchema = z.object({
  practiceId: z.string(),
  requestorId: z.string(),
  payPeriod: z.number(),
  year: z.number(),
  requestedAmount: z.string().refine((val) => parseFloat(val) > 0, "Amount must be greater than 0"),
  justification: z.string().min(10, "Justification must be at least 10 characters"),
});

export type InsertNegativeEarningsCapRequest = z.infer<typeof insertNegativeEarningsCapRequestSchema>;
export type NegativeEarningsCapRequest = typeof negativeEarningsCapRequests.$inferSelect;

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [users.portfolioId],
    references: [portfolios.id],
  }),
}));

export const portfoliosRelations = relations(portfolios, ({ many }) => ({
  practices: many(practices),
  psms: many(users),
}));

export const practicesRelations = relations(practices, ({ one, many }) => ({
  portfolio: one(portfolios, {
    fields: [practices.portfolioId],
    references: [portfolios.id],
  }),
  ledgerEntries: many(practiceLedger),
  stipendRequests: many(stipendRequests),
  reassignments: many(practiceReassignments),
  negativeEarningsCapRequests: many(negativeEarningsCapRequests),
}));

export const practiceLedgerRelations = relations(practiceLedger, ({ one }) => ({
  practice: one(practices, {
    fields: [practiceLedger.practiceId],
    references: [practices.id],
  }),
  stipendRequest: one(stipendRequests, {
    fields: [practiceLedger.relatedRequestId],
    references: [stipendRequests.id],
  }),
  allocation: one(interPsmAllocations, {
    fields: [practiceLedger.relatedAllocationId],
    references: [interPsmAllocations.id],
  }),
}));

export const stipendRequestsRelations = relations(stipendRequests, ({ one, many }) => ({
  practice: one(practices, {
    fields: [stipendRequests.practiceId],
    references: [practices.id],
  }),
  requestor: one(users, {
    fields: [stipendRequests.requestorId],
    references: [users.id],
  }),
  ledgerEntries: many(practiceLedger),
}));

export const interPsmAllocationsRelations = relations(interPsmAllocations, ({ one, many }) => ({
  donorPsm: one(users, {
    fields: [interPsmAllocations.donorPsmId],
    references: [users.id],
  }),
  ledgerEntries: many(practiceLedger),
}));

// ============================================================================
// SLACK SETTINGS TABLE
// ============================================================================

export const slack_settings = pgTable("slack_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationType: varchar("notification_type").notNull(), // e.g., "request_submitted", "request_approved", "request_rejected", "period_paid"
  webhookUrl: text("webhook_url").notNull(),
  channelName: varchar("channel_name"), // Display name like "#stipend-approvals"
  description: text("description"), // What this webhook is for
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSlackSettingSchema = createInsertSchema(slack_settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  notificationType: z.enum(["request_submitted", "request_approved", "request_rejected", "period_paid", "allocations", "general"], 
    { required_error: "Notification type is required" }),
  webhookUrl: z.string().url("Must be a valid webhook URL").startsWith("https://hooks.slack.com/", "Must be a valid Slack webhook URL"),
  channelName: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateSlackSettingSchema = insertSlackSettingSchema.partial().extend({
  id: z.string(),
});

export type InsertSlackSetting = z.infer<typeof insertSlackSettingSchema>;
export type UpdateSlackSetting = z.infer<typeof updateSlackSettingSchema>;
export type SlackSetting = typeof slack_settings.$inferSelect;

export const practiceReassignmentsRelations = relations(practiceReassignments, ({ one }) => ({
  practice: one(practices, {
    fields: [practiceReassignments.practiceId],
    references: [practices.id],
  }),
  fromPortfolio: one(portfolios, {
    fields: [practiceReassignments.fromPortfolioId],
    references: [portfolios.id],
  }),
  toPortfolio: one(portfolios, {
    fields: [practiceReassignments.toPortfolioId],
    references: [portfolios.id],
  }),
}));

export const negativeEarningsCapRequestsRelations = relations(negativeEarningsCapRequests, ({ one }) => ({
  practice: one(practices, {
    fields: [negativeEarningsCapRequests.practiceId],
    references: [practices.id],
  }),
  requestor: one(users, {
    fields: [negativeEarningsCapRequests.requestorId],
    references: [users.id],
  }),
}));

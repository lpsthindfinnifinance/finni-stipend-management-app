import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertStipendRequestSchema,
  insertPortfolioSchema,
  updatePortfolioSchema,
  insertPracticeSchema,
  updatePracticeSchema,
  insertUserSchema,
  updateUserSchema
} from "@shared/schema";
import axios from "axios";

// Slack notification helper
async function sendSlackNotification(message: string) {
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.log("Slack webhook not configured");
    return;
  }

  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
      text: message,
    });
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Role-based middleware
  const isFinance = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      // Admin has all Finance permissions
      if (user?.role !== "Finance" && user?.role !== "Admin") {
        return res.status(403).json({ message: "Finance or Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Finance middleware error:", error);
      res.status(500).json({ message: "Authentication error" });
    }
  };

  // ============================================================================
  // AUTH ROUTES
  // ============================================================================

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/update-role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, portfolioId } = req.body;
      
      const user = await storage.updateUserRole(userId, role, portfolioId);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // ============================================================================
  // DASHBOARD ROUTES
  // ============================================================================

  app.get('/api/dashboard/summary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const summary = await storage.getDashboardSummary(
        userId,
        user.role || "PSM",
        user.portfolioId || undefined
      );
      
      res.json(summary);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });

  // ============================================================================
  // PORTFOLIO ROUTES
  // ============================================================================

  app.get('/api/portfolios', isAuthenticated, async (req, res) => {
    try {
      const portfolios = await storage.getPortfolioSummaries();
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      res.status(500).json({ message: "Failed to fetch portfolios" });
    }
  });

  app.get('/api/portfolios/:id', isAuthenticated, async (req, res) => {
    try {
      const portfolio = await storage.getPortfolioById(req.params.id);
      
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      res.json(portfolio);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      res.status(500).json({ message: "Failed to fetch portfolio" });
    }
  });

  // ============================================================================
  // PRACTICE ROUTES
  // ============================================================================

  app.get('/api/practices', isAuthenticated, async (req, res) => {
    try {
      const { search, portfolio } = req.query;
      
      const practices = await storage.getPractices({
        search: search as string,
        portfolio: portfolio as string,
      });
      
      // Get current pay period to fetch latest metrics
      const currentPeriod = await storage.getCurrentPayPeriod();
      
      // Enrich with balance data and latest metrics
      const enrichedPractices = await Promise.all(
        practices.map(async (practice) => {
          const [balance, stipendPaid, stipendCommitted, metrics] = await Promise.all([
            storage.getPracticeBalance(practice.id),
            storage.getStipendPaid(practice.id),
            storage.getStipendCommitted(practice.id),
            currentPeriod ? storage.getCurrentMetrics(practice.id, currentPeriod.id) : Promise.resolve(undefined),
          ]);
          
          return {
            ...practice,
            stipendCap: metrics?.stipendCapAvgFinal ?? 0,
            availableBalance: balance,
            stipendPaid,
            stipendCommitted,
          };
        })
      );
      
      res.json(enrichedPractices);
    } catch (error) {
      console.error("Error fetching practices:", error);
      res.status(500).json({ message: "Failed to fetch practices" });
    }
  });

  app.get('/api/practices/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.json([]);
      }

      // Finance and Admin can see all practices, Lead PSM and PSM see only their portfolio
      let practices;
      if (user.role === 'Finance' || user.role === 'Admin') {
        practices = await storage.getPractices({});
      } else if (user.portfolioId) {
        practices = await storage.getPractices({
          portfolio: user.portfolioId,
        });
      } else {
        return res.json([]);
      }
      
      // Enrich with current balance for each practice
      const enrichedPractices = await Promise.all(
        practices.map(async (practice) => {
          const currentBalance = await storage.getPracticeBalance(practice.id);
          return {
            ...practice,
            currentBalance, // Numeric balance
          };
        })
      );
      
      res.json(enrichedPractices);
    } catch (error) {
      console.error("Error fetching practices:", error);
      res.status(500).json({ message: "Failed to fetch practices" });
    }
  });

  app.get('/api/practices/:id', isAuthenticated, async (req, res) => {
    try {
      const practice = await storage.getPracticeById(req.params.id);
      
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }

      res.json(practice);
    } catch (error) {
      console.error("Error fetching practice:", error);
      res.status(500).json({ message: "Failed to fetch practice" });
    }
  });

  app.get('/api/practices/:id/balance', isAuthenticated, async (req, res) => {
    try {
      const currentPeriod = await storage.getCurrentPayPeriod();
      const [balance, stipendPaid, stipendCommitted, metrics] = await Promise.all([
        storage.getPracticeBalance(req.params.id),
        storage.getStipendPaid(req.params.id),
        storage.getStipendCommitted(req.params.id),
        currentPeriod ? storage.getCurrentMetrics(req.params.id, currentPeriod.id) : Promise.resolve(undefined),
      ]);
      
      const stipendCap = metrics?.stipendCapAvgFinal ?? 0;
      // Utilization = (Paid + Committed) / Cap, not Available / Cap
      const utilizationPercent = stipendCap > 0 ? ((stipendPaid + stipendCommitted) / stipendCap) * 100 : 0;
      
      res.json({
        practiceId: req.params.id,
        currentBalance: balance,
        stipendCap,
        stipendPaid,
        stipendCommitted,
        utilizationPercent,
        available: balance, // Keep for backward compatibility
      });
    } catch (error) {
      console.error("Error fetching practice balance:", error);
      res.status(500).json({ message: "Failed to fetch practice balance" });
    }
  });

  app.get('/api/practices/:id/ledger', isAuthenticated, async (req, res) => {
    try {
      const ledger = await storage.getPracticeLedger(req.params.id);
      
      // Calculate running balance
      let runningBalance = 0;
      const ledgerWithBalance = ledger.map(entry => {
        runningBalance += parseFloat(entry.amount);
        return {
          ...entry,
          runningBalance,
        };
      }).reverse(); // Reverse to show oldest first
      
      res.json(ledgerWithBalance);
    } catch (error) {
      console.error("Error fetching practice ledger:", error);
      res.status(500).json({ message: "Failed to fetch practice ledger" });
    }
  });

  // ============================================================================
  // STIPEND REQUEST ROUTES
  // ============================================================================

  app.post('/api/stipend-requests', isAuthenticated, async (req: any, res) => {
    try {
      const validationResult = insertStipendRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.errors,
        });
      }

      const request = await storage.createStipendRequest(req.body);
      
      // Send Slack notification
      await sendSlackNotification(
        `New stipend request submitted: $${req.body.amount} for practice ${req.body.practiceId}`
      );
      
      res.json(request);
    } catch (error) {
      console.error("Error creating stipend request:", error);
      res.status(500).json({ message: "Failed to create stipend request" });
    }
  });

  app.get('/api/stipend-requests', isAuthenticated, async (req: any, res) => {
    try {
      const { requestorId } = req.query;
      
      if (requestorId) {
        // Filter by requestor
        const requests = await storage.getStipendRequests({ requestorId: requestorId as string });
        return res.json(requests);
      }

      // Return all requests if no filter
      const requests = await storage.getStipendRequests({});
      res.json(requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.get('/api/stipend-requests/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get pending requests based on role
      let status = "pending_psm";
      if (user.role === "Lead PSM") status = "pending_lead_psm";
      if (user.role === "Finance") status = "pending_finance";

      const requests = await storage.getStipendRequests({ status });
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.get('/api/stipend-requests/approved', isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getStipendRequests({ status: "approved" });
      res.json(requests);
    } catch (error) {
      console.error("Error fetching approved requests:", error);
      res.status(500).json({ message: "Failed to fetch approved requests" });
    }
  });

  app.get('/api/stipend-requests/rejected', isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getStipendRequests({ status: "rejected" });
      res.json(requests);
    } catch (error) {
      console.error("Error fetching rejected requests:", error);
      res.status(500).json({ message: "Failed to fetch rejected requests" });
    }
  });

  app.post('/api/stipend-requests/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const request = await storage.getStipendRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Determine next status based on current status and user role
      let newStatus = request.status;
      
      if (request.status === "pending_psm" && user.role === "PSM") {
        newStatus = "pending_lead_psm";
      } else if (request.status === "pending_lead_psm" && user.role === "Lead PSM") {
        newStatus = "pending_finance";
      } else if (request.status === "pending_finance" && user.role === "Finance") {
        newStatus = "approved";
        
        // Create ledger entry for approved request
        await storage.createLedgerEntry({
          practiceId: request.practiceId,
          payPeriod: 1, // Current period - should be dynamic
          transactionType: request.requestType === "one_time" ? "paid" : "committed",
          amount: request.amount,
          description: `Stipend request #${requestId} approved`,
          relatedRequestId: requestId,
          relatedAllocationId: null,
        });
      } else {
        return res.status(403).json({ message: "Cannot approve this request" });
      }

      const updated = await storage.updateStipendRequestStatus(requestId, newStatus, userId);
      
      // Send Slack notification
      await sendSlackNotification(
        `Stipend request #${requestId} approved by ${user.role}. New status: ${newStatus}`
      );
      
      res.json(updated);
    } catch (error) {
      console.error("Error approving request:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.post('/api/stipend-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { reason } = req.body;
      
      const updated = await storage.updateStipendRequestStatus(requestId, "rejected", userId, reason);
      
      // Send Slack notification
      await sendSlackNotification(
        `Stipend request #${requestId} rejected. Reason: ${reason || "No reason provided"}`
      );
      
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // ============================================================================
  // NEGATIVE EARNINGS CAP ROUTES
  // ============================================================================

  app.get('/api/negative-earnings/summary', isAuthenticated, async (req, res) => {
    try {
      const currentPeriod = await storage.getCurrentPayPeriod();
      if (!currentPeriod) {
        return res.status(400).json({ message: "No active pay period found" });
      }

      const summary = await storage.getNegativeEarningsSummary(currentPeriod.id);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching negative earnings summary:", error);
      res.status(500).json({ message: "Failed to fetch negative earnings summary" });
    }
  });

  app.get('/api/negative-earnings/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filters: any = {};
      
      // PSMs only see their own requests
      if (user.role === "PSM") {
        filters.requestorId = userId;
      }
      
      const requests = await storage.getNegativeEarningsCapRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching negative earnings requests:", error);
      res.status(500).json({ message: "Failed to fetch negative earnings requests" });
    }
  });

  app.post('/api/negative-earnings/requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { practiceId, amount, justification } = req.body;

      if (!practiceId || !amount || !justification) {
        return res.status(400).json({ message: "Practice, amount, and justification are required" });
      }

      // Get current pay period
      const currentPeriod = await storage.getCurrentPayPeriod();
      if (!currentPeriod) {
        return res.status(400).json({ message: "No active pay period found" });
      }

      const newRequest = await storage.createNegativeEarningsCapRequest({
        practiceId,
        requestorId: userId,
        payPeriod: currentPeriod.id,
        requestedAmount: amount.toString(),
        justification,
      });

      // Send Slack notification
      await sendSlackNotification(
        `New Negative Earnings Cap request #${newRequest.id} for $${amount} (PP${currentPeriod.id}) pending Finance approval`
      );

      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating negative earnings cap request:", error);
      res.status(500).json({ message: "Failed to create request" });
    }
  });

  app.post('/api/negative-earnings/requests/:id/approve', isAuthenticated, isFinance, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { approvedAmount, notes } = req.body;

      const updated = await storage.updateNegativeEarningsCapRequestStatus(
        requestId, 
        'approved', 
        userId, 
        approvedAmount?.toString(),
        notes
      );

      // Send Slack notification
      const amount = approvedAmount || updated.requestedAmount;
      await sendSlackNotification(
        `Negative Earnings Cap request #${requestId} approved by Finance for $${amount} (PP${updated.payPeriod})`
      );

      res.json(updated);
    } catch (error) {
      console.error("Error approving negative earnings request:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.post('/api/negative-earnings/requests/:id/reject', isAuthenticated, isFinance, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const { notes } = req.body;

      const updated = await storage.updateNegativeEarningsCapRequestStatus(
        requestId, 
        'rejected', 
        userId, 
        undefined,
        notes
      );

      // Send Slack notification
      await sendSlackNotification(
        `Negative Earnings Cap request #${requestId} (PP${updated.payPeriod}) rejected by Finance. ${notes ? 'Reason: ' + notes : ''}`
      );

      res.json(updated);
    } catch (error) {
      console.error("Error rejecting negative earnings request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // ============================================================================
  // PAY PERIOD ROUTES
  // ============================================================================

  app.get('/api/pay-periods/current', isAuthenticated, async (req, res) => {
    try {
      const period = await storage.getCurrentPayPeriod();
      res.json(period || { id: 1 }); // Default to period 1 if none set
    } catch (error) {
      console.error("Error fetching current pay period:", error);
      res.status(500).json({ message: "Failed to fetch current pay period" });
    }
  });

  app.get('/api/pay-periods', isAuthenticated, async (req, res) => {
    try {
      const periods = await storage.getPayPeriods();
      res.json(periods);
    } catch (error) {
      console.error("Error fetching pay periods:", error);
      res.status(500).json({ message: "Failed to fetch pay periods" });
    }
  });

  app.post('/api/pay-periods/import', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData || typeof csvData !== 'string') {
        return res.status(400).json({ message: "CSV data is required" });
      }

      // Get current pay period
      const currentPeriod = await storage.getCurrentPayPeriod();
      if (!currentPeriod) {
        return res.status(400).json({ message: "No active pay period found" });
      }

      // Parse CSV - expecting BigQuery export with all columns
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Map BigQuery column names to database column names (complete mapping for all 40+ columns)
      const columnMapping: Record<string, string> = {
        // Practice identification
        'ClinicName': 'clinicName',
        'DisplayName': 'displayName',
        'Group': 'group',
        'PayPeriod': 'payPeriod', // Simplified template format
        'Practice_DisplayName_Group': 'practiceDisplayNameGroup',
        'IsActivePractice': 'isActivePractice',
        'CurrentPayPeriod_Number': 'currentPayPeriodNumber', // Full BigQuery format
        
        // YTD metrics - Basic
        'BilledPPs_YTD': 'billedPpsYtd',
        'NetRevenue_SubTotal_YTD': 'netRevenueSubTotalYtd',
        'Rent_Lease_Stipend_YTD': 'rentLeaseStipendYtd',
        'Staff_Training_Cost_YTD': 'staffTrainingCostYtd',
        'Total_Staff_Cost_YTD': 'totalStaffCostYtd',
        'Miscellaneous_YTD': 'miscellaneousYtd',
        'HQ_Errors_Stipend_YTD': 'hqErrorsStipendYtd',
        'PO_Errors_Stipend_YTD': 'poErrorsStipendYtd',
        'Negative_Earnings_YTD': 'negativeEarningsYtd',
        'Brex_Expenses_Reimbursement_Mkt_YTD': 'brexExpensesReimbursementMktYtd',
        'Covered_Benefits_YTD': 'coveredBenefitsYtd',
        'Sales_Marketing_SubTotal_YTD': 'salesMarketingSubTotalYtd',
        'Gross_Margin_SubTotal_YTD': 'grossMarginSubTotalYtd',
        'Total_Promotional_Spend_YTD': 'totalPromotionalSpendYtd',
        'Gross_Margin_before_PromSpend_YTD': 'grossMarginBeforePromSpendYtd',
        'Promotional_Spend_excl_HQErr_NegErns_YTD': 'promotionalSpendExclHqErrNegErnsYtd',
        
        // L6PP metrics
        'BilledPPs_L6PP': 'billedPpsL6pp',
        'NetRevenue_SubTotal_L6PP': 'netRevenueSubTotalL6pp',
        'Gross_Margin_SubTotal_L6PP': 'grossMarginSubTotalL6pp',
        'Total_Promotional_Spend_L6PP': 'totalPromotionalSpendL6pp',
        'Gross_Margin_before_PromSpend_L6PP': 'grossMarginBeforePromSpendL6pp',
        'Promotional_Spend_excl_HQErr_NegErns_L6PP': 'promotionalSpendExclHqErrNegErnsL6pp',
        
        // 2PP Lag metrics
        'Charge_Dollars_2PP_Lag': 'chargeDollars2ppLag',
        'Arbora_Collections_2PP_Lag': 'arboraCollections2ppLag',
        
        // Percentages
        'Gross_Margin_before_Stipend_Percent_YTD': 'grossMarginBeforeStipendPercentYtd',
        'Gross_Margin_before_Stipend_Percent_L6PP': 'grossMarginBeforeStipendPercentL6pp',
        'Collections_Percent_2PP_Lag': 'collectionsPercent2ppLag',
        
        // Revenue projections
        'NetRevenue_FY': 'netRevenueFy',
        'NetRevenue_Annualized_L6PP': 'netRevenueAnnualizedL6pp',
        
        // Performance metrics
        'PerformanceMetric_YTD': 'performanceMetricYtd',
        'PerformanceMetric_L6PP': 'performanceMetricL6pp',
        
        // Stipend caps (supports both simplified and full BigQuery formats)
        'StipendCap': 'stipendCap', // Simplified template format
        'StipendCapRate_FY': 'stipendCapRateFy',
        'StipendCapRate_Annual': 'stipendCapRateAnnual',
        'StipendCap_FY': 'stipendCapFy',
        'StipendCap_AnnualizedAdj': 'stipendCapAnnualizedAdj',
        'StipendCapAvgFinal': 'stipendCapAvgFinal', // Full BigQuery format
        
        // Negative earnings cap
        'NegativeEarningsCap': 'negativeEarningsCap',
      };

      // Build header index map
      const headerIndex: Record<string, number> = {};
      headers.forEach((header, index) => {
        headerIndex[header] = index;
      });

      const imports: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim());
        
        // Helper to get value by BigQuery column name
        const getValue = (bigQueryCol: string) => {
          const idx = headerIndex[bigQueryCol];
          return idx !== undefined ? values[idx] : null;
        };

        // Helper to parse numeric value (handles empty strings)
        const parseNumeric = (value: string | null) => {
          if (!value || value === '') return null;
          const parsed = parseFloat(value);
          return Number.isFinite(parsed) ? parsed : null;
        };

        // Helper to parse integer value
        const parseIntValue = (value: string | null) => {
          if (!value || value === '') return null;
          const parsed = parseInt(value, 10);
          return Number.isFinite(parsed) ? parsed : null;
        };

        // Extract clinic name (primary identifier)
        const clinicName = getValue('ClinicName');
        if (!clinicName) {
          errors.push(`Line ${i + 1}: Missing ClinicName`);
          continue;
        }

        // Build import data object with ALL BigQuery columns
        const importData: any = {
          // Practice identification
          clinicName,
          displayName: getValue('DisplayName'),
          group: getValue('Group'),
          practiceDisplayNameGroup: getValue('Practice_DisplayName_Group'),
          isActivePractice: parseIntValue(getValue('IsActivePractice')),
          // Support both simplified template (PayPeriod) and full BigQuery format (CurrentPayPeriod_Number)
          // Use nullish coalescing so that 0 is treated as valid
          currentPayPeriodNumber: parseIntValue(getValue('PayPeriod')) ?? parseIntValue(getValue('CurrentPayPeriod_Number')) ?? currentPeriod.id,
          
          // YTD metrics - Complete set
          billedPpsYtd: parseIntValue(getValue('BilledPPs_YTD')),
          netRevenueSubTotalYtd: parseNumeric(getValue('NetRevenue_SubTotal_YTD')),
          rentLeaseStipendYtd: parseNumeric(getValue('Rent_Lease_Stipend_YTD')),
          staffTrainingCostYtd: parseNumeric(getValue('Staff_Training_Cost_YTD')),
          totalStaffCostYtd: parseNumeric(getValue('Total_Staff_Cost_YTD')),
          miscellaneousYtd: parseNumeric(getValue('Miscellaneous_YTD')),
          hqErrorsStipendYtd: parseNumeric(getValue('HQ_Errors_Stipend_YTD')),
          poErrorsStipendYtd: parseNumeric(getValue('PO_Errors_Stipend_YTD')),
          negativeEarningsYtd: parseNumeric(getValue('Negative_Earnings_YTD')),
          brexExpensesReimbursementMktYtd: parseNumeric(getValue('Brex_Expenses_Reimbursement_Mkt_YTD')),
          coveredBenefitsYtd: parseNumeric(getValue('Covered_Benefits_YTD')),
          salesMarketingSubTotalYtd: parseNumeric(getValue('Sales_Marketing_SubTotal_YTD')),
          grossMarginSubTotalYtd: parseNumeric(getValue('Gross_Margin_SubTotal_YTD')),
          totalPromotionalSpendYtd: parseNumeric(getValue('Total_Promotional_Spend_YTD')),
          grossMarginBeforePromSpendYtd: parseNumeric(getValue('Gross_Margin_before_PromSpend_YTD')),
          promotionalSpendExclHqErrNegErnsYtd: parseNumeric(getValue('Promotional_Spend_excl_HQErr_NegErns_YTD')),
          
          // L6PP metrics - Complete set
          billedPpsL6pp: parseIntValue(getValue('BilledPPs_L6PP')),
          netRevenueSubTotalL6pp: parseNumeric(getValue('NetRevenue_SubTotal_L6PP')),
          grossMarginSubTotalL6pp: parseNumeric(getValue('Gross_Margin_SubTotal_L6PP')),
          totalPromotionalSpendL6pp: parseNumeric(getValue('Total_Promotional_Spend_L6PP')),
          grossMarginBeforePromSpendL6pp: parseNumeric(getValue('Gross_Margin_before_PromSpend_L6PP')),
          promotionalSpendExclHqErrNegErnsL6pp: parseNumeric(getValue('Promotional_Spend_excl_HQErr_NegErns_L6PP')),
          
          // 2PP Lag metrics
          chargeDollars2ppLag: parseNumeric(getValue('Charge_Dollars_2PP_Lag')),
          arboraCollections2ppLag: parseNumeric(getValue('Arbora_Collections_2PP_Lag')),
          
          // Percentages
          grossMarginBeforeStipendPercentYtd: parseNumeric(getValue('Gross_Margin_before_Stipend_Percent_YTD')),
          grossMarginBeforeStipendPercentL6pp: parseNumeric(getValue('Gross_Margin_before_Stipend_Percent_L6PP')),
          collectionsPercent2ppLag: parseNumeric(getValue('Collections_Percent_2PP_Lag')),
          
          // Revenue projections
          netRevenueFy: parseNumeric(getValue('NetRevenue_FY')),
          netRevenueAnnualizedL6pp: parseNumeric(getValue('NetRevenue_Annualized_L6PP')),
          
          // Performance metrics
          performanceMetricYtd: parseNumeric(getValue('PerformanceMetric_YTD')),
          performanceMetricL6pp: parseNumeric(getValue('PerformanceMetric_L6PP')),
          
          // Stipend caps
          stipendCapRateFy: parseNumeric(getValue('StipendCapRate_FY')),
          stipendCapRateAnnual: parseNumeric(getValue('StipendCapRate_Annual')),
          stipendCapFy: parseNumeric(getValue('StipendCap_FY')),
          stipendCapAnnualizedAdj: parseNumeric(getValue('StipendCap_AnnualizedAdj')),
          // Support both simplified template (StipendCap) and full BigQuery format (StipendCapAvgFinal)
          // Use nullish coalescing so that 0 is treated as valid
          stipendCapAvgFinal: parseNumeric(getValue('StipendCap')) ?? parseNumeric(getValue('StipendCapAvgFinal')),
          
          // Negative earnings cap
          negativeEarningsCap: parseNumeric(getValue('NegativeEarningsCap')),
        };

        imports.push(importData);
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "CSV validation errors", 
          errors: errors.slice(0, 10),
        });
      }

      if (imports.length === 0) {
        return res.status(400).json({ message: "No valid data to import" });
      }

      // Process imports and create ledger entries for remeasurement
      let importedCount = 0;
      let remeasurementCount = 0;
      let openingBalanceCount = 0;
      let skippedNullStipendCap = 0;

      for (const importData of imports) {
        // Upsert metrics first
        await storage.upsertPracticeMetrics(importData);
        importedCount++;

        // Check if StipendCapAvgFinal is null - this is required for ledger entries
        if (importData.stipendCapAvgFinal === null) {
          skippedNullStipendCap++;
          continue;
        }

        // Calculate remeasurement adjustment using StipendCapAvgFinal
        // Get previous period number from the imported data
        const currentPeriodNum = importData.currentPayPeriodNumber;
        const previousPeriodNum = currentPeriodNum - 1;

        // Find practice by clinic name to get practiceId for ledger entry
        const practice = await storage.getPracticeByClinicName(importData.clinicName);
        
        if (!practice) continue; // Skip if practice not found
        
        // Only look for previous metrics if we're not in the first period
        if (previousPeriodNum > 0) {
          const previousMetrics = await storage.getPreviousMetricsByClinicName(
            importData.clinicName, 
            previousPeriodNum
          );

          // If no previous metrics exist, create opening balance from current StipendCapAvgFinal
          if (!previousMetrics && importData.stipendCapAvgFinal !== null) {
            const openingBalance = Number(importData.stipendCapAvgFinal);
            if (openingBalance > 0.01) {
              await storage.createLedgerEntry({
                practiceId: practice.id,
                payPeriod: currentPeriodNum,
                transactionType: 'opening_balance',
                amount: openingBalance.toString(),
                description: `Opening balance for PP${currentPeriodNum}: $${openingBalance.toFixed(2)}`,
              });
              openingBalanceCount++;
            }
          }
          // If previous metrics exist, calculate remeasurement
          else if (previousMetrics && importData.stipendCapAvgFinal !== null && previousMetrics.stipendCapAvgFinal !== null) {
            const previousCap = Number(previousMetrics.stipendCapAvgFinal);
            const newCap = Number(importData.stipendCapAvgFinal);
            const adjustment = newCap - previousCap;
            
            // Only create ledger entry if adjustment is significant (> $0.01)
            if (Math.abs(adjustment) > 0.01) {
              await storage.createLedgerEntry({
                practiceId: practice.id,
                payPeriod: currentPeriodNum,
                transactionType: adjustment > 0 ? 'remeasurement_increase' : 'remeasurement_decrease',
                amount: Math.abs(adjustment).toString(),
                description: `Remeasurement PP${currentPeriodNum}: ${adjustment > 0 ? '+' : ''}$${adjustment.toFixed(2)} (Prev PP${previousPeriodNum}: $${previousCap.toFixed(2)}, New: $${newCap.toFixed(2)})`,
              });
              remeasurementCount++;
            }
          }
        } else {
          // First period ever - create opening balance
          if (importData.stipendCapAvgFinal !== null) {
            const openingBalance = Number(importData.stipendCapAvgFinal);
            if (openingBalance > 0.01) {
              await storage.createLedgerEntry({
                practiceId: practice.id,
                payPeriod: currentPeriodNum,
                transactionType: 'opening_balance',
                amount: openingBalance.toString(),
                description: `Opening balance for PP${currentPeriodNum}: $${openingBalance.toFixed(2)}`,
              });
              openingBalanceCount++;
            }
          }
        }
      }

      const balanceMsg = openingBalanceCount > 0 ? `, ${openingBalanceCount} opening balances` : '';
      const warningMsg = skippedNullStipendCap > 0 ? ` ⚠️ WARNING: ${skippedNullStipendCap} practices skipped - StipendCapAvgFinal column is empty or missing in your CSV!` : '';
      
      res.json({ 
        message: `Successfully imported ${importedCount} practice metrics (${remeasurementCount} remeasurements${balanceMsg})${warningMsg}`,
        imported: importedCount,
        remeasurements: remeasurementCount,
        openingBalances: openingBalanceCount,
        skippedNullStipendCap,
      });
    } catch (error) {
      console.error("Error importing BigQuery data:", error);
      res.status(500).json({ message: "Failed to import data" });
    }
  });

  // ============================================================================
  // ALLOCATIONS ROUTES
  // ============================================================================

  app.get('/api/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const allocations = await storage.getInterPsmAllocations({ donorId: userId });
      res.json(allocations);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  app.post('/api/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { donorPsmId, recipientPsmId, totalAmount, donorPracticeIds, donorPractices } = req.body;

      // Verify donor PSM is the current user
      if (donorPsmId !== userId) {
        return res.status(403).json({ message: "Cannot allocate from another PSM's budget" });
      }

      // Coerce and validate numeric fields
      const numericTotalAmount = Number(totalAmount);
      if (!Number.isFinite(numericTotalAmount) || numericTotalAmount <= 0) {
        return res.status(400).json({ message: "Invalid total amount" });
      }

      // Validate total amount matches sum of donor practices
      const donorSum = donorPractices.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      if (Math.abs(donorSum - numericTotalAmount) > 0.01) {
        return res.status(400).json({ message: "Total amount does not match practice amounts" });
      }

      // Validate each practice belongs to donor PSM and has sufficient balance
      const user = await storage.getUser(userId);
      for (const donorPractice of donorPractices) {
        // Coerce amount to number
        const requestedAmount = Number(donorPractice.amount);
        if (!Number.isFinite(requestedAmount)) {
          return res.status(400).json({ message: `Invalid amount for practice ${donorPractice.practiceId}` });
        }
        
        const practice = await storage.getPracticeById(donorPractice.practiceId);
        
        if (!practice) {
          return res.status(404).json({ message: `Practice ${donorPractice.practiceId} not found` });
        }

        // Verify practice belongs to donor's portfolio (for PSM role, Admin can allocate from any portfolio)
        if (user?.role === "PSM" && practice.portfolioId !== user.portfolioId) {
          return res.status(403).json({ message: `Practice ${donorPractice.practiceId} does not belong to your portfolio` });
        }
        // Admin users can allocate from any practice, so no check needed

        // Check available balance (getPracticeBalance returns a number, not an object)
        const available = await storage.getPracticeBalance(donorPractice.practiceId);
        
        if (requestedAmount <= 0) {
          return res.status(400).json({ message: `Amount must be greater than 0 for practice ${practice.name}` });
        }
        
        if (requestedAmount > available) {
          return res.status(400).json({ 
            message: `Insufficient balance for practice ${practice.name}. Available: $${available.toFixed(2)}, Requested: $${requestedAmount.toFixed(2)}` 
          });
        }
      }

      // Create allocation record
      const allocation = await storage.createInterPsmAllocation({
        donorPsmId,
        recipientPsmId,
        totalAmount: totalAmount.toString(),
        donorPracticeIds,
      });

      // Create ledger entries for each donor practice (debit)
      const currentPeriod = await storage.getCurrentPayPeriod();
      for (const donorPractice of donorPractices) {
        await storage.createLedgerEntry({
          practiceId: donorPractice.practiceId,
          payPeriod: currentPeriod?.id || 1,
          transactionType: "allocation_out",
          amount: (-Math.abs(donorPractice.amount)).toString(), // Negative for debit
          description: `Inter-PSM allocation #${allocation.id} to ${recipientPsmId}`,
          relatedRequestId: null,
          relatedAllocationId: allocation.id,
        });
      }

      // Send Slack notification
      await sendSlackNotification(
        `💸 Inter-PSM Allocation #${allocation.id}: $${totalAmount} transferred from ${donorPsmId} to ${recipientPsmId} (${donorPracticeIds.length} practices)`
      );

      // Update allocation status to completed
      await storage.updateAllocationStatus(allocation.id, "completed");

      res.json(allocation);
    } catch (error) {
      console.error("Error creating allocation:", error);
      res.status(500).json({ message: "Failed to create allocation" });
    }
  });

  // ============================================================================
  // SETTINGS ROUTES (Finance only)
  // ============================================================================

  // Portfolios CRUD
  app.get('/api/settings/portfolios', isAuthenticated, isFinance, async (req, res) => {
    try {
      const portfolios = await storage.getPortfolios();
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching portfolios:", error);
      res.status(500).json({ message: "Failed to fetch portfolios" });
    }
  });

  app.post('/api/settings/portfolios', isAuthenticated, isFinance, async (req, res) => {
    try {
      const result = insertPortfolioSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }
      
      const portfolio = await storage.createPortfolio(result.data);
      res.json(portfolio);
    } catch (error: any) {
      console.error("Error creating portfolio:", error);
      res.status(500).json({ message: error.message || "Failed to create portfolio" });
    }
  });

  app.patch('/api/settings/portfolios/:id', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { id } = req.params;
      const result = updatePortfolioSchema.safeParse({ ...req.body, id });
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }
      
      const { id: _, ...updateData } = result.data;
      const portfolio = await storage.updatePortfolio(id, updateData);
      res.json(portfolio);
    } catch (error: any) {
      console.error("Error updating portfolio:", error);
      res.status(500).json({ message: error.message || "Failed to update portfolio" });
    }
  });

  app.delete('/api/settings/portfolios/:id', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.deletePortfolio(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting portfolio:", error);
      res.status(500).json({ message: error.message || "Failed to delete portfolio" });
    }
  });

  // Practices CRUD
  app.get('/api/settings/practices', isAuthenticated, isFinance, async (req, res) => {
    try {
      const practices = await storage.getPractices();
      res.json(practices);
    } catch (error) {
      console.error("Error fetching practices:", error);
      res.status(500).json({ message: "Failed to fetch practices" });
    }
  });

  app.post('/api/settings/practices', isAuthenticated, isFinance, async (req, res) => {
    try {
      const result = insertPracticeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }
      
      const practice = await storage.createPractice(result.data);
      res.json(practice);
    } catch (error: any) {
      console.error("Error creating practice:", error);
      res.status(500).json({ message: error.message || "Failed to create practice" });
    }
  });

  app.patch('/api/settings/practices/:id', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { id } = req.params;
      const result = updatePracticeSchema.safeParse({ ...req.body, id });
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }
      
      const { id: _, ...updateData } = result.data;
      const practice = await storage.updatePractice(id, updateData);
      res.json(practice);
    } catch (error: any) {
      console.error("Error updating practice:", error);
      res.status(500).json({ message: error.message || "Failed to update practice" });
    }
  });

  app.delete('/api/settings/practices/:id', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.deletePractice(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting practice:", error);
      res.status(500).json({ message: error.message || "Failed to delete practice" });
    }
  });

  // Users CRUD
  app.get('/api/settings/users', isAuthenticated, isFinance, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/settings/users', isAuthenticated, isFinance, async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }
      
      const user = await storage.createUser(result.data);
      res.json(user);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: error.message || "Failed to create user" });
    }
  });

  app.patch('/api/settings/users/:id', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { id } = req.params;
      const result = updateUserSchema.safeParse({ ...req.body, id });
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }
      
      const { id: _, ...updateData } = result.data;
      const user = await storage.updateUser(id, updateData);
      res.json(user);
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: error.message || "Failed to update user" });
    }
  });

  app.delete('/api/settings/users/:id', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.deleteUser(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: error.message || "Failed to delete user" });
    }
  });

  // CSV Template Download
  app.get('/api/templates/metrics', isAuthenticated, isFinance, async (req, res) => {
    try {
      // Generate CSV template with headers
      const headers = [
        'ClinicName',
        'DisplayName',
        'Group',
        'PayPeriod',
        'StipendCap',
        'NegativeEarningsCap',
        'NegativeEarningsUtilized'
      ];
      
      const csv = headers.join(',') + '\n';
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="bigquery_metrics_template.csv"');
      res.send(csv);
    } catch (error) {
      console.error("Error generating CSV template:", error);
      res.status(500).json({ message: "Failed to generate CSV template" });
    }
  });

  // Current Pay Period endpoint
  app.get('/api/pay-periods/current', isAuthenticated, async (req, res) => {
    try {
      const current = await storage.getCurrentPayPeriod();
      res.json(current || { id: 1 });
    } catch (error) {
      console.error("Error fetching current pay period:", error);
      res.status(500).json({ message: "Failed to fetch current pay period" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertStipendRequestSchema,
  InsertStipendRequest,
  insertPortfolioSchema,
  updatePortfolioSchema,
  insertPracticeSchema,
  updatePracticeSchema,
  insertUserSchema,
  updateUserSchema
} from "@shared/schema";
import axios from "axios";

// Slack notification helper
async function sendSlackNotification(message: string, notificationType: string = 'general', storage?: any) {
  let webhookUrl: string | null = null;
  let hasAnyDatabaseSettings = false;
  
  // Try to get webhook from database first
  if (storage) {
    try {
      const settings = await storage.getSlackSettings();
      hasAnyDatabaseSettings = settings && settings.length > 0;
      
      if (hasAnyDatabaseSettings) {
        // If database settings exist, ONLY use database webhooks (no fallback to env)
        const activeSetting = settings.find((s: any) => 
          s.notificationType === notificationType && s.isActive
        );
        
        if (activeSetting) {
          webhookUrl = activeSetting.webhookUrl;
          console.log(`Using database webhook for ${notificationType}`);
        } else {
          console.log(`No active webhook found in database for ${notificationType} - notification skipped`);
          return; // Don't send if disabled in database settings
        }
      }
    } catch (error) {
      console.error("Error fetching Slack settings from database:", error);
    }
  }
  
  // Fall back to environment variable ONLY if no database settings exist at all
  if (!webhookUrl && !hasAnyDatabaseSettings) {
    webhookUrl = process.env.SLACK_WEBHOOK_URL || null;
    if (webhookUrl) {
      console.log(`Using environment variable webhook for ${notificationType} (no database settings found)`);
    }
  }
  
  if (!webhookUrl) {
    console.log(`Slack webhook not configured for ${notificationType}`);
    return;
  }

  try {
    await axios.post(webhookUrl, {
      text: message,
    });
    console.log(`✓ Slack notification sent for ${notificationType}`);
  } catch (error) {
    console.error(`Failed to send Slack notification for ${notificationType}:`, error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Helper function to get user by email (preferred) or ID fallback
  async function getUserFromClaims(claims: any): Promise<User | undefined> {
    const userEmail = claims?.email;
    const userId = claims?.sub;
    
    // Try to find user by email first (handles existing users with different IDs)
    if (userEmail) {
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.email === userEmail);
      if (user) return user;
    }
    
    // Fall back to userId
    if (userId) {
      return await storage.getUser(userId);
    }
    
    return undefined;
  }

  // Role-based middleware
  const isFinance = async (req: any, res: any, next: any) => {
    try {
      if (!req.user?.claims) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await getUserFromClaims(req.user.claims);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Admin has all Finance permissions
      if (user.role !== "Finance" && user.role !== "Admin") {
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
      const user = await getUserFromClaims(req.user.claims);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/update-role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getUserFromClaims(req.user.claims);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { role, portfolioId } = req.body;
      const user = await storage.updateUserRole(currentUser.id, role, portfolioId);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/auth/switch-role', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getUserFromClaims(req.user.claims);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { role } = req.body;
      
      // Validate role
      const validRoles = ["Admin", "Finance", "Lead PSM", "PSM"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Check if user has this role assigned
      const userRoles = currentUser.roles || [currentUser.role];
      if (!userRoles.includes(role)) {
        return res.status(403).json({ message: "You are not authorized to switch to this role" });
      }
      
      const user = await storage.updateUserRole(currentUser.id, role, undefined);
      res.json(user);
    } catch (error) {
      console.error("Error switching role:", error);
      res.status(500).json({ message: "Failed to switch role" });
    }
  });

  app.patch('/api/auth/switch-portfolio', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await getUserFromClaims(req.user.claims);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { portfolioId } = req.body;
      
      // Validate portfolio
      const validPortfolios = ["G1", "G2", "G3", "G4", "G5"];
      if (!validPortfolios.includes(portfolioId)) {
        return res.status(400).json({ message: "Invalid portfolio" });
      }
      
      // Update portfolio (keep current role)
      const updatedUser = await storage.updateUserRole(currentUser.id, currentUser.role || "PSM", portfolioId);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error switching portfolio:", error);
      res.status(500).json({ message: "Failed to switch portfolio" });
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
      const user = await getUserFromClaims(req.user.claims);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const summary = await storage.getDashboardSummary(
        user.id,
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

  // Lightweight endpoint for dropdowns - returns only basic portfolio info
  app.get('/api/portfolios/list', isAuthenticated, async (req, res) => {
    try {
      const portfolios = await storage.getPortfolios();
      res.json(portfolios);
    } catch (error) {
      console.error("Error fetching portfolio list:", error);
      res.status(500).json({ message: "Failed to fetch portfolio list" });
    }
  });

  // Full endpoint with summaries for dashboard/analytics
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
      const currentYear = currentPeriod?.year || 2025;
      const enrichedPractices = await Promise.all(
        practices.map(async (practice) => {
          const [balance, stipendPaid, stipendCommitted, metrics, unapprovedStipend, allocatedIn, allocatedOut] = await Promise.all([
            storage.getPracticeBalance(practice.id),
            storage.getStipendPaid(practice.id, currentYear),
            storage.getStipendCommitted(practice.id, currentYear),
            currentPeriod ? storage.getCurrentMetrics(practice.id, currentPeriod.payPeriodNumber, currentPeriod.year) : Promise.resolve(undefined),
            storage.getUnapprovedStipend(practice.id),
            storage.getAllocatedIn(practice.id),
            storage.getAllocatedOut(practice.id),
          ]);
          
          const stipendCap = metrics?.stipendCapAvgFinal ? parseFloat(metrics.stipendCapAvgFinal) : 0;
          const remainingPeriods = currentPeriod ? Math.max(26 - currentPeriod.payPeriodNumber, 1) : 1;
          
          // Year-scoped available balance: Cap - Paid (current year) - Committed (current year)
          const availableBalanceTillPP26 = stipendCap - stipendPaid - stipendCommitted;
          const availablePerPP = availableBalanceTillPP26 / remainingPeriods;
          
          // Utilization scoped to current year PP1-PP26
          const utilizationPercent = stipendCap > 0 ? ((stipendPaid + stipendCommitted) / stipendCap) * 100 : 0;
          
          return {
            ...practice,
            stipendCap,
            currentBalance: balance, // Total balance for donor validation (allocation logic)
            availableBalance: availableBalanceTillPP26, // Year-scoped for display
            stipendPaid,
            stipendCommitted,
            availablePerPP,
            unapprovedStipend,
            utilizationPercent,
            allocatedIn,
            allocatedOut,
          };
        })
      );
      
      // Sort by portfolio (G1, G2, G3, G4, G5) then by practice ID
      enrichedPractices.sort((a, b) => {
        // First sort by portfolio
        if (a.portfolioId !== b.portfolioId) {
          return a.portfolioId.localeCompare(b.portfolioId);
        }
        // Then sort by practice ID within same portfolio
        return a.id.localeCompare(b.id);
      });
      
      res.json(enrichedPractices);
    } catch (error) {
      console.error("Error fetching practices:", error);
      res.status(500).json({ message: "Failed to fetch practices" });
    }
  });

  // Specific routes MUST come before parameterized routes
  app.get('/api/practices/all', isAuthenticated, async (req, res) => {
    try {
      const practices = await storage.getPractices({});
      res.json(practices);
    } catch (error) {
      console.error("Error fetching all practices:", error);
      res.status(500).json({ message: "Failed to fetch practices" });
    }
  });

  app.get('/api/practices/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Added logs for error tracing ------------------------------------------------------------------------------------------------------------------------
      console.log(JSON.stringify({
        severity: "INFO",
        message: "1: My Practices GET ==>",
        data: {isAuthenticated:isAuthenticated, userId:userId, user:user, isUser:!user, userRole:user?.role}
      }));
      
      if (!user) {
        return res.json([]);
      }

      // Finance and Admin can see all practices, Lead PSM and PSM see only their portfolio
      let practices;
      if (user.role === 'Finance' || user.role === 'Admin') {
        practices = await storage.getPractices({});
        
        // Added logs for error tracing ------------------------------------------------------------------------------------------------------------------------
          console.log(JSON.stringify({
            severity: "INFO",
            message: "2: My Practices GET ==>",
            data: {practices:practices}
          }));
        
      } else if (user.portfolioId) {
        practices = await storage.getPractices({
          portfolio: user.portfolioId,
        });
        // Added logs for error tracing ------------------------------------------------------------------------------------------------------------------------
          console.log(JSON.stringify({
            severity: "INFO",
            message: "3: My Practices GET ==>",
            data: {practices:practices}
          }));
      } else {
        console.log("4: My Practices GET ==> Else Case")
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

  app.get('/api/practices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const practice = await storage.getPracticeById(req.params.id);
      
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }

      // Check if PSM user has access to this practice (portfolio-based access control)
      // Only PSM users are restricted to their portfolio; Lead PSM, Finance, and Admin can view all
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user && user.role === 'PSM') {
        if (user.portfolioId !== practice.portfolioId) {
          return res.status(403).json({ message: "Access denied: You can only view practices in your portfolio" });
        }
      }

      res.json(practice);
    } catch (error) {
      console.error("Error fetching practice:", error);
      res.status(500).json({ message: "Failed to fetch practice" });
    }
  });

  app.get('/api/practices/:id/balance', isAuthenticated, async (req: any, res) => {
    try {
      // Check if PSM user has access to this practice
      // Only PSM users are restricted to their portfolio; Lead PSM, Finance, and Admin can view all
      const practice = await storage.getPracticeById(req.params.id);
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user && user.role === 'PSM') {
        if (user.portfolioId !== practice.portfolioId) {
          return res.status(403).json({ message: "Access denied: You can only view practices in your portfolio" });
        }
      }
      
      const currentPeriod = await storage.getCurrentPayPeriod();
      const currentYear = currentPeriod?.year || 2025;
      const [balance, stipendPaid, stipendCommitted, metrics, allocatedIn, allocatedOut] = await Promise.all([
        storage.getPracticeBalance(req.params.id),
        storage.getStipendPaid(req.params.id, currentYear),
        storage.getStipendCommitted(req.params.id, currentYear),
        currentPeriod ? storage.getCurrentMetrics(req.params.id, currentPeriod.payPeriodNumber, currentPeriod.year) : Promise.resolve(undefined),
        storage.getAllocatedIn(req.params.id),
        storage.getAllocatedOut(req.params.id),
      ]);
      
      const stipendCap = Number(metrics?.stipendCapAvgFinal ?? 0);
      // Utilization = (Paid + Committed) / Cap (scoped to current year PP1-PP26)
      const utilizationPercent = stipendCap > 0 ? ((stipendPaid + stipendCommitted) / stipendCap) * 100 : 0;
      
      // Year-scoped available balance for display
      const availableBalanceTillPP26 = stipendCap - stipendPaid - stipendCommitted;
      const remainingPeriods = currentPeriod ? Math.max(26 - currentPeriod.payPeriodNumber, 1) : 1;
      const availablePerPP = availableBalanceTillPP26 / remainingPeriods;
      
      res.json({
        practiceId: req.params.id,
        currentBalance: balance, // Total balance for allocation donor validation
        stipendCap,
        stipendPaid,
        stipendCommitted,
        utilizationPercent,
        allocatedIn,
        allocatedOut,
        availablePerPP,
        available: availableBalanceTillPP26, // Year-scoped for display
      });
    } catch (error) {
      console.error("Error fetching practice balance:", error);
      res.status(500).json({ message: "Failed to fetch practice balance" });
    }
  });

  app.get('/api/practices/:id/ledger', isAuthenticated, async (req: any, res) => {
    try {
      // Check if PSM user has access to this practice
      // Only PSM users are restricted to their portfolio; Lead PSM, Finance, and Admin can view all
      const practice = await storage.getPracticeById(req.params.id);
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user && user.role === 'PSM') {
        if (user.portfolioId !== practice.portfolioId) {
          return res.status(403).json({ message: "Access denied: You can only view practices in your portfolio" });
        }
      }
      
      const ledger = await storage.getPracticeLedger(req.params.id);
      
      // Reverse first to get oldest to newest order for correct running balance calculation
      const reversedLedger = [...ledger].reverse();
      
      // Calculate running balance from oldest to newest
      let runningBalance = 0;
      const ledgerWithBalance = reversedLedger.map(entry => {
        runningBalance += parseFloat(entry.amount);
        return {
          ...entry,
          runningBalance,
        };
      });
      
      res.json(ledgerWithBalance);
    } catch (error) {
      console.error("Error fetching practice ledger:", error);
      res.status(500).json({ message: "Failed to fetch practice ledger" });
    }
  });

  app.get('/api/practices/:id/pending-requests', isAuthenticated, async (req: any, res) => {
    try {
      // Check if PSM user has access to this practice
      // Only PSM users are restricted to their portfolio; Lead PSM, Finance, and Admin can view all
      const practice = await storage.getPracticeById(req.params.id);
      if (!practice) {
        return res.status(404).json({ message: "Practice not found" });
      }
      
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user && user.role === 'PSM') {
        if (user.portfolioId !== practice.portfolioId) {
          return res.status(403).json({ message: "Access denied: You can only view practices in your portfolio" });
        }
      }
      
      const pendingRequests = await storage.getPendingStipendRequestsForPractice(req.params.id);
      res.json(pendingRequests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
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

      // Use validated data (type assertion needed due to Zod refine chain)
      const validatedData = validationResult.data as any;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const request = await storage.createStipendRequest(validatedData);
      
      // Get practice details for portfolio information
      const practice = await storage.getPracticeById(validatedData.practiceId);
      const portfolioName = practice?.portfolioId || 'Unknown';

      // Construct URL to the stipend request
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL 
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const requestUrl = `${baseUrl}/stipend-requests/${request.id}`;

      // Build pay period info
      let payPeriodInfo = '';
      if (validatedData.requestType === 'one-time') {
        payPeriodInfo = `*Pay Period:* PP${validatedData.effectivePayPeriod || 'Current'}\n`;
      } else if (validatedData.requestType === 'recurring') {
        const endPeriod = validatedData.recurringEndPeriod || 26;
        payPeriodInfo = `*Effective Pay Period:* PP${validatedData.effectivePayPeriod || 'Current'}\n` +
                       `*Recurring Until:* PP${endPeriod}\n`;
      }

      // Send Slack notification with enhanced details
      await sendSlackNotification(
        `🆕 *New Stipend Request Submitted*\n` +
        `*Request ID:* #${request.id}\n` +
        `*Submitted by:* ${user.firstName} ${user.lastName}\n` +
        `*Group:* ${portfolioName}\n` +
        `*Clinic ID:* ${validatedData.practiceId}\n` +
        `*Amount:* $${parseFloat(validatedData.amount).toFixed(2)}\n` +
        `*Description:* ${validatedData.stipendDescription}\n` +
        payPeriodInfo +
        `*View Request:* ${requestUrl}`,
        'request_submitted',
        storage
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (requestorId) {
        // Filter by requestor
        let requests = await storage.getStipendRequests({ requestorId: requestorId as string });
        
        // For PSM only, additionally filter by portfolio
        // Lead PSM and Finance users can see all their requests across portfolios
        if (user.role === 'PSM' && user.portfolioId) {
          // Get all practices in the user's portfolio
          const practices = await storage.getPractices({ portfolio: user.portfolioId });
          const practiceIds = new Set(practices.map(p => p.id));
          
          // Filter requests to only include those for practices in the user's portfolio
          requests = requests.filter(req => practiceIds.has(req.practiceId));
        }
        
        return res.json(requests);
      }

      // Return all requests if no filter (Finance/Admin only)
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

      // Role-based pending logic:
      // - PSM: See pending_finance (requests awaiting Finance approval, even though Lead PSM approved)
      // - Lead PSM: See pending_lead_psm (requests awaiting their approval)
      // - Finance: See pending_finance (requests awaiting their approval)
      // - Admin: See pending_lead_psm (same as Lead PSM)
      let status: string | undefined;
      if (user.role === "PSM") status = "pending_finance";
      else if (user.role === "Lead PSM") status = "pending_lead_psm";
      else if (user.role === "Finance") status = "pending_finance";
      else if (user.role === "Admin") status = "pending_lead_psm";
      
      if (!status) {
        return res.json([]);
      }

      const requests = await storage.getStipendRequests({ status });
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.get('/api/stipend-requests/approved', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Role-based approved logic:
      // - PSM: See only fully approved (approved) requests
      // - Lead PSM: See both pending_finance AND approved (they've done their part)
      // - Finance: See only fully approved (approved) requests
      // - Admin: See only fully approved (approved) requests
      let requests;
      if (user.role === "Lead PSM") {
        // Lead PSM sees both pending_finance and approved in the "Approved" tab
        const [pendingFinance, approved] = await Promise.all([
          storage.getStipendRequests({ status: "pending_finance" }),
          storage.getStipendRequests({ status: "approved" }),
        ]);
        requests = [...pendingFinance, ...approved];
      } else {
        // All other roles see only fully approved requests
        requests = await storage.getStipendRequests({ status: "approved" });
      }
      
      res.json(requests);
    } catch (error) {
      console.error("Error fetching approved requests:", error);
      res.status(500).json({ message: "Failed to fetch approved requests" });
    }
  });

  app.get('/api/stipend-requests/all-approved', isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getStipendRequests({ status: "approved" });
      
      // Filter out requests for inactive practices
      const activePractices = await storage.getActivePractices();
      const activePracticeIds = new Set(activePractices.map(p => p.id));
      const activeRequests = requests.filter(request => activePracticeIds.has(request.practiceId));
      
      // Enrich each request with payment status information
      const enrichedRequests = await Promise.all(
        activeRequests.map(async (request) => {
          const breakdown = await storage.getPayPeriodBreakdown(request.id);
          const allPaid = breakdown.length > 0 && breakdown.every(period => period.status === 'paid');
          return {
            ...request,
            isFullyPaid: allPaid,
            paymentBreakdown: breakdown, // Include full breakdown for period-specific status
          };
        })
      );
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching all approved requests:", error);
      res.status(500).json({ message: "Failed to fetch all approved requests" });
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

  app.get('/api/stipend-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getStipendRequestById(requestId);
      
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Check if PSM user has access to this request (portfolio-based access control)
      // Only PSM users are restricted to their portfolio; Lead PSM, Finance, and Admin can view all
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user && user.role === 'PSM') {
        // Get the practice to check its portfolio
        const practice = await storage.getPracticeById(request.practiceId);
        if (practice && user.portfolioId !== practice.portfolioId) {
          return res.status(403).json({ message: "Access denied: You can only view requests for practices in your portfolio" });
        }
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error fetching request details:", error);
      res.status(500).json({ message: "Failed to fetch request details" });
    }
  });

  app.post('/api/stipend-requests/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { comment } = req.body; // Get optional comment from request body
      
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
        
        // Get current pay period
        const currentPeriod = await storage.getCurrentPayPeriod();
        const currentPeriodNumber = currentPeriod?.id || 1;
        
        // Create ledger entries for approved request
        // Amount should be negative for committed as it reduces available balance
        // All entries start as "committed" - Finance will manually mark them as "paid"
        const amount = `-${request.amount}`; // Make negative to reduce balance
        
        if (request.requestType === "one_time") {
          // One-time request: Create single "committed" entry for the effective pay period
          const effectivePeriod = request.effectivePayPeriod || currentPeriodNumber;
          const effectiveYear = request.effectiveYear || currentPeriod?.year || 2025;
          await storage.createLedgerEntry({
            practiceId: request.practiceId,
            payPeriod: effectivePeriod,
            year: effectiveYear,
            transactionType: "committed",
            amount,
            description: `Stipend request #${requestId} approved`,
            relatedRequestId: requestId,
            relatedAllocationId: null,
          });
        } else if (request.requestType === "recurring") {
          // Recurring request: Create "committed" entries for all periods from effective to end
          const effectivePeriod = request.effectivePayPeriod || currentPeriodNumber;
          const effectiveYear = request.effectiveYear || currentPeriod?.year || 2025;
          const endPeriod = request.recurringEndPeriod || 26;
          const endYear = request.recurringEndYear || effectiveYear;
          
          // Create ledger entries for all pay periods in the range
          let currentYear = effectiveYear;
          let period = effectivePeriod;
          
          while (true) {
            // Check if we've reached the end
            if (currentYear > endYear) break;
            if (currentYear === endYear && period > endPeriod) break;
            
            // All periods start as "committed" - Finance marks as "paid" when processed
            await storage.createLedgerEntry({
              practiceId: request.practiceId,
              payPeriod: period,
              year: currentYear,
              transactionType: "committed",
              amount,
              description: `Recurring stipend request #${requestId} (PP${period}'${currentYear})`,
              relatedRequestId: requestId,
              relatedAllocationId: null,
            });
            
            // Move to next period
            period++;
            if (period > 26) {
              // Move to next year
              period = 1;
              currentYear++;
            }
          }
        }
      } else {
        return res.status(403).json({ message: "Cannot approve this request" });
      }

      const updated = await storage.updateStipendRequestStatus(requestId, newStatus, userId, comment);
      
      // Get requestor details
      const requestor = await storage.getUser(request.requestorId);
      
      // Get practice details for portfolio information
      const practice = await storage.getPracticeById(request.practiceId);
      const portfolioName = practice?.portfolioId || 'Unknown';

      // Construct URL to the stipend request
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL 
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const requestUrl = `${baseUrl}/stipend-requests/${requestId}`;

      // Build pay period info
      let payPeriodInfo = '';
      if (request.requestType === 'one_time') {
        payPeriodInfo = `*Pay Period:* PP${request.effectivePayPeriod}\n`;
      } else if (request.requestType === 'recurring') {
        payPeriodInfo = `*Effective Pay Period:* PP${request.effectivePayPeriod}\n` +
                       `*Recurring Until:* PP${request.recurringEndPeriod || 26}\n`;
      }

      // Send Slack notification with enhanced details
      await sendSlackNotification(
        `✅ *Stipend Request Approved*\n` +
        `*Request ID:* #${requestId}\n` +
        `*Submitted by:* ${requestor?.firstName} ${requestor?.lastName}\n` +
        `*Group:* ${portfolioName}\n` +
        `*Clinic ID:* ${request.practiceId}\n` +
        `*Amount:* $${parseFloat(request.amount).toFixed(2)}\n` +
        `*Description:* ${request.stipendDescription}\n` +
        payPeriodInfo +
        `*Approved by:* ${user.firstName} ${user.lastName} (${user.role})\n` +
        `*New Status:* ${newStatus}\n` +
        `*View Request:* ${requestUrl}`,
        'request_approved',
        storage
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
      const user = await storage.getUser(userId);
      const { reason } = req.body;

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get request details for Slack notification
      const request = await storage.getStipendRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      const updated = await storage.updateStipendRequestStatus(requestId, "rejected", userId, reason);
      
      // Get requestor details
      const requestor = await storage.getUser(request.requestorId);
      
      // Get practice details for portfolio information
      const practice = await storage.getPracticeById(request.practiceId);
      const portfolioName = practice?.portfolioId || 'Unknown';

      // Construct URL to the stipend request
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL 
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const requestUrl = `${baseUrl}/stipend-requests/${requestId}`;

      // Build pay period info
      let payPeriodInfo = '';
      if (request.requestType === 'one_time') {
        payPeriodInfo = `*Pay Period:* PP${request.effectivePayPeriod}\n`;
      } else if (request.requestType === 'recurring') {
        payPeriodInfo = `*Effective Pay Period:* PP${request.effectivePayPeriod}\n` +
                       `*Recurring Until:* PP${request.recurringEndPeriod || 26}\n`;
      }

      // Send Slack notification with enhanced details
      await sendSlackNotification(
        `❌ *Stipend Request Rejected*\n` +
        `*Request ID:* #${requestId}\n` +
        `*Submitted by:* ${requestor?.firstName} ${requestor?.lastName}\n` +
        `*Group:* ${portfolioName}\n` +
        `*Clinic ID:* ${request.practiceId}\n` +
        `*Amount:* $${parseFloat(request.amount).toFixed(2)}\n` +
        `*Description:* ${request.stipendDescription}\n` +
        payPeriodInfo +
        `*Rejected by:* ${user.firstName} ${user.lastName} (${user.role})\n` +
        `*Reason:* ${reason || "No reason provided"}\n` +
        `*View Request:* ${requestUrl}`,
        'request_rejected',
        storage
      );
      
      res.json(updated);
    } catch (error) {
      console.error("Error rejecting request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  app.get('/api/stipend-requests/:id/pay-period-breakdown', isAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const breakdown = await storage.getPayPeriodBreakdown(requestId);
      res.json(breakdown);
    } catch (error) {
      console.error("Error fetching pay period breakdown:", error);
      res.status(500).json({ message: "Failed to fetch pay period breakdown" });
    }
  });

  app.post('/api/stipend-requests/:id/cancel-period', isAuthenticated, isFinance, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { payPeriod, year } = req.body;
      
      if (!payPeriod || typeof payPeriod !== 'number') {
        return res.status(400).json({ message: "Valid pay period is required" });
      }
      
      if (!year || typeof year !== 'number') {
        return res.status(400).json({ message: "Valid year is required" });
      }

      await storage.cancelCommittedPeriod(requestId, payPeriod, year);

      // Get request details for Slack notification
      const request = await storage.getStipendRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Get practice details for portfolio information
      const practice = await storage.getPracticeById(request.practiceId);
      const portfolioName = practice?.portfolioId || 'Unknown';
      const practiceName = practice?.clinicName || request.practiceId;

      // Construct URL to the stipend request
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL 
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const requestUrl = `${baseUrl}/requests/${requestId}`;

      // Send Slack notification with enhanced details
      await sendSlackNotification(
        `🚫 *Stipend Period Cancelled*\n` +
        `*Request ID:* #${requestId}\n` +
        `*Practice:* ${practiceName}\n` +
        `*Portfolio:* ${portfolioName}\n` +
        `*Pay Period:* PP${payPeriod}'${year}\n` +
        `*Description:* ${request.stipendDescription}\n` +
        `*Cancelled by:* ${user.firstName} ${user.lastName} (${user.role})\n` +
        `*View Request:* ${requestUrl}`,
        'general',
        storage
      );

      res.json({ success: true, message: `Cancelled committed period PP${payPeriod}` });
    } catch (error) {
      console.error("Error cancelling committed period:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to cancel committed period" });
    }
  });

  app.post('/api/stipend-requests/:id/update-period-amount', isAuthenticated, isFinance, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { payPeriod, year, newAmount } = req.body;
      
      if (!payPeriod || typeof payPeriod !== 'number') {
        return res.status(400).json({ message: "Valid pay period is required" });
      }
      
      if (!year || typeof year !== 'number') {
        return res.status(400).json({ message: "Valid year is required" });
      }
      
      if (!newAmount || typeof newAmount !== 'number' || newAmount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      await storage.updateCommittedPeriodAmount(requestId, payPeriod, year, newAmount);

      // Send Slack notification
      await sendSlackNotification(
        `Stipend amount for request #${requestId} updated to $${newAmount.toFixed(2)} for PP${payPeriod} by ${user.firstName} ${user.lastName}`,
        'general',
        storage
      );

      res.json({ success: true, message: `Updated period PP${payPeriod} amount to $${newAmount.toFixed(2)}` });
    } catch (error) {
      console.error("Error updating period amount:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update period amount" });
    }
  });

  app.post('/api/stipend-requests/:id/mark-period-paid', isAuthenticated, isFinance, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { payPeriod, year } = req.body;
      
      if (!payPeriod || typeof payPeriod !== 'number') {
        return res.status(400).json({ message: "Valid pay period is required" });
      }
      
      if (!year || typeof year !== 'number') {
        return res.status(400).json({ message: "Valid year is required" });
      }

      // Get request details for Slack notification
      const request = await storage.getStipendRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      await storage.markPeriodAsPaid(requestId, payPeriod, year);

      // Get requestor details
      const requestor = await storage.getUser(request.requestorId);
      
      // Get practice details for portfolio information
      const practice = await storage.getPracticeById(request.practiceId);
      const portfolioName = practice?.portfolioId || 'Unknown';

      // Construct URL to the stipend request
      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL 
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const requestUrl = `${baseUrl}/stipend-requests/${requestId}`;

      // Send Slack notification with enhanced details
      await sendSlackNotification(
        `✅ *Stipend Request #${requestId} Marked as Paid*\n` +
        `*Pay Period:* PP${payPeriod}\n` +
        `*Submitted by:* ${requestor?.firstName} ${requestor?.lastName}\n` +
        `*Group:* ${portfolioName}\n` +
        `*Clinic ID:* ${request.practiceId}\n` +
        `*Amount:* $${parseFloat(request.amount).toFixed(2)}\n` +
        `*Description:* ${request.stipendDescription}\n` +
        `*Marked by:* ${user.firstName} ${user.lastName}\n` +
        `*View Request:* ${requestUrl}`,
        'period_paid',
        storage
      );

      res.json({ success: true, message: `Marked period PP${payPeriod} as paid` });
    } catch (error) {
      console.error("Error marking period as paid:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to mark period as paid" });
    }
  });

  app.delete('/api/stipend-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the stipend request
      const request = await storage.getStipendRequestById(requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      // Only the requestor can delete their own request
      if (request.requestorId !== userId) {
        return res.status(403).json({ message: "You can only delete your own requests" });
      }

      // Can only delete if status is pending_psm or pending_lead_psm
      const allowedStatuses = ['pending_psm', 'pending_lead_psm'];
      if (!allowedStatuses.includes(request.status)) {
        return res.status(403).json({ 
          message: "Can only delete requests that haven't been approved by Lead PSM yet" 
        });
      }

      const result = await storage.deleteStipendRequest(requestId);
      
      if (!result.success) {
        return res.status(500).json({ message: result.message || "Failed to delete request" });
      }

      // Send Slack notification
      await sendSlackNotification(
        `Stipend request #${requestId} deleted by ${user.firstName} ${user.lastName}`,
        'general',
        storage
      );

      res.json({ success: true, message: "Request deleted successfully" });
    } catch (error) {
      console.error("Error deleting stipend request:", error);
      res.status(500).json({ message: "Failed to delete request" });
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
      
      // Transform to combine firstName and lastName into requestorName
      const transformedRequests = requests.map(req => ({
        ...req,
        requestorName: req.requestorFirstName && req.requestorLastName
          ? `${req.requestorFirstName} ${req.requestorLastName}`.trim()
          : req.requestorId,
        requestorFirstName: undefined,
        requestorLastName: undefined,
      }));
      
      res.json(transformedRequests);
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
        `New Negative Earnings Cap request #${newRequest.id} for $${amount} (PP${currentPeriod.id}) pending Finance approval`,
        'general',
        storage
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
        `Negative Earnings Cap request #${requestId} approved by Finance for $${amount} (PP${updated.payPeriod})`,
        'general',
        storage
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
        `Negative Earnings Cap request #${requestId} (PP${updated.payPeriod}) rejected by Finance. ${notes ? 'Reason: ' + notes : ''}`,
        'general',
        storage
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

  app.post('/api/pay-periods/:id/set-current', isAuthenticated, isFinance, async (req, res) => {
    try {
      const periodId = parseInt(req.params.id);
      if (isNaN(periodId)) {
        return res.status(400).json({ message: "Invalid pay period ID" });
      }

      await storage.setCurrentPayPeriod(periodId);
      res.json({ message: "Current pay period updated successfully" });
    } catch (error) {
      console.error("Error setting current pay period:", error);
      res.status(500).json({ message: "Failed to set current pay period" });
    }
  });

  app.get('/api/pay-periods/:id/csv', isAuthenticated, isFinance, async (req, res) => {
    try {
      const periodId = parseInt(req.params.id);
      
      if (isNaN(periodId)) {
        return res.status(400).json({ message: "Invalid pay period ID" });
      }

      const periods = await storage.getPayPeriods();
      const period = periods.find(p => p.id === periodId);
      
      if (!period) {
        return res.status(404).json({ message: "Pay period not found" });
      }

      if (!period.csvData) {
        return res.status(404).json({ message: "No CSV data available for this pay period" });
      }

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="pay_period_${periodId}.csv"`);
      res.send(period.csvData);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      res.status(500).json({ message: "Failed to download CSV" });
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
        // Practice identification (only ClinicName required)
        'ClinicName': 'clinicName',
        'PayPeriod': 'payPeriod', // Simplified template format  
        'Year': 'year', // Year column (2025, 2026, etc.)
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

        // Extract year (required)
        const yearValue = getValue('Year');
        if (!yearValue || isNaN(parseInt(yearValue))) {
          errors.push(`Line ${i + 1}: Missing or invalid Year`);
          continue;
        }
        const year = parseInt(yearValue);
        if (year < 2025) {
          errors.push(`Line ${i + 1}: Year must be 2025 or later`);
          continue;
        }

        // Build import data object with ALL BigQuery columns
        const importData: any = {
          // Practice identification (only ClinicName required)
          clinicName,
          year, // Year column
          practiceDisplayNameGroup: getValue('Practice_DisplayName_Group'),
          isActivePractice: parseIntValue(getValue('IsActivePractice')),
          // Support both simplified template (PayPeriod) and full BigQuery format (CurrentPayPeriod_Number)
          // Use nullish coalescing so that 0 is treated as valid
          currentPayPeriodNumber: parseIntValue(getValue('PayPeriod')) ?? parseIntValue(getValue('CurrentPayPeriod_Number')) ?? currentPeriod.payPeriodNumber,
          
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
      const practicesNotInTable: string[] = [];
      
      // Get the current period number and year from the first import
      const currentPeriodNum = imports.length > 0 ? imports[0].currentPayPeriodNumber : currentPeriod.payPeriodNumber;
      const currentYear = imports.length > 0 ? imports[0].year : currentPeriod.year;
      const previousPeriodNum = currentPeriodNum - 1;
      // Previous year handling: if currentPeriodNum is 1, previous period is PP26 of previous year
      const previousYear = currentPeriodNum === 1 ? currentYear - 1 : currentYear;

      for (const importData of imports) {
        // Upsert metrics first
        await storage.upsertPracticeMetrics(importData);
        importedCount++;

        // Check if StipendCapAvgFinal is null - this is required for ledger entries
        if (importData.stipendCapAvgFinal === null) {
          skippedNullStipendCap++;
          continue;
        }

        // Find practice by clinic name to get practiceId for ledger entry
        const practice = await storage.getPracticeByClinicName(importData.clinicName);
        
        if (!practice) {
          practicesNotInTable.push(importData.clinicName);
          continue; // Skip if practice not found
        }
        
        // Only look for previous metrics if we're not in the first period
        if (previousPeriodNum > 0) {
          const previousMetrics = await storage.getPreviousMetricsByClinicName(
            importData.clinicName, 
            previousPeriodNum,
            previousYear
          );

          // If no previous metrics exist, create opening balance from current StipendCapAvgFinal
          if (!previousMetrics && importData.stipendCapAvgFinal !== null) {
            const openingBalance = Number(importData.stipendCapAvgFinal);
            if (openingBalance > 0.01) {
              // Delete existing opening balance entries for this practice/period/year (to prevent duplicates)
              await storage.deleteOpeningBalanceEntries(practice.id, currentPeriodNum, currentYear);
              
              await storage.createLedgerEntry({
                practiceId: practice.id,
                payPeriod: currentPeriodNum,
                year: currentYear,
                transactionType: 'opening_balance',
                amount: openingBalance.toString(),
                description: `Opening balance for PP${currentPeriodNum}'${currentYear}: $${openingBalance.toFixed(2)}`,
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
              // Delete existing remeasurement entries for this practice/period (prevents duplicates on re-upload)
              await storage.deleteRemeasurementEntries(practice.id, currentPeriodNum, currentYear);
              
              await storage.createLedgerEntry({
                practiceId: practice.id,
                payPeriod: currentPeriodNum,
                year: currentYear,
                transactionType: adjustment > 0 ? 'remeasurement_increase' : 'remeasurement_decrease',
                amount: adjustment.toString(), // Store actual value (positive for increase, negative for decrease)
                description: `Remeasurement PP${currentPeriodNum}'${currentYear}: ${adjustment > 0 ? '+' : ''}$${adjustment.toFixed(2)} (Prev PP${previousPeriodNum}'${previousYear}: $${previousCap.toFixed(2)}, New: $${newCap.toFixed(2)})`,
              });
              remeasurementCount++;
            }
          }
        } else {
          // First period ever (PP1) - create opening balance
          if (importData.stipendCapAvgFinal !== null) {
            const openingBalance = Number(importData.stipendCapAvgFinal);
            if (openingBalance > 0.01) {
              // Delete existing opening balance entries for this practice/period/year (to prevent duplicates)
              await storage.deleteOpeningBalanceEntries(practice.id, currentPeriodNum, currentYear);
              
              await storage.createLedgerEntry({
                practiceId: practice.id,
                payPeriod: currentPeriodNum,
                year: currentYear,
                transactionType: 'opening_balance',
                amount: openingBalance.toString(),
                description: `Opening balance for PP${currentPeriodNum}'${currentYear}: $${openingBalance.toFixed(2)}`,
              });
              openingBalanceCount++;
            }
          }
        }
      }

      // Check for practices that disappeared from CSV (existed in previous period but not in current)
      const disappearedPractices: string[] = [];
      if (previousPeriodNum > 0) {
        // Get all practices with metrics from previous period
        const allPreviousMetrics = await storage.getAllPracticeMetricsByPeriod(previousPeriodNum, previousYear);
        const currentCsvPractices = new Set(imports.map(imp => imp.clinicName));
        
        for (const prevMetric of allPreviousMetrics) {
          // Only flag if practice had a stipend cap in previous period
          if (prevMetric.stipendCapAvgFinal !== null && 
              Number(prevMetric.stipendCapAvgFinal) > 0.01 &&
              !currentCsvPractices.has(prevMetric.clinicName)) {
            disappearedPractices.push(prevMetric.clinicName);
          }
        }
      }

      // Save CSV data to the pay period specified in the CSV (not necessarily the current period)
      await storage.updatePayPeriodCsvData(currentPeriodNum, currentYear, csvData);

      const balanceMsg = openingBalanceCount > 0 ? `, ${openingBalanceCount} opening balances` : '';
      const warningMsg = skippedNullStipendCap > 0 ? ` ⚠️ WARNING: ${skippedNullStipendCap} practices skipped - StipendCapAvgFinal column is empty or missing in your CSV!` : '';
      
      res.json({ 
        message: `Successfully imported ${importedCount} practice metrics (${remeasurementCount} remeasurements${balanceMsg})${warningMsg}`,
        imported: importedCount,
        remeasurements: remeasurementCount,
        openingBalances: openingBalanceCount,
        skippedNullStipendCap,
        practicesNotInTable,
        disappearedPractices,
      });
    } catch (error) {
      console.error("Error importing BigQuery data:", error);
      res.status(500).json({ message: "Failed to import data" });
    }
  });

  // Opening Balance CSV Import
  app.post('/api/opening-balance/import', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData || typeof csvData !== 'string') {
        return res.status(400).json({ message: "CSV data is required" });
      }

      // Parse CSV - expecting columns: ClinicID, PayPeriodNumber, Year, OpeningBalanceStipendPaid
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['ClinicID', 'PayPeriodNumber', 'Year', 'OpeningBalanceStipendPaid'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          message: `Missing required columns: ${missingHeaders.join(', ')}. Expected columns: ClinicID, PayPeriodNumber, Year, OpeningBalanceStipendPaid` 
        });
      }

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
        
        const clinicId = values[headerIndex['ClinicID']];
        const payPeriodNumber = values[headerIndex['PayPeriodNumber']];
        const yearValue = values[headerIndex['Year']];
        const openingBalanceStipendPaid = values[headerIndex['OpeningBalanceStipendPaid']];

        // Validate required fields
        if (!clinicId) {
          errors.push(`Line ${i + 1}: Missing ClinicID`);
          continue;
        }

        if (!payPeriodNumber || isNaN(parseInt(payPeriodNumber))) {
          errors.push(`Line ${i + 1}: Invalid PayPeriodNumber`);
          continue;
        }

        const periodNum = parseInt(payPeriodNumber);
        if (periodNum < 1 || periodNum > 26) {
          errors.push(`Line ${i + 1}: PayPeriodNumber must be between 1 and 26`);
          continue;
        }

        if (!yearValue || isNaN(parseInt(yearValue))) {
          errors.push(`Line ${i + 1}: Missing or invalid Year`);
          continue;
        }

        const year = parseInt(yearValue);
        if (year < 2025) {
          errors.push(`Line ${i + 1}: Year must be 2025 or later`);
          continue;
        }

        if (!openingBalanceStipendPaid || isNaN(parseFloat(openingBalanceStipendPaid))) {
          errors.push(`Line ${i + 1}: Invalid OpeningBalanceStipendPaid`);
          continue;
        }

        const amount = parseFloat(openingBalanceStipendPaid);
        
        imports.push({
          clinicId,
          payPeriodNumber: periodNum,
          year,
          amount,
        });
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

      // Process imports and create ledger entries
      let createdCount = 0;
      let skippedCount = 0;
      const skippedReasons: string[] = [];

      for (const importData of imports) {
        // Find practice by clinic ID
        const practice = await storage.getPracticeById(importData.clinicId);
        
        if (!practice) {
          skippedCount++;
          skippedReasons.push(`Practice ${importData.clinicId} not found`);
          continue;
        }

        // Delete existing opening_balance_stipend_paid entries for this practice/period/year (to allow updates/zeroing)
        await storage.deleteOpeningBalanceStipendPaid(practice.id, importData.payPeriodNumber, importData.year);

        // Only create new entry if amount is non-zero
        if (importData.amount !== 0) {
          await storage.createLedgerEntry({
            practiceId: practice.id,
            payPeriod: importData.payPeriodNumber,
            year: importData.year,
            transactionType: 'opening_balance_stipend_paid',
            amount: (-Math.abs(importData.amount)).toString(), // Negative value
            description: `Opening Balance - Stipend Paid (PP${importData.payPeriodNumber}'${importData.year})`,
          });
        }
        
        createdCount++;
      }

      const warningMsg = skippedCount > 0 
        ? ` ⚠️ WARNING: ${skippedCount} entries skipped. Reasons: ${skippedReasons.slice(0, 5).join(', ')}` 
        : '';
      
      res.json({ 
        message: `Successfully imported ${createdCount} opening balance entries${warningMsg}`,
        created: createdCount,
        skipped: skippedCount,
      });
    } catch (error) {
      console.error("Error importing opening balance data:", error);
      res.status(500).json({ message: "Failed to import opening balance data" });
    }
  });

  // ============================================================================
  // ALLOCATIONS ROUTES
  // ============================================================================

  app.get('/api/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch both allocations where user is donor AND where user's portfolio is recipient
      const [donorAllocations, recipientAllocations] = await Promise.all([
        storage.getInterPsmAllocations({ donorId: userId }),
        user.portfolioId 
          ? storage.getInterPsmAllocations({ recipientPortfolioId: user.portfolioId })
          : Promise.resolve([])
      ]);

      // Combine and deduplicate (in case user is both donor and recipient)
      const allAllocations = [...donorAllocations];
      for (const recipientAlloc of recipientAllocations) {
        if (!allAllocations.find(a => a.id === recipientAlloc.id)) {
          allAllocations.push(recipientAlloc);
        }
      }

      // Sort by creation date (newest first)
      allAllocations.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json(allAllocations);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      res.status(500).json({ message: "Failed to fetch allocations" });
    }
  });

  app.get('/api/allocations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const allocationId = parseInt(req.params.id);
      
      if (isNaN(allocationId)) {
        return res.status(400).json({ message: "Invalid allocation ID" });
      }

      const allocation = await storage.getInterPsmAllocationById(allocationId);
      
      if (!allocation) {
        return res.status(404).json({ message: "Allocation not found" });
      }

      res.json(allocation);
    } catch (error) {
      console.error("Error fetching allocation details:", error);
      res.status(500).json({ message: "Failed to fetch allocation details" });
    }
  });


  app.post('/api/allocations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        donorPsmId, 
        totalAmount, 
        donorPracticeIds, 
        donorPractices,
        recipientPractices
      } = req.body;

      // Verify donor PSM is the current user
      if (donorPsmId !== userId) {
        return res.status(403).json({ message: "Cannot allocate from another PSM's budget" });
      }

      // Validate recipient practices
      if (!recipientPractices || recipientPractices.length === 0) {
        return res.status(400).json({ message: "Recipient practices are required" });
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

      // Get user and validate portfolio permissions
      const user = await storage.getUser(userId);
      const userPortfolioId = user?.portfolioId;

      // Validate recipient amounts match donor amounts
      const recipientSum = recipientPractices.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
      if (Math.abs(recipientSum - numericTotalAmount) > 0.01) {
        return res.status(400).json({ 
          message: `Total recipient amount ($${recipientSum.toFixed(2)}) must equal total donor amount ($${numericTotalAmount.toFixed(2)})` 
        });
      }

      // Validate each recipient practice exists
      for (const recipientPractice of recipientPractices) {
        const practice = await storage.getPracticeById(recipientPractice.practiceId);
        if (!practice) {
          return res.status(404).json({ message: `Recipient practice ${recipientPractice.practiceId} not found` });
        }

        // For PSM: recipient practices must be in same portfolio
        // For Lead PSM/Finance/Admin: can allocate to any practice
        if (user?.role === "PSM" && practice.portfolioId !== userPortfolioId) {
          return res.status(403).json({ 
            message: `As a PSM, you can only allocate to practices within your portfolio (${userPortfolioId})` 
          });
        }

        // Validate amount
        const amount = Number(recipientPractice.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ message: `Invalid amount for recipient practice ${practice.name}` });
        }
      }

      // Validate each practice belongs to donor PSM and has sufficient balance
      for (const donorPractice of donorPractices) {
        const requestedAmount = Number(donorPractice.amount);
        if (!Number.isFinite(requestedAmount)) {
          return res.status(400).json({ message: `Invalid amount for practice ${donorPractice.practiceId}` });
        }
        
        const practice = await storage.getPracticeById(donorPractice.practiceId);
        
        if (!practice) {
          return res.status(404).json({ message: `Practice ${donorPractice.practiceId} not found` });
        }

        // For PSM: Verify practice belongs to donor's portfolio
        // For Lead PSM/Finance/Admin: can allocate from any practice
        if (user?.role === "PSM" && practice.portfolioId !== userPortfolioId) {
          return res.status(403).json({ message: `Practice ${donorPractice.practiceId} does not belong to your portfolio` });
        }

        // Check available balance
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
      const recipientPracticeIds = recipientPractices.map((p: any) => p.practiceId);
      const allocationData: any = {
        donorPsmId,
        recipientPsmId: null, // DEPRECATED - no longer used
        recipientPracticeIds,
        totalAmount: totalAmount.toString(),
        donorPracticeIds,
      };
      const allocation = await storage.createInterPsmAllocation(allocationData);

      // Create ledger entries for donor practices (debit/allocation_out)
      const currentPeriod = await storage.getCurrentPayPeriod();
      const currentYear = currentPeriod?.year || 2025;
      for (const donorPractice of donorPractices) {
        await storage.createLedgerEntry({
          practiceId: donorPractice.practiceId,
          payPeriod: currentPeriod?.id || 1,
          year: currentYear,
          transactionType: "allocation_out",
          amount: (-Math.abs(donorPractice.amount)).toString(),
          description: `Allocation #${allocation.id} to ${recipientPracticeIds.length} recipient practice(s)`,
          relatedRequestId: null,
          relatedAllocationId: allocation.id,
        });
      }

      // Create allocation_in entries for recipient practices
      for (const recipientPractice of recipientPractices) {
        await storage.createLedgerEntry({
          practiceId: recipientPractice.practiceId,
          payPeriod: currentPeriod?.id || 1,
          year: currentYear,
          transactionType: "allocation_in",
          amount: Math.abs(recipientPractice.amount).toString(),
          description: `Allocation #${allocation.id} from ${donorPracticeIds.length} donor practice(s)`,
          relatedRequestId: null,
          relatedAllocationId: allocation.id,
        });
      }

      // Send Slack notification
      await sendSlackNotification(
        `💸 Practice Allocation #${allocation.id}: $${totalAmount} transferred (${donorPracticeIds.length} donor → ${recipientPracticeIds.length} recipient practices)`,
        'general',
        storage
      );
      
      // Mark allocations as completed immediately
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
      // Include inactive practices for Settings page management
      const practices = await storage.getPractices({ includeInactive: true });
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
      // Generate CSV template with headers (including Year for multi-year support)
      const headers = [
        'ClinicName',
        'PayPeriod',
        'Year',
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

  // ============================================================================
  // SLACK SETTINGS API ENDPOINTS
  // ============================================================================

  app.get('/api/settings/slack', isAuthenticated, isFinance, async (req, res) => {
    try {
      const settings = await storage.getSlackSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching Slack settings:", error);
      res.status(500).json({ message: "Failed to fetch Slack settings" });
    }
  });

  app.post('/api/settings/slack', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { insertSlackSettingSchema } = await import("@shared/schema");
      const result = insertSlackSettingSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const newSetting = await storage.createSlackSetting(result.data);
      res.status(201).json(newSetting);
    } catch (error) {
      console.error("Error creating Slack setting:", error);
      res.status(500).json({ message: "Failed to create Slack setting" });
    }
  });

  app.put('/api/settings/slack/:id', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { id } = req.params;
      const { updateSlackSettingSchema } = await import("@shared/schema");
      const result = updateSlackSettingSchema.safeParse({ id, ...req.body });
      if (!result.success) {
        return res.status(400).json({ message: "Validation error", errors: result.error.errors });
      }

      const updated = await storage.updateSlackSetting(id, result.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating Slack setting:", error);
      res.status(500).json({ message: "Failed to update Slack setting" });
    }
  });

  app.delete('/api/settings/slack/:id', isAuthenticated, isFinance, async (req, res) => {
    try {
      const { id} = req.params;
      const result = await storage.deleteSlackSetting(id);
      res.json(result);
    } catch (error) {
      console.error("Error deleting Slack setting:", error);
      res.status(500).json({ message: "Failed to delete Slack setting" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

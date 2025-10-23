import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertStipendRequestSchema } from "@shared/schema";
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
      
      res.json(practices);
    } catch (error) {
      console.error("Error fetching practices:", error);
      res.status(500).json({ message: "Failed to fetch practices" });
    }
  });

  app.get('/api/practices/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.portfolioId) {
        return res.json([]);
      }

      const practices = await storage.getPractices({
        portfolio: user.portfolioId,
      });
      
      res.json(practices);
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
      const balance = await storage.getPracticeBalance(req.params.id);
      
      res.json({
        practiceId: req.params.id,
        available: balance,
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

  // ============================================================================
  // ALLOCATIONS ROUTES (Placeholder for future implementation)
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

  const httpServer = createServer(app);
  return httpServer;
}

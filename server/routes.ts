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

  // Role-based middleware
  const isFinance = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== "Finance") {
        return res.status(403).json({ message: "Finance access required" });
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
      
      if (!user) {
        return res.json([]);
      }

      // Finance can see all practices, Lead PSM and PSM see only their portfolio
      let practices;
      if (user.role === 'Finance') {
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

      // Parse CSV (expect format: practice_id,gross_margin_percent,collections_percent)
      const lines = csvData.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['practice_id', 'gross_margin_percent', 'collections_percent'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          message: `Missing required headers: ${missingHeaders.join(', ')}` 
        });
      }

      const practiceIdIndex = headers.indexOf('practice_id');
      const gmIndex = headers.indexOf('gross_margin_percent');
      const collIndex = headers.indexOf('collections_percent');

      const imports: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split(',').map(v => v.trim());
        
        const practiceId = values[practiceIdIndex];
        const gmPercent = parseFloat(values[gmIndex]);
        const collPercent = parseFloat(values[collIndex]);

        // Validate data
        if (!practiceId) {
          errors.push(`Line ${i + 1}: Missing practice_id`);
          continue;
        }
        if (!Number.isFinite(gmPercent) || gmPercent < 0 || gmPercent > 100) {
          errors.push(`Line ${i + 1}: Invalid gross_margin_percent (${values[gmIndex]})`);
          continue;
        }
        if (!Number.isFinite(collPercent) || collPercent < 0 || collPercent > 100) {
          errors.push(`Line ${i + 1}: Invalid collections_percent (${values[collIndex]})`);
          continue;
        }

        // Check practice exists
        const practice = await storage.getPracticeById(practiceId);
        if (!practice) {
          errors.push(`Line ${i + 1}: Practice ${practiceId} not found`);
          continue;
        }

        // Calculate stipend cap: 0.6 * GM% + 0.4 * Collections%
        const stipendCap = (0.6 * gmPercent) + (0.4 * collPercent);

        imports.push({
          practiceId,
          grossMarginPercent: gmPercent,
          collectionsPercent: collPercent,
          stipendCap,
          payPeriod: currentPeriod.id,
        });
      }

      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "CSV validation errors", 
          errors: errors.slice(0, 10), // Limit error messages
        });
      }

      if (imports.length === 0) {
        return res.status(400).json({ message: "No valid data to import" });
      }

      // Process imports and create ledger entries for remeasurement
      let importedCount = 0;
      let remeasurementCount = 0;

      for (const importData of imports) {
        // Get previous metrics for this practice
        const previousMetrics = await storage.getCurrentMetrics(
          importData.practiceId, 
          currentPeriod.id - 1
        );

        // Upsert metrics
        await storage.upsertPracticeMetrics(importData);
        importedCount++;

        // Calculate remeasurement adjustment
        if (previousMetrics) {
          const previousCap = Number(previousMetrics.stipendCap);
          const newCap = importData.stipendCap;
          const adjustment = newCap - previousCap;

          // Create ledger entry for remeasurement (can be positive or negative)
          if (Math.abs(adjustment) > 0.01) {
            await storage.createPracticeLedger({
              practiceId: importData.practiceId,
              payPeriod: currentPeriod.id,
              transactionType: adjustment > 0 ? 'remeasurement_increase' : 'remeasurement_decrease',
              amount: Math.abs(adjustment).toString(),
              description: `Remeasurement adjustment for Pay Period ${currentPeriod.id}: ${adjustment > 0 ? '+' : ''}$${adjustment.toFixed(2)} (Previous: $${previousCap.toFixed(2)}, New: $${newCap.toFixed(2)})`,
            });
            remeasurementCount++;
          }
        }
      }

      res.json({ 
        message: `Successfully imported ${importedCount} practice metrics`,
        imported: importedCount,
        remeasurements: remeasurementCount,
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

        // Verify practice belongs to donor's portfolio (for PSM role)
        if (user?.role === "PSM" && practice.portfolioId !== user.portfolioId) {
          return res.status(403).json({ message: `Practice ${donorPractice.practiceId} does not belong to your portfolio` });
        }

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

  const httpServer = createServer(app);
  return httpServer;
}

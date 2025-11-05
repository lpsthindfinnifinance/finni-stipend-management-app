import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  UserCheck, 
  Users, 
  DollarSign, 
  FileText, 
  Calendar, 
  Settings, 
  TrendingUp,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Help() {
  const { role } = useAuth();

  const availableTabs = [
    { value: "overview", label: "Overview", roles: ["PSM", "Lead PSM", "Finance", "Admin"] },
    { value: "psm", label: "PSM", roles: ["PSM", "Lead PSM", "Finance", "Admin"] },
    { value: "lead-psm", label: "Lead PSM", roles: ["Lead PSM", "Finance", "Admin"] },
    { value: "finance", label: "Finance", roles: ["Finance", "Admin"] },
    { value: "admin", label: "Admin", roles: ["Admin"] },
  ];

  const visibleTabs = availableTabs.filter(tab => role && tab.roles.includes(role));
  const gridCols = visibleTabs.length === 1 ? "grid-cols-1" : 
                   visibleTabs.length === 2 ? "grid-cols-2" : 
                   visibleTabs.length === 3 ? "grid-cols-3" : 
                   visibleTabs.length === 4 ? "grid-cols-4" : "grid-cols-5";

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Finni Health Stipend Management - User Guide
        </h1>
        <p className="text-muted-foreground">
          Comprehensive guide for PSMs, Lead PSMs, and Finance users
        </p>
      </div>

      <Tabs defaultValue={visibleTabs[0]?.value || "overview"} className="space-y-6">
        <TabsList className={`grid w-full ${gridCols}`}>
          {visibleTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} data-testid={`tab-${tab.value}`}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab - Available to all roles */}
        {role && ["PSM", "Lead PSM", "Finance", "Admin"].includes(role) && (
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Understanding the Finni Health Stipend Management System</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">What is this system?</h3>
                <p className="text-sm text-muted-foreground">
                  The Finni Health Stipend Management System manages stipend requests and approvals for 100+ ABA practices 
                  across 5 portfolios (G1-G5). It handles a two-level approval process, tracks practice-level ledgers, 
                  and manages 14-day pay periods throughout the year.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">User Roles</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Badge variant="secondary">PSM</Badge>
                    <p className="text-sm text-muted-foreground">
                      Can create stipend requests for practices in their portfolio and view approvals
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="default">Lead PSM</Badge>
                    <p className="text-sm text-muted-foreground">
                      Approves requests from PSMs in their portfolio (first approval level)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-blue-600">Finance</Badge>
                    <p className="text-sm text-muted-foreground">
                      Final approval authority, manages pay periods, imports BigQuery data, handles operations
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge className="bg-purple-600">Admin</Badge>
                    <p className="text-sm text-muted-foreground">
                      Full system access, manages users, portfolios, and practices
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Key Concepts</h3>
                <div className="space-y-2">
                  <div>
                    <strong className="text-sm">Pay Periods:</strong>
                    <p className="text-sm text-muted-foreground">
                      14-day cycles (26 per year). PP1 starts Dec 23, 2024. All stipends are tied to specific pay periods.
                    </p>
                  </div>
                  <div>
                    <strong className="text-sm">Stipend Cap:</strong>
                    <p className="text-sm text-muted-foreground">
                      Average of (1) Year to Date Finni's Net Revenue × Stipend Cap % based on stipend metric, and (2) Last 6 pay periods Finni's Net Revenue × Stipend Cap % based on stipend metric
                    </p>
                  </div>
                  <div>
                    <strong className="text-sm">Year-Scoped Financial Metrics:</strong>
                    <p className="text-sm text-muted-foreground">
                      All dashboard KPIs (Stipend Paid, Stipend Committed, Available Balance, Utilization %) are calculated from PP1-PP26 of the currently selected pay period's year only. 
                      This ensures accurate year-over-year comparisons and prevents cross-year data mixing.
                    </p>
                  </div>
                  <div>
                    <strong className="text-sm">Remeasurement:</strong>
                    <p className="text-sm text-muted-foreground">
                      When stipend caps change between pay periods, adjustments are automatically calculated and recorded
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* PSM Tab - Available to PSM, Lead PSM, Finance, Admin */}
        {role && ["PSM", "Lead PSM", "Finance", "Admin"].includes(role) && (
        <TabsContent value="psm" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                PSM User Guide
              </CardTitle>
              <CardDescription>How to create and manage stipend requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Dashboard */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  1. Understanding Your Dashboard
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Your dashboard shows real-time portfolio-level financial metrics for the current year (PP1-PP26):
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                  <li><strong>Total Portfolio Cap:</strong> Combined stipend caps for all practices in your portfolio (current year only)</li>
                  <li><strong>Stipend Paid (YTD):</strong> Total stipends paid from PP1 to PP26 of the current year</li>
                  <li><strong>Stipend Committed:</strong> Approved stipends not yet paid (current year PP1-PP26)</li>
                  <li><strong>Available Balance:</strong> Remaining capacity (Cap - Paid - Committed for current year)</li>
                  <li><strong>Pending Approvals:</strong> Requests awaiting Lead PSM/Finance approval</li>
                </ul>
                <div className="bg-muted p-3 rounded-lg mt-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Important:</strong> When viewing PP1 2026, you'll see metrics for 2026 only (not 2025 data). 
                    This year-scoped approach ensures accurate tracking as you transition between years.
                  </p>
                </div>
              </div>

              {/* Creating Requests */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  2. How to Create a Stipend Request (Step-by-Step)
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Before You Start:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Check your practice's available balance on the Dashboard or Practices page</li>
                      <li>Gather all required information: amount, business justification, stipend type</li>
                      <li>Know which pay period the stipend should start (effective date)</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">📍 Step 1: Access the Request Form</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Click "My Requests" in the left sidebar navigation</li>
                      <li>Click the green "New Request" button in the top right corner</li>
                      <li>The stipend request form will open</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">📝 Step 2: Fill Out Basic Information</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Practice:</strong> Click the dropdown and select the practice from your portfolio (only your portfolio's practices will appear)</li>
                      <li><strong>Amount:</strong> Enter the stipend amount (e.g., 5000.00). System will validate against practice's available balance</li>
                      <li><strong>Stipend Type:</strong> Select from dropdown:
                        <ul className="ml-5 mt-1 list-circle">
                          <li>Rent/Lease Reimbursement</li>
                          <li>Staff Cost Reimbursement</li>
                          <li>Marketing/Advertising</li>
                          <li>Equipment/Supplies</li>
                          <li>Technology/Software</li>
                          <li>Other</li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">📄 Step 3: Provide Detailed Description</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Stipend Description (Required):</strong> Enter a detailed explanation of what this stipend is for
                        <p className="text-xs italic mt-1">Example: "Q1 2025 office rent reimbursement for expanded clinic space"</p>
                      </li>
                      <li><strong>Staff Emails (Conditional):</strong> If you selected "Staff Cost Reimbursement", this field becomes required. Enter staff email addresses separated by commas</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">📅 Step 4: Select Request Type and Timing</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Request Type:</strong> Choose one:
                        <ul className="ml-5 mt-1 list-circle">
                          <li><strong>One-time:</strong> Stipend paid once in a single pay period</li>
                          <li><strong>Recurring:</strong> Stipend paid every period for a specified range</li>
                        </ul>
                      </li>
                      <li><strong>Effective Pay Period:</strong> Select when the stipend should start (usually current or next period)</li>
                      <li><strong>End Pay Period (Recurring only):</strong> If recurring, select the final pay period for this stipend</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">💼 Step 5: Add Business Justification</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Justification (Required):</strong> Explain the business reason for this request
                        <p className="text-xs italic mt-1">Example: "Practice expanding to serve 15 additional clients per week, requiring larger facility"</p>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">✅ Step 6: Review and Submit</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Review all entered information for accuracy</li>
                      <li>Check that the amount is within available balance</li>
                      <li>Click the blue "Submit Request" button at the bottom</li>
                      <li>You'll see a success message and be redirected to "My Requests" page</li>
                      <li>Your request will appear in the "Pending" tab with status "Pending Lead PSM"</li>
                    </ul>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-1 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Common Mistakes to Avoid:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Requesting more than the practice's available balance (will be rejected by system)</li>
                      <li>Forgetting to add staff emails when selecting "Staff Cost Reimbursement" type</li>
                      <li>Not providing detailed enough description or justification</li>
                      <li>Selecting wrong effective pay period (can't be changed after submission)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Tracking Requests */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  3. Tracking Your Requests
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  On the "My Requests" page, you'll see tabs for different statuses:
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Badge variant="secondary">Pending</Badge>
                    <p className="text-sm text-muted-foreground">Awaiting approval from Lead PSM or Finance</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="default" className="bg-green-600">Approved</Badge>
                    <p className="text-sm text-muted-foreground">Fully approved by Finance, committed or paid</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Badge variant="destructive">Rejected</Badge>
                    <p className="text-sm text-muted-foreground">Denied by Lead PSM or Finance (includes rejection comments)</p>
                  </div>
                </div>
              </div>

              {/* Practice Details */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  4. Viewing Practice Financial Details
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Navigate to "Practices" page and click on any practice row to view detailed financial information:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 ml-5 list-disc">
                  <li><strong>Stipend Cap (Current Year):</strong> Maximum stipend allocation for this practice for PP1-PP26 of current year</li>
                  <li><strong>Stipend Paid (Current Year):</strong> Total stipends already disbursed from PP1 to current period of this year</li>
                  <li><strong>Stipend Committed (Current Year):</strong> Approved stipends not yet paid for PP1-PP26 of current year</li>
                  <li><strong>Available Balance:</strong> 
                    <ul className="ml-5 mt-1 list-circle">
                      <li><strong>Till PP26:</strong> Remaining capacity through end of current year (Cap - Paid - Committed)</li>
                      <li><strong>Per Pay Period:</strong> Average available per remaining period (Till PP26 ÷ Remaining Periods)</li>
                    </ul>
                  </li>
                  <li><strong>% Utilized:</strong> Percentage of cap consumed by paid + committed stipends (current year only)</li>
                  <li><strong>Pending Requests:</strong> Count of requests awaiting approval for this practice</li>
                  <li><strong>Ledger History Table:</strong> Complete transaction history including opening balances, remeasurements, paid/committed stipends, and allocations</li>
                </ul>
                <div className="bg-muted p-3 rounded-lg mt-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> All financial metrics are year-scoped. When viewing PP1 2026, you'll only see 2026 data (not 2025). 
                    This allows accurate tracking as practices transition between years.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Lead PSM Tab - Available to Lead PSM, Finance, Admin */}
        {role && ["Lead PSM", "Finance", "Admin"].includes(role) && (
        <TabsContent value="lead-psm" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Lead PSM User Guide
              </CardTitle>
              <CardDescription>How to approve/reject stipend requests and manage allocations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Approval Process */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  1. Approving Stipend Requests
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Step 1: Navigate to "Approvals" page</p>
                    <p className="text-sm text-muted-foreground">
                      You'll see all pending requests from PSMs in your portfolio
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 2: Review request details</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Practice name and requestor</li>
                      <li>Amount and stipend type</li>
                      <li>Justification and description</li>
                      <li>Pay period details</li>
                      <li>Practice's available balance</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 3: Make decision</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Approve:</strong> Click "Approve" (optional: add comment) → Sends to Finance for final approval</li>
                      <li><strong>Reject:</strong> Click "Reject" and provide rejection reason → Request denied, PSM notified</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Understanding Approval Flow</p>
                    <p className="text-sm text-muted-foreground">
                      After you approve, the request status becomes "Pending Finance" and moves to Finance for final approval.
                      You'll see it in your "Approved" tab while Finance sees it in their "Pending" tab.
                    </p>
                  </div>
                </div>
              </div>

              {/* Allocations */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  2. How to Allocate Stipends Between Practices (Step-by-Step)
                </h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-1">What are Allocations?</p>
                    <p className="text-sm text-muted-foreground">
                      Allocations allow you to transfer stipend funds from practices with excess capacity (donors) 
                      to practices that need additional funds (recipients). Lead PSMs can allocate across all portfolios. 
                      PSMs can only allocate within their own portfolio.
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Before You Start:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Identify which practice(s) have excess available balance (donors)</li>
                      <li>Identify which practice(s) need additional funds (recipients)</li>
                      <li>Verify donor practices have sufficient total balance to transfer</li>
                      <li>Know the exact amounts you want to transfer</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">📍 Step 1: Access Allocations Page</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Click "Allocations" in the left sidebar navigation</li>
                      <li>You'll see a table of all past allocations</li>
                      <li>Click the green "New Allocation" button in the top right</li>
                      <li>The allocation form will open</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">💰 Step 2: Select Donor Practices (Giving Funds)</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>In the "Donor Practices" table, you'll see all available practices with their current balances</li>
                      <li>Check the checkbox next to each practice you want to transfer FROM</li>
                      <li>For each selected donor, enter the amount to transfer in the "Amount" input field
                        <p className="text-xs italic mt-1">Example: Check "NM-LC" and enter 5000.00</p>
                      </li>
                      <li>You can select multiple donors - the total donor amount is calculated at the bottom</li>
                      <li>System validates that each donor has sufficient balance</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">📥 Step 3: Select Recipient Practices (Receiving Funds)</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>In the "Recipient Practices" table, you'll see all practices (excluding donor practices)</li>
                      <li>Check the checkbox next to each practice you want to transfer TO</li>
                      <li>For each selected recipient, enter the amount to receive in the "Amount" input field
                        <p className="text-xs italic mt-1">Example: Check "CO-RachelB" and enter 5000.00</p>
                      </li>
                      <li>You can select multiple recipients - the total recipient amount is calculated at the bottom</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">⚖️ Step 4: Balance the Allocation</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>The form shows "Total Donor Amount" and "Total Recipient Amount" at the bottom</li>
                      <li><strong>CRITICAL:</strong> These two amounts MUST be exactly equal to submit</li>
                      <li>If amounts don't match, you'll see a red error message</li>
                      <li>Adjust the amounts until both totals are identical
                        <p className="text-xs italic mt-1">Example: Donor total = $8,000, Recipient total = $8,000 ✅</p>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">✅ Step 5: Submit the Allocation</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Review all donor and recipient selections and amounts</li>
                      <li>Verify that total donor = total recipient</li>
                      <li>Click the blue "Submit Allocation" button at the bottom</li>
                      <li>You'll see a success message</li>
                      <li>The allocation will appear in the main Allocations table</li>
                    </ul>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold mb-2">🔄 What Happens After Submission</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>System creates ledger entries for each donor practice (negative amounts, type "allocation_out")</li>
                      <li>System creates ledger entries for each recipient practice (positive amounts, type "allocation_in")</li>
                      <li>Donor practice balances decrease immediately</li>
                      <li>Recipient practice balances increase immediately</li>
                      <li>All changes are visible in practice ledger history</li>
                      <li>Allocation is marked as "completed" instantly (no approval needed)</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-1 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Common Mistakes to Avoid:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Unbalanced totals:</strong> Donor and recipient amounts must match exactly</li>
                      <li><strong>Insufficient balance:</strong> Donor practice must have enough total balance to give</li>
                      <li><strong>Self-allocation:</strong> Cannot allocate from a practice to itself (automatically prevented)</li>
                      <li><strong>Portfolio restrictions (PSM only):</strong> PSMs can only allocate within their portfolio</li>
                      <li><strong>Forgetting multiple practices:</strong> You can allocate from/to multiple practices in one transaction</li>
                    </ul>
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Example Allocation Scenario:</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Practice A has $10,000 excess, Practice B needs $6,000, Practice C needs $4,000:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Donor: Practice A → $10,000</li>
                      <li>Recipients: Practice B → $6,000, Practice C → $4,000</li>
                      <li>Total Donor = $10,000, Total Recipient = $10,000 ✅ Balanced!</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Same as PSM */}
              <div>
                <h3 className="font-semibold mb-3">3. All PSM Features</h3>
                <p className="text-sm text-muted-foreground">
                  Lead PSMs have all PSM capabilities: creating requests, viewing dashboard, checking practice details, etc.
                  See the PSM tab for detailed guides on these features.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Finance Tab - Available to Finance, Admin */}
        {role && ["Finance", "Admin"].includes(role) && (
        <TabsContent value="finance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Finance User Guide
              </CardTitle>
              <CardDescription>Final approvals, pay period management, and BigQuery data imports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Final Approval */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  1. Final Approval of Requests
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Finance has final approval authority for all requests approved by Lead PSMs.
                  </p>
                  <div>
                    <p className="text-sm font-medium mb-2">Approval Process</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Navigate to "Approvals" page</li>
                      <li>Review requests in "Pending" tab (these were approved by Lead PSMs)</li>
                      <li>Click "Approve" to finalize → Creates ledger entries automatically</li>
                      <li>Click "Reject" with reason → Request denied</li>
                      <li>Can add optional comments with approval/rejection</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">What Happens on Approval</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>One-time requests:</strong> Single "committed" ledger entry created</li>
                      <li><strong>Recurring requests:</strong> Multiple "committed" entries created for each pay period</li>
                      <li>Practice balance decreases by committed amounts</li>
                      <li>Request visible in "All Stipends" with filterable pay period breakdown</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Pay Period Management */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  2. Pay Period Management
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Viewing Pay Periods</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Navigate to "Finance Ops" → "Pay Periods" tab
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>See all 26 pay periods (14-day cycles)</li>
                      <li>PP1 starts Dec 23, 2024</li>
                      <li>Current period is highlighted</li>
                      <li>Remeasurement status shown for each period</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Setting Current Pay Period</p>
                    <p className="text-sm text-muted-foreground">
                      Click "Set Current" button on any inactive period to make it active. 
                      Only one period can be current at a time.
                    </p>
                  </div>
                </div>
              </div>

              {/* CSV Import */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  3. BigQuery CSV Import (Critical Process)
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Step 1: Download CSV Template</p>
                    <p className="text-sm text-muted-foreground">
                      On Finance Ops page, click "Download Template" to get the CSV format
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Required columns (6 columns): <code className="bg-muted px-1 py-0.5 rounded">ClinicName, PayPeriod, Year, StipendCap, NegativeEarningsCap, NegativeEarningsUtilized</code>
                    </p>
                    <div className="bg-muted p-2 rounded mt-2 text-xs font-mono">
                      Example: NM-LC,1,2026,50000.00,5000.00,1200.00
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 2: Prepare CSV Data</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Export data from BigQuery for all practices</li>
                      <li><strong>ClinicName:</strong> Must match Practice ID exactly (e.g., "NM-LC", "CO-RachelB") - this is the Practice ID, not the clinic display name</li>
                      <li><strong>PayPeriod:</strong> Enter pay period number (1-26), or leave empty to auto-fill with current period</li>
                      <li><strong>Year:</strong> Enter 4-digit year (e.g., 2025, 2026) - REQUIRED for multi-year support</li>
                      <li><strong>StipendCap:</strong> Calculated stipend cap for this practice/period/year</li>
                      <li><strong>NegativeEarningsCap:</strong> Negative earnings cap value</li>
                      <li><strong>NegativeEarningsUtilized:</strong> Amount of negative earnings used</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 3: Upload CSV</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Click "Import CSV Data" button</li>
                      <li>Select your prepared CSV file</li>
                      <li>Click "Import" and wait for processing</li>
                      <li>Review success message with import statistics</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 4: What Happens During Import</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Metrics Saved:</strong> All CSV data stored in practice_metrics table</li>
                      <li><strong>Remeasurement Calculated:</strong> System compares new StipendCap with previous period</li>
                      <li><strong>Ledger Entries Created:</strong> 
                        <ul className="ml-5 list-disc mt-1">
                          <li>Opening balance (first import for a practice)</li>
                          <li>Remeasurement increase (cap went up)</li>
                          <li>Remeasurement decrease (cap went down)</li>
                        </ul>
                      </li>
                      <li><strong>CSV Stored:</strong> Raw CSV saved for future download</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Understanding Remeasurement</p>
                    <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground space-y-2">
                      <p><strong>Example:</strong></p>
                      <p>• PP1 2025: Import StipendCap = $50,000 → Opening balance created</p>
                      <p>• PP2 2025: Import StipendCap = $52,500 → Remeasurement: +$2,500</p>
                      <p>• PP3 2025: Import StipendCap = $51,000 → Remeasurement: -$1,500</p>
                      <p className="mt-2 pt-2 border-t border-border">
                        <strong>Key:</strong> Remeasurement only compares raw StipendCap values from consecutive CSV uploads within the same year.
                        It does NOT consider allocations, paid stipends, or other ledger activities.
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Year-Scoped Financial Metrics</p>
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm text-muted-foreground">
                      <p className="font-semibold mb-2">Important: All KPIs are Year-Scoped</p>
                      <p>All dashboard metrics (Stipend Paid, Stipend Committed, Available Balance, Utilization %) are calculated from PP1-PP26 of the currently selected pay period's year only.</p>
                      <p className="mt-2"><strong>Example:</strong></p>
                      <ul className="ml-5 mt-1 list-disc">
                        <li>When viewing PP22 2025: Shows 2025 data only (PP1-PP26 of 2025)</li>
                        <li>When viewing PP1 2026: Shows 2026 data only (PP1-PP26 of 2026)</li>
                      </ul>
                      <p className="mt-2">This ensures accurate year-over-year comparisons and prevents cross-year data mixing when transitioning between years.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CSV Download */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  4. Downloading Historical CSV Data
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  In the "All Pay Periods" table, each period shows a "Download CSV" column:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                  <li>If CSV was imported for that period, "Download" button appears</li>
                  <li>Click to download the exact CSV file that was imported</li>
                  <li>Useful for auditing and historical reference</li>
                  <li>If no CSV uploaded, shows "No data"</li>
                </ul>
              </div>

              {/* All Stipends */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  5. Viewing All Approved Stipends
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Navigate to "Finance Ops" → "All Stipends" tab for comprehensive view
                  </p>
                  <div>
                    <p className="text-sm font-medium mb-2">Features</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Filter by Pay Period:</strong> See stipends for specific periods</li>
                      <li><strong>Export to CSV:</strong> Download filtered data for reporting</li>
                      <li><strong>View Details:</strong> Click any row to see full request details</li>
                      <li><strong>Payment Status:</strong> See Paid, Committed, or Cancelled status</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Editing Stipends */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  6. Editing Committed Stipend Amounts
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Finance can adjust committed stipend amounts on a per-period basis for recurring requests.
                  </p>
                  <div>
                    <p className="text-sm font-medium mb-2">How to Edit</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Navigate to request detail page</li>
                      <li>Scroll to "Pay Period Breakdown" table</li>
                      <li>Find periods with "Committed" status</li>
                      <li>Click "Edit" button for that period</li>
                      <li>Enter new amount and save</li>
                      <li>Only that specific period's ledger entry is updated</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Important Notes
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Can only edit "Committed" periods (not Paid or Cancelled)</li>
                      <li>Each period is independent - editing one doesn't affect others</li>
                      <li>Changes are immediately reflected in practice balance</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Admin Tab - Available to Admin only */}
        {role && role === "Admin" && (
        <TabsContent value="admin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Admin User Guide
              </CardTitle>
              <CardDescription>System configuration and user management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* User Management */}
              <div>
                <h3 className="font-semibold mb-3">1. Managing Users</h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Navigate to "Settings" page → "Users" tab
                  </p>
                  <div>
                    <p className="text-sm font-medium mb-2">Adding New Users</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Click "Add User" button</li>
                      <li>Enter email, name, primary role, and portfolio</li>
                      <li>Optionally assign additional roles via checkboxes</li>
                      <li>User can switch between assigned roles in header</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Editing Users</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Click on any user row</li>
                      <li>Update name, primary role, portfolio, or additional roles</li>
                      <li>Primary role checkbox is disabled to prevent removal</li>
                      <li>Save changes</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Multi-Role System</p>
                    <p className="text-sm text-muted-foreground">
                      Users can have multiple roles (e.g., PSM + Lead PSM). They can switch between roles
                      using the role switcher in the header. The switcher only shows if user has 2+ roles.
                    </p>
                  </div>
                </div>
              </div>

              {/* Portfolio Management */}
              <div>
                <h3 className="font-semibold mb-3">2. Managing Portfolios</h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Navigate to "Settings" → "Portfolios" tab
                  </p>
                  <div>
                    <p className="text-sm font-medium mb-2">Adding Portfolios</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Click "Add Portfolio"</li>
                      <li>Enter portfolio ID (e.g., G1, G2) and name</li>
                      <li>Save to create</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Deleting Portfolios</p>
                    <p className="text-sm text-muted-foreground">
                      System prevents deletion if portfolio has practices or assigned users.
                      Reassign or remove dependencies first.
                    </p>
                  </div>
                </div>
              </div>

              {/* Practice Management */}
              <div>
                <h3 className="font-semibold mb-3">3. Managing Practices</h3>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Navigate to "Settings" → "Practices" tab
                  </p>
                  <div>
                    <p className="text-sm font-medium mb-2">Adding Practices</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Click "Add Practice"</li>
                      <li>Enter practice ID (ClinicName from BigQuery)</li>
                      <li>Enter clinic name and assign to portfolio</li>
                      <li>Select current pay period</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Editing Practices</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Click on practice row</li>
                      <li>Update name or reassign to different portfolio</li>
                      <li>Cannot change practice ID (used for BigQuery matching)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* All Other Features */}
              <div>
                <h3 className="font-semibold mb-3">4. All Finance Features</h3>
                <p className="text-sm text-muted-foreground">
                  Admins have full Finance capabilities including approvals, pay period management, 
                  CSV imports, and stipend editing. See the Finance tab for detailed guides.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {/* Quick Reference */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Status Colors</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Pending</Badge>
                  <span className="text-sm text-muted-foreground">Awaiting approval</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600">Approved</Badge>
                  <span className="text-sm text-muted-foreground">Fully approved</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Rejected</Badge>
                  <span className="text-sm text-muted-foreground">Request denied</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Committed</Badge>
                  <span className="text-sm text-muted-foreground">Approved, not paid yet</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="default">Paid</Badge>
                  <span className="text-sm text-muted-foreground">Payment completed</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Common Tasks</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
                <li>Create request: My Requests → New Request</li>
                <li>Approve request: Approvals → Pending tab</li>
                <li>Import BigQuery: Finance Ops → Import CSV Data</li>
                <li>Download CSV: Finance Ops → Pay Periods table</li>
                <li>Allocate funds: Allocations → New Allocation</li>
                <li>Add user: Settings → Users → Add User</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

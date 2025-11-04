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

export default function Help() {
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="psm" data-testid="tab-psm">PSM</TabsTrigger>
          <TabsTrigger value="lead-psm" data-testid="tab-lead-psm">Lead PSM</TabsTrigger>
          <TabsTrigger value="finance" data-testid="tab-finance">Finance</TabsTrigger>
          <TabsTrigger value="admin" data-testid="tab-admin">Admin</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
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
                      Maximum stipend amount calculated from BigQuery data: 0.6 × Gross Margin % + 0.4 × Collections %
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

        {/* PSM Tab */}
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
                  1. Dashboard Overview
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Your dashboard shows portfolio-level financial metrics:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                  <li><strong>Total Portfolio Cap:</strong> Combined stipend caps for all practices in your portfolio</li>
                  <li><strong>Stipend Paid (YTD):</strong> Total stipends paid out this year</li>
                  <li><strong>Stipend Committed:</strong> Approved stipends not yet paid</li>
                  <li><strong>Available Balance:</strong> Remaining stipend capacity</li>
                  <li><strong>Pending Approvals:</strong> Requests awaiting Lead PSM/Finance approval</li>
                </ul>
              </div>

              {/* Creating Requests */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  2. Creating Stipend Requests
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Step 1: Navigate to "My Requests"</p>
                    <p className="text-sm text-muted-foreground">Click "New Request" button in the top right</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 2: Fill out request form</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li><strong>Practice:</strong> Select practice from your portfolio</li>
                      <li><strong>Amount:</strong> Enter stipend amount (validated against available balance)</li>
                      <li><strong>Stipend Type:</strong> Choose category (Rent/Lease, Staff Cost, Marketing, etc.)</li>
                      <li><strong>Stipend Description:</strong> Detailed explanation of the request (required)</li>
                      <li><strong>Staff Emails:</strong> Required if type is "Staff Cost Reimbursement"</li>
                      <li><strong>Request Type:</strong> One-time or Recurring</li>
                      <li><strong>Effective Pay Period:</strong> When stipend should start</li>
                      <li><strong>Justification:</strong> Business reason for this request</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 3: For Recurring Requests</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Select "Recurring" as request type</li>
                      <li>Choose end pay period (when recurring payments stop)</li>
                      <li>Amount will be paid each period until end period</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 4: Submit</p>
                    <p className="text-sm text-muted-foreground">
                      Click "Submit Request" - it will go to Lead PSM for approval
                    </p>
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
                  4. Viewing Practice Details
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Click on any practice to view:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                  <li><strong>Stipend Cap:</strong> Maximum available for this practice</li>
                  <li><strong>Current Balance:</strong> Available funds after paid/committed stipends</li>
                  <li><strong>Ledger History:</strong> All financial transactions for the practice</li>
                  <li><strong>Pending Requests:</strong> Requests awaiting approval</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lead PSM Tab */}
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
                  2. Managing Practice Allocations
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Lead PSMs can allocate stipends between any practices (across all portfolios).
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Step 1: Navigate to "Allocations" page</p>
                    <p className="text-sm text-muted-foreground">Click "New Allocation" button</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 2: Select donor practices</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Use checkboxes to select practices giving funds</li>
                      <li>Enter amount for each selected practice</li>
                      <li>Total donor amount is calculated automatically</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 3: Select recipient practices</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Select practices receiving funds</li>
                      <li>Enter amount for each recipient</li>
                      <li>Total recipient amount must equal total donor amount</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 4: Submit allocation</p>
                    <p className="text-sm text-muted-foreground">
                      System creates ledger entries: negative for donors, positive for recipients. 
                      Balances update immediately.
                    </p>
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

        {/* Finance Tab */}
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
                      Required columns: <code className="bg-muted px-1 py-0.5 rounded">ClinicName, PayPeriod, StipendCap, NegativeEarningsCap, NegativeEarningsUtilized</code>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Step 2: Prepare CSV Data</p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-5 list-disc">
                      <li>Export data from BigQuery</li>
                      <li>Match ClinicName exactly to practice names in system</li>
                      <li>Ensure StipendCap values are calculated correctly</li>
                      <li>PayPeriod should match current period (or leave empty to auto-fill)</li>
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
                      <p>• PP1: Import StipendCap = $50,000 → Opening balance created</p>
                      <p>• PP2: Import StipendCap = $52,500 → Remeasurement: +$2,500</p>
                      <p>• PP3: Import StipendCap = $51,000 → Remeasurement: -$1,500</p>
                      <p className="mt-2 pt-2 border-t border-border">
                        <strong>Key:</strong> Remeasurement only compares raw StipendCap values from consecutive CSV uploads.
                        It does NOT consider allocations, paid stipends, or other ledger activities.
                      </p>
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

        {/* Admin Tab */}
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

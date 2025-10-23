# Stipend Management System - Design Guidelines

## Design Approach

**Selected System**: Carbon Design System (IBM's enterprise design system)
**Justification**: Carbon Design excels at data-heavy, enterprise financial applications with complex workflows, extensive data tables, and multi-level approval systems. Its structured approach to information hierarchy and form design aligns perfectly with stipend management requirements.

**Core Principles**:
- Clarity over decoration: Information accessibility is paramount
- Consistent data visualization: Standardized table layouts and financial displays
- Progressive disclosure: Show summary data with drill-down capabilities
- Trust through precision: Exact numbers, clear statuses, audit trails

---

## Typography System

**Font Family**: 
- Primary: 'IBM Plex Sans' (via Google Fonts CDN)
- Monospace: 'IBM Plex Mono' for financial figures and IDs

**Hierarchy**:
- Page Titles: text-3xl font-semibold (Dashboard names, section headers)
- Section Headers: text-xl font-semibold (Portfolio names, "Pending Requests")
- Card Titles: text-lg font-medium (Practice names, transaction types)
- Body Text: text-base font-normal (Descriptions, justifications)
- Financial Figures: text-lg font-mono font-semibold (Balances, amounts, percentages)
- Labels: text-sm font-medium uppercase tracking-wide (Form labels, table headers)
- Metadata: text-sm (Dates, user names, pay periods)
- Small Text: text-xs (Helper text, footnotes)

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 to p-6
- Section margins: mb-8 to mb-12
- Card spacing: gap-6 to gap-8
- Form field spacing: space-y-4
- Table cell padding: px-4 py-3
- Dashboard grid gaps: gap-6

**Container Strategy**:
- Max width: max-w-7xl mx-auto for main content area
- Sidebar: Fixed width w-64 for role-based navigation
- Two-column layouts: grid grid-cols-1 lg:grid-cols-3 (2:1 ratio for main content and sidebar details)
- Dashboard cards: grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3

---

## Component Library

### Navigation
- **Top Navigation Bar**: Fixed header with role indicator badge, current pay period display, user profile dropdown
- **Sidebar Navigation**: Vertical menu with Portfolio Dashboard, Practices, Requests, Approvals, Reports, Settings sections
- Icons: Heroicons (outline for inactive, solid for active states)

### Dashboard Cards
- **Portfolio Summary Cards**: 
  - Header with portfolio name (G1-G5) and PSM name
  - Three-row metric display: Total Cap, Allocated, Remaining
  - Horizontal progress bar showing utilization percentage
  - Footer with "View Details" link
  
- **Practice Overview Cards**:
  - Practice name and ID in header
  - Key metrics in 2x2 grid: GM%, Collections%, Stipend Cap, Available Balance
  - Small ledger preview (last 3 transactions)
  - Quick action button

### Data Tables
- **Standard Table Structure**:
  - Sticky header with sortable columns (arrows on hover)
  - Alternating row treatment for readability
  - Row hover state for interactivity
  - Pagination footer (10/25/50/100 rows)
  - Filter/search bar above table
  
- **Ledger Table**: 
  - Columns: Date, Transaction Type, Description, Amount, Running Balance
  - Monospace font for numerical columns
  - Right-aligned numbers
  - Expandable rows for transaction details

- **Approval Queue Table**:
  - Columns: Request ID, Practice, PSM, Amount, Type, Status, Actions
  - Inline action buttons (Approve/Reject) for authorized users
  - Status badges in dedicated column

### Forms
- **Stipend Request Form**:
  - Two-column layout on desktop (form fields left, summary/validation right)
  - Dropdown for practice selection with search
  - Number input with currency formatting ($)
  - Radio buttons for One-time vs Recurring
  - Date picker for recurring end period
  - Textarea for justification (min 50 characters)
  - Real-time balance validation panel
  - Submit button disabled until valid

- **Inter-PSM Allocation Form**:
  - Multi-select for donor practices (checkboxes with balance display)
  - Running total of selected amount
  - Dropdown for recipient PSM
  - Allocation breakdown table
  - Confirmation modal before submission

### Status Indicators
- **Badges**: 
  - Pending: rounded-full px-3 py-1 text-xs font-medium
  - Approved: (same structure)
  - Rejected: (same structure)
  - Paid: (same structure)
  - Committed: (same structure)

- **Progress Bars**:
  - Container: w-full h-2 rounded-full overflow-hidden
  - Fill: h-full rounded-full transition-all duration-300
  - Label above: Percentage and absolute amounts

### Modals & Overlays
- **Approval Modal**:
  - Centered overlay with backdrop blur
  - Header with request summary
  - Detailed transaction breakdown
  - Approval notes textarea
  - Approve/Reject button pair

- **Confirmation Dialogs**:
  - Compact size (max-w-md)
  - Warning icon for destructive actions
  - Clear primary and secondary buttons

### Charts & Visualizations
- **Portfolio Utilization Chart**: Stacked horizontal bar showing Paid, Committed, Available per portfolio
- **Trend Line Chart**: Simple line chart for stipend allocation over pay periods
- **Distribution Donut**: Practice count per portfolio

---

## Page Layouts

### Dashboard (Role-Specific Landing)
- Top metrics row: 3-4 summary cards (Total Portfolio Cap, This Period Allocated, Pending Approvals, Available Balance)
- Portfolio grid below: 5 portfolio cards (G1-G5) in responsive grid
- Right sidebar: Recent activity feed and pending actions
- Bottom section: Quick stats and charts

### Practice Management
- Filter bar: Search, Portfolio dropdown, Sort by dropdown
- Practice table: Full-width with all 60+ practices
- Click row to expand ledger details inline
- Bulk actions toolbar when rows selected

### Request Submission
- Centered form container (max-w-2xl)
- Progress stepper at top: Select Practice → Enter Details → Review → Submit
- Validation summary in sticky right panel
- Previous requests history at bottom

### Approval Workflow
- Tab navigation: Pending, Approved, Rejected
- Queue table with priority sorting
- Bulk approve functionality for Lead PSM/Finance
- Detailed view panel slides from right on row click

### Reports Dashboard
- Filter controls: Date range, Portfolio, PSM, Transaction type
- Multiple report sections: Utilization Summary, Ledger Export, Allocation History, Audit Trail
- Export buttons (CSV, PDF) for each report type
- Data visualization above detailed tables

### Pay Period Management (Admin)
- Current period display with countdown to next period
- "Advance Period" button with confirmation
- BigQuery import section: CSV upload with preview
- Remeasurement summary table showing practice-by-practice changes

---

## Interaction Patterns

### Data Loading
- Skeleton screens for tables (shimmer effect)
- Inline spinners for action buttons
- Toast notifications for success/error (top-right corner, auto-dismiss 5s)

### Approval Flow
- Linear stepper showing: Submitted → PSM Review → Lead PSM Review → Finance Review → Complete
- Active step highlighted, completed steps with checkmark
- Notifications appear in sidebar and via Slack

### Balance Validation
- Real-time calculation as user types amount
- Green checkmark if within balance
- Red error message with available balance if exceeded
- Disabled submit until validation passes

### Multi-Select Practices
- Checkbox in table row
- Selected count and total amount in sticky header
- "Clear All" and "Select All" quick actions
- Visual highlight on selected rows

---

## Accessibility

- All form inputs have associated labels with for attributes
- ARIA labels on icon-only buttons
- Keyboard navigation: Tab through forms, Arrow keys in tables, Enter to submit
- Focus indicators: 2px ring on all interactive elements
- Error messages linked to inputs via aria-describedby
- Status announcements for screen readers on approval actions
- Minimum touch target: 44x44px for mobile

---

## Responsive Behavior

**Mobile (< 768px)**:
- Sidebar collapses to hamburger menu
- Dashboard cards stack vertically
- Tables switch to card view (key columns only)
- Forms go single column
- Reduce padding to p-4

**Tablet (768px - 1024px)**:
- 2-column dashboard grid
- Sidebar remains visible but narrower
- Tables show more columns with horizontal scroll

**Desktop (> 1024px)**:
- Full 3-column layouts
- All table columns visible
- Split-screen views for drill-downs

---

## Icons

**Library**: Heroicons via CDN
- Navigation: home, users, document-text, clipboard-check, chart-bar, cog
- Actions: plus, pencil, trash, arrow-right, check, x-mark
- Status: check-circle, clock, exclamation-triangle, information-circle
- Financial: currency-dollar, arrows-right-left, trending-up

---

## Images

**No hero images required** - This is a data-focused enterprise application. All visual interest comes from well-structured data displays, charts, and clear information hierarchy.
# Finni Health - Stipend Management System

## Project Overview
A comprehensive stipend management system for managing 60+ ABA practices across 5 portfolios (G1-G5) with multi-level approval workflows, practice-level ledger tracking, and real-time portfolio analytics.

## Recent Changes
- **2025-10-28**: Practice Balance Display & Table Improvements
  - **Critical Bug Fix**: Fixed `getPracticeByClinicName()` to search by practice ID instead of display name, enabling all 101 practices to create ledger entries during CSV import
  - **Balance Calculations**: `/api/practices` endpoint now enriches practice data with:
    - `stipendCap` - From latest metrics in current pay period
    - `availableBalance` - Sum of all ledger entries
    - `stipendPaid` - Sum of approved stipend requests
    - `stipendCommitted` - Sum of pending stipend requests (pending_psm, pending_lead_psm, pending_finance)
  - **Practice Table Updates**:
    - Removed GM% and Collections% columns (per user request)
    - Added Stipend Paid and Stipend Committed columns
    - Updated column order: Practice ID, Name, Portfolio, Stipend Cap, Stipend Paid, Stipend Committed, Available
  - Dashboard now correctly shows $432K+ total cap across all portfolios
  - Individual practice balances now display correctly throughout the system
  - New storage methods: `getStipendPaid()` and `getStipendCommitted()` for per-practice calculations

- **2025-10-27**: Settings Page & System Administration Features Complete
  - **Settings Page (Finance-only)**: Complete CRUD interface with tabbed navigation for Portfolios, Practices, and Users
    - Portfolios tab: Create, edit, delete portfolios with safe-delete validation (prevents deletion with associated practices)
    - Practices tab: Create, edit, delete practices with group assignment and relationship checks
    - Users tab: Create, edit, delete users with role/portfolio assignment and validation
    - All operations use React Query for optimistic updates and cache invalidation
    - Finance-only access control at both page and API levels
  - **CSV Template Download**: Standardized 7-column template (ClinicName, DisplayName, Group, PayPeriod, StipendCap, NegativeEarningsCap, NegativeEarningsUtilized)
  - **Pay Periods Enhancements**: CSV template download button, filtered display (Period 21+)
  - **Dynamic Header**: Current pay period now fetched from API and displayed in header
  - **Navigation**: Finance-only Settings link added to sidebar
  - Database schemas extended with insert/update/delete validation using drizzle-zod
  - Backend API routes with comprehensive relationship checks and safe-delete logic
  - All CRUD operations properly secured with Finance middleware

- **2025-10-27**: BigQuery Integration & Negative Earnings Cap System
  - Complete 40+ column BigQuery schema with case-sensitive header handling
  - BigQuery import logic with remeasurement calculation (StipendCapAvgFinal comparison)
  - Negative Earnings Cap database with payPeriod tracking
  - Negative Earnings page with group-level summaries and practice-level details
  - PSM request form for additional Negative Earnings cap with Finance approval
  - Pay Periods page updated with BigQuery table documentation
  - Database joins fixed: practiceMetrics.clinicName → practices.id
  - All API endpoints functional and tested

- **2025-10-23**: Complete MVP Core Features
  - Stipend Request Workflow fully functional with multi-level approvals
  - Practice Detail Page with complete ledger history and balance tracking
  - Inter-PSM Allocation System with multi-practice donor selection and automatic ledger entries
  - Complete database schema with practice-level ledger tracking
  - Full frontend implementation with Carbon Design System aesthetics
  - Role-based authentication (PSM, Lead PSM, Finance)
  - All core MVP pages created and wired to router
  - Database seeded with 5 portfolios (G1-G5), 60 practices, and 26 pay periods
  - Backend fully implemented with all API endpoints
  - Slack webhook integration for approval notifications
  - Numeric balance validation throughout the stack (no overdrafts possible)
  - Added stipend type categorization (Lease Stipend, Staff Cost Reimbursement, Marketing, Equipment, Training, Other)

## User Roles & Permissions
1. **PSM (Practice Success Manager)**
   - Manages one portfolio
   - Submits stipend requests for their practices
   - Self-approves requests (first approval level)
   - Can transfer stipend to other PSMs
   - Views their portfolio dashboard

2. **Lead PSM**
   - Oversees all portfolios
   - Second-level approval for all requests
   - Can transfer stipend between PSMs
   - Views all portfolio analytics

3. **Finance**
   - Final approval authority
   - Manages pay periods
   - Imports BigQuery data
   - Views comprehensive reports
   - No portfolio assignment

## Project Architecture

### Database Schema
**Core Tables:**
- `users` - User accounts with roles (PSM, Lead PSM, Finance)
- `portfolios` - 5 portfolios (G1-G5)
- `practices` - 60+ ABA practices
- `practice_metrics` - BigQuery import data (40+ columns including GM%, Collections%, Stipend Cap, Revenue, YTD metrics)
- `practice_ledger` - Transaction history (opening balance, remeasurements, allocations)
- `stipend_requests` - Request submissions with multi-level approval tracking
- `inter_psm_allocations` - PSM-to-PSM stipend transfers
- `pay_periods` - 14-day pay period management
- `practice_reassignments` - Historical portfolio assignment changes
- `negative_earnings_cap_requests` - Negative earnings cap requests with payPeriod tracking and Finance approval

**Key Relationships:**
- Practice → Portfolio (current assignment)
- Practice → Metrics (per pay period)
- Practice → Ledger (all transactions)
- Request → Practice (single practice per request)
- Allocation → Multiple Practices (donor practices)

### Frontend Structure
**Pages:**
- `/` - Dashboard (role-specific landing page with portfolio cards)
- `/practices` - Practice management table with filters and sorting
- `/requests/new` - Submit stipend request form
- `/requests` - My Requests (request history for current user)
- `/approvals` - Multi-level approval interface (PSM, Lead PSM, Finance)
- `/allocations` - Inter-PSM allocation management
- `/reports` - Comprehensive reports and analytics
- `/pay-periods` - Pay period management with BigQuery import and CSV template download (Finance only)
- `/negative-earnings` - Negative Earnings Cap tracking with group summaries and PSM request form
- `/settings` - System administration with CRUD for Portfolios, Practices, and Users (Finance only)

**Components:**
- `AppSidebar` - Role-based navigation
- `PortfolioCard` - Portfolio summary with utilization
- `PracticeTable` - Sortable/filterable practice list
- `LedgerTable` - Transaction history display
- `StatusBadge` - Visual status indicators

### Backend Structure
**API Endpoints:**
- `GET /api/auth/user` - Current user info
- `GET /api/dashboard/summary` - Dashboard metrics
- `GET /api/portfolios` - Portfolio list with aggregated balances
- `GET /api/practices` - Practice list with filters
- `GET /api/practices/:id/balance` - Practice ledger balance
- `POST /api/stipend-requests` - Submit request
- `POST /api/stipend-requests/:id/approve` - Approve request
- `POST /api/stipend-requests/:id/reject` - Reject request
- `POST /api/allocations` - Inter-PSM allocation
- `GET /api/pay-periods/current` - Current pay period info
- `GET /api/templates/metrics` - Download CSV template for BigQuery imports
- `GET /api/settings/portfolios` - List all portfolios (Finance only)
- `POST /api/settings/portfolios` - Create portfolio (Finance only)
- `PATCH /api/settings/portfolios/:id` - Update portfolio (Finance only)
- `DELETE /api/settings/portfolios/:id` - Delete portfolio with safe-delete checks (Finance only)
- `GET /api/settings/practices` - List all practices (Finance only)
- `POST /api/settings/practices` - Create practice (Finance only)
- `PATCH /api/settings/practices/:id` - Update practice (Finance only)
- `DELETE /api/settings/practices/:id` - Delete practice with safe-delete checks (Finance only)
- `GET /api/settings/users` - List all users (Finance only)
- `POST /api/settings/users` - Create user (Finance only)
- `PATCH /api/settings/users/:id` - Update user (Finance only)
- `DELETE /api/settings/users/:id` - Delete user with safe-delete checks (Finance only)

### Authentication
- Replit Auth (OpenID Connect)
- Custom role assignment in users table
- Session-based authentication with PostgreSQL storage
- Role-based access control on all protected endpoints

## Key Features

### 1. Practice-Level Ledger Tracking
All financial tracking happens at the practice level:
- Opening balance (zero for now)
- Remeasurement adjustments (from BigQuery imports)
- Paid stipends (approved and disbursed)
- Committed stipends (approved for future periods)
- Inter-PSM allocations (in/out)

Portfolio balances are aggregated sums of associated practices.

### 2. Stipend Cap Calculation
Formula: `0.6 * Gross Margin % + 0.4 * Collections %`

Calculated automatically when importing BigQuery data.

### 3. Multi-Level Approval Workflow
1. PSM submits request → Status: `pending_psm`
2. PSM self-approves → Status: `pending_lead_psm`
3. Lead PSM approves → Status: `pending_finance`
4. Finance approves → Status: `approved` → Creates ledger entries

Slack notifications sent at each stage.

### 4. Inter-PSM Allocation Flow
1. Donor PSM selects multiple practices to transfer from
2. System pools allocated amounts from practice ledgers
3. Recipient PSM receives pooled amount
4. Recipient PSM allocates to their own practices
5. All transactions recorded in practice ledgers

### 5. Pay Period Management
- 14-day intervals (26 periods in 2025)
- Period advancement triggers:
  - BigQuery data import
  - Remeasurement calculation (difference from previous cap)
  - Automatic ledger entries for each practice

## Design System
- **Typography**: IBM Plex Sans (primary), IBM Plex Mono (financial figures)
- **Colors**: Blue/gray palette optimized for financial dashboards
- **Layout**: Max-width containers, responsive grid layouts
- **Components**: Shadcn UI with Carbon Design System patterns
- **Spacing**: Consistent 4px-based spacing system

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `SLACK_WEBHOOK_URL` - Slack notifications
- `REPL_ID` - Replit instance ID
- `REPLIT_DOMAINS` - Allowed domains for auth

## Development Workflow
1. Schema changes → Update `shared/schema.ts`
2. Run `npm run db:push` to sync database
3. Update storage interface in `server/storage.ts`
4. Add API routes in `server/routes.ts`
5. Create/update frontend components
6. Test critical user journeys

## Future Enhancements
- Direct BigQuery API integration (currently CSV upload)
- Advanced reporting with exportable Excel/PDF
- Email notifications in addition to Slack
- Audit log system with user attribution
- Mobile-responsive optimizations

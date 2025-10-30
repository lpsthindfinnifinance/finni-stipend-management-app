# Finni Health - Stipend Management System

## Overview
Finni Health is a comprehensive stipend management system designed for 60+ ABA practices across five portfolios (G1-G5). Its primary purpose is to streamline multi-level approval workflows for stipend requests, track practice-level ledgers, and provide real-time portfolio analytics. The system aims to centralize stipend management, enhance financial transparency, and support efficient allocation of funds across practices within the Finni Health network.

## Recent Changes
- **2025-10-30**: Practices Page - Allocation Column Positioning & Label Update
  - **UI Refinements**:
    - Checkbox label: "Show Allocation Columns" → "Show Allocation" (more concise)
    - Repositioned allocation columns to appear immediately after "Stipend Cap (Till PP26)"
    - New column order (when allocations shown): Practice ID → Practice Name → Portfolio → Stipend Cap → **Allocated-in → Allocated-out** → Stipend Paid → Committed → Available → Available per PP → Requested → Utilized %
    - Groups cap-related metrics together for better financial analysis workflow
  - **E2E Testing**: Verified column positioning, toggle functionality, and sticky header behavior with reordered columns

- **2025-10-30**: Practices Page - Fixed Sticky Headers & Added Allocation Columns
  - **Sticky Header Fix** (CRITICAL FIX):
    - ROOT CAUSE: Shadcn Table component wraps `<table>` in div with `overflow-auto`, breaking `position: sticky`
    - SOLUTION: Replaced with native `<table>` element, moved overflow to parent container
    - Headers now properly freeze and remain visible when scrolling through 101 practices
    - Only table body scrolls, page stays fixed (document.scrollY === 0)
  - **New Allocation Columns** (Toggle-able):
    - Added "Show Allocation" checkbox above table
    - "Allocated-in": Sum of allocation_in transactions (funds received, displayed in blue)
    - "Allocated-out": Sum of allocation_out transactions (funds given, displayed in purple)
    - Backend: Added `getAllocatedIn()` and `getAllocatedOut()` storage methods
    - Data sourced from practice_ledger table with transactionType filtering
  - **Column Label Update**:
    - "Utilization %" → "Utilized %" (as requested by user)
  - **E2E Testing**: All functionality verified including sticky headers, column toggle, and data display

- **2025-10-30**: Practices Page UI/UX Refinements
  - **Layout Improvements**:
    - Table now fills remaining vertical screen space using flexbox layout (`h-screen` + `min-h-0`)
    - Frozen/sticky column headers remain visible while scrolling through 101 practices
    - Only table body scrolls, not entire page (document scroll stays at 0)
  - **Column Label Updates**:
    - "Available per PP" → "Available per Pay Period" (more user-friendly)
    - "Unapproved Stipend" → "Stipend Requested" (clearer terminology)
  - **Technical Implementation**:
    - Outer container: `h-screen flex flex-col overflow-hidden`
    - Table headers: `sticky top-0 bg-background z-10`
    - Flex children use `min-h-0` to allow proper shrinking
    - E2E test verified all behaviors work correctly

- **2025-10-30**: Practices Page Enhanced with New Metrics
  - **Table Improvements**:
    - Removed expand/collapse tree arrows for cleaner interface
    - Increased table width to full width for better visibility
    - Added 3 new columns displaying key financial metrics
  - **New Columns**:
    - **Available per Pay Period**: Available balance divided by remaining pay periods
    - **Stipend Requested**: Sum of pending requests (pending_psm, pending_lead_psm, pending_finance)
    - **Utilization %**: (Stipend Paid + Committed) / Stipend Cap × 100
  - **Backend Enhancements**:
    - Added `getUnapprovedStipend()` storage method for calculating pending requests
    - Updated GET /api/practices endpoint with new calculated fields
    - Fixed type conversion bug: stipendCap now properly returned as number instead of string
  - **Total Columns (10)**: Practice ID, Practice Name, Portfolio, Stipend Cap (Till PP26), Stipend Paid, Stipend Committed, Available (till PP26), Available per Pay Period, Stipend Requested, Utilization %
  - **Data Integrity**: Utilization % correctly displays overspend scenarios (>100%), division by zero protection for availablePerPP

- **2025-10-30**: Dashboard Revamp with Standardized Financial Terminology
  - **6 New KPI Cards**: Replaced previous 4 cards with comprehensive metrics:
    - Total Portfolio Cap (till PP26): Sum of all stipend caps across portfolios
    - Stipend Paid (YTD): Total paid from PP1 to current period, calculated from ledger
    - Stipend Committed: Approved for future periods (not yet paid)
    - Available Balance (till PP26): Cap - Paid - Committed
    - Available Balance (per PP): Available / remaining pay periods
    - Pending Approvals: Count of requests requiring user's action
  - **Enhanced Portfolio Cards**: Display 5 financial metrics per portfolio with color-coded utilization bars
  - **Backend Optimization**: Ledger-based calculations for accuracy with Math.abs() for debit entries

## User Preferences
- I prefer simple language and clear explanations.
- I want iterative development with frequent updates and feedback loops.
- Ask before making major architectural changes or introducing new dependencies.
- Ensure all critical user journeys are thoroughly tested.
- I expect detailed explanations for any complex logic or decisions.
- Do not make changes to the folder `node_modules`.
- Do not make changes to the file `package-lock.json`.

## System Architecture

### UI/UX Decisions
The system utilizes the Carbon Design System patterns, implemented with Shadcn UI components. Typography employs IBM Plex Sans for general text and IBM Plex Mono for financial figures. A blue/gray color palette is optimized for financial dashboards, and layouts use max-width containers with responsive grid designs, adhering to a consistent 4px-based spacing system.

### Technical Implementations
The application follows a client-server architecture. The frontend is built with React, leveraging React Query for data fetching and cache invalidation. The backend is implemented with Node.js, using PostgreSQL as the primary database. Drizzle-ORM is used for database interactions, with drizzle-zod for schema validation. Role-based access control is enforced at both the frontend and API levels. Authentication is handled via Replit Auth (OpenID Connect) with custom role assignments stored in the `users` table. Slack webhooks are integrated for approval notifications.

### Feature Specifications
- **Dashboard**: Displays key performance indicators (KPIs) like Total Portfolio Cap, Stipend Paid (YTD), Stipend Committed, Available Balance, and Pending Approvals. Portfolio cards show financial metrics (Cap, Utilized, Committed, Remaining) with color-coded utilization bars.
- **Stipend Request Workflow**: Multi-level approval process (PSM → Lead PSM → Finance), with status tracking and automatic ledger entry creation upon final approval.
- **Inter-PSM Allocation System**: Enables PSMs to transfer stipends between practices within their portfolios, with automatic ledger adjustments.
- **Practice-Level Ledger Tracking**: Records all financial transactions including opening balances, remeasurement adjustments, paid stipends, committed stipends, and inter-PSM allocations.
- **Stipend Cap Calculation**: Automatically calculated based on `0.6 * Gross Margin % + 0.4 * Collections %` during BigQuery data imports.
- **Pay Period Management**: Manages 14-day pay periods, triggering BigQuery data imports, remeasurement calculations, and automatic ledger entries.
- **Negative Earnings Cap System**: Tracks negative earnings caps, allows PSMs to request additional caps, and requires Finance approval.
- **Settings Page (Admin/Finance)**: Provides CRUD interfaces for managing Portfolios, Practices, and Users, including role and portfolio assignments. Includes safe-delete validation and CSV template download for BigQuery data.

### System Design Choices
- **Database Schema**: Core tables include `users`, `portfolios`, `practices`, `practice_metrics` (BigQuery import data), `practice_ledger` (transaction history), `stipend_requests`, `inter_psm_allocations`, `pay_periods`, `practice_reassignments`, and `negative_earnings_cap_requests`. Relationships are defined to link practices to portfolios, metrics, and ledger entries.
- **API Endpoints**: A comprehensive set of RESTful APIs for user authentication, dashboard data, portfolio and practice management, stipend requests, approvals, allocations, pay period management, and system settings. All protected endpoints enforce role-based access control.
- **Security**: Session-based authentication with PostgreSQL storage and robust role-based access control are implemented across the application. Numeric balance validation prevents overdrafts.

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Replit Auth**: Used for user authentication (OpenID Connect).
- **Slack Webhooks**: For sending approval notifications.
- **BigQuery**: Source for practice metrics and stipend cap data (currently integrated via CSV imports).
- **Shadcn UI**: Frontend component library for building the user interface.
- **Drizzle-ORM**: TypeScript ORM for interacting with PostgreSQL.
- **React Query**: For data fetching, caching, and state management on the frontend.
# Finni Health - Stipend Management System

## Overview
Finni Health is a stipend management system for 60+ ABA practices across five portfolios. Its core purpose is to streamline multi-level approval workflows for stipend requests, track practice-level ledgers, and provide real-time portfolio analytics. The system centralizes stipend management, enhances financial transparency, and supports efficient fund allocation within the Finni Health network. The project aims to improve operational efficiency and financial oversight for stipend-related activities.

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
The system uses Carbon Design System patterns, implemented with Shadcn UI components. Typography is IBM Plex Sans for text and IBM Plex Mono for financial figures. A blue/gray color palette is used for dashboards, with responsive grid designs and a 4px-based spacing system.

### Technical Implementations
The application uses a client-server architecture. The frontend is React with React Query for data fetching. The backend is Node.js with PostgreSQL as the database, using Drizzle-ORM and drizzle-zod for schema validation. Role-based access control is enforced, and authentication uses Replit Auth (OpenID Connect) with custom roles. Slack webhooks are integrated for notifications.

### Feature Specifications
- **Dashboard**: Displays KPIs such as Total Portfolio Cap, Stipend Paid (YTD), Stipend Committed, Available Balance, and Pending Approvals, with portfolio-specific financial metrics.
- **Stipend Request Workflow**: A two-level approval process (Lead PSM → Finance) with status tracking and automatic ledger entry creation.
- **Two-Tier Allocation System**: Supports two allocation types: (1) **Practice-to-Practice** allocations where PSMs and Lead PSMs can transfer stipends between practices within their own portfolio by selecting a recipient PSM, and (2) **Inter-Portfolio** allocations where PSMs can transfer stipends to another portfolio's suspense account for later distribution. Lead PSMs can then allocate funds from their portfolio's suspense account to individual practices within their portfolio. All allocations automatically create proper ledger entries with transaction types (allocation_out, allocation_in, suspense_in, suspense_out) and enforce balance validation in both UI and backend. Finance and Admin roles can allocate from any practice regardless of portfolio. The system pre-fetches portfolio data for optimal user experience when switching between allocation types.
- **Practice-Level Ledger Tracking**: Records all financial transactions including opening balances, remeasurement adjustments, paid/committed stipends, and inter-PSM allocations.
- **Stipend Cap Calculation**: Automatically calculated based on `0.6 * Gross Margin % + 0.4 * Collections %` via BigQuery data imports.
- **Pay Period Management**: Manages 14-day pay periods, triggering BigQuery data imports, remeasurement calculations, and automatic ledger entries. All stipend requests are tied to specific pay periods.
- **Negative Earnings Cap System**: Tracks negative earnings caps and facilitates requests for additional caps requiring Finance approval.
- **Settings Page (Admin/Finance)**: Provides CRUD operations for Portfolios, Practices, and Users, including role/portfolio assignments, safe-delete validation, and CSV template downloads for BigQuery data.
- **Finance Ops Page**: A centralized page for Finance and Admin roles with "Pay Periods" and "All Stipends" tabs. The "Pay Periods" tab displays current pay period information, BigQuery CSV import functionality, and a table of all pay periods. The "All Stipends" tab provides a comprehensive, filterable, and exportable table of all approved stipends.
- **Enhanced Stipend Request Details**: Stipend requests include a required `stipendDescription` field and a conditional `staffEmails` field for "Staff Cost Reimbursement" types. Ledger history tables display "Stipend Type" and "Stipend Description."
- **Approval System Enhancements**: Approval actions now include optional comments, and all approval stages (Lead PSM, Finance) properly record timestamps and approvers. Table rows are clickable to navigate to detail pages.
- **Request Detail Page Actions**: Approve/Reject buttons are available directly on the request detail page for users with appropriate permissions, using the same logic as the main Approvals page.

### System Design Choices
- **Database Schema**: Key tables include `users`, `portfolios`, `practices`, `practice_metrics`, `practice_ledger`, `stipend_requests`, `inter_psm_allocations`, `pay_periods`, `practice_reassignments`, and `negative_earnings_cap_requests`.
- **API Endpoints**: RESTful APIs support all application functions, secured with role-based access control.
- **Security**: Session-based authentication with PostgreSQL storage and robust role-based access control, including numeric balance validation.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Replit Auth**: User authentication (OpenID Connect).
- **Slack Webhooks**: Approval notifications.
- **BigQuery**: Source for practice metrics and stipend cap data (via CSV imports).
- **Shadcn UI**: Frontend component library.
- **Drizzle-ORM**: TypeScript ORM for PostgreSQL.
- **React Query**: Frontend data fetching and state management.
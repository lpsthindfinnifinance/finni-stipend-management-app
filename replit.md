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
The system uses Carbon Design System patterns, implemented with Shadcn UI components. Typography is IBM Plex Sans for text and IBM Plex Mono for financial figures. A blue/gray color palette is used for dashboards, with responsive grid designs and a 4px-based spacing system. The header displays the Finni Health logo on the left side, with role and portfolio switcher dropdowns on the right, allowing users to dynamically change their role (Admin, Finance, Lead PSM, PSM) and portfolio (G1-G5) for testing and demonstration purposes.

**Multi-Role System**: Users can be assigned multiple roles simultaneously. The `role` field stores the currently active role, while the `roles` array field stores all assigned roles. In the Settings page, Admin/Finance users can assign additional roles via checkboxes (in addition to the primary role). The role switcher in the header only displays roles assigned to the current user, automatically hiding the switcher for single-role users. When switching roles, backend validation ensures users can only switch to roles they've been assigned. The primary role checkbox is automatically checked and disabled in the Settings form to prevent removal.

### Technical Implementations
The application uses a client-server architecture. The frontend is React with React Query for data fetching. The backend is Node.js with PostgreSQL as the database, using Drizzle-ORM and drizzle-zod for schema validation. Role-based access control is enforced, and authentication uses Replit Auth (OpenID Connect) with custom roles. Slack webhooks are integrated for notifications.

**Authentication Implementation**: The system uses a helper function `getUserFromClaims` that performs email-first user lookups with ID fallback to handle both new OIDC users (where database ID matches OIDC sub) and legacy users (where database ID differs from OIDC sub). This ensures seamless authentication for all users regardless of when they joined the system. The query client handles 401 responses gracefully by returning null instead of throwing errors, and 304 (Not Modified) responses properly return cached data.

### Feature Specifications
- **Dashboard**: Displays KPIs such as Total Portfolio Cap, Stipend Paid (YTD), Stipend Committed, Available Balance, and Pending Approvals, with portfolio-specific financial metrics.
- **Stipend Request Workflow**: A two-level approval process (Lead PSM → Finance) with status tracking and automatic ledger entry creation. **Role-based Approval Visibility**: When a request is approved by Lead PSM (status becomes `pending_finance`), it appears differently based on role: PSM users see it in "Pending" tab with "Pending Finance" status (as it still awaits final approval), Lead PSM users see it in "Approved" tab with "Pending Finance" status (their work is done), and Finance users see it in "Pending" tab until they approve it. Once fully approved by Finance (status becomes `approved`), all roles see it in the "Approved" tab. Real-time UI updates ensure approved/rejected requests move between tabs instantly without page refresh.
- **Practice Allocation System**: A simplified practice-to-practice allocation system where users can transfer stipends between practices. The UI provides two separate tables for donor and recipient selection, with amount inputs for each practice. Total donor amount must equal total recipient amount. The system creates `allocation_out` ledger entries for each donor practice (negative amounts) and `allocation_in` ledger entries for each recipient practice (positive amounts). Donor practices are automatically excluded from the recipient list to prevent self-allocation. All allocations are marked as "completed" immediately upon creation. **Permission Model**: PSMs can only allocate from practices in their portfolio to other practices within their portfolio. Lead PSMs, Finance, and Admin roles can allocate from any practice to any practice across all portfolios. The allocations page displays a single table of all allocations with donor/recipient practice information. All allocations automatically create proper ledger entries with transaction types (allocation_out, allocation_in) and enforce balance validation in both UI and backend.
- **Practice-Level Ledger Tracking**: Records all financial transactions including opening balances, remeasurement adjustments, paid/committed stipends, and inter-PSM allocations.
- **Stipend Cap Calculation**: Automatically calculated based on `0.6 * Gross Margin % + 0.4 * Collections %` via BigQuery data imports.
- **Pay Period Management**: Manages 14-day pay periods, triggering BigQuery data imports, remeasurement calculations, and automatic ledger entries. All stipend requests are tied to specific pay periods.
- **Negative Earnings Cap System**: Tracks negative earnings caps and facilitates requests for additional caps requiring Finance approval.
- **Settings Page (Admin/Finance)**: Provides CRUD operations for Portfolios, Practices, and Users, including role/portfolio assignments, safe-delete validation, and CSV template downloads for BigQuery data.
- **Finance Ops Page**: A centralized page for Finance and Admin roles with "Pay Periods" and "All Stipends" tabs. The "Pay Periods" tab displays current pay period information, BigQuery CSV import functionality, and a table of all pay periods. The "All Stipends" tab provides a comprehensive, filterable, and exportable table of all approved stipends. When filtering by a specific pay period, requests with cancelled periods are properly excluded from the filtered results (both table display and CSV export use the shared `shouldShowRequestForPeriod` helper function).
- **Enhanced Stipend Request Details**: Stipend requests include a required `stipendDescription` field and a conditional `staffEmails` field for "Staff Cost Reimbursement" types. Ledger history tables display "Stipend Type" and "Stipend Description."
- **Approval System Enhancements**: Approval actions now include optional comments, and all approval stages (Lead PSM, Finance) properly record timestamps and approvers. Table rows are clickable to navigate to detail pages.
- **Request Detail Page Actions**: Approve/Reject buttons are available directly on the request detail page for users with appropriate permissions, using the same logic as the main Approvals page.
- **Stipend Amount Editing**: Finance and Admin users can edit committed stipend amounts on individual request detail pages via the Pay Period Breakdown table. The "Edit" button appears only for periods with "Committed" status (not for Paid or Cancelled periods). Editing updates only the specific pay period's ledger entry, leaving other periods unchanged. This enables precise adjustments to individual installments in recurring stipend requests without affecting the entire request.
- **Portfolio-Based Access Control**: PSM users can only view practice details, balances, ledgers, pending requests, and stipend request details for practices within their assigned portfolio. Lead PSM, Finance, and Admin users can view all practices and requests across all portfolios. On the Practices page, PSM users see all practices but can only click on practices in their portfolio - out-of-portfolio practices are visually disabled (faded with opacity-50, not-allowed cursor) and non-clickable. The "My Requests" page only shows PSM users their requests for practices in their current portfolio. When PSM users attempt to directly access practice/request URLs outside their portfolio (via URL navigation), they receive a 403 error with an "Access Denied" toast notification and are redirected to /dashboard (for practices) or /requests (for stipend requests) after 1.5 seconds. The backend enforces this access control on all relevant API endpoints, and the frontend gracefully handles 403 responses with user-friendly error messages.

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
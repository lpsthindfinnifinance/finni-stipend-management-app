# Finni Health - Stipend Management System

## Overview
Finni Health is a comprehensive stipend management system designed for 60+ ABA practices across five portfolios (G1-G5). Its primary purpose is to streamline multi-level approval workflows for stipend requests, track practice-level ledgers, and provide real-time portfolio analytics. The system aims to centralize stipend management, enhance financial transparency, and support efficient allocation of funds across practices within the Finni Health network.

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
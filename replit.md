# Finni Health - Stipend Management System

## Overview
Finni Health is a comprehensive stipend management system designed for 60+ ABA practices across five portfolios (G1-G5). Its primary purpose is to streamline multi-level approval workflows for stipend requests, track practice-level ledgers, and provide real-time portfolio analytics. The system aims to centralize stipend management, enhance financial transparency, and support efficient allocation of funds across practices within the Finni Health network.

## Recent Changes
- **2025-10-31**: Removed PSM Approval Step from Workflow
  - **Workflow Simplification**: Changed approval workflow from 3-level (PSM → Lead PSM → Finance) to 2-level (Lead PSM → Finance)
  - **Database Schema Changes**:
    - Dropped `psmApprovedAt`, `psmApprovedBy`, and `psmComment` columns from `stipend_requests` table
    - Changed default status from "pending_psm" to "pending_lead_psm"
    - Updated all existing pending requests to new default status
  - **Backend Updates**:
    - Removed PSM approval logic from `updateStipendRequestStatus()` in server/storage.ts
    - Removed "pending_psm" status from all backend queries and filters
    - Updated dashboard pending counts to exclude PSM approval step
  - **Frontend Updates**:
    - Removed PSM approval UI from Approvals page (client/src/pages/approvals.tsx)
    - Removed PSM approval step from Request Detail approval timeline (client/src/pages/stipend-request-detail.tsx)
    - Updated `canApprove()` function to remove PSM role check
  - **UI Enhancements**:
    - Removed 'Description' column from Ledger History table for cleaner display
    - Added 'Stipend Description' column to Pending Stipend Requests table for better context
  - **Rationale**: PSMs should not approve their own requests; Lead PSM approval provides sufficient oversight

- **2025-10-31**: Enhanced Stipend Request Tracking with Descriptions and Staff Emails
  - **Stipend Description Field**:
    - Added `stipendDescription` field (varchar 500) to all stipend requests
    - Form field appears below Stipend Type selection in New Request form
    - Required field with minimum 5 characters, maximum 500 characters
    - Displayed in Ledger History table for better transaction context
  - **Staff Emails Field** (Conditional):
    - Added `staffEmails` field (varchar 500) to stipend_requests table
    - Only appears when "Staff Cost Reimbursement Item" stipend type is selected
    - Required when visible, minimum 5 characters
    - Tracks staff email addresses for cost reimbursement items
  - **Practice Ledger Enhancement**:
    - Added "Stipend Type" and "Stipend Description" columns to Practice Detail ledger history table
    - Backend `getPracticeLedger()` now left joins with `stipend_requests` table
    - Shows stipend type as a badge and description in dedicated columns
    - Non-stipend transactions (opening balance, remeasurement, etc.) show "—" placeholder
  - **Technical Implementation**:
    - Database schema updated with two new nullable varchar(500) fields
    - Backend JOIN retrieves stipendType and stipendDescription when available
    - Frontend conditionally renders Staff Emails field based on stipend type selection
    - StatusBadge component used for stipend type display in ledger table

- **2025-10-31**: Enhanced Approval System with Comments, Timestamps & Clickable Table Rows
  - **Approval Comments Feature**:
    - Added three new fields to `stipend_requests` table: `psmComment`, `leadPsmComment`, `financeComment`
    - Backend approval endpoint now accepts optional `comment` parameter
    - `updateStipendRequestStatus()` saves comments based on approval stage (PSM/Lead PSM/Finance)
    - **Approvals Page**: Added approval dialog with comment field (optional, minimum 5 characters if provided)
    - **Request Detail Page**: Comments displayed in approval timeline for each completed stage in muted background boxes
    - Real-time validation: Comment field shows error and disables approval button if less than 5 characters
    - Comments are optional - approvers can skip or add context to their decisions
  - **Approval Timestamp Tracking** (Bug Fix):
    - Fixed critical bug where PSM and Lead PSM approval timestamps/usernames weren't being saved
    - Removed incorrect `status.includes("approved")` check that prevented PSM/Lead PSM data recording
    - Now properly saves approval data at each stage: PSM → Lead PSM → Finance
    - Timestamps stored in UTC, displayed in user's local timezone with time
    - Changed from `formatDate()` to `formatDateTime()` to show both date and time
  - **Clickable Table Rows**:
    - **Pending Requests Table**: Entire row now clickable (not just request ID link)
    - **Ledger History Table**: Rows with `relatedRequestId` now fully clickable
    - Removed individual links from cells - navigation happens via row click
    - Added `cursor-pointer` and `hover-elevate` classes for visual affordance
    - Simplified description rendering (no more regex parsing and link splitting)
  - **Technical Implementation**:
    - Row onClick uses `window.location.href` for navigation
    - Conditional clickability based on `relatedRequestId` existence in ledger
    - Proper data-testid attributes for both clickable and non-clickable rows
    - Type-safe comment handling with proper null checks in UI
    - Database stores timestamps in UTC (PostgreSQL default)
    - JavaScript/Browser automatically converts to user's local timezone for display
  - **E2E Testing**: Verified clickable rows navigate correctly, approval timeline displays all stages with comments
  - **Note**: Existing requests approved before this fix will not have PSM/Lead PSM data retroactively

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
- **Stipend Request Workflow**: Two-level approval process (Lead PSM → Finance), with status tracking and automatic ledger entry creation upon final approval.
- **Inter-PSM Allocation System**: Enables PSMs to transfer stipends between practices within their portfolios, with automatic ledger adjustments.
- **Practice-Level Ledger Tracking**: Records all financial transactions including opening balances, remeasurement adjustments, paid stipends, committed stipends, and inter-PSM allocations.
- **Stipend Cap Calculation**: Automatically calculated based on `0.6 * Gross Margin % + 0.4 * Collections %` during BigQuery data imports.
- **Pay Period Management**: Manages 14-day pay periods, triggering BigQuery data imports, remeasurement calculations, and automatic ledger entries.
- **Negative Earnings Cap System**: Tracks negative earnings caps, allows PSMs to request additional caps, and requires Finance approval.
- **Settings Page (Admin/Finance)**: Provides CRUD interfaces for managing Portfolios, Practices, and Users, including role and portfolio assignments. Includes safe-delete validation and CSV template download for BigQuery data.

### System Design Choices
- **Database Schema**: Core tables include `users`, `portfolios`, `practices`, `practice_metrics`, `practice_ledger`, `stipend_requests`, `inter_psm_allocations`, `pay_periods`, `practice_reassignments`, and `negative_earnings_cap_requests`. Relationships are defined to link practices to portfolios, metrics, and ledger entries.
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
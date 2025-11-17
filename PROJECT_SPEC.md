# iOpes Dealer Dashboard - Project Specification

## Overview
Comprehensive dealer dashboard implementation including derogatory account management, loan closure functionality, VIN verification, reporting, client profiles, and verification services for dealer organizations.

---

## Phase 2: Dealer Dashboard & Reports Enhancement

### Overview
Phase 2 extends the existing iOpes Dealer Dashboard with enhanced reporting, risk tracking, verification capabilities, and improved dealer workflows. The app already includes multi-tenant role architecture, DocuSign signing flows, Stripe payments and KYC, Twilio verification, Supabase RLS, and role-based dashboards.

---

## Phase 2 Feature Checklist

### Feature 2.1: VIN Verification (Create Loan Tab)
- [x] **2.1.1** Integrate NHTSA VIN Decoder API
  - [x] Create VIN decoder utility (`/utils/vin-decoder.ts`)
  - [x] Implement VIN format validation (17 chars, no I/O/Q)
  - [x] Auto-fill Year, Make, Model, Trim from NHTSA API
- [x] **2.1.2** Add VIN verification UI to Create Loan form
  - [x] VIN input field with character validation
  - [x] "Verify VIN" button (manual trigger)
  - [x] Display verification status (loading, success, error)
  - [x] Show verified vehicle details (read-only fields)
  - [x] Character counter and format validation feedback
- [x] **2.1.3** Duplicate VIN/Client Detection
  - [x] Check for duplicate loans by VIN immediately on verification (before form submission)
  - [x] Check for duplicate loans by client (email, phone, full name + DOB)
  - [x] Query all loan statuses (open, pending, funded, closed, derogatory, settled)
  - [x] Display red banner alert with existing loan # if duplicate found
  - [x] Prevent loan creation if duplicate exists (no admin override)
  - [x] Add database query to check for existing loans
  - [x] Create API endpoint `/api/loans/check-duplicate`
  - [x] Simplified UI banner showing loan #, customer name, status, and view link

### Feature 2.2: Reports Tab (Dealer Analytics)
- [ ] **2.2.1** Create Reports Tab Navigation
  - [ ] Add "Reports" to dashboard sidebar
  - [ ] Create `/dashboard/reports` route
  - [ ] Implement role-based access control
- [ ] **2.2.2** Funding & Collection Report
  - [ ] Design report layout and metrics
  - [ ] Calculate total funded amount
  - [ ] Calculate total collected amount
  - [ ] Calculate outstanding balance
  - [ ] Show collection rate percentage
  - [ ] Display by date range: Last 7 days, Last 30 days, Last 90 days, Custom
  - [ ] Define and implement risk color thresholds (to be determined and provided)
- [ ] **2.2.3** Account Status Report
  - [ ] Show breakdown by loan status (Active, Late, Derogatory, Closed)
  - [ ] Display count and percentage for each status
  - [ ] Calculate dealer longevity from account creation date
  - [ ] Show derogatory rate percentage
  - [ ] Include risk indicators with color coding
- [ ] **2.2.4** Report Generation & Download
  - [ ] Implement in-app report viewing
  - [ ] Add PDF export functionality
  - [ ] Auto date-stamp PDFs
  - [ ] Include Dealer ID in PDF filename
  - [ ] Create PDF template with branding
- [ ] **2.2.5** Batch Report Generation (Cron)
  - [ ] Create cron job for weekly report generation
  - [ ] Schedule for Friday morning execution (use UTC for simplicity)
  - [ ] Generate reports for all active dealers
  - [ ] Store generated reports in database/storage
  - [ ] Send email notification with report link
- [ ] **2.2.6** Consolidated Admin Reports
  - [ ] Create admin-level consolidated reports
  - [ ] Aggregate data across all dealers
  - [ ] Add dealer comparison metrics

### Feature 2.3: Dashboard Navigation Enhancement
- [ ] **2.3.1** Update Dashboard Sidebar
  - [ ] Add new navigation items to existing sidebar:
    - [ ] Reports
    - [ ] Collections
  - [ ] Maintain existing navigation items (Create Loan, Clients, Settings already exist)
  - [ ] Role-based visibility already implemented
  - [ ] Add icons for new navigation items
  - [ ] Ensure mobile responsiveness
  - [ ] Note: Derogatory Accounts accessible via Loans page filter (no separate nav needed)

### Feature 2.4: Client Profile Enhancements
- [ ] **2.4.1** DocuSign Contract Integration
  - [ ] Display DocuSign contract link in client profile
  - [ ] Add PDF preview/viewer for contract
  - [ ] Show contract status (signed, pending, terminated)
- [ ] **2.4.2** Reference Information Display
  - [ ] Show client references in profile
  - [ ] Display reference contact information
  - [ ] Add reference verification status
- **Note:** Credit card display, ID verification, and loan discharge functionality already handled by existing Stripe integration and Close Loan feature

### Feature 2.5: Derogatory Accounts Tab Enhancement
- [x] **2.5.1** Automatic Derogatory Population (2 weeks past due)
  - [x] Create cron job to detect late payments
  - [x] Add `is_late` and `days_overdue` fields to loans
  - [x] Flag accounts 2 weeks past scheduled payment date
  - [x] Display in Derogatory Accounts tab
- [x] **2.5.2** Manual Derogatory Marking
  - [x] Add "Mark as Derogatory" button
  - [x] Create derogatory reason selection dialog
  - [x] Implement standardized reason field
- [x] **2.5.3** Derogatory Notes Section
  - [x] Add notes field to derogatory dialog
  - [x] Store notes with derogatory record
- [ ] **2.5.4** Derogatory Notifications
  - [ ] Send email notification to dealer who created the loan when marked derogatory
  - [ ] Send email notification to borrower when marked derogatory
  - [ ] Send immediately when loan is marked as derogatory
  - [ ] Use Resend for email notifications
  - [ ] Include loan details and reason in notification

### Feature 2.6: Double Loan Alert System
- [ ] **2.6.1** Duplicate Detection Logic
  - [ ] Check for existing open/pending loans by VIN
  - [ ] Check for existing open/pending loans by client
  - [ ] Query database on loan creation attempt
- [ ] **2.6.2** Alert Display
  - [ ] Show banner call-out with existing loan #
  - [ ] Display alert prominently on create loan page
  - [ ] Include link to existing loan details
  - [ ] Prevent form submission if duplicate exists
- [ ] **2.6.3** No Override Mechanism
  - [ ] Ensure no admin override capability
  - [ ] Block loan creation at API level
  - [ ] Return clear error message

### Feature 2.7: Client Notes System
- **Status:** Deferred to future phase

### Feature 2.8: iOpes Verified Product (Separate Dashboard)
- [ ] **2.8.1** Verified Dashboard Route Setup
  - [ ] Create `/verified/*` route structure
  - [ ] Build separate dashboard layout
  - [ ] Implement role-based access
- [ ] **2.8.2** Verification Form (Simplified)
  - [ ] Create verification form with fields: Name, Email, Phone, Address only
  - [ ] Implement form validation
  - [ ] Do NOT store private information (SSN, DOB, etc.)
  - [ ] Store only: name, email, phone, address
- [ ] **2.8.3** Stripe Identity Verification Integration
  - [ ] Use Stripe Identity Verification service (paid API)
  - [ ] Integrate Stripe verification modal
  - [ ] Handle verification session creation
  - [ ] Process verification results from Stripe
  - [ ] Handle API errors and edge cases
  - [ ] No local storage of verification documents
- [ ] **2.8.4** Client Verified Certification PDF
  - [ ] Design PDF certificate template
  - [ ] Include iOpes branding
  - [ ] Add dealer logo
  - [ ] Include timestamp and verification ID
  - [ ] Generate PDF after successful verification
  - [ ] Store PDF in secure storage (Supabase Storage)
- [ ] **2.8.5** Stripe Billing for Verifications
  - [ ] Require credit card connection for dealers
  - [ ] Implement Stripe Checkout for instant charge
  - [ ] Set pricing at $5.00 per verification
  - [ ] Charge immediately upon verification request
  - [ ] Handle payment success/failure
  - [ ] Send receipt to dealer
- [ ] **2.8.6** Verified Clients Section in Main Dashboard
  - [ ] Create "Verified Clients" section (separate from loan clients)
  - [ ] Display verified clients list
  - [ ] Show verification status and date
  - [ ] Link to verification certificate
  - [ ] No cross-reference with loan clients (completely separate)

### Feature 2.9: Derogatory Reason Button (Manual Flagging)
- [x] **2.9.1** Derogatory Reason Selection
  - [x] Implement predefined reasons:
    - Accident
    - Repo
    - Trade-In
    - Return
    - Exchange
    - Disaster
    - Other (with notes)
  - [x] Create confirmation modal
  - [x] Require reason selection before finalizing

---

## Phase 2 Implementation Summary

### ✅ Completed Features:
1. **VIN Verification (2.1.1 & 2.1.2)** - NHTSA API integration with UI
2. **Duplicate VIN/Client Detection (2.1.3)** - Real-time duplicate checking with clean UI
3. **Late Payment Detection (2.5.1)** - Cron job and database fields
4. **Manual Derogatory Marking (2.5.2 & 2.5.3)** - Dialog with reasons and notes
5. **Derogatory Reason Button (2.9.1)** - Confirmation modal

### 🚧 Priority Implementation Order:
1. **Derogatory Notifications (2.5.4)** - Email to dealer and borrower
4. **Reports Tab (2.2)** - Dealer analytics and metrics
5. **Dashboard Navigation (2.3)** - Add Reports and Collections
6. **Client Profile Enhancements (2.4)** - DocuSign and references
7. **iOpes Verified Product (2.8)** - Separate verification service

### 📋 Deferred Features:
- **Client Notes System (2.7)** - Future phase
- **VIN Verification Audit Trail (2.1.4)** - Not needed (VIN verification complete)

### 🔑 Key Technical Notes:
- **Duplicate Detection:** Check all loan statuses (open, pending, funded, closed, derogatory, settled)
- **Duplicate Criteria:** VIN + Client (email, phone, name+DOB)
- **Reports Date Ranges:** Last 7/30/90 days + Custom
- **Batch Reports:** Friday morning UTC
- **Verification Pricing:** $5.00 per verification
- **Stripe Integration:** Use Stripe Identity Verification (no local storage)
- **Notifications:** Immediate email via Resend to dealer + borrower
- **Navigation:** Add to existing sidebar (Reports, Collections only)

---

## Feature 1: Derogatory Account Management

### Requirements Summary
- **Purpose**: Track and manage loans that become non-performing due to missed payments, repossession, accidents, or other dealer-initiated reasons
- **Status**: Single "Derogatory" status with reason field
- **Trigger**: Manual (dealer action) or Automatic (2+ missed payments with dealer confirmation)
- **Billing Impact**: Stop all invoices, create single invoice for full remaining balance
- **Resolution**: Marked as "Settled" when paid in full (cannot be restored to active)

---

## Task Checklist

### Phase 1: Database & Schema Updates
- [x] **1.1** Add `derogatory_status` field to loans table (boolean, default false)
- [x] **1.2** Add `derogatory_reason` field to loans table (text, nullable)
- [x] **1.3** Add `derogatory_date` field to loans table (timestamp, nullable)
- [x] **1.4** Add `derogatory_marked_by` field to loans table (user ID reference)
- [x] **1.5** Add `derogatory_type` field to loans table (enum: 'manual' or 'automatic')
- [x] **1.6** Add `missed_payment_threshold` field to organizations table (integer, default 2)
- [x] **1.7** Add new loan status: 'derogatory' to status enum
- [x] **1.8** Add new loan status: 'settled' to status enum
- [x] **1.9** Add new loan status: 'closed' to status enum
- [x] **1.10** Create migration for all schema changes

### Phase 2: Derogatory Reason Options
- [x] **2.1** Define predefined derogatory reasons:
  - Repossession
  - Accident/Total Loss
  - Trade-in
  - Return
  - Exchange
  - Natural Disaster
  - Voluntary Surrender
  - Missed Payments
  - Other (with text field)
- [x] **2.2** Create constants file for derogatory reasons
- [x] **2.3** Create TypeScript types for derogatory data

### Phase 3: Automatic Derogatory Detection
- [ ] **3.1** Create cron job API route `/api/cron/detect-derogatory`
- [ ] **3.2** Implement logic to detect loans with X missed payments (configurable per org)
- [ ] **3.3** Flag loans as "pending_derogatory_review" (new status)
- [ ] **3.4** Send notification to organization users about flagged accounts
- [ ] **3.5** Create "Pending Review" filter/badge in loans table
- [ ] **3.6** Add Vercel cron configuration for daily execution

### Phase 4: Manual Derogatory Marking (Dealer Action)
- [x] **4.1** Add "Mark as Derogatory" action button to loans table
- [x] **4.2** Create derogatory confirmation dialog component
  - [x] Dropdown for predefined reasons
  - [x] Text field for "Other" reason
  - [x] Display current balance and remaining payments
  - [x] Warning message about stopping billing
  - [x] Require reason selection (validation)
- [x] **4.3** Create API route `/api/loans/[id]/mark-derogatory`
- [x] **4.4** Implement Stripe invoice cancellation logic
  - [x] Fetch all open/draft invoices for loan
  - [x] Void all open invoices
  - [x] Delete all draft/scheduled invoices
- [x] **4.5** Calculate total remaining balance
  - [x] Sum of unpaid invoices
  - [x] Plus all future scheduled payments
- [x] **4.6** Create single "Final Balance Due" invoice in Stripe
- [x] **4.7** Update loan status to 'derogatory'
- [x] **4.8** Store derogatory metadata (reason, date, marked_by)
- [ ] **4.9** Send notification email to borrower about derogatory status (TODO: Phase 8)

### Phase 5: Automatic Derogatory Confirmation (From Flagged)
- [ ] **5.1** Add "Confirm Derogatory" action for pending_derogatory_review loans
- [ ] **5.2** Create confirmation dialog for auto-flagged accounts
  - [ ] Show missed payment details
  - [ ] Allow adding/editing reason
  - [ ] Option to dismiss flag (if resolved)
- [ ] **5.3** Reuse mark-derogatory API logic
- [ ] **5.4** Track that it was auto-detected but manually confirmed

### Phase 6: Loan Status Filters (Horizontal Filter Bar)
- [x] **6.1** Design horizontal filter bar component above loans table
- [x] **6.2** Implement filter options:
  - [x] "All" (default)
  - [x] "On Time" (no late payments)
  - [x] "Late" (1 missed payment, not yet derogatory) - TODO: Phase 12
  - [x] "Pending Review" (auto-flagged for derogatory)
  - [x] "Derogatory" (marked as derogatory)
  - [x] "Settled" (derogatory but paid in full)
  - [x] "Closed" (manually closed)
  - [x] "Active" (funded and current)
- [x] **6.3** Add filter state management
- [x] **6.4** Update loans query to filter by selected status
- [x] **6.5** Show count badges on each filter option
- [x] **6.6** Style active filter with highlight

### Phase 7: Derogatory Status Display
- [x] **7.1** Add "Derogatory" badge/tag to loan cards and table rows
- [x] **7.2** Style derogatory loans with red/warning color scheme
- [x] **7.3** Display derogatory reason in loan details
- [x] **7.4** Show derogatory date and marked by user (in badge)
- [x] **7.5** Display "Final Balance Due" amount prominently (in DerogatoryInfoCard component)
- [x] **7.6** Show link to final balance invoice (available in component)

### Phase 8: Settlement (Paid in Full)
- [ ] **8.1** Create webhook handler for derogatory invoice payment
- [ ] **8.2** Update loan status from 'derogatory' to 'settled' when paid
- [ ] **8.3** Send confirmation email to borrower
- [ ] **8.4** Send notification to organization
- [ ] **8.5** Update dashboard metrics

### Phase 9: Dashboard Metrics
- [ ] **9.1** Add "Derogatory Accounts" stat card to dashboard
- [ ] **9.2** Calculate derogatory rate percentage
- [ ] **9.3** Add "Pending Review" count to dashboard
- [ ] **9.4** Add "Settled Accounts" metric
- [ ] **9.5** Update existing metrics to exclude derogatory loans
- [ ] **9.6** Add derogatory trend chart (optional)

### Phase 10: Organization Settings (Missed Payment Threshold)
- [ ] **10.1** Add setting in organization settings page
- [ ] **10.2** Allow configuring missed payment threshold (1-4 weeks)
- [ ] **10.3** Create API to update organization settings
- [ ] **10.4** Use org-specific threshold in derogatory detection cron

---

## Feature 2: Manual Loan Closure

### Requirements Summary
- **Purpose**: Close loans early for reasons other than derogatory (trade-ins, deals, payoffs)
- **Billing Impact**: Cancel all remaining invoices (paid and unpaid)
- **Status**: Marked as "Closed"
- **Difference from Derogatory**: No final balance due, no negative connotation

---

## Task Checklist

### Phase 11: Manual Loan Closure
- [x] **11.1** Add "Close Loan" action button to loans table
- [x] **11.2** Create closure confirmation dialog
  - [x] Dropdown for closure reasons:
    - Trade-in
    - Early Payoff
    - Refinanced
    - Dealer Agreement
    - Customer Request
    - Other (with text field)
  - [x] Display remaining balance (if any)
  - [x] Option to waive remaining balance
  - [x] Warning about stopping billing
  - [x] Require reason selection
- [x] **11.3** Create API route `/api/loans/[id]/close`
- [x] **11.4** Implement closure logic:
  - [x] Cancel all open/draft Stripe invoices
  - [x] Void unpaid invoices (or optionally create final invoice)
  - [x] Update loan status to 'closed'
  - [x] Store closure reason and date
- [x] **11.5** Add `closure_reason` field to loans table (Phase 1)
- [x] **11.6** Add `closure_date` field to loans table (Phase 1)
- [x] **11.7** Add `closed_by` field to loans table (user ID) (Phase 1)
- [ ] **11.8** Send notification to borrower about closure (TODO: Phase 8)
- [x] **11.9** Display closed loans in table with "Closed" badge
- [x] **11.10** Add "Closed" to status filters

---

## Feature 3: Late Payment Detection & Tracking

### Requirements Summary
- **Purpose**: Track loans with 1 missed payment (not yet derogatory)
- **Display**: Show as "Late" in filters and with warning badge
- **Action**: Alert dealers before auto-flagging for derogatory

---

## Task Checklist

### Phase 12: Late Payment Tracking
- [ ] **12.1** Create function to detect late payments (1 missed payment)
- [ ] **12.2** Add "Late" status/flag to loans
- [ ] **12.3** Display "Late" badge on loan cards/rows
- [ ] **12.4** Show days overdue
- [ ] **12.5** Add to "Late" filter in horizontal filter bar
- [ ] **12.6** Send reminder notification to borrower
- [ ] **12.7** Alert organization about late accounts

---

## Technical Implementation Details

### Database Schema Changes

```sql
-- Add to loans table
ALTER TABLE loans ADD COLUMN derogatory_status BOOLEAN DEFAULT FALSE;
ALTER TABLE loans ADD COLUMN derogatory_reason TEXT;
ALTER TABLE loans ADD COLUMN derogatory_date TIMESTAMP;
ALTER TABLE loans ADD COLUMN derogatory_marked_by UUID REFERENCES profiles(id);
ALTER TABLE loans ADD COLUMN derogatory_type VARCHAR(20); -- 'manual' or 'automatic'
ALTER TABLE loans ADD COLUMN closure_reason TEXT;
ALTER TABLE loans ADD COLUMN closure_date TIMESTAMP;
ALTER TABLE loans ADD COLUMN closed_by UUID REFERENCES profiles(id);

-- Add to organizations table
ALTER TABLE organizations ADD COLUMN missed_payment_threshold INTEGER DEFAULT 2;

-- Update status enum
ALTER TYPE loan_status ADD VALUE 'pending_derogatory_review';
ALTER TYPE loan_status ADD VALUE 'derogatory';
ALTER TYPE loan_status ADD VALUE 'settled';
ALTER TYPE loan_status ADD VALUE 'closed';
```

### API Endpoints to Create

1. `POST /api/loans/[id]/mark-derogatory` - Mark loan as derogatory
2. `POST /api/loans/[id]/close` - Close loan manually
3. `GET /api/cron/detect-derogatory` - Detect loans for derogatory review
4. `POST /api/loans/[id]/confirm-derogatory` - Confirm auto-flagged derogatory
5. `PATCH /api/organizations/[id]/settings` - Update org settings

### Stripe Operations

**Mark as Derogatory:**
1. List all invoices for customer with loan metadata
2. Void all open invoices
3. Delete all draft/scheduled invoices
4. Calculate remaining balance
5. Create single final invoice with full balance

**Close Loan:**
1. List all invoices for customer with loan metadata
2. Void all open invoices
3. Delete all draft/scheduled invoices
4. Optionally create final invoice or waive balance

### Notification Templates

- [ ] **Email**: Derogatory account notification to borrower
- [ ] **Email**: Pending derogatory review to organization
- [ ] **Email**: Loan closed notification to borrower
- [ ] **Email**: Settlement confirmation (derogatory paid)

---

## UI Components to Create/Update

### New Components
- [ ] `DerogatorySummaryCard.tsx` - Dashboard metric card
- [ ] `MarkDerogatorySummaryDialog.tsx` - Confirmation dialog for derogatory
- [ ] `CloseLoanDialog.tsx` - Confirmation dialog for closure
- [ ] `LoanStatusFilters.tsx` - Horizontal filter bar
- [ ] `DerogatorySummaryBadge.tsx` - Status badge component

### Updated Components
- [ ] `DataTable.tsx` - Add filter bar support
- [ ] `/dashboard/page.tsx` - Add derogatory metrics
- [ ] `/dashboard/loans/page.tsx` - Add filters and actions
- [ ] `/dashboard/loans/[id]/page.tsx` - Show derogatory/closure details

---

## Testing Checklist

- [ ] Test manual derogatory marking
- [ ] Test automatic derogatory detection
- [ ] Test derogatory confirmation from pending review
- [ ] Test Stripe invoice cancellation
- [ ] Test final balance invoice creation
- [ ] Test settlement flow (payment of final invoice)
- [ ] Test manual loan closure
- [ ] Test status filters
- [ ] Test dashboard metrics
- [ ] Test notifications (email)
- [ ] Test organization settings (threshold)
- [ ] Test permissions (all org users can mark derogatory)
- [ ] Test late payment detection
- [ ] Test edge cases (loan with no invoices, already paid loans, etc.)

---

## Success Criteria

✅ Dealers can manually mark loans as derogatory with required reason
✅ System auto-detects loans with 2+ missed payments and flags for review
✅ All future invoices are cancelled when marked derogatory
✅ Single final balance invoice is created for derogatory accounts
✅ Derogatory accounts show "Settled" status when paid in full
✅ Horizontal filter bar allows filtering by loan status
✅ Dashboard shows derogatory account metrics
✅ Dealers can close loans for non-derogatory reasons
✅ Borrowers receive notifications for status changes
✅ Organizations can configure missed payment threshold

---

## Future Enhancements (Not in Scope)

- Payment plans for derogatory accounts
- Ability to restore derogatory accounts to active
- Partial payment tracking for derogatory accounts
- Collections agency integration
- Credit bureau reporting
- Derogatory account aging reports
- Automated payment retry logic
- SMS notifications in addition to email

---

## Notes

- All monetary calculations in cents (Stripe format)
- All dates in ISO 8601 format
- Use existing confirmation dialog component pattern
- Maintain proper case formatting (toProperCase utility)
- Follow existing code style and patterns
- Ensure mobile responsiveness
- Add proper error handling and logging
- Include metadata in all Stripe operations for tracking

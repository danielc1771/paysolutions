# Derogatory Accounts & Loan Closure - Project Specification

## Overview
Implementation of derogatory account management and loan closure functionality for dealer organizations to handle non-performing loans, repossessions, accidents, and early closures.

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

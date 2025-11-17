# Stripe Fee Structure & Surcharging

## Overview
This document explains how fees are calculated and passed to customers for loan payments.

## Fee Breakdown

### 1. Weekly Payment
- **Amount**: Calculated based on loan terms (principal, APR, term length)
- **Who Pays**: Customer (borrower)
- **Purpose**: Principal + interest payment

### 2. Processing Fee (Convenience Fee)
- **Amount**: $5.00 per payment
- **Who Pays**: Customer (borrower)
- **Purpose**: Administrative and processing costs
- **Applied**: Every invoice for the entire loan term

### 3. Credit Card Processing Fee (Stripe Surcharge)
- **Amount**: 2.9% + $0.30 per transaction
- **Who Pays**: Customer (borrower)
- **Purpose**: Pass through Stripe's credit card processing fees
- **Calculation**: Applied to (Weekly Payment + Processing Fee)
- **Applied**: Every invoice for the entire loan term

## Example Calculation

**Loan Details:**
- Weekly Payment: $100.00
- Processing Fee: $5.00
- Term: 52 weeks

**Per Invoice Calculation:**
```
Weekly Payment:           $100.00
Processing Fee:           $  5.00
Subtotal:                 $105.00

Stripe Surcharge:
  2.9% of $105.00 =       $  3.05
  Fixed fee =             $  0.30
  Total Surcharge:        $  3.35

TOTAL PER INVOICE:        $108.35
```

**Total Over Loan Term (52 weeks):**
```
Weekly Payments:          $5,200.00  (52 × $100.00)
Processing Fees:          $  260.00  (52 × $5.00)
Stripe Surcharges:        $  174.20  (52 × $3.35)
TOTAL LOAN COST:          $5,634.20
```

## Implementation Details

### Invoice Creation (`/api/loans/[id]/fund`)

When a loan is funded, the system:

1. **Creates all invoices upfront** for the entire loan term
2. **Schedules automatic finalization** for each invoice
   - First invoice: Finalized immediately
   - Subsequent invoices: Finalized weekly (7 days apart)
3. **Adds three line items to each invoice:**
   - Weekly Payment (loan amount)
   - Processing Fee ($5.00)
   - Credit Card Processing Fee (calculated dynamically)

### Code Implementation

```typescript
// Calculate fees
const weeklyPaymentAmount = Math.round(parseFloat(loan.weekly_payment) * 100);
const convenienceFee = 500; // $5.00 in cents

// Calculate Stripe surcharge
const subtotal = weeklyPaymentAmount + convenienceFee;
const stripePercentageFee = Math.round(subtotal * 0.029); // 2.9%
const stripeFixedFee = 30; // $0.30 in cents
const stripeSurcharge = stripePercentageFee + stripeFixedFee;

// Add to invoice
await stripe.invoices.addLines(invoice.id, {
  lines: [
    { description: 'Weekly Payment', amount: weeklyPaymentAmount },
    { description: 'Processing Fee', amount: convenienceFee },
    { description: 'Credit Card Processing Fee (2.9% + $0.30)', amount: stripeSurcharge },
  ],
});
```

## Legal & Compliance Considerations

### Surcharging Rules

**Federal Law:**
- Surcharging is legal at the federal level in the United States
- Must not exceed the actual cost of processing (we charge exactly Stripe's fee)

**State Laws:**
- ✅ **Legal in most states** (including most major states)
- ❌ **Prohibited in**: Connecticut, Massachusetts, Puerto Rico
- ⚠️ **Restricted in**: California, Colorado, Florida, Kansas, Maine, New York, Oklahoma, Texas

**Best Practices:**
1. **Disclose clearly** - Show surcharge as separate line item
2. **Label accurately** - "Credit Card Processing Fee (2.9% + $0.30)"
3. **Don't exceed cost** - Only charge actual Stripe fees
4. **Offer alternatives** - Consider ACH/bank transfer option (no surcharge)

### Stripe's Surcharging Policy

Stripe allows surcharging with these requirements:
- ✅ Surcharge must be clearly disclosed to customers
- ✅ Surcharge amount must not exceed the cost of processing
- ✅ Surcharge must be shown as a separate line item
- ✅ Must comply with card network rules (Visa, Mastercard, etc.)

**Card Network Rules:**
- Maximum surcharge: 4% (we charge ~3%, well within limits)
- Must apply to all cards of a brand (can't surcharge Visa but not Mastercard)
- Must notify card networks 30 days before implementing

## Alternative: ACH/Bank Transfers

To avoid credit card fees entirely, consider implementing ACH payments:

**Benefits:**
- Lower fees: ~$0.80 per transaction (vs. 2.9% + $0.30)
- Better for customers (lower total cost)
- Better for business (more predictable costs)

**Implementation:**
```typescript
// Stripe ACH pricing
const achFee = 80; // $0.80 in cents

// Much lower surcharge for ACH
const achSurcharge = achFee; // Just $0.80 vs. $3.35 for credit card
```

## Invoice Metadata

Each invoice stores fee breakdown in metadata:
```json
{
  "weekly_payment_amount": "10000",
  "convenience_fee": "500",
  "stripe_surcharge": "335",
  "type": "weekly_payment"
}
```

This allows for:
- Transparent reporting
- Easy auditing
- Customer service inquiries
- Financial reconciliation

## Customer Communication

### Invoice Display
Customers see three clear line items:
1. Weekly Payment $XXX.XX
2. Processing Fee $5.00
3. Credit Card Processing Fee (2.9% + $0.30) $X.XX

### Transparency
- All fees disclosed upfront during loan application
- Total loan cost calculated and shown before signing
- Each invoice clearly itemizes all charges
- No hidden fees

## Updating Fee Structure

### To Change Processing Fee:
```typescript
// In /api/loans/[id]/fund/route.ts
const convenienceFee = 500; // Change this value (in cents)
```

### To Change Stripe Surcharge Rate:
```typescript
// Update if Stripe changes their pricing
const stripePercentageFee = Math.round(subtotal * 0.029); // Update percentage
const stripeFixedFee = 30; // Update fixed fee
```

### To Add ACH Option:
1. Implement ACH payment method collection
2. Create separate invoice line item for ACH surcharge
3. Update invoice creation logic to detect payment method
4. Apply appropriate surcharge based on payment method

## Monitoring & Reporting

Track fee revenue separately:
- Processing fees → Company revenue
- Stripe surcharges → Pass-through (covers Stripe costs)
- Weekly payments → Loan principal + interest

## Questions & Support

For questions about:
- **Legal compliance**: Consult with legal counsel in your jurisdiction
- **Stripe policies**: Contact Stripe support
- **Implementation**: Review code in `/api/loans/[id]/fund/route.ts`

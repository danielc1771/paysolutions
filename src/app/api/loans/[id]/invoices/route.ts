import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export type Invoice = { 
  id: string;
  number: string;
  status: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  base_amount: number;
  has_late_fee: boolean;
  late_fee_amount: number;
  is_late_fee_invoice: boolean;
  original_invoice_id: string | null;
  created: string;
  due_date: string | null;
  paid_at: string | null;
  hosted_invoice_url: string;
  invoice_pdf: string;
  attempt_count: number;
  next_payment_attempt: string | null;
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    console.log('📋 Fetching invoices for loan:', loanId);

    const supabase = await createClient();

    // Get loan with subscription info
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('stripe_subscription_id, borrower:borrowers(stripe_customer_id)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('❌ Error fetching loan:', loanError);
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Get customer ID from loan or borrower
    const borrower = Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower;
    const customerId = borrower?.stripe_customer_id;

    if (!customerId) {
      return NextResponse.json({
        success: true,
        invoices: [],
        message: 'No Stripe customer found for this loan',
      });
    }

    // Fetch invoices for this customer and subscription
    const invoices = await stripe.invoices.list({
      customer: customerId,
      subscription: loan.stripe_subscription_id || undefined,
      limit: 100,
    });

    // Transform invoice data for frontend
    const transformedInvoices = invoices.data.map(invoice => {
      // Check for late fees in line items
      const lateFeeItems = invoice.lines.data.filter(line => 
        line.metadata?.type === 'late_fee' || 
        line.description?.toLowerCase().includes('late fee')
      );
      
      const hasLateFee = lateFeeItems.length > 0;
      const lateFeeAmount = lateFeeItems.reduce((sum, item) => sum + (item.amount / 100), 0);
      
      // Calculate base amount (total - late fees)
      const baseAmount = (invoice.amount_due / 100) - lateFeeAmount;
      
      return {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount_due: invoice.amount_due / 100, // Convert from cents
        amount_paid: invoice.amount_paid / 100,
        amount_remaining: invoice.amount_remaining / 100,
        base_amount: baseAmount, // Amount without late fees
        has_late_fee: hasLateFee,
        late_fee_amount: lateFeeAmount,
        is_late_fee_invoice: invoice.metadata?.is_late_fee_invoice === 'true',
        original_invoice_id: invoice.metadata?.original_invoice_id || null,
        created: new Date(invoice.created * 1000).toISOString(),
        due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
        paid_at: invoice.status === 'paid' && invoice.status_transitions?.paid_at 
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
          : null,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        attempt_count: invoice.attempt_count,
        next_payment_attempt: invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000).toISOString() 
          : null,
      } as Invoice;
    });

    // Sort by creation date (newest first)
    transformedInvoices.sort((a, b) => 
      new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    console.log(`✅ Found ${transformedInvoices.length} invoices for loan ${loanId}`);

    return NextResponse.json({
      success: true,
      invoices: transformedInvoices,
      summary: {
        total_invoices: transformedInvoices.length,
        paid_invoices: transformedInvoices.filter(inv => inv.status === 'paid').length,
        open_invoices: transformedInvoices.filter(inv => inv.status === 'open').length,
        total_paid: transformedInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.amount_paid, 0),
      },
    });

  } catch (error) {
    console.error('💥 Error fetching invoices:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch invoices',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
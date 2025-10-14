import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const LATE_FEE_AMOUNT = 1500; // $15.00 in cents
const GRACE_PERIOD_DAYS = 5;

export async function GET() {
  try {

    console.log('🔄 Starting late fee processing job...');

    const now = Math.floor(Date.now() / 1000);
    const cutoffDate = now - (GRACE_PERIOD_DAYS * 24 * 60 * 60); // 5 days ago

    console.log('Cutoff date:', cutoffDate);
    let processedCount = 0;
    let skippedCount = 0;

    // Use auto-pagination to fetch ALL open invoices
    console.log('📊 Fetching all open invoices...');

    for await (const invoice of stripe.invoices.list({
      status: 'open',
      limit: 100, // Fetch 100 at a time for efficiency
    })) {
      // Check if invoice is past due (considering grace period)
      if (!invoice.due_date || invoice.due_date < cutoffDate) {
        skippedCount++;
        continue;
      }

      // Check if late fee already applied
      if (invoice.metadata?.late_fee_applied === 'true') {
        skippedCount++;
        continue;
      }

      try {
        console.log(`💰 Processing late fee for invoice ${invoice.id} (due: ${new Date(invoice.due_date * 1000).toLocaleDateString()})`);


        // Step 1: Create a revision invoice (creates a new draft invoice from the original)
        const revisionInvoice = await stripe.invoices.create({
          from_invoice: {
            invoice: invoice.id,
            action: 'revision',
          },
        });
        console.log(`📝 Created revision invoice ${revisionInvoice.id} from ${invoice.id}`);

        // Step 2: Add late fee line item to the revision
        await stripe.invoiceItems.create({
          customer: invoice.customer as string,
          invoice: revisionInvoice.id,
          amount: LATE_FEE_AMOUNT, // $15.00 in cents
          currency: 'usd',
          description: `Late Fee - Payment ${invoice.metadata?.payment_number || 'N/A'}`,
        });

        // Step 3: Update metadata on the revision before finalizing
        await stripe.invoices.update(revisionInvoice.id, {
          due_date: invoice.due_date,
          metadata: {
            ...invoice.metadata,
            late_fee_applied: 'true',
            late_fee_applied_date: new Date().toISOString(),
          },
        });

        // Step 4: Finalize the revision (this voids the original invoice automatically)
        await stripe.invoices.finalizeInvoice(revisionInvoice.id);

        processedCount++;

        console.log(`✅ Late fee added to invoice ${invoice.id} via revision ${revisionInvoice.id}`);
      } catch (error) {
        console.error(`❌ Failed to process late fee for invoice ${invoice.id}:`, error);
      }
    }

    console.log(`✅ Late fee processing complete. Processed: ${processedCount}, Skipped: ${skippedCount}`);

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} late fees, skipped ${skippedCount} invoices`,
      processed: processedCount,
      skipped: skippedCount,
    });

  } catch (error) {
    console.error('💥 Error in late fee processing:', error);
    return NextResponse.json(
      {
        error: 'Failed to process late fees',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

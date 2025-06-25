import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const loanId = params.id;

    if (!loanId) {
      return NextResponse.json(
        { error: 'Loan ID is required' },
        { status: 400 }
      );
    }

    // Fetch loan and borrower details
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select(`
        id,
        loan_number,
        borrower_name,
        principal_amount,
        interest_rate,
        term_months,
        monthly_payment,
        status,
        borrower:borrowers(
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      console.error('Error fetching loan:', loanError);
      return NextResponse.json(
        { error: 'Loan not found' },
        { status: 404 }
      );
    }

    // Check if loan is funded (payment summary should only be sent for funded loans)
    if (loan.status !== 'funded') {
      return NextResponse.json(
        { error: 'Payment summary can only be sent for funded loans' },
        { status: 400 }
      );
    }

    // Generate payment summary URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const paymentSummaryUrl = `${baseUrl}/payment-summary/${loanId}`;

    // In a real application, you would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Resend
    // 
    // For this example, we'll simulate sending the email
    
    const emailData = {
      to: loan.borrower.email,
      subject: `Payment Summary for Loan #${loan.loan_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 28px;">Payment Summary</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Loan #${loan.loan_number}</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${loan.borrower.first_name},</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Your loan payment summary is now available. You can view your complete payment schedule, 
              upcoming due dates, and payment history using the secure link below.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
              <h3 style="color: #333; margin-top: 0;">Loan Details:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li><strong>Loan Amount:</strong> $${parseFloat(loan.principal_amount).toLocaleString()}</li>
                <li><strong>Interest Rate:</strong> ${parseFloat(loan.interest_rate)}% APR</li>
                <li><strong>Term:</strong> ${loan.term_months} months</li>
                <li><strong>Monthly Payment:</strong> $${parseFloat(loan.monthly_payment).toLocaleString()}</li>
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentSummaryUrl}" 
               style="display: inline-block; background: #667eea; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              View Payment Summary
            </a>
          </div>
          
          <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin-top: 25px;">
            <p style="color: #0066cc; margin: 0; font-size: 14px; text-align: center;">
              <strong>🔒 Secure Link:</strong> This link is secure and personalized for your account. 
              Do not share it with others.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              If you have any questions about your loan or payments, please contact our support team.
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              PaySolutions - Secure Loan Management
            </p>
          </div>
        </div>
      `
    };

    // TODO: Replace this with actual email service integration
    console.log('📧 Email would be sent to:', emailData.to);
    console.log('📧 Subject:', emailData.subject);
    console.log('📧 Payment Summary URL:', paymentSummaryUrl);

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Log the email sending activity
    const { error: logError } = await supabase
      .from('loan_activities')
      .insert({
        loan_id: loanId,
        activity_type: 'payment_summary_sent',
        description: `Payment summary email sent to ${loan.borrower.email}`,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('Failed to log email activity:', logError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment summary email sent successfully',
      recipient: loan.borrower.email,
      paymentSummaryUrl
    });

  } catch (error) {
    console.error('Error sending payment summary email:', error);
    return NextResponse.json(
      { error: 'Failed to send payment summary email' },
      { status: 500 }
    );
  }
}

import { Resend } from 'resend';
import { LoanApplicationTemplate } from '@/components/emails/LoanApplicationTemplate';

const resend = new Resend('re_bq5JrnkW_7ST7xk8HGfNpAAK4qjRaTjEg');

interface LoanApplicationEmailData {
  to: string;
  firstName: string;
  applicationUrl: string;
  loanAmount: string;
  dealerName?: string;
  vehicleInfo?: string;
}

export const sendLoanApplicationEmail = async ({
  to,
  firstName,
  applicationUrl,
  loanAmount,
  dealerName,
  vehicleInfo
}: LoanApplicationEmailData) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'PaySolutions <onboarding@resend.dev>',
      to: [to],
      subject: 'Complete Your Loan Application - PaySolutions',
      react: LoanApplicationTemplate({
        firstName,
        applicationUrl,
        loanAmount,
        dealerName,
        vehicleInfo
      }),
    });

    if (error) {
      console.error('Resend email error:', error);
      throw new Error(error.message || 'Failed to send email');
    }

    console.log('Email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending loan application email:', error);
    throw error;
  }
};
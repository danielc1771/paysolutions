import { Resend } from 'resend';
import { LoanApplicationTemplate } from '@/components/emails/LoanApplicationTemplate';
import { VerificationEmailTemplate } from '@/components/emails/VerificationEmailTemplate';

const resend = new Resend(process.env.RESEND_API_KEY);

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
      from: 'iPayUS <noreply@mail.ipayus.net>',
      to: [to],
      subject: 'Complete Your Loan Application - iPayUS',
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

// Verification Email
interface VerificationEmailData {
  to: string;
  firstName: string;
  verificationUrl: string;
  organizationName: string;
}

export const sendVerificationEmail = async ({
  to,
  firstName,
  verificationUrl,
  organizationName,
}: VerificationEmailData) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'iOpes Verification <noreply@mail.ipayus.net>',
      to: [to],
      subject: `Identity Verification Request from ${organizationName}`,
      react: VerificationEmailTemplate({
        firstName,
        verificationUrl,
        organizationName,
      }),
    });

    if (error) {
      console.error('Resend email error:', error);
      throw new Error(error.message || 'Failed to send verification email');
    }

    console.log('Verification email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};
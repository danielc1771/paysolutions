import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export const sendLoanApplicationEmail = async (to: string, name: string, applicationUrl: string) => {
  const mailOptions = {
    from: process.env.EMAIL_SERVER_USER,
    to,
    subject: 'Your Loan Application with PaySolutions',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hello ${name},</h2>
        <p>Thank you for your interest in a loan with PaySolutions. Please click the link below to complete your application:</p>
        <p style="text-align: center;">
          <a href="${applicationUrl}" style="background-color: #6d28d9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Complete Your Application
          </a>
        </p>
        <p>If you did not request this loan, please disregard this email.</p>
        <br />
        <p>Sincerely,</p>
        <p>The PaySolutions Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

import { NextRequest, NextResponse } from 'next/server';
// import { sendEmail } from '@/utils/mailer'; // Uncomment when email utility is ready

// POST - Send verification email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { verificationUrl, organizationName } = body;

    if (!verificationUrl || !organizationName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Implement actual email sending logic
    // For now, this is a placeholder that logs the email details
    console.log('📧 Sending verification email:', {
      verificationId: id,
      verificationUrl,
      organizationName,
    });

    // Example email template structure:
    /*
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Identity Verification Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #333;">Identity Verification Request</h1>
          </div>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <p>Hello,</p>
            <p>${organizationName} has requested that you verify your identity.</p>
            <p>This is a secure process that helps protect your information and comply with regulatory requirements.</p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}"
                 style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Verify My Identity
              </a>
            </p>
            <p style="font-size: 14px; color: #666;">
              This verification link will expire in 7 days.
            </p>
            <p style="font-size: 14px; color: #666;">
              If you did not request this verification, please ignore this email.
            </p>
          </div>
          <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
            <p>&copy; ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: verificationEmail,
      subject: `Identity Verification Request from ${organizationName}`,
      html: emailHtml,
    });
    */

    // Return success for now
    return NextResponse.json({
      success: true,
      message: 'Email would be sent (placeholder)',
    });
  } catch (error) {
    console.error('Error in POST /api/verifications/[id]/send-email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

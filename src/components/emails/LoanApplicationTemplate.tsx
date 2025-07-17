import * as React from 'react';

interface LoanApplicationEmailProps {
  firstName: string;
  applicationUrl: string;
  loanAmount: string;
  dealerName?: string;
  vehicleInfo?: string;
}

export function LoanApplicationTemplate({ 
  firstName, 
  applicationUrl, 
  loanAmount,
  dealerName,
  vehicleInfo 
}: LoanApplicationEmailProps) {
  // Helper function to format text properly
  const formatText = (text: string) => {
    if (!text) return '';
    return text.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };
  return (
    <html>
      <body style={{
        margin: 0,
        padding: '40px 0',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 30px',
            textAlign: 'center' as const
          }}>
            <div style={{
              backgroundColor: 'white',
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <img 
                src={`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/logoMain.png`}
                alt="iPayUS Logo" 
                style={{
                  width: '60px',
                  height: '60px',
                  objectFit: 'contain'
                }}
              />
            </div>
            <h1 style={{
              color: 'white',
              margin: 0,
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              iPayUS
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '8px 0 0',
              fontSize: '16px'
            }}>
              Your trusted lending partner
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '40px 30px' }}>
            <h2 style={{
              color: '#1f2937',
              margin: '0 0 16px',
              fontSize: '24px',
              fontWeight: '700'
            }}>
              Hello {formatText(firstName)}!
            </h2>
            
            <p style={{
              color: '#4b5563',
              margin: '0 0 24px',
              fontSize: '16px',
              lineHeight: '1.6'
            }}>
              Thank you for your interest in a loan with iPayUS. We&apos;re excited to help you with your financing needs. 
              Your personalized application is ready and waiting for you to complete.
            </p>

            {/* Loan Details */}
            <div style={{
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              borderRadius: '12px',
              padding: '24px',
              margin: '24px 0'
            }}>
              <h3 style={{
                color: '#1f2937',
                margin: '0 0 16px',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                Loan Details:
              </h3>
              <div style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Loan Amount:</strong> ${parseInt(loanAmount).toLocaleString()}
                </div>
                {dealerName && (
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Dealership:</strong> {formatText(dealerName)}
                  </div>
                )}
                {vehicleInfo && (
                  <div style={{ marginBottom: '0' }}>
                    <strong>Vehicle:</strong> {vehicleInfo}
                  </div>
                )}
              </div>
            </div>

            {/* What to Expect */}
            <div style={{
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              borderRadius: '12px',
              padding: '24px',
              margin: '24px 0'
            }}>
              <h3 style={{
                color: '#1f2937',
                margin: '0 0 16px',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                What To Expect:
              </h3>
              <ul style={{
                color: '#4b5563',
                margin: 0,
                paddingLeft: '20px',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                <li style={{ marginBottom: '8px' }}>Complete Your Personal and Employment Information</li>
                <li style={{ marginBottom: '8px' }}>Secure Identity Verification (2-3 Minutes)</li>
                <li style={{ marginBottom: '8px' }}>Set Your Communication Preferences</li>
                <li style={{ marginBottom: 0 }}>Review and Submit Your Application</li>
              </ul>
            </div>

            {/* CTA Button */}
            <div style={{ textAlign: 'center' as const, margin: '32px 0' }}>
              <a 
                href={applicationUrl}
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '16px 32px',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '16px',
                  boxShadow: '0 10px 15px -3px rgba(102, 126, 234, 0.4)'
                }}
              >
                Complete Your Application
              </a>
            </div>

            {/* Security Note */}
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '16px',
              margin: '24px 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <div style={{
                  flexShrink: 0,
                  marginRight: '12px'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    background: '#0ea5e9',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      🔒
                    </span>
                  </div>
                </div>
                <div>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#0c4a6e',
                    fontWeight: '600'
                  }}>
                    Secure & Protected
                  </p>
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: '13px',
                    color: '#075985',
                    lineHeight: '1.4'
                  }}>
                    Your information is encrypted and protected. We use industry-leading security measures to keep your data safe.
                  </p>
                </div>
              </div>
            </div>

            <p style={{
              color: '#6b7280',
              margin: '24px 0 0',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              If you did not request this loan application, please disregard this email. 
              This link will expire in 7 days for your security.
            </p>
          </div>

          {/* Footer */}
          <div style={{
            background: '#f9fafb',
            padding: '30px',
            textAlign: 'center' as const,
            borderTop: '1px solid #e5e7eb'
          }}>
            <p style={{
              color: '#1f2937',
              margin: '0 0 8px',
              fontWeight: '600',
              fontSize: '16px'
            }}>
              The iPayUS Team
            </p>
            <p style={{
              color: '#6b7280',
              margin: 0,
              fontSize: '14px'
            }}>
              Making financing simple and accessible
            </p>
            
            <div style={{
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e5e7eb'
            }}>
              <p style={{
                color: '#9ca3af',
                margin: 0,
                fontSize: '12px'
              }}>
                © 2024 iPayUS. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
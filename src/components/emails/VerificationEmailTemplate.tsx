import * as React from 'react';

interface VerificationEmailProps {
  firstName: string;
  verificationUrl: string;
  organizationName: string;
}

export function VerificationEmailTemplate({
  firstName,
  verificationUrl,
  organizationName,
}: VerificationEmailProps) {
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
        background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
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
            background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://framerusercontent.com/images/lclNoKfRTrilOCywAs49FSfrG6E.png?scale-down-to=512&width=2790&height=1854"
                alt="iOpes Logo"
                width="60"
                height="60"
                style={{
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
              Identity Verification
            </h1>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '8px 0 0',
              fontSize: '16px'
            }}>
              Secure verification by iOpes
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
              <strong>{organizationName}</strong> has requested that you verify your identity.
              This is a secure process that takes just a few minutes to complete.
            </p>

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
                What You&apos;ll Need:
              </h3>
              <ul style={{
                color: '#4b5563',
                margin: 0,
                paddingLeft: '20px',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                <li style={{ marginBottom: '8px' }}>A valid government-issued ID (Driver&apos;s License, Passport, or ID Card)</li>
                <li style={{ marginBottom: '8px' }}>Good lighting and a camera-enabled device</li>
                <li style={{ marginBottom: 0 }}>2-3 minutes of your time</li>
              </ul>
            </div>

            {/* CTA Button */}
            <table width="100%" cellPadding="0" cellSpacing="0" border={0} style={{ margin: '32px 0' }}>
              <tr>
                <td align="center">
                  <table cellPadding="0" cellSpacing="0" border={0}>
                    <tr>
                      <td
                        align="center"
                        style={{
                          background: '#10b981',
                          borderRadius: '12px',
                          padding: '0'
                        }}
                      >
                        <a
                          href={verificationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block',
                            color: '#ffffff',
                            backgroundColor: 'transparent',
                            padding: '16px 48px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '16px',
                            lineHeight: '1.5',
                            minWidth: '200px',
                            textAlign: 'center' as const,
                            WebkitTextSizeAdjust: 'none'
                          }}
                        >
                          <span style={{ color: '#ffffff', textDecoration: 'none' }}>Verify My Identity</span>
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            {/* Security Note */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
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
                    background: '#10b981',
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
                    color: '#166534',
                    fontWeight: '600'
                  }}>
                    Secure & Protected
                  </p>
                  <p style={{
                    margin: '4px 0 0',
                    fontSize: '13px',
                    color: '#15803d',
                    lineHeight: '1.4'
                  }}>
                    Your information is encrypted and protected using Stripe Identity,
                    an industry-leading verification service trusted by millions.
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
              If you did not request this verification, please disregard this email.
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
              The iOpes Team
            </p>
            <p style={{
              color: '#6b7280',
              margin: 0,
              fontSize: '14px'
            }}>
              Secure identity verification made simple
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
                &copy; 2025 iOpes. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

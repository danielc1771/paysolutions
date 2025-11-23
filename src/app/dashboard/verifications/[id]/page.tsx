'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Link as LinkIcon, Trash2, CheckCircle, Phone, Download } from 'lucide-react';
import { VerificationWithCreator } from '@/types/verification';
import { useUserProfile } from '@/components/auth/RoleRedirect';
import VerificationStatusBadge from '@/components/verifications/VerificationStatusBadge';
import VerificationTimeline from '@/components/verifications/VerificationTimeline';
import { generateVerificationPDF } from '@/utils/pdf/generateVerificationPDF';

interface VerificationDetailProps {
  params: Promise<{ id: string }>;
}

export default function VerificationDetail({ params }: VerificationDetailProps) {
  const [verification, setVerification] = useState<VerificationWithCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        setLoading(true);
        const { id } = await params;

        // Fetch verification from API route
        const response = await fetch(`/api/verifications/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to fetch verification');
          return;
        }

        setVerification(data.verification);
      } catch (err) {
        setError('Failed to fetch verification details');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchVerification();
    }
  }, [params, profile]);

  const handleResendEmail = async () => {
    if (!verification) return;

    setResendingEmail(true);
    try {
      const response = await fetch(`/api/verifications/${verification.id}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`Verification email resent to ${verification.email}`);
        setShowSuccessModal(true);

        // Refresh verification data via API
        const refreshResponse = await fetch(`/api/verifications/${verification.id}`);
        const refreshData = await refreshResponse.json();

        if (refreshResponse.ok && refreshData.verification) {
          setVerification(refreshData.verification);
        }
      } else {
        alert('Failed to resend email: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Failed to resend email. Please try again.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCopyLink = async () => {
    if (!verification?.verification_token) return;

    const baseUrl = window.location.origin;
    const verificationLink = `${baseUrl}/verify/${verification.verification_token}`;

    await navigator.clipboard.writeText(verificationLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDelete = async () => {
    if (!verification) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/verifications/${verification.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to verifications list
        window.location.href = '/dashboard/verifications';
      } else {
        alert('Failed to delete verification: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting verification:', error);
      alert('Failed to delete verification. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isExpired = verification && verification.expires_at && new Date(verification.expires_at) < new Date();
  const canResendEmail = verification && verification.status !== 'completed';
  const canDelete = verification && verification.status !== 'completed';
  const isCompleted = verification && verification.status === 'completed';

  const handleDownloadPDF = async () => {
    if (!verification || verification.status !== 'completed') return;

    setGeneratingPDF(true);
    try {
      await generateVerificationPDF(verification);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading verification details...</p>
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification not found</h3>
          <p className="text-red-600 mb-4">{error || 'Verification does not exist or you do not have permission to view it'}</p>
          <Link
            href="/dashboard/verifications"
            className="bg-green-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-green-600 transition-colors"
          >
            Back to Verifications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Back Button */}
        <Link
          href="/dashboard/verifications"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Verifications
        </Link>

        {/* Customer Contact Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              {/* Avatar */}
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                {verification.first_name[0]}{verification.last_name[0]}
              </div>

              {/* Info */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {verification.first_name} {verification.last_name}
                </h1>
                <div className="flex items-center gap-3 mb-3">
                  {verification.creator && (
                    <p className="text-sm text-blue-600 font-medium">Created by {verification.creator.full_name}</p>
                  )}
                  {isAdmin && verification.organization && (
                    <>
                      <span className="text-gray-300">•</span>
                      <p className="text-sm text-gray-500">{verification.organization.name}</p>
                    </>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center space-x-2">
                  <a
                    href={`mailto:${verification.email}`}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center space-x-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </a>
                  {verification.phone && (
                    <a
                      href={`tel:${verification.phone}`}
                      className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors flex items-center space-x-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  )}
                  <button
                    onClick={handleCopyLink}
                    className="cursor-pointer px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors flex items-center space-x-1"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                  {/* Resend Email Button */}
                  {canResendEmail && (
                    <button
                      onClick={handleResendEmail}
                      disabled={resendingEmail}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {resendingEmail ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-700"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Resend Email</span>
                        </>
                      )}
                    </button>
                  )}
                  {/* Download PDF Button */}
                  {isCompleted && (
                    <button
                      onClick={handleDownloadPDF}
                      disabled={generatingPDF}
                      className="cursor-pointer px-3 py-1.5 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg text-xs font-semibold hover:from-green-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 shadow-sm"
                    >
                      {generatingPDF ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Certificate</span>
                        </>
                      )}
                    </button>
                  )}
                  {/* Delete Button */}
                  {canDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <VerificationStatusBadge
              status={verification.status}
              stripeStatus={verification.stripe_verification_status}
              phoneStatus={verification.phone_verification_status}
              size="md"
              showIcon={true}
            />
          </div>
        </div>

        {/* Verification Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Verification Progress</h3>
          <VerificationTimeline
            verification={verification}
            showLabels={true}
            size="lg"
          />

          {/* Additional status information */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              {verification.status === 'pending' && !verification.email_sent_at && (
                <p>📝 Verification created. Email not yet sent.</p>
              )}
              {verification.status === 'email_sent' && (
                <p>✉️ Verification email sent to {verification.email}. Waiting for customer to begin verification.</p>
              )}
              {verification.status === 'in_progress' && (
                <p>⏳ Customer has started the verification process.</p>
              )}
              {verification.status === 'identity_verified' && !verification.phone && (
                <p>🎉 Identity verification complete!</p>
              )}
              {verification.status === 'identity_verified' && verification.phone && (
                <p>📱 Identity verified. Waiting for phone verification.</p>
              )}
              {verification.status === 'phone_verified' && (
                <p>🎉 Phone number verified!</p>
              )}
              {verification.status === 'completed' && (
                <p>✅ Verification fully completed on {new Date(verification.completed_at!).toLocaleString()}</p>
              )}
              {verification.status === 'failed' && (
                <p>❌ Verification failed. Please create a new verification request.</p>
              )}
              {isExpired && verification.status !== 'completed' && (
                <p className="text-orange-600">⚠️ Verification link expired on {new Date(verification.expires_at!).toLocaleString()}. Resend email to extend.</p>
              )}
            </div>

            {/* Show verification timestamps if available */}
            {(verification.email_sent_at || verification.stripe_verified_at || verification.phone_verified_at || verification.completed_at) && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 font-semibold mb-1">Timeline:</p>
                {verification.email_sent_at && (
                  <p className="text-xs text-gray-500">
                    ✉️ Email sent: {new Date(verification.email_sent_at).toLocaleString()}
                  </p>
                )}
                {verification.stripe_verified_at && (
                  <p className="text-xs text-gray-500">
                    🪪 Identity verified: {new Date(verification.stripe_verified_at).toLocaleString()}
                  </p>
                )}
                {verification.phone_verified_at && (
                  <p className="text-xs text-gray-500">
                    📱 Phone verified: {new Date(verification.phone_verified_at).toLocaleString()}
                  </p>
                )}
                {verification.completed_at && (
                  <p className="text-xs text-gray-500">
                    ✅ Completed: {new Date(verification.completed_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
              <p className="text-gray-900 font-medium">{verification.first_name} {verification.last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-gray-900 font-medium">{verification.email}</p>
            </div>
            {verification.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                <p className="text-gray-900 font-medium">{verification.phone}</p>
              </div>
            )}
            {verification.purpose && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Purpose/Notes</label>
                <p className="text-gray-900">{verification.purpose}</p>
              </div>
            )}
          </div>
        </div>

        {/* Verification Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Created</label>
              <p className="text-gray-900">{new Date(verification.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Expires</label>
              <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                {new Date(verification.expires_at!).toLocaleString()}
                {isExpired && ' (Expired)'}
              </p>
            </div>
            {verification.stripe_verification_session_id && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Stripe Session ID</label>
                <p className="text-gray-900 font-mono text-xs">{verification.stripe_verification_session_id}</p>
              </div>
            )}
            {verification.phone_verification_session_id && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Phone Session ID</label>
                <p className="text-gray-900 font-mono text-xs">{verification.phone_verification_session_id}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Emails Sent</label>
              <p className="text-gray-900">{verification.email_sent_count || 0}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowSuccessModal(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-96 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              <button
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold py-3 px-6 rounded-2xl hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                onClick={() => setShowSuccessModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 w-96 border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Verification?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this verification for {verification.first_name} {verification.last_name}? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  className="flex-1 bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-2xl hover:bg-gray-300 transition-all duration-300"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-red-600 text-white font-semibold py-3 px-6 rounded-2xl hover:bg-red-700 transition-all duration-300 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

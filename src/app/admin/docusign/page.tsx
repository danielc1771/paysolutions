'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { RoleRedirect } from '@/components/auth/RoleRedirect';

interface ConnectConfig {
  connectId: string;
  name: string;
  urlToPublishTo: string;
  enabled: string;
  allUsers: string;
  loggingEnabled: string;
  requiresAcknowledgement: string;
  envelopeEvents: string;
  recipientEvents: string;
}

export default function DocuSignAdminPage() {
  const [configurations, setConfigurations] = useState<ConnectConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [recommendedConfig, setRecommendedConfig] = useState<{
    webhookUrl: string;
    isAccessible: boolean;
    recommendedConfig: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    fetchConfigurations();
    fetchRecommendedConfig();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/docusign/connect');
      const data = await response.json();
      
      if (data.success) {
        setConfigurations(data.configurations?.configurations || []);
      } else {
        setError(data.error || 'Failed to fetch configurations');
      }
    } catch (err) {
      setError('Failed to fetch configurations');
      console.error('Error fetching configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedConfig = async () => {
    try {
      const response = await fetch('/api/docusign/connect?action=recommend');
      const data = await response.json();
      
      if (data.success) {
        setRecommendedConfig(data);
      }
    } catch (err) {
      console.error('Error fetching recommended config:', err);
    }
  };

  const createRecommendedConfig = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/docusign/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create-recommended' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Connect configuration created successfully!');
        fetchConfigurations();
      } else {
        alert(`Failed to create configuration: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to create configuration');
      console.error('Error creating configuration:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteConfiguration = async (connectId: string) => {
    if (!confirm('Are you sure you want to delete this Connect configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/docusign/connect?connectId=${connectId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Connect configuration deleted successfully!');
        fetchConfigurations();
      } else {
        alert(`Failed to delete configuration: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to delete configuration');
      console.error('Error deleting configuration:', err);
    }
  };

  const toggleConfiguration = async (connectId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/docusign/connect', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectId,
          enabled: !enabled,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Configuration ${enabled ? 'disabled' : 'enabled'} successfully!`);
        fetchConfigurations();
      } else {
        alert(`Failed to update configuration: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to update configuration');
      console.error('Error updating configuration:', err);
    }
  };

  return (
    <RoleRedirect allowedRoles={['admin']}>
      <AdminLayout>
        <div className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
              DocuSign Connect Management
            </h1>
            <p className="text-gray-600 text-lg">Manage DocuSign webhook configurations for automatic loan status updates</p>
          </div>

          {/* Recommended Configuration */}
          {recommendedConfig && (
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-6 shadow-lg border border-white/20 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Recommended Configuration</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Create a Connect configuration with optimal settings for PaySolutions
                  </p>
                  <div className="text-sm text-gray-500">
                    <p><strong>Webhook URL:</strong> {recommendedConfig.webhookUrl}</p>
                    <p><strong>Status:</strong> 
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        recommendedConfig.isAccessible 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {recommendedConfig.isAccessible ? 'Accessible' : 'Not Accessible'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={createRecommendedConfig}
                  disabled={creating || !recommendedConfig.isAccessible}
                  className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Configuration'}
                </button>
              </div>
            </div>
          )}

          {/* Current Configurations */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Configurations</h2>
                  <p className="text-gray-600">Manage existing DocuSign Connect configurations</p>
                </div>
                <button
                  onClick={fetchConfigurations}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-500 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading configurations...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Configurations</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button 
                  onClick={fetchConfigurations}
                  className="bg-red-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : configurations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No Connect Configurations</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  No DocuSign Connect configurations found. Create one to enable automatic webhook notifications.
                </p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-4">
                  {configurations.map((config) => (
                    <div 
                      key={config.connectId}
                      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/30"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{config.name}</h3>
                          <p className="text-sm text-gray-600">{config.urlToPublishTo}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            config.enabled === 'true' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {config.enabled === 'true' ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">All Users:</span>
                          <span className="ml-2 text-gray-600">{config.allUsers === 'true' ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Logging:</span>
                          <span className="ml-2 text-gray-600">{config.loggingEnabled === 'true' ? 'Enabled' : 'Disabled'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Requires Ack:</span>
                          <span className="ml-2 text-gray-600">{config.requiresAcknowledgement === 'true' ? 'Yes' : 'No'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Connect ID:</span>
                          <span className="ml-2 text-gray-600 font-mono text-xs">{config.connectId}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleConfiguration(config.connectId, config.enabled === 'true')}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            config.enabled === 'true'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {config.enabled === 'true' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => deleteConfiguration(config.connectId)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </RoleRedirect>
  );
}
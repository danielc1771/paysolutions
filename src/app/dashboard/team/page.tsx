'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Users, UserPlus, Mail, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { useUserProfile } from '@/components/auth/RoleRedirect';

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: 'INVITED' | 'ACTIVE';
  organization?: {
    id: string;
    name: string;
  };
}

export default function TeamPage() {
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    fullName: '',
    email: '',
    role: 'team_member'
  });
  const { profile } = useUserProfile();
  const isAdmin = profile?.role === 'admin';
  const supabase = useMemo(() => createClient(), []);

  // Fetch team members
  const fetchTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to view team members');
        return;
      }

      if (isAdmin) {
        // Admin: Fetch only admin users (system administrators)
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            email,
            role,
            status
          `)
          .eq('role', 'admin')
          .order('full_name', { ascending: true });

        if (membersError) {
          console.error('Supabase error:', membersError);
          setError(`Failed to fetch admin users: ${membersError.message}`);
          return;
        }

        setTeamMembers(members?.map(member => ({
          id: member.id,
          fullName: member.full_name || '',
          email: member.email || '',
          role: member.role || 'admin',
          status: member.status || 'INVITED'
        })) || []);
      } else {
        // Organization users: Fetch org team members
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!currentProfile?.organization_id) {
          setError('Organization not found');
          return;
        }

        // Get all team members in the organization (exclude borrowers and system admins)
        const { data: members, error: membersError } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, status')
          .eq('organization_id', currentProfile.organization_id)
          .neq('role', 'borrower')
          .neq('role', 'admin')
          .order('full_name', { ascending: true });

        if (membersError) {
          console.error('Supabase error:', membersError);
          setError(`Failed to fetch team members: ${membersError.message}`);
          return;
        }

        setTeamMembers(members?.map(member => ({
          id: member.id,
          fullName: member.full_name || '',
          email: member.email || '',
          role: member.role || 'team_member',
          status: member.status || 'INVITED'
        })) || []);
      }

    } catch (error) {
      console.error('Team fetch error:', error);
      setError('An error occurred while fetching team members. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [supabase, isAdmin]);

  // Invite team member
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: inviteData.fullName,
          email: inviteData.email
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      setSuccess(`Invitation sent successfully to ${inviteData.email}`);
      setInviteData({ fullName: '', email: '', role: 'team_member' });
      setShowInviteForm(false);
      
      // Refresh team members list
      await fetchTeamMembers();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  // Delete team member
  const handleDeleteMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from the team?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/team/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ memberId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove team member');
      }

      setSuccess('Team member removed successfully');
      await fetchTeamMembers();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team member');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchTeamMembers();
    }
  }, [fetchTeamMembers, profile]);

  // No filtering needed - admins see only admins, non-admins see their org members
  const filteredTeamMembers = teamMembers;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-3">
                {isAdmin ? 'System Administrators' : 'Team Management'}
              </h1>
              <p className="text-gray-600 text-lg">
                {isAdmin ? 'Manage system administrator accounts' : 'Manage your organization\'s team members and staff'}
              </p>
            </div>

            {/* Status Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-green-700">{success}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mb-6 flex justify-between items-center">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-600 mr-2" />
                <span className="text-gray-700 font-medium">
                  {filteredTeamMembers.length} {isAdmin ? 'Administrator' : 'Team Member'}{filteredTeamMembers.length !== 1 ? 's' : ''}
                </span>
              </div>
              {!isAdmin && (
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Team Member
                </button>
              )}
            </div>

            {/* Invite Form */}
            {showInviteForm && (
              <div className="mb-6 bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite New Team Member</h3>
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={inviteData.fullName}
                        onChange={(e) => setInviteData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={inviteData.email}
                        onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteForm(false);
                        setInviteData({ fullName: '', email: '', role: 'team_member' });
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300 disabled:opacity-50 flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Send Invitation</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Team Members List */}
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
              {loading && teamMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading {isAdmin ? 'users' : 'team members'}...</p>
                </div>
              ) : filteredTeamMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isAdmin ? 'No users found' : 'No team members yet'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {isAdmin 
                      ? 'Try adjusting your filters' 
                      : 'Start building your team by inviting new members'}
                  </p>
                  {!isAdmin && (
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-teal-600 transition-all duration-300"
                    >
                      Invite First Team Member
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold">{isAdmin ? 'User' : 'Team Member'}</th>
                        {isAdmin && <th className="px-6 py-4 text-left text-sm font-semibold">Organization</th>}
                        <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                        {!isAdmin && <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredTeamMembers.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
                              <div className="text-sm text-gray-500">{member.email}</div>
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-700">
                                {member.organization?.name || 'No Organization'}
                              </span>
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                              {member.role === 'organization_owner' ? 'Owner' : 
                               member.role === 'user' ? 'User' :
                               member.role === 'admin' ? 'Admin' : 'Team Member'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              member.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {member.status === 'ACTIVE' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Invited
                                </>
                              )}
                            </span>
                          </td>
                          {!isAdmin && (
                            <td className="px-6 py-4">
                              {member.role !== 'organization_owner' && (
                                <button
                                  onClick={() => handleDeleteMember(member.id, member.email)}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Remove team member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
    </div>
  );
}
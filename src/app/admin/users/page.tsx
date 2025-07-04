'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { createClient } from '@/utils/supabase/client';
import { UserPlus, Mail, User, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

interface UserProfile {
  id: string;
  email: string | null;
  role: string | null;
  fullName: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated.');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.organization_id) {
        setError(profileError?.message || 'Could not retrieve organization ID for user.');
        setLoading(false);
        return;
      }

      const { data, error: usersError } = await supabase
        .from('profiles')
        .select('id, role, email, full_name')
        .eq('organization_id', profile.organization_id);

      if (usersError) {
        setError(usersError.message);
      } else {
        const mappedUsers = data.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role,
          fullName: u.full_name,
        }));
        setUsers(mappedUsers);
      }
    } catch (err) {
      setError('Failed to fetch users.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setError(null);
    setSuccess(null);

    const response = await fetch('/api/admin/users/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, role }),
    });

    if (response.ok) {
      setSuccess('User invited successfully! An email has been sent.');
      setEmail('');
      setRole('user');
      fetchUsers(); // Refresh the user list
    } else {
      const errorData = await response.text();
      setError(errorData);
    }
    setInviteLoading(false);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
                User Management
              </h1>
              <p className="text-gray-600 text-lg">Manage users and their roles within your organization.</p>
            </div>
          </div>

          {/* Invite User Section */}
          <div className="group bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/20 mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invite New User</h2>
            <form onSubmit={handleInvite} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-300"
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                  Role
                </label>
                <CustomSelect
                  options={[{ value: 'user', label: 'User' }, { value: 'admin', label: 'Admin' }]}
                  value={role}
                  onChange={setRole}
                  placeholder="Select a role"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 px-6 rounded-2xl font-semibold hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Sending Invite...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Mail className="w-5 h-5 mr-2" />
                    Invite User
                  </div>
                )}
              </button>
              {success && (
                <div className="mt-4 p-4 bg-green-50/80 backdrop-blur-sm border border-green-200 rounded-2xl">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                    <p className="text-green-700 text-sm font-medium">{success}</p>
                  </div>
                </div>
              )}
              {error && (
                <div className="mt-4 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl">
                  <div className="flex items-center">
                    <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Users List Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden">
            <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Current Users</h2>
              <p className="text-gray-600">All users registered within your organization.</p>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-500 mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <UserPlus className="w-10 h-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No users yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">Invite your first user to get started!</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-4">
                  {users.map((user) => (
                    <div 
                      key={user.id} 
                      className="group relative bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 border border-white/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-lg">
                                {user.fullName ? user.fullName[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : 'U')}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-gray-900">{user.fullName || user.email}</p>
                            <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                          </div>
                        </div>
                        {/* Future action buttons could go here */}
                        <button className="p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 bg-gray-100 text-gray-600">
                          <User className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

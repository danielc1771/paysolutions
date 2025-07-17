'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import UserLayout from '@/components/UserLayout';
import { RoleRedirect } from '@/components/auth/RoleRedirect';
import { useUserProfile } from '@/components/auth/RoleRedirect';

// Color theme options with their gradient values
const COLOR_THEMES = {
  default: {
    name: 'Default (Green/Teal)',
    gradient: 'from-green-500 to-teal-500',
    bgGradient: 'from-green-50 via-blue-50 to-teal-100',
    shadow: 'shadow-green-500/25'
  },
  blue: {
    name: 'Ocean Blue',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 via-cyan-50 to-blue-100',
    shadow: 'shadow-blue-500/25'
  },
  purple: {
    name: 'Royal Purple',
    gradient: 'from-purple-500 to-indigo-500',
    bgGradient: 'from-purple-50 via-indigo-50 to-purple-100',
    shadow: 'shadow-purple-500/25'
  },
  amber: {
    name: 'Sunset Amber',
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-50 via-yellow-50 to-orange-100',
    shadow: 'shadow-amber-500/25'
  },
  rose: {
    name: 'Rose Pink',
    gradient: 'from-rose-500 to-pink-500',
    bgGradient: 'from-rose-50 via-pink-50 to-rose-100',
    shadow: 'shadow-rose-500/25'
  }
};

export default function OrganizationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [settings, setSettings] = useState<{
    id: string;
    logo_url: string;
    color_theme: string;
  } | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUserProfile();

  // Fetch organization and settings data
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.organizationId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch organization details
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organizationId)
          .single();

        if (orgError) throw orgError;
        setOrganization(orgData);

        // Fetch organization settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', profile.organizationId)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          // PGRST116 is "no rows returned" - this is fine, we'll create settings later
          throw settingsError;
        }

        if (settingsData) {
          setSettings(settingsData);
          if (settingsData.color_theme) {
            setSelectedTheme(settingsData.color_theme);
          }
          if (settingsData.logo_url) {
            setLogoUrl(settingsData.logo_url);
            setLogoPreview(settingsData.logo_url);
          }
        }
      } catch (error) {
        console.error('Error fetching organization data:', error);
        setMessage({ type: 'error', text: 'Failed to load organization settings.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, supabase]);

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - industry standard formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, WebP, or GIF).' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo image must be less than 2MB.' });
      return;
    }

    // Clear any previous error messages
    setMessage({ type: '', text: '' });

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organizationId) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let updatedLogoUrl = logoUrl;
      let oldLogoPath = null;

      // Extract old logo path for cleanup if it exists
      if (logoUrl && logoUrl.includes('organization_assets')) {
        const urlParts = logoUrl.split('/organization_assets/');
        if (urlParts.length > 1) {
          oldLogoPath = urlParts[1].split('?')[0]; // Remove query params
        }
      }

      // Upload new logo if selected (only for organization owners)
      if (logoFile && profile?.role === 'organization_owner') {
        const fileExtension = logoFile.name.split('.').pop();
        const fileName = `org_logo_${profile.organizationId}_${Date.now()}.${fileExtension}`;
        
        const { error: uploadError } = await supabase.storage
          .from('organization_assets')
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Failed to upload logo. Please try again.');
        }

        // Get public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from('organization_assets')
          .getPublicUrl(fileName);

        updatedLogoUrl = publicUrlData.publicUrl;

        // Clean up old logo if it exists and upload was successful
        if (oldLogoPath && oldLogoPath !== fileName) {
          try {
            await supabase.storage
              .from('organization_assets')
              .remove([oldLogoPath]);
          } catch (cleanupError) {
            console.warn('Failed to cleanup old logo:', cleanupError);
            // Don't fail the entire operation for cleanup failure
          }
        }
      }

      // Check if settings exist for this organization
      if (settings?.id) {
        // Update existing settings
        const updateData: Record<string, string> = {
          color_theme: selectedTheme,
          updated_at: new Date().toISOString()
        };
        
        // Only update logo if user is organization owner
        if (profile?.role === 'organization_owner') {
          updateData.logo_url = updatedLogoUrl;
        }
        
        const { error: updateError } = await supabase
          .from('organization_settings')
          .update(updateData)
          .eq('id', settings.id);

        if (updateError) throw updateError;
      } else {
        // Create new settings
        const insertData: Record<string, string> = {
          organization_id: profile.organizationId,
          color_theme: selectedTheme
        };
        
        // Only include logo if user is organization owner
        if (profile?.role === 'organization_owner') {
          insertData.logo_url = updatedLogoUrl;
        }
        
        const { error: insertError } = await supabase
          .from('organization_settings')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      // Only update logo URL state if user is organization owner
      if (profile?.role === 'organization_owner') {
        setLogoUrl(updatedLogoUrl);
      }
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Refresh the page to apply changes
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error('Error saving settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
      
      // Reset logo preview on error
      if (logoFile) {
        setLogoPreview(logoUrl || '');
        setLogoFile(null);
      }
    } finally {
      setSaving(false);
    }
  };

  // Render theme option
  const renderThemeOption = (themeKey: string) => {
    const theme = COLOR_THEMES[themeKey as keyof typeof COLOR_THEMES];
    const isSelected = selectedTheme === themeKey;
    
    return (
      <div 
        key={themeKey}
        className={`relative p-4 border rounded-xl transition-all cursor-pointer ${
          isSelected 
            ? 'border-2 border-blue-500 shadow-md' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setSelectedTheme(themeKey)}
      >
        <div className={`h-16 rounded-lg bg-gradient-to-r ${theme.gradient} mb-3`}></div>
        <div className="text-sm font-medium">{theme.name}</div>
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    );
  };

  return (
    <RoleRedirect allowedRoles={['admin', 'user', 'organization_owner']}>
      <UserLayout>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Organization Settings</h1>
            
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-500"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {message.text && (
                  <div className={`p-4 mb-6 rounded-lg ${
                    message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                  }`}>
                    {message.text}
                  </div>
                )}
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">Organization Information</h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                        <input
                          type="text"
                          value={organization?.name || ''}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">Contact support to change organization name</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={organization?.email || ''}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {profile?.role === 'organization_owner' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                    <div className="p-6 border-b border-gray-100">
                      <h2 className="text-lg font-semibold text-gray-800">Dashboard Logo</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Upload your organization logo to display in the dashboard sidebar
                      </p>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        <div>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Logo Image</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-green-50 file:text-green-700
                                hover:file:bg-green-100"
                            />
                            <p className="mt-1 text-xs text-gray-500">Recommended size: 200x200px. Max 2MB. Supports JPEG, PNG, WebP, GIF.</p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                          <div className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                            {logoPreview ? (
                              <Image
                                src={logoPreview}
                                alt="Logo Preview"
                                width={200}
                                height={200}
                                className="rounded-xl shadow-lg"
                              />
                            ) : (
                              <div className="text-gray-400 text-sm">No logo selected</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {profile?.role !== 'organization_owner' && logoUrl && logoUrl !== '/logoMain.png' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                    <div className="p-6 border-b border-gray-100">
                      <h2 className="text-lg font-semibold text-gray-800">Current Organization Logo</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Only organization owners can upload logos
                      </p>
                    </div>
                    
                    <div className="p-6">
                      <div className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                        <Image
                          src={logoUrl}
                          alt="Current Logo"
                          width={200}
                          height={200}
                          className="rounded-xl shadow-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">Dashboard Color Theme</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose a color theme for your dashboard highlights
                    </p>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {Object.keys(COLOR_THEMES).map(themeKey => renderThemeOption(themeKey))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-6 py-2 rounded-lg text-white font-medium ${
                      saving 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 shadow-md'
                    }`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </UserLayout>
    </RoleRedirect>
  );
}

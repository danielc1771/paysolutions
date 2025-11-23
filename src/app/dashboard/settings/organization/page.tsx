'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { useUserProfile } from '@/components/auth/RoleRedirect';

export default function OrganizationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<{
    id: string;
    name: string;
    email: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    phone?: string;
    dealer_license_number?: string;
    ein_number?: string;
  } | null>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedOrg, setEditedOrg] = useState<{
    name: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string;
  }>({ name: '', email: '', address: '', city: '', state: '', zip_code: '', phone: '' });
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [editedBusiness, setEditedBusiness] = useState<{
    dealer_license_number: string;
    ein_number: string;
    phone: string;
    cell_phone: string;
  }>({ dealer_license_number: '', ein_number: '', phone: '', cell_phone: '' });
  const [userProfile, setUserProfile] = useState<{ cell_phone?: string } | null>(null);
  const [settings, setSettings] = useState<{
    id: string;
    logo_url: string;
    color_theme: string;
  } | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [removeLogo, setRemoveLogo] = useState(false);
  const [hasLogoChanges, setHasLogoChanges] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
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
        setEditedOrg({
          name: orgData.name || '',
          email: orgData.email || '',
          address: orgData.address || '',
          city: orgData.city || '',
          state: orgData.state || '',
          zip_code: orgData.zip_code || '',
          phone: orgData.phone || ''
        });

        // Fetch user profile for cell phone
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('cell_phone')
          .eq('id', profile.id)
          .single();

        if (profileError) {
          console.warn('Error fetching profile:', profileError);
        } else {
          setUserProfile(profileData);
        }

        // Set business information
        setEditedBusiness({
          dealer_license_number: orgData.dealer_license_number || '',
          ein_number: orgData.ein_number || '',
          phone: orgData.phone || '',
          cell_phone: profileData?.cell_phone || ''
        });

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
      console.error('[Logo Upload] Invalid file type:', file.type);
      setMessage({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, WebP, or GIF).' });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      console.error('[Logo Upload] File too large:', file.size);
      setMessage({ type: 'error', text: 'Logo image must be less than 2MB.' });
      return;
    }

    // Clear any previous error messages
    setMessage({ type: '', text: '' });
    setRemoveLogo(false);
    setLogoFile(file);
    setHasLogoChanges(true); // Enable save button

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle logo removal with immediate save
  const handleRemoveLogo = async () => {
    if (!profile?.organizationId || profile?.role !== 'organization_owner') return;
    
    // Confirm removal
    if (!window.confirm('Are you sure you want to remove your organization logo? The default iOpes logo will be used instead.')) {
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let oldLogoPath = null;

      // Extract old logo path for cleanup if it exists
      if (logoUrl && logoUrl.includes('organization_assets')) {
        const urlParts = logoUrl.split('/organization_assets/');
        if (urlParts.length > 1) {
          oldLogoPath = urlParts[1].split('?')[0];
        }
      }

      // Delete from storage if exists
      if (oldLogoPath) {
        await supabase.storage
          .from('organization_assets')
          .remove([oldLogoPath]);
      }

      // Update database to remove logo URL
      if (settings?.id) {
        const { error: updateError } = await supabase
          .from('organization_settings')
          .update({
            logo_url: '',
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (updateError) {
          console.error('[Logo Upload] Database update error:', updateError);
          throw new Error('Failed to remove logo from database');
        }
      } else {
        // If no settings exist yet, create with empty logo
        const { error: insertError } = await supabase
          .from('organization_settings')
          .insert({
            organization_id: profile.organizationId,
            logo_url: '',
            color_theme: 'default'
          });

        if (insertError) {
          console.error('[Logo Upload] Database insert error:', insertError);
          throw new Error('Failed to save settings');
        }
      }

      // Update local state
      setLogoUrl('');
      setLogoPreview('');
      setLogoFile(null);
      setRemoveLogo(false);
      setHasLogoChanges(false);
      
      setMessage({ type: 'success', text: 'Logo removed successfully! Refreshing...' });
      
      // Reload page to update sidebar
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('[Logo Upload] Error removing logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove logo. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  // Handle saving logo changes only
  const handleSaveLogo = async () => {
    if (!profile?.organizationId || !logoFile) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      
      let oldLogoPath = null;

      // Extract old logo path for cleanup if it exists
      if (logoUrl && logoUrl.includes('organization_assets')) {
        const urlParts = logoUrl.split('/organization_assets/');
        if (urlParts.length > 1) {
          oldLogoPath = urlParts[1].split('?')[0];
        }
      }

      // Upload new logo
      const fileExtension = logoFile.name.split('.').pop();
      const fileName = `org_logo_${profile.organizationId}_${Date.now()}.${fileExtension}`;
      
      
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('organization_assets')
        .upload(fileName, logoFile);

      if (uploadError) {
        console.error('[Logo Upload] Upload error:', uploadError);
        throw new Error('Failed to upload logo. Please try again.');
      }

      console.log('[Logo Upload] Upload successful:', uploadData);

      // Get public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('organization_assets')
        .getPublicUrl(fileName);

      const updatedLogoUrl = publicUrlData.publicUrl;
      console.log('[Logo Upload] Public URL generated:', updatedLogoUrl);

      // Update database
      if (settings?.id) {
        console.log('[Logo Upload] Updating settings with new logo');
        const { error: updateError } = await supabase
          .from('organization_settings')
          .update({
            logo_url: updatedLogoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id);

        if (updateError) {
          console.error('[Logo Upload] Update error:', updateError);
          throw updateError;
        }
      } else {
        // Create new settings
        console.log('[Logo Upload] Creating new settings with logo');
        const { error: insertError } = await supabase
          .from('organization_settings')
          .insert({
            organization_id: profile.organizationId,
            logo_url: updatedLogoUrl,
            color_theme: 'default'
          });

        if (insertError) {
          console.error('[Logo Upload] Insert error:', insertError);
          throw insertError;
        }
      }

      // Clean up old logo if it exists
      if (oldLogoPath && oldLogoPath !== fileName) {
        try {
          console.log('[Logo Upload] Cleaning up old logo:', oldLogoPath);
          await supabase.storage
            .from('organization_assets')
            .remove([oldLogoPath]);
          console.log('[Logo Upload] Old logo cleaned up successfully');
        } catch (cleanupError) {
          console.warn('[Logo Upload] Failed to cleanup old logo:', cleanupError);
        }
      }

      // Update local state
      console.log('[Logo Upload] Updating local state with new logo URL:', updatedLogoUrl);
      setLogoUrl(updatedLogoUrl);
      setLogoPreview(updatedLogoUrl);
      setLogoFile(null);
      setHasLogoChanges(false);
      
      console.log('[Logo Upload] Logo saved successfully');
      setMessage({ type: 'success', text: 'Logo saved successfully! Refreshing...' });
      
      // Reload the page to apply changes to sidebar
      setTimeout(() => {
        console.log('[Logo Upload] Reloading page');
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('[Logo Upload] Error saving logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save logo. Please try again.';
      setMessage({ type: 'error', text: errorMessage });
      
      // Reset logo preview on error
      setLogoPreview(logoUrl || '');
      setLogoFile(null);
      setHasLogoChanges(false);
    } finally {
      setSaving(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.organizationId) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      console.log('[Logo Upload] Starting save process', {
        hasLogoFile: !!logoFile,
        removeLogo,
        currentLogoUrl: logoUrl,
        role: profile?.role,
        organizationId: profile?.organizationId
      });

      let updatedLogoUrl = logoUrl;
      let oldLogoPath = null;

      // Extract old logo path for cleanup if it exists
      if (logoUrl && logoUrl.includes('organization_assets')) {
        const urlParts = logoUrl.split('/organization_assets/');
        if (urlParts.length > 1) {
          oldLogoPath = urlParts[1].split('?')[0]; // Remove query params
          console.log('[Logo Upload] Old logo path extracted:', oldLogoPath);
        }
      }

      // Upload new logo if selected (only for organization owners)
      if (logoFile && profile?.role === 'organization_owner') {
        const fileExtension = logoFile.name.split('.').pop();
        const fileName = `org_logo_${profile.organizationId}_${Date.now()}.${fileExtension}`;
        
        console.log('[Logo Upload] Uploading new logo:', fileName);
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('organization_assets')
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error('[Logo Upload] Upload error:', uploadError);
          throw new Error('Failed to upload logo. Please try again.');
        }

        console.log('[Logo Upload] Upload successful:', uploadData);

        // Get public URL for the uploaded file
        const { data: publicUrlData } = supabase.storage
          .from('organization_assets')
          .getPublicUrl(fileName);

        updatedLogoUrl = publicUrlData.publicUrl;
        console.log('[Logo Upload] Public URL generated:', updatedLogoUrl);

        // Clean up old logo if it exists and upload was successful
        if (oldLogoPath && oldLogoPath !== fileName) {
          try {
            console.log('[Logo Upload] Cleaning up old logo:', oldLogoPath);
            await supabase.storage
              .from('organization_assets')
              .remove([oldLogoPath]);
            console.log('[Logo Upload] Old logo cleaned up successfully');
          } catch (cleanupError) {
            console.warn('[Logo Upload] Failed to cleanup old logo:', cleanupError);
            // Don't fail the entire operation for cleanup failure
          }
        }
      }

      // Check if settings exist for this organization
      if (settings?.id) {
        // Update existing settings
        const updateData: Record<string, string> = {
          color_theme: 'default',
          updated_at: new Date().toISOString()
        };
        
        // Only update logo if user is organization owner
        if (profile?.role === 'organization_owner') {
          updateData.logo_url = updatedLogoUrl;
        }
        
        console.log('[Logo Upload] Updating settings:', { id: settings.id, updateData });
        
        const { error: updateError } = await supabase
          .from('organization_settings')
          .update(updateData)
          .eq('id', settings.id);

        if (updateError) {
          console.error('[Logo Upload] Update error:', updateError);
          throw updateError;
        }
        
        console.log('[Logo Upload] Settings updated successfully');
      } else {
        // Create new settings
        const insertData: Record<string, string> = {
          organization_id: profile.organizationId,
          color_theme: 'default'
        };
        
        // Only include logo if user is organization owner
        if (profile?.role === 'organization_owner') {
          insertData.logo_url = updatedLogoUrl;
        }
        
        console.log('[Logo Upload] Creating new settings:', insertData);
        
        const { error: insertError } = await supabase
          .from('organization_settings')
          .insert(insertData);

        if (insertError) {
          console.error('[Logo Upload] Insert error:', insertError);
          throw insertError;
        }
        
        console.log('[Logo Upload] Settings created successfully');
      }

      // Only update logo URL state if user is organization owner
      if (profile?.role === 'organization_owner') {
        console.log('[Logo Upload] Updating local state with new logo URL:', updatedLogoUrl);
        setLogoUrl(updatedLogoUrl);
        setLogoPreview(updatedLogoUrl);
        setLogoFile(null);
        setRemoveLogo(false);
      }
      
      console.log('[Logo Upload] Save completed successfully');
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Reload the page to apply changes
      setTimeout(() => {
        console.log('[Logo Upload] Reloading page');
        window.location.reload();
      }, 1000);
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

  return (
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
                    {profile?.role === 'organization_owner' && (
                      <div className="mb-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingInfo(!isEditingInfo)}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          {isEditingInfo ? 'Cancel' : 'Edit Information'}
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                        <input
                          type="text"
                          value={isEditingInfo ? editedOrg.name : organization?.name || ''}
                          onChange={(e) => setEditedOrg({ ...editedOrg, name: e.target.value })}
                          disabled={!isEditingInfo}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingInfo 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={isEditingInfo ? editedOrg.email : organization?.email || ''}
                          onChange={(e) => setEditedOrg({ ...editedOrg, email: e.target.value })}
                          disabled={!isEditingInfo}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingInfo 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={isEditingInfo ? editedOrg.phone : organization?.phone || ''}
                          onChange={(e) => setEditedOrg({ ...editedOrg, phone: e.target.value })}
                          disabled={!isEditingInfo}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingInfo 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                          type="text"
                          value={isEditingInfo ? editedOrg.address : organization?.address || ''}
                          onChange={(e) => setEditedOrg({ ...editedOrg, address: e.target.value })}
                          disabled={!isEditingInfo}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingInfo 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={isEditingInfo ? editedOrg.city : organization?.city || ''}
                          onChange={(e) => setEditedOrg({ ...editedOrg, city: e.target.value })}
                          disabled={!isEditingInfo}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingInfo 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={isEditingInfo ? editedOrg.state : organization?.state || ''}
                          onChange={(e) => setEditedOrg({ ...editedOrg, state: e.target.value })}
                          disabled={!isEditingInfo}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingInfo 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                        <input
                          type="text"
                          value={isEditingInfo ? editedOrg.zip_code : organization?.zip_code || ''}
                          onChange={(e) => setEditedOrg({ ...editedOrg, zip_code: e.target.value })}
                          disabled={!isEditingInfo}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingInfo 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                        />
                      </div>
                    </div>
                    
                    {isEditingInfo && profile?.role === 'organization_owner' && (
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingInfo(false);
                            setEditedOrg({
                              name: organization?.name || '',
                              email: organization?.email || '',
                              address: organization?.address || '',
                              city: organization?.city || '',
                              state: organization?.state || '',
                              zip_code: organization?.zip_code || '',
                              phone: organization?.phone || ''
                            });
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setSaving(true);
                              const { error } = await supabase
                                .from('organizations')
                                .update({
                                  name: editedOrg.name,
                                  email: editedOrg.email,
                                  address: editedOrg.address,
                                  city: editedOrg.city,
                                  state: editedOrg.state,
                                  zip_code: editedOrg.zip_code,
                                  phone: editedOrg.phone,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', organization?.id);
                              
                              if (error) throw error;
                              
                              setOrganization({ ...organization!, ...editedOrg });
                              setIsEditingInfo(false);
                              setMessage({ type: 'success', text: 'Organization information updated successfully!' });
                            } catch (error) {
                              console.error('Error updating organization:', error);
                              setMessage({ type: 'error', text: 'Failed to update organization information.' });
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Dealer Business Information Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                  <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">Dealer Business Information</h2>
                  </div>
                  
                  <div className="p-6">
                    {profile?.role === 'organization_owner' && (
                      <div className="mb-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIsEditingBusiness(!isEditingBusiness)}
                          className="text-sm text-green-600 hover:text-green-700 font-medium"
                        >
                          {isEditingBusiness ? 'Cancel' : 'Edit Information'}
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dealer License Number</label>
                        <input
                          type="text"
                          value={isEditingBusiness ? editedBusiness.dealer_license_number : organization?.dealer_license_number || 'Not provided'}
                          onChange={(e) => setEditedBusiness({ ...editedBusiness, dealer_license_number: e.target.value })}
                          disabled={!isEditingBusiness}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingBusiness 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                          placeholder="DL123456"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">EIN Number</label>
                        <input
                          type="text"
                          value={isEditingBusiness ? editedBusiness.ein_number : organization?.ein_number || 'Not provided'}
                          onChange={(e) => setEditedBusiness({ ...editedBusiness, ein_number: e.target.value })}
                          disabled={!isEditingBusiness}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingBusiness 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                          placeholder="12-3456789"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone Number</label>
                        <input
                          type="tel"
                          value={isEditingBusiness ? editedBusiness.phone : organization?.phone || 'Not provided'}
                          onChange={(e) => setEditedBusiness({ ...editedBusiness, phone: e.target.value })}
                          disabled={!isEditingBusiness}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingBusiness 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                          placeholder="(555) 987-6543"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cell Phone Number</label>
                        <input
                          type="tel"
                          value={isEditingBusiness ? editedBusiness.cell_phone : userProfile?.cell_phone || 'Not provided'}
                          onChange={(e) => setEditedBusiness({ ...editedBusiness, cell_phone: e.target.value })}
                          disabled={!isEditingBusiness}
                          className={`w-full px-4 py-2 border rounded-lg ${
                            isEditingBusiness 
                              ? 'border-gray-300 bg-white text-gray-900' 
                              : 'border-gray-300 bg-gray-50 text-gray-500'
                          }`}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                    
                    {isEditingBusiness && profile?.role === 'organization_owner' && (
                      <div className="mt-6 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingBusiness(false);
                            setEditedBusiness({
                              dealer_license_number: organization?.dealer_license_number || '',
                              ein_number: organization?.ein_number || '',
                              phone: organization?.phone || '',
                              cell_phone: userProfile?.cell_phone || ''
                            });
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setSaving(true);
                              
                              // Update organization fields
                              const { error: orgError } = await supabase
                                .from('organizations')
                                .update({
                                  dealer_license_number: editedBusiness.dealer_license_number,
                                  ein_number: editedBusiness.ein_number,
                                  phone: editedBusiness.phone,
                                  updated_at: new Date().toISOString()
                                })
                                .eq('id', organization?.id);
                              
                              if (orgError) throw orgError;
                              
                              // Update profile cell phone
                              const { error: profileError } = await supabase
                                .from('profiles')
                                .update({
                                  cell_phone: editedBusiness.cell_phone
                                })
                                .eq('id', profile.id);
                              
                              if (profileError) throw profileError;
                              
                              // Update local state
                              setOrganization({ 
                                ...organization!, 
                                dealer_license_number: editedBusiness.dealer_license_number,
                                ein_number: editedBusiness.ein_number,
                                phone: editedBusiness.phone
                              });
                              setUserProfile({ cell_phone: editedBusiness.cell_phone });
                              setIsEditingBusiness(false);
                              setMessage({ type: 'success', text: 'Business information updated successfully!' });
                              
                              // Dispatch event to trigger onboarding re-check
                              window.dispatchEvent(new Event('onboardingUpdated'));
                            } catch (error) {
                              console.error('Error updating business information:', error);
                              setMessage({ type: 'error', text: 'Failed to update business information.' });
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
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
                          
                          <div className="flex gap-3">
                            {(logoUrl || logoPreview) && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                disabled={saving}
                                className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {saving ? 'Removing...' : 'Remove Logo'}
                              </button>
                            )}
                            
                            <button
                              type="button"
                              onClick={handleSaveLogo}
                              disabled={!hasLogoChanges || saving}
                              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                hasLogoChanges && !saving
                                  ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600'
                                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                          <div className="w-full h-48 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                            {logoPreview || logoUrl ? (
                              <Image
                                src={logoPreview || logoUrl}
                                alt="Logo Preview"
                                width={200}
                                height={200}
                                className="rounded-xl shadow-lg object-contain"
                                unoptimized
                                onError={(e) => {
                                  console.error('[Logo Upload] Image load error:', e);
                                  setLogoPreview('');
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center">
                                <Image
                                  src="/logoMain.png"
                                  alt="Default iOpes Logo"
                                  width={150}
                                  height={150}
                                  className="object-contain opacity-50"
                                />
                                <p className="text-gray-400 text-sm mt-2">Default logo (iOpes)</p>
                              </div>
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
                          className="rounded-xl shadow-lg object-contain"
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
  );
}

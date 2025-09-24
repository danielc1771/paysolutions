import 'server-only';
import { createClient } from '@/utils/supabase/admin';

export interface OrganizationOwner {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
}

/**
 * Get the organization owner for a given organization ID
 * There should only be one organization owner per organization
 */
export async function getOrganizationOwner(organizationId: string): Promise<OrganizationOwner | null> {
  try {
    const supabase = await createClient();
    
    const { data: owner, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, organization_id')
      .eq('organization_id', organizationId)
      .eq('role', 'organization_owner')
      .eq('status', 'ACTIVE')
      .single();

    if (error || !owner) {
      console.error('No organization owner found for organization:', organizationId, error);
      return null;
    }

    return {
      id: owner.id,
      email: owner.email!,
      fullName: owner.full_name || 'Organization Owner',
      organizationId: owner.organization_id!
    };
  } catch (error) {
    console.error('Error fetching organization owner:', error);
    return null;
  }
}

/**
 * Get the organization owner for a loan by loan ID
 */
export async function getOrganizationOwnerByLoanId(loanId: string): Promise<OrganizationOwner | null> {
  try {
    const supabase = await createClient();
    
    // First get the loan's organization ID
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('organization_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan?.organization_id) {
      console.error('No organization found for loan:', loanId, loanError);
      return null;
    }

    return getOrganizationOwner(loan.organization_id);
  } catch (error) {
    console.error('Error fetching organization owner by loan ID:', error);
    return null;
  }
}
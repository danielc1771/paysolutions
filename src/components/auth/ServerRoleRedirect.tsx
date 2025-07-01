import { redirect } from 'next/navigation'
import { getServerProfile } from '@/lib/auth/server-utils'
import { getHomepageForRole, type Role } from '@/lib/auth/roles'

interface ServerRoleRedirectProps {
  children: React.ReactNode
  allowedRoles?: Role[]
  redirectIfUnauthorized?: boolean
}

export async function ServerRoleRedirect({ 
  children, 
  allowedRoles, 
  redirectIfUnauthorized = true 
}: ServerRoleRedirectProps) {
  const profile = await getServerProfile()

  // If no profile and redirect is enabled, redirect to login
  if (!profile && redirectIfUnauthorized) {
    redirect('/login')
  }

  // If no profile but redirect is disabled, show access denied
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please log in to access this page.</p>
        </div>
      </div>
    )
  }

  // If no roles specified, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>
  }

  // Check if user has required role
  const hasRequiredRole = allowedRoles.includes(profile.role)

  // Redirect if unauthorized
  if (!hasRequiredRole && redirectIfUnauthorized) {
    const homepage = getHomepageForRole(profile.role)
    redirect(homepage)
  }

  // Show access denied if unauthorized and redirect is disabled
  if (!hasRequiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">
            Required role(s): {allowedRoles.join(', ')}
          </p>
          <p className="text-sm text-gray-500">Your role: {profile.role}</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
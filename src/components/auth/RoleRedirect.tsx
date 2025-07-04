'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClientProfile } from '@/lib/auth/utils'
import { getHomepageForRole, type Role, type UserProfile } from '@/lib/auth/roles'

interface RoleRedirectProps {
  children: React.ReactNode
  allowedRoles?: Role[]
  redirectIfUnauthorized?: boolean
}

export function RoleRedirect({ 
  children, 
  allowedRoles, 
  redirectIfUnauthorized = true 
}: RoleRedirectProps) {
  const router = useRouter()
  const [, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkRole() {
      try {
        const userProfile = await getClientProfile()
        setProfile(userProfile)

        if (!userProfile) {
          if (redirectIfUnauthorized) {
            router.push('/login')
          }
          return
        }

        // If no roles specified, allow access
        if (!allowedRoles || allowedRoles.length === 0) {
          setHasAccess(true)
          return
        }

        // Check if user has required role
        const hasRequiredRole = allowedRoles.includes(userProfile.role)
        setHasAccess(hasRequiredRole)

        // Redirect if unauthorized
        if (!hasRequiredRole && redirectIfUnauthorized) {
          const homepage = getHomepageForRole(userProfile.role)
          router.push(homepage)
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        if (redirectIfUnauthorized) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [allowedRoles, redirectIfUnauthorized, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Hook for getting current user profile
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const userProfile = await getClientProfile()
        setProfile(userProfile)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  return { profile, loading }
}
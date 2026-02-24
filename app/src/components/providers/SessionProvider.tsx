'use client';

import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';
import { UserRole, UserProfile } from '@/lib/auth/types';

const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

const DEV_PROFILES: Record<UserRole, UserProfile> = {
  nanny: {
    id: 'dev-nanny-profile',
    user_id: 'dev-nanny-user',
    first_name: 'Emma',
    last_name: 'Wilson',
    email: 'emma@babybloom.dev',
    suburb: 'Bondi',
    postcode: '2026',
    profile_picture_url: null,
  },
  parent: {
    id: 'dev-parent-profile',
    user_id: 'dev-parent-user',
    first_name: 'James',
    last_name: 'Chen',
    email: 'james@babybloom.dev',
    suburb: 'Surry Hills',
    postcode: '2010',
    profile_picture_url: null,
  },
  admin: {
    id: 'dev-admin-profile',
    user_id: 'dev-admin-user',
    first_name: 'Bailey',
    last_name: 'Admin',
    email: 'admin@babybloom.dev',
    suburb: 'Sydney',
    postcode: '2000',
    profile_picture_url: null,
  },
  super_admin: {
    id: 'dev-admin-profile',
    user_id: 'dev-admin-user',
    first_name: 'Bailey',
    last_name: 'Admin',
    email: 'admin@babybloom.dev',
    suburb: 'Sydney',
    postcode: '2000',
    profile_picture_url: null,
  },
};

function getDevRole(): UserRole {
  if (typeof window === 'undefined') return 'nanny';
  return (localStorage.getItem('bb-dev-role') as UserRole) || 'nanny';
}

function DevSessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('nanny');

  useEffect(() => {
    setRole(getDevRole());
  }, []);

  const profile = DEV_PROFILES[role];

  const devUser = {
    id: profile.user_id,
    email: profile.email,
    app_metadata: {},
    user_metadata: { first_name: profile.first_name, last_name: profile.last_name },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User;

  return (
    <AuthContext.Provider
      value={{
        user: devUser,
        role,
        profile,
        isLoading: false,
        signOut: async () => {
          window.location.href = '/';
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  if (isDevMode) {
    return <DevSessionProvider>{children}</DevSessionProvider>;
  }

  return <RealSessionProvider>{children}</RealSessionProvider>;
}

function RealSessionProvider({ children }: SessionProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      } else if (roleData) {
        setRole(roleData.role as UserRole);
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile(profileData as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, [supabase]);

  const clearUserData = useCallback(() => {
    setUser(null);
    setRole(null);
    setProfile(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore — we're leaving anyway
    }
    clearUserData();
    window.location.href = '/login';
  }, [supabase, clearUserData]);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          await fetchUserData(session.user.id);
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await fetchUserData(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          clearUserData();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
        } else if (event === 'USER_UPDATED' && session?.user) {
          setUser(session.user);
          await fetchUserData(session.user.id);
        }
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserData, clearUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        profile,
        isLoading,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable persistent sessions
    persistSession: true,
    
    // Store session in localStorage for persistence across browser sessions
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    
    // Auto-refresh tokens before they expire
    autoRefreshToken: true,
    
    // Detect session in URL (for magic links, etc.)
    detectSessionInUrl: true,
    
    // Flow type for authentication
    flowType: 'pkce',
    
    // Debug mode in development
    debug: process.env.NODE_ENV === 'development'
  },
  
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'youthhub-web'
    }
  },
  
  // Real-time configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Export a function to get the client with current auth state
export const getSupabaseClient = () => supabase

// Export auth helpers
export const auth = {
  // Get current user
  getUser: () => supabase.auth.getUser(),
  
  // Get current session
  getSession: () => supabase.auth.getSession(),
  
  // Sign out
  signOut: () => supabase.auth.signOut(),
  
  // Refresh session
  refreshSession: () => supabase.auth.refreshSession(),
  
  // Check if user is authenticated
  isAuthenticated: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  }
}

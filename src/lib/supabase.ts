
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isConfigured = supabaseUrl && supabaseAnonKey;

// Fail-safe client creation
// If environment variables are missing (e.g. during build time without env vars), 
// we return a mock client to prevent the build from crashing with "supabaseUrl is required".
// NOTE: You must add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel Project Settings for the app to function.

const mockClient = {
    from: () => ({
        select: () => ({
            eq: () => ({ single: () => ({ data: null, error: { message: 'Missing DB Config' } }), data: [], error: { message: 'Missing DB Config' } }),
            order: () => ({ data: [], error: { message: 'Missing DB Config' } }),
            delete: () => ({ error: { message: 'Missing DB Config' } }),
            limit: () => ({ data: [], error: null }),
            data: [],
            error: { message: 'Missing DB Config' }
        }),
        insert: () => ({ select: () => ({ single: () => ({ data: null, error: { message: 'Missing DB Config' } }) }) }),
        upsert: () => ({ select: () => ({ single: () => ({ data: null, error: { message: 'Missing DB Config' } }) }) })
    }),
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }) }
} as any;

// 1. Client for public access
export const supabase = isConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : mockClient;

// 2. Admin client for server-side operations
export const supabaseAdmin = (supabaseUrl && supabaseServiceKey)
    ? createClient(supabaseUrl, supabaseServiceKey)
    : mockClient;

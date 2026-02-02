import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'supabase-auth-token',
    },
    global: {
        headers: {
            'x-client-info': 'property-tax-survey-app'
        }
    }
});

// Helper to add timeout to any promise
export const withTimeout = (promise, timeoutMs = 15000) => {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
        )
    ]);
};

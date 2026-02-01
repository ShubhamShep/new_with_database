import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    // Check if user is already logged in
    useEffect(() => {
        let mounted = true;

        // Timeout to prevent infinite loading
        const timeout = setTimeout(() => {
            if (mounted) setCheckingSession(false);
        }, 3000);

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (mounted) {
                if (session) {
                    navigate('/dashboard', { replace: true });
                }
                setCheckingSession(false);
            }
        }).catch(err => {
            console.error('Session check failed:', err);
            if (mounted) setCheckingSession(false);
        });

        // Listen for auth changes - this handles navigation after login
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Login page - Auth event:', event);
            if (event === 'SIGNED_IN' && session) {
                // Add small delay to ensure session is persisted
                setTimeout(() => {
                    navigate('/dashboard', { replace: true });
                }, 100);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeout);
            subscription.unsubscribe();
        };
    }, [navigate]);

    const handleAuth = async (isSignUp) => {
        if (!email || !password) {
            alert('Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = isSignUp
                ? await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin + '/new_with_database/#/dashboard'
                    }
                })
                : await supabase.auth.signInWithPassword({ email, password });

            if (error) throw error;

            if (isSignUp) {
                alert('Sign up successful! You can now log in.');
                setLoading(false);
            }
            // Don't navigate here - let onAuthStateChange handle it
            // This ensures the session is fully established before navigating
        } catch (error) {
            console.error('Auth error:', error.message);
            alert(error.message);
            setLoading(false);
        }
    };

    // Show loading while checking session
    if (checkingSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            </div>

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl shadow-lg mb-4">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">INDICES</h1>
                    <p className="text-blue-300 mt-1 text-sm">Geospatial Survey System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                    <h2 className="text-xl font-semibold text-white text-center mb-6">Surveyor Login</h2>

                    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleAuth(false); }}>
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="surveyor@example.com"
                                autoComplete="email"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : 'Sign In'}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/20"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-transparent text-gray-400">or</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleAuth(true)}
                            disabled={loading}
                            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all"
                        >
                            Create Account
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-gray-500 text-xs mt-6">
                    Powered by INDICES Geospatial Survey System
                </p>
            </div>
        </div>
    );
};

export default Login;

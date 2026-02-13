import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { dataStore } from '../utils/dataStore';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile including role
    const fetchProfile = useCallback(async (userId) => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.log('Profile fetch error:', error.code);
                if (error.code === 'PGRST116') {
                    // Profile doesn't exist — create one
                    const currentUser = (await supabase.auth.getUser()).data.user;
                    const { data: newProfile, error: createError } = await supabase
                        .from('user_profiles')
                        .insert({
                            id: userId,
                            email: currentUser?.email,
                            role: 'surveyor'
                        })
                        .select()
                        .single();

                    if (!createError && newProfile) {
                        setProfile(newProfile);
                    } else {
                        setProfile({ id: userId, role: 'surveyor', email: currentUser?.email });
                    }
                    return;
                }
                setProfile({ id: userId, role: 'surveyor' });
                return;
            }

            setProfile(data);
        } catch (err) {
            console.error('Error in fetchProfile:', err);
            setProfile({ id: userId, role: 'surveyor' });
        }
    }, []);

    // ─── SINGLE auth listener for the entire app ───
    useEffect(() => {
        let mounted = true;

        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!mounted) return;
            if (session?.user) {
                setUser(session.user);
                fetchProfile(session.user.id);
                import('../utils/dataService').then(({ dataService }) => {
                    dataService.fetchAll(session.user.id);
                });
            }
            setLoading(false);
        });

        // 2. Listen for changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!mounted) return;
                console.log('Auth event:', event);

                if (event === 'SIGNED_IN' && session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                    import('../utils/dataService').then(({ dataService }) => {
                        dataService.fetchAll(session.user.id);
                    });
                } else if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setProfile(null);
                    dataStore.clear();
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    setUser(session.user);
                }

                setLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    // Role checking utilities
    const isAdmin = useCallback(() => profile?.role === 'admin', [profile]);
    const isSupervisor = useCallback(() => profile?.role === 'supervisor', [profile]);
    const isSurveyor = useCallback(() => profile?.role === 'surveyor', [profile]);
    const hasRole = useCallback((role) => profile?.role === role, [profile]);
    const hasAnyRole = useCallback((roles) => roles.includes(profile?.role), [profile]);

    // Permission checking
    const canManageUsers = useCallback(() => profile?.role === 'admin', [profile]);
    const canManageZones = useCallback(() => ['admin', 'supervisor'].includes(profile?.role), [profile]);
    const canViewAllSurveys = useCallback(() => ['admin', 'supervisor'].includes(profile?.role), [profile]);
    const canApproveSurveys = useCallback(() => ['admin', 'supervisor'].includes(profile?.role), [profile]);
    const canExportData = useCallback(() => ['admin', 'supervisor'].includes(profile?.role), [profile]);

    // Update profile
    const updateProfile = async (updates) => {
        if (!user) return { error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('user_profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', user.id)
            .select()
            .single();

        if (!error) {
            setProfile(data);
        }

        return { data, error };
    };

    // Sign out — single clean function
    const signOut = async () => {
        try {
            dataStore.clear();
            localStorage.removeItem('supabase-auth-token');
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('signOut error:', error);
                throw error;
            }
            // State is cleared by the onAuthStateChange listener above
        } catch (err) {
            // Force-clear state even if Supabase call fails
            setUser(null);
            setProfile(null);
            dataStore.clear();
            throw err;
        }
    };

    const value = {
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        // Role checks
        isAdmin,
        isSupervisor,
        isSurveyor,
        hasRole,
        hasAnyRole,
        // Permission checks
        canManageUsers,
        canManageZones,
        canViewAllSurveys,
        canApproveSurveys,
        canExportData,
        // Actions
        updateProfile,
        signOut,
        refreshProfile: () => user && fetchProfile(user.id)
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;

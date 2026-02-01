import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

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
    const [error, setError] = useState(null);

    // Fetch user profile including role
    const fetchProfile = async (userId) => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.log('Profile fetch error (may be normal for new users):', error.code);
                // Profile might not exist yet - set a default profile
                if (error.code === 'PGRST116') {
                    // Try to create profile
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
                        // Even if creation fails, set a minimal profile so app works
                        setProfile({ id: userId, role: 'surveyor', email: currentUser?.email });
                    }
                    return;
                }
                // For other errors, set a minimal profile
                setProfile({ id: userId, role: 'surveyor' });
                return;
            }

            setProfile(data);
        } catch (err) {
            console.error('Error in fetchProfile:', err);
            // Set minimal profile so app continues to work
            setProfile({ id: userId, role: 'surveyor' });
        }
    };

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Role checking utilities
    const isAdmin = () => profile?.role === 'admin';
    const isSupervisor = () => profile?.role === 'supervisor';
    const isSurveyor = () => profile?.role === 'surveyor';
    const hasRole = (role) => profile?.role === role;
    const hasAnyRole = (roles) => roles.includes(profile?.role);

    // Permission checking
    const canManageUsers = () => isAdmin();
    const canManageZones = () => isAdmin() || isSupervisor();
    const canViewAllSurveys = () => isAdmin() || isSupervisor();
    const canApproveSurveys = () => isAdmin() || isSupervisor();
    const canExportData = () => isAdmin() || isSupervisor();

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

    // Sign out
    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    const value = {
        user,
        profile,
        loading,
        error,
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

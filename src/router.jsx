import React from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Survey from './pages/Survey';
import SurveyDetail from './pages/SurveyDetail';
import Admin from './pages/Admin';
import SurveyedBuildings from './pages/SurveyedBuildings';
// V2 Pages
import UserManagement from './pages/UserManagement';
import ZoneManagement from './pages/ZoneManagement';
import MyAssignments from './pages/MyAssignments';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const [session, setSession] = React.useState(undefined); // undefined = not checked yet
    const [loading, setLoading] = React.useState(true);
    const [initialCheckDone, setInitialCheckDone] = React.useState(false);

    React.useEffect(() => {
        let mounted = true;
        let noSessionTimeout = null;

        // Check session immediately to avoid waiting for listener
        const checkSession = async () => {
            try {
                const { data } = await supabase.auth.getSession();
                if (mounted && data.session) {
                    setSession(data.session);
                    setLoading(false);
                    setInitialCheckDone(true);
                }
            } catch (error) {
                console.error('Error checking session:', error);
            }
        };
        checkSession();

        // Listen for auth changes - this is the primary source of truth for updates
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session ? 'Has session' : 'No session');

            if (mounted) {
                if (session) {
                    // We have a session - immediately update and stop loading
                    setSession(session);
                    setLoading(false);
                    setInitialCheckDone(true);
                    if (noSessionTimeout) clearTimeout(noSessionTimeout);
                } else if (event === 'INITIAL_SESSION' && !session) {
                    // No session on initial check - wait a bit to be sure
                    // This gives time for the session to be restored from storage
                    noSessionTimeout = setTimeout(() => {
                        if (mounted && !initialCheckDone) {
                            console.log('No session confirmed after delay');
                            setSession(null);
                            setLoading(false);
                            setInitialCheckDone(true);
                        }
                    }, 1500);
                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setLoading(false);
                }
            }
        });

        // Fallback: If nothing happens within 5 seconds, check session manually
        const fallbackTimeout = setTimeout(async () => {
            if (mounted && loading && !initialCheckDone) {
                console.log('Fallback session check...');
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) {
                    setSession(session);
                    setLoading(false);
                    setInitialCheckDone(true);
                }
            }
        }, 5000);

        return () => {
            mounted = false;
            clearTimeout(fallbackTimeout);
            if (noSessionTimeout) clearTimeout(noSessionTimeout);
            subscription.unsubscribe();
        };
    }, []);

    // Show loading while checking session
    if (loading || session === undefined) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    return session ? children : <Navigate to="/login" replace />;
};

const router = createHashRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
    },
    {
        path: '/',
        element: <AuthLayout />,
        children: [
            {
                path: 'login',
                element: <Login />,
            },
        ],
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <DashboardLayout />
            </ProtectedRoute>
        ),
        children: [
            {
                path: 'dashboard',
                element: <Dashboard />,
            },
            {
                path: 'survey',
                element: <Survey />,
            },
            {
                path: 'survey/:id',
                element: <SurveyDetail />,
            },
            {
                path: 'admin',
                element: <Admin />,
            },
            {
                path: 'surveyed-buildings',
                element: <SurveyedBuildings />,
            },
            // V2 Routes
            {
                path: 'users',
                element: <UserManagement />,
            },
            {
                path: 'zones',
                element: <ZoneManagement />,
            },
            {
                path: 'my-assignments',
                element: <MyAssignments />,
            },
        ],
    },
]);

export default router;


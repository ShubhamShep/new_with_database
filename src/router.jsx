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

    React.useEffect(() => {
        let mounted = true;

        // Listen for auth changes FIRST - this is the primary source of truth
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session ? 'Has session' : 'No session');
            if (mounted) {
                setSession(session);
                // Only stop loading after we get a definitive auth state
                if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                    setLoading(false);
                }
            }
        });

        // Fallback: If no auth event fires within 3 seconds, check session manually
        const fallbackTimeout = setTimeout(async () => {
            if (mounted && loading) {
                console.log('Fallback session check...');
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) {
                    setSession(session);
                    setLoading(false);
                }
            }
        }, 3000);

        return () => {
            mounted = false;
            clearTimeout(fallbackTimeout);
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


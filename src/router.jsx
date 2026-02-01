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

        // Get initial session
        const checkSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (mounted) {
                    if (error) {
                        console.error('Auth error:', error);
                    }
                    console.log('Session check result:', session ? 'Authenticated' : 'Not authenticated');
                    setSession(session);
                    setLoading(false);
                }
            } catch (err) {
                console.error('getSession failed:', err);
                if (mounted) {
                    setSession(null);
                    setLoading(false);
                }
            }
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('Auth state changed:', _event, session ? 'Has session' : 'No session');
            if (mounted) {
                setSession(session);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Show loading while checking session
    if (loading || session === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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


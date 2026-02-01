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
    const [session, setSession] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
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


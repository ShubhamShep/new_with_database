import React from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Survey from './pages/Survey';
import SurveyDetail from './pages/SurveyDetail';
import Admin from './pages/Admin';
import SurveyedBuildings from './pages/SurveyedBuildings';
import UserManagement from './pages/UserManagement';
import ZoneManagement from './pages/ZoneManagement';
import MyAssignments from './pages/MyAssignments';
import { useAuth } from './contexts/AuthContext';

// ─── Simple ProtectedRoute that reads from AuthContext ───
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Checking authentication...</p>
                </div>
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// ─── Public route — redirect to dashboard if already logged in ───
const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

const router = createHashRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
    },
    {
        path: '/login',
        element: (
            <PublicRoute>
                <AuthLayout />
            </PublicRoute>
        ),
        children: [
            {
                index: true,
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

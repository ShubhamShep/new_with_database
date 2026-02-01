import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * RoleGuard - Protects routes based on user roles
 * 
 * Usage:
 * <RoleGuard roles={['admin', 'supervisor']}>
 *   <ProtectedComponent />
 * </RoleGuard>
 */
const RoleGuard = ({
    children,
    roles = [],
    fallback = null,
    redirectTo = '/dashboard'
}) => {
    const { profile, loading, hasAnyRole } = useAuth();

    // Show loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-500">Checking permissions...</span>
                </div>
            </div>
        );
    }

    // Check if user has required role
    if (roles.length > 0 && !hasAnyRole(roles)) {
        // If fallback is provided, show it
        if (fallback) {
            return fallback;
        }
        // Otherwise redirect
        return <Navigate to={redirectTo} replace />;
    }

    return children;
};

/**
 * AdminOnly - Shorthand for admin-only content
 */
export const AdminOnly = ({ children, fallback = null }) => (
    <RoleGuard roles={['admin']} fallback={fallback}>
        {children}
    </RoleGuard>
);

/**
 * SupervisorOrAdmin - Shorthand for supervisor and admin content
 */
export const SupervisorOrAdmin = ({ children, fallback = null }) => (
    <RoleGuard roles={['admin', 'supervisor']} fallback={fallback}>
        {children}
    </RoleGuard>
);

/**
 * PermissionMessage - Shows a message when user doesn't have permission
 */
export const PermissionMessage = ({ message = "You don't have permission to view this content." }) => (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h3>
        <p className="text-gray-500 max-w-md">{message}</p>
    </div>
);

export default RoleGuard;

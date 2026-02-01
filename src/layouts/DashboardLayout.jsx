import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { APP_VERSION } from '../version';

const DashboardLayout = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { profile, isAdmin, isSupervisor, canManageZones, signOut } = useAuth();

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Mobile Overlay - Higher z-index */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-[9998] md:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar - Higher z-index */}
            <aside className={`fixed md:static inset-y-0 left-0 z-[9999] w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo with Close Button on Mobile */}
                    <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold">INDICES</h1>
                            <p className="text-xs text-slate-400 mt-0.5">Geospatial Survey System</p>
                        </div>
                        {/* Close button for mobile */}
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-slate-700 transition-colors"
                            onClick={closeSidebar}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        <NavLink to="/dashboard" icon="📊" active={location.pathname === '/dashboard'} onClick={closeSidebar}>
                            {t('nav.dashboard')}
                        </NavLink>
                        <NavLink to="/survey" icon="🗺️" active={location.pathname === '/survey'} onClick={closeSidebar}>
                            {t('nav.surveyMap')}
                        </NavLink>
                        <NavLink to="/surveyed-buildings" icon="🏘️" active={location.pathname === '/surveyed-buildings'} onClick={closeSidebar}>
                            {t('nav.allBuildings')}
                        </NavLink>
                        <NavLink to="/my-assignments" icon="📋" active={location.pathname === '/my-assignments'} onClick={closeSidebar}>
                            {t('nav.myAssignments')}
                        </NavLink>

                        {/* Admin/Supervisor Section */}
                        {canManageZones() && (
                            <>
                                <div className="pt-4 pb-2">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider px-4">Management</p>
                                </div>
                                <NavLink to="/zones" icon="🗺️" active={location.pathname === '/zones'} onClick={closeSidebar}>
                                    {t('nav.zones')}
                                </NavLink>
                            </>
                        )}

                        {/* Admin Only */}
                        {isAdmin() && (
                            <>
                                <NavLink to="/users" icon="👥" active={location.pathname === '/users'} onClick={closeSidebar}>
                                    {t('nav.users')}
                                </NavLink>
                                <NavLink to="/admin" icon="⚙️" active={location.pathname === '/admin'} onClick={closeSidebar}>
                                    {t('nav.admin')}
                                </NavLink>
                            </>
                        )}
                    </nav>

                    {/* User Info & Logout */}
                    <div className="p-4 border-t border-slate-700 space-y-3">
                        {/* User Info */}
                        {profile && (
                            <div className="flex items-center gap-3 px-2 py-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                    {profile.full_name?.charAt(0) || profile.email?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{profile.full_name || 'User'}</p>
                                    <p className="text-xs text-slate-400 capitalize">{t(`roles.${profile.role}`)}</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-base"
                        >
                            {t('auth.logout')}
                        </button>

                        {/* Version Display */}
                        <div className="text-center pt-2 border-t border-slate-700 mt-2">
                            <p className="text-xs text-slate-500">{APP_VERSION}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                    {/* Hamburger Menu - Larger touch target */}
                    <button
                        className="md:hidden p-3 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{t('common.appName')}</h2>
                    <LanguageSwitcher variant="compact" />
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

const NavLink = ({ to, icon, children, active, onClick }) => {
    return (
        <Link
            to={to}
            onClick={onClick}
            className={`flex items-center space-x-3 py-4 px-4 rounded-lg transition-colors ${active
                ? 'bg-blue-600 text-white'
                : 'hover:bg-slate-700 text-white'
                }`}
        >
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-base">{children}</span>
        </Link>
    );
};

export default DashboardLayout;

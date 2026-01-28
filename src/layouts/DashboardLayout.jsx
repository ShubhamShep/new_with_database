import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
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
                    <nav className="flex-1 p-4 space-y-2">
                        <NavLink to="/dashboard" icon="📊" active={location.pathname === '/dashboard'} onClick={closeSidebar}>
                            Dashboard
                        </NavLink>
                        <NavLink to="/survey" icon="🗺️" active={location.pathname === '/survey'} onClick={closeSidebar}>
                            Survey Map
                        </NavLink>
                        <NavLink to="/surveyed-buildings" icon="🏘️" active={location.pathname === '/surveyed-buildings'} onClick={closeSidebar}>
                            All Buildings
                        </NavLink>
                        <NavLink to="/admin" icon="⚙️" active={location.pathname === '/admin'} onClick={closeSidebar}>
                            Admin Panel
                        </NavLink>
                    </nav>

                    {/* Logout */}
                    <div className="p-4 border-t border-slate-700">
                        <button
                            onClick={handleLogout}
                            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors text-base"
                        >
                            Logout
                        </button>
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
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Property Survey System</h2>
                    <div className="w-10" /> {/* Spacer for balance */}
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

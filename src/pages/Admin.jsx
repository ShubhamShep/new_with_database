import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDataStore } from '../hooks/useDataStore';
import { dataService } from '../utils/dataService';
import RoleGuard, { PermissionMessage } from '../components/RoleGuard';

const Admin = () => {
    const { t } = useTranslation();
    const { isAdmin } = useAuth();
    const surveys = useDataStore('surveys');
    const users = useDataStore('users');
    const stats = useDataStore('stats');
    const zones = useDataStore('zones');
    const loading = useDataStore('loading');

    const [activeTab, setActiveTab] = useState('overview');

    // Manual refresh
    const handleRefresh = async () => {
        await dataService.fetchAll();
    };

    // Get user role stats
    const adminCount = users?.filter(u => u.role === 'admin').length || 0;
    const supervisorCount = users?.filter(u => u.role === 'supervisor').length || 0;
    const surveyorCount = users?.filter(u => u.role === 'surveyor').length || 0;

    // Get zone stats
    const pendingZones = zones?.filter(z => z.status === 'pending').length || 0;
    const activeZones = zones?.filter(z => z.status === 'in_progress').length || 0;
    const completedZones = zones?.filter(z => z.status === 'completed').length || 0;

    // Get survey stats by status
    const draftSurveys = surveys?.filter(s => s.status === 'draft').length || 0;
    const submittedSurveys = surveys?.filter(s => s.status === 'submitted').length || 0;
    const verifiedSurveys = surveys?.filter(s => s.status === 'verified').length || 0;

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return 'bg-yellow-100 text-yellow-800';
            case 'submitted': return 'bg-green-100 text-green-800';
            case 'verified': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'admin': return 'bg-red-100 text-red-700';
            case 'supervisor': return 'bg-purple-100 text-purple-700';
            case 'surveyor': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <RoleGuard roles={['admin']} fallback={<PermissionMessage message={t('messages.noPermission')} />}>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-3xl">⚙️</span>
                            Admin Panel
                        </h1>
                        <p className="text-gray-500 mt-1">System overview and administration</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {loading ? 'Loading...' : t('common.refresh')}
                    </button>
                </div>

                {/* Overview Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Total Surveys */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 shadow-lg text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-3xl">📋</span>
                            <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-3xl font-bold">{stats?.total || 0}</p>
                        <p className="text-sm text-blue-100">Total Surveys</p>
                    </div>

                    {/* Total Users */}
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 shadow-lg text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-3xl">👥</span>
                            <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <p className="text-3xl font-bold">{users?.length || 0}</p>
                        <p className="text-sm text-purple-100">Total Users</p>
                    </div>

                    {/* Total Zones */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 shadow-lg text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-3xl">🗺️</span>
                            <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                        </div>
                        <p className="text-3xl font-bold">{zones?.length || 0}</p>
                        <p className="text-sm text-green-100">Survey Zones</p>
                    </div>

                    {/* This Month */}
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 shadow-lg text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-3xl">📅</span>
                            <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-3xl font-bold">{stats?.thisMonth || 0}</p>
                        <p className="text-sm text-orange-100">This Month</p>
                    </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
                    {/* User Roles */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-red-600">{adminCount}</p>
                        <p className="text-xs text-gray-500">Admins</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-purple-600">{supervisorCount}</p>
                        <p className="text-xs text-gray-500">Supervisors</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-blue-600">{surveyorCount}</p>
                        <p className="text-xs text-gray-500">Surveyors</p>
                    </div>

                    {/* Zone Status */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-gray-600">{pendingZones}</p>
                        <p className="text-xs text-gray-500">Pending Zones</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-blue-600">{activeZones}</p>
                        <p className="text-xs text-gray-500">Active Zones</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-2xl font-bold text-green-600">{completedZones}</p>
                        <p className="text-xs text-gray-500">Done Zones</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {['overview', 'surveys', 'users', 'zones'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${activeTab === tab
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Survey Status Breakdown */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Survey Status Breakdown</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Draft</span>
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                                        {draftSurveys}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Submitted</span>
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                        {submittedSurveys}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Verified</span>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                                        {verifiedSurveys}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Stats</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Today</span>
                                    <span className="text-2xl font-bold text-blue-600">{stats?.today || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">This Week</span>
                                    <span className="text-2xl font-bold text-green-600">{stats?.thisWeek || 0}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">This Month</span>
                                    <span className="text-2xl font-bold text-purple-600">{stats?.thisMonth || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'surveys' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">All Surveys ({surveys?.length || 0})</h2>
                        </div>
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : !surveys || surveys.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-gray-500">No surveys found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Building ID</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner ID</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {surveys.slice(0, 50).map((survey) => (
                                            <tr key={survey.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-gray-800">{survey.building_id || 'N/A'}</td>
                                                <td className="px-6 py-4 text-gray-800">{survey.owner_id || 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(survey.status)}`}>
                                                        {survey.status || 'draft'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {new Date(survey.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">All Users ({users?.length || 0})</h2>
                        </div>
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : !users || users.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-gray-500">No users found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                            {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                                                        </div>
                                                        <span className="font-medium text-gray-800">{user.full_name || 'No Name'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {user.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'zones' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">All Zones ({zones?.length || 0})</h2>
                        </div>
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : !zones || zones.length === 0 ? (
                            <div className="text-center py-20">
                                <p className="text-gray-500">No zones found</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-6">
                                {zones.map(zone => (
                                    <div
                                        key={zone.id}
                                        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        <div className="h-2" style={{ backgroundColor: zone.color }}></div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-lg text-gray-800 mb-2">{zone.name}</h3>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Progress:</span>
                                                <span className="font-semibold text-gray-800">
                                                    {zone.completed_count || 0} / {zone.target_count || 0}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                                                <div
                                                    className="h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.min(100, ((zone.completed_count || 0) / (zone.target_count || 1)) * 100)}%`,
                                                        backgroundColor: zone.color
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </RoleGuard>
    );
};

export default Admin;

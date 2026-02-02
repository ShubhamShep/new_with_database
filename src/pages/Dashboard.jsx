import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useDataStore } from '../hooks/useDataStore';
import { dataService } from '../utils/dataService';
import { generateSurveyPDF } from '../utils/generatePDF';
import { useToast } from '../components/Toast';
import { exportToExcel, exportToCSV } from '../utils/exportToExcel';

const Dashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const surveys = useDataStore('surveys');
    const stats = useDataStore('stats');
    const loading = useDataStore('loading');
    const lastUpdate = useDataStore('lastUpdate');

    // Manual refresh - only when user clicks
    const handleRefresh = async () => {
        const result = await dataService.fetchAll();
        if (result.success) {
            toast.success('Data refreshed successfully');
        } else {
            toast.error('Failed to refresh data');
        }
    };

    // Handle delete
    const handleDeleteSurvey = async (id) => {
        if (!confirm('Are you sure you want to delete this survey?')) return;

        try {
            const { error } = await supabase.from('surveys').delete().eq('id', id);

            if (error) {
                toast.error('Failed to delete survey');
            } else {
                toast.success('Survey deleted successfully');
                // Refresh after delete
                dataService.fetchSurveys();
                dataService.fetchStats();
            }
        } catch (err) {
            toast.error('Error deleting survey');
        }
    };

    // Navigate to map and highlight survey
    const viewOnMap = (survey) => {
        if (!survey.geometry) {
            toast.error('This survey has no location data');
            return;
        }
        // Navigate to map with survey ID as state
        navigate('/surveyed-buildings', { state: { highlightSurveyId: survey.id } });
    };

    // Handle export
    const handleExportExcel = () => {
        if (surveys.length === 0) {
            toast.error('No surveys to export');
            return;
        }
        exportToExcel(surveys);
        toast.success(`Exported ${surveys.length} surveys to Excel`);
    };

    const handleExportCSV = () => {
        if (surveys.length === 0) {
            toast.error('No surveys to export');
            return;
        }
        exportToCSV(surveys);
        toast.success(`Exported ${surveys.length}surveys to CSV`);
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-600 mt-1">Overview of your survey activities</p>
                        {lastUpdate && (
                            <p className="text-xs text-gray-500 mt-1">
                                Last updated: {new Date(lastUpdate).toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Excel
                        </button>

                        <button
                            onClick={handleExportCSV}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            CSV
                        </button>

                        <button
                            onClick={() => navigate('/survey')}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg transition-all hover:scale-105 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Survey
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard title="Total Surveys" value={stats.total} icon="📊" color="blue" />
                <StatCard title="Today" value={stats.today} icon="📅" color="green" />
                <StatCard title="This Week" value={stats.thisWeek} icon="📆" color="purple" />
                <StatCard title="This Month" value={stats.thisMonth} icon="📈" color="orange" />
            </div>

            {/* Recent Surveys Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Recent Surveys</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-2">Loading...</p>
                    </div>
                ) : surveys.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <p>No surveys found. Click "New Survey" to create one.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Building ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {surveys.slice(0, 20).map(survey => (
                                    <tr key={survey.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">{survey.building_id || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{survey.owner_name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(survey.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${survey.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {survey.status || 'draft'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => viewOnMap(survey)}
                                                    className="text-green-600 hover:text-green-800"
                                                    title="View on Map"
                                                    disabled={!survey.geometry}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => generateSurveyPDF(survey)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                    title="Download PDF"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSurvey(survey.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// Simple stat card component
const StatCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600'
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
                </div>
                <div className={`bg-gradient-to-br ${colors[color]} w-12 h-12 rounded-lg flex items-center justify-center text-2xl`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

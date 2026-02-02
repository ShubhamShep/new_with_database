import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { generateSurveyPDF } from '../utils/generatePDF';
import { useToast } from '../components/Toast';
import SyncIndicator from '../components/SyncIndicator';
import { exportToExcel, exportToCSV } from '../utils/exportToExcel';
import { persistentStorage } from '../utils/persistentStorage';


const Dashboard = () => {
    const navigate = useNavigate();
    const toast = useToast();

    // Initialize from localStorage immediately
    const [stats, setStats] = useState(() => {
        return persistentStorage.get('dashboard_stats') || {
            total: 0,
            today: 0,
            thisWeek: 0,
            thisMonth: 0,
        };
    });

    const [recentSurveys, setRecentSurveys] = useState(() => {
        return persistentStorage.get('dashboard_surveys') || [];
    });

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [lastFetch, setLastFetch] = useState(() => {
        return persistentStorage.get('dashboard_last_fetch') || null;
    });

    useEffect(() => {
        // Only fetch if we don't have fresh data
        if (!persistentStorage.isFresh('dashboard_stats', 5 * 60 * 1000)) {
            console.log('[Dashboard] No fresh data, fetching...');
            fetchAllData();
        } else {
            console.log('[Dashboard] Using cached data');
        }
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([fetchStats(), fetchRecentSurveys()]);
        setLoading(false);
        setLastFetch(new Date().toLocaleString());
        persistentStorage.set('dashboard_last_fetch', new Date().toLocaleString());
    };

    const fetchStats = async () => {
        console.log('[Dashboard] fetchStats starting...');
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            console.log('[Dashboard] Making stats query...');
            const { data, error } = await Promise.race([
                supabase.from('surveys').select('created_at, status'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);

            console.log('[Dashboard] Stats query result:', {
                hasData: !!data,
                dataCount: data?.length || 0,
                hasError: !!error
            });

            if (data) {
                const newStats = {
                    total: data.length,
                    today: data.filter(s => new Date(s.created_at) >= new Date(startOfDay)).length,
                    thisWeek: data.filter(s => new Date(s.created_at) >= new Date(startOfWeek)).length,
                    thisMonth: data.filter(s => new Date(s.created_at) >= new Date(startOfMonth)).length,
                };
                setStats(newStats);
                persistentStorage.set('dashboard_stats', newStats);
                console.log('[Dashboard] Stats saved to storage');
            }
        } catch (err) {
            console.error('[Dashboard] fetchStats error:', err);
            // Keep existing data from localStorage
        }
    };

    const fetchRecentSurveys = async () => {
        try {
            const { data, error } = await Promise.race([
                supabase.from('surveys').select('*').order('created_at', { ascending: false }).limit(20),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);

            if (error) {
                console.error('[Dashboard] Error fetching recent surveys:', error);
                // Keep existing data from localStorage
            } else if (data) {
                setRecentSurveys(data);
                persistentStorage.set('dashboard_surveys', data);
                console.log('[Dashboard] Recent surveys saved to storage');
            }
        } catch (err) {
            console.error('[Dashboard] fetchRecentSurveys error:', err);
            // Keep existing data from localStorage
        }
    };

    const handleDeleteSurvey = async (id) => {
        if (!confirm('Are you sure you want to delete this survey?')) return;

        const { error } = await supabase
            .from('surveys')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to delete survey');
        } else {
            toast.success('Survey deleted successfully');
            fetchRecentSurveys();
            fetchStats();
        }
    };

    const handleGeneratePDF = async (survey) => {
        toast.info('Generating PDF...');
        try {
            await generateSurveyPDF(survey);
            toast.success('PDF downloaded successfully!');
        } catch (error) {
            toast.error('Failed to generate PDF');
        }
    };

    const handleExportExcel = () => {
        if (filteredSurveys.length === 0) {
            toast.error('No surveys to export');
            return;
        }

        toast.info('Generating Excel file...');
        try {
            exportToExcel(filteredSurveys, `Property_Survey_${new Date().toISOString().split('T')[0]}`);
            toast.success(`Exported ${filteredSurveys.length} surveys to Excel`);
        } catch (error) {
            toast.error('Failed to export to Excel');
        }
    };

    const handleExportCSV = () => {
        if (filteredSurveys.length === 0) {
            toast.error('No surveys to export');
            return;
        }

        toast.info('Generating CSV file...');
        try {
            exportToCSV(filteredSurveys, `Property_Survey_${new Date().toISOString().split('T')[0]}`);
            toast.success(`Exported ${filteredSurveys.length} surveys to CSV`);
        } catch (error) {
            toast.error('Failed to export to CSV');
        }
    };

    // Filter surveys
    const filteredSurveys = recentSurveys.filter(survey => {
        const matchesSearch =
            survey.building_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            survey.owner_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || survey.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Sync Indicator for Offline Support */}
            <SyncIndicator onSyncComplete={fetchRecentSurveys} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-1">Overview of your survey activities</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {/* Export Buttons */}
                    <button
                        onClick={fetchAllData}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 flex items-center gap-2"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Excel
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        CSV
                    </button>
                    <button
                        onClick={() => navigate('/survey')}
                        className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2 text-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Survey
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : (
                    <>
                        <StatCard title="Total Surveys" value={stats.total} icon="📊" color="blue" />
                        <StatCard title="Today" value={stats.today} icon="📅" color="green" />
                        <StatCard title="This Week" value={stats.thisWeek} icon="📆" color="purple" />
                        <StatCard title="This Month" value={stats.thisMonth} icon="📈" color="orange" />
                    </>
                )}
            </div>

            {/* Recent Surveys */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Search and Filter Bar */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search by Building ID or Owner..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        {/* Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="verified">Verified</option>
                        </select>
                    </div>
                </div>

                {/* Table Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 hidden sm:block">
                    <div className="grid grid-cols-5 gap-4 text-sm font-semibold text-gray-600">
                        <span>Building</span>
                        <span>Owner</span>
                        <span>Status</span>
                        <span>Date</span>
                        <span>Actions</span>
                    </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <>
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </>
                    ) : filteredSurveys.length === 0 ? (
                        <div className="p-12 text-center">
                            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-gray-500 text-lg">No surveys found</p>
                            <p className="text-gray-400 text-sm mt-1">Start your first survey to see it here!</p>
                        </div>
                    ) : (
                        filteredSurveys.map((survey) => (
                            <SurveyRow
                                key={survey.id}
                                survey={survey}
                                onView={() => navigate(`/survey/${survey.id}`)}
                                onPDF={() => handleGeneratePDF(survey)}
                                onDelete={() => handleDeleteSurvey(survey.id)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// Survey Row Component
const SurveyRow = ({ survey, onView, onPDF, onDelete }) => {
    return (
        <div className="p-4 hover:bg-gray-50 transition-colors">
            {/* Mobile Layout */}
            <div className="sm:hidden space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold text-gray-900">{survey.building_id || 'No ID'}</p>
                        <p className="text-sm text-gray-500">{survey.owner_name || 'Unknown Owner'}</p>
                    </div>
                    <StatusBadge status={survey.status} />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                        {new Date(survey.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                        <ActionButton onClick={onView} icon="👁️" label="View" color="blue" />
                        <ActionButton onClick={onPDF} icon="📄" label="PDF" color="green" />
                        <ActionButton onClick={onDelete} icon="🗑️" label="Delete" color="red" />
                    </div>
                </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:grid grid-cols-5 gap-4 items-center">
                <span className="font-medium text-gray-900">{survey.building_id || 'No ID'}</span>
                <span className="text-gray-600">{survey.owner_name || 'Unknown'}</span>
                <StatusBadge status={survey.status} />
                <span className="text-gray-500 text-sm">
                    {new Date(survey.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-2">
                    <ActionButton onClick={onView} icon="👁️" label="View" color="blue" />
                    <ActionButton onClick={onPDF} icon="📄" label="PDF" color="green" />
                    <ActionButton onClick={onDelete} icon="🗑️" label="Delete" color="red" />
                </div>
            </div>
        </div>
    );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
    const styles = {
        draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        submitted: 'bg-green-100 text-green-800 border-green-200',
        verified: 'bg-purple-100 text-purple-800 border-purple-200',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            {status}
        </span>
    );
};

// Action Button Component
const ActionButton = ({ onClick, icon, label, color }) => {
    const colors = {
        blue: 'hover:bg-blue-100 text-blue-600',
        green: 'hover:bg-green-100 text-green-600',
        red: 'hover:bg-red-100 text-red-600',
    };

    return (
        <button
            onClick={onClick}
            className={`p-2 rounded-lg transition-colors ${colors[color]}`}
            title={label}
        >
            <span className="text-sm">{icon}</span>
        </button>
    );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} text-white rounded-2xl p-4 sm:p-6 shadow-lg transform transition-all hover:scale-105`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs sm:text-sm opacity-90">{title}</p>
                    <p className="text-2xl sm:text-4xl font-bold mt-1">{value}</p>
                </div>
                <span className="text-3xl sm:text-5xl opacity-80">{icon}</span>
            </div>
        </div>
    );
};

// Skeleton Components
const SkeletonCard = () => (
    <div className="bg-gray-200 rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-1/2 mb-3"></div>
        <div className="h-8 bg-gray-300 rounded w-1/3"></div>
    </div>
);

const SkeletonRow = () => (
    <div className="p-4 animate-pulse">
        <div className="grid grid-cols-5 gap-4">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
    </div>
);

export default Dashboard;

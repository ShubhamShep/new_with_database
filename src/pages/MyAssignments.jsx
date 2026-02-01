import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';

const MyAssignments = () => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [mySurveys, setMySurveys] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch assigned zones
    const fetchAssignments = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Get zones assigned to current user
            const { data: zones, error: zonesError } = await supabase
                .from('survey_zones')
                .select(`
                    *,
                    supervisor:user_profiles!survey_zones_supervisor_id_fkey(id, full_name, email, phone)
                `)
                .eq('assigned_to', user.id)
                .order('priority', { ascending: false });

            if (zonesError) throw zonesError;
            setAssignments(zones || []);

            // Get user's survey count
            const { data: surveys, error: surveysError } = await supabase
                .from('surveys')
                .select('id, created_at, zone_id')
                .eq('surveyor_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (!surveysError) {
                setMySurveys(surveys || []);
            }
        } catch (err) {
            console.error('Error fetching assignments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [user]);

    const getPriorityBadge = (priority) => {
        const colors = {
            urgent: 'bg-red-100 text-red-700 border-red-200',
            high: 'bg-orange-100 text-orange-700 border-orange-200',
            medium: 'bg-blue-100 text-blue-700 border-blue-200',
            low: 'bg-gray-100 text-gray-600 border-gray-200'
        };
        return colors[priority] || colors.medium;
    };

    const getStatusBadge = (status) => {
        const colors = {
            completed: 'bg-green-100 text-green-700',
            in_progress: 'bg-blue-100 text-blue-700',
            on_hold: 'bg-yellow-100 text-yellow-700',
            pending: 'bg-gray-100 text-gray-600'
        };
        return colors[status] || colors.pending;
    };

    // Calculate total progress
    const totalTarget = assignments.reduce((sum, z) => sum + (z.target_count || 0), 0);
    const totalCompleted = assignments.reduce((sum, z) => sum + (z.completed_count || 0), 0);
    const todaysSurveys = mySurveys.filter(s => {
        const today = new Date().toDateString();
        return new Date(s.created_at).toDateString() === today;
    }).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-3xl">📋</span>
                    {t('assignments.title')}
                </h1>
                <p className="text-gray-500 mt-1">
                    {profile?.full_name && `Welcome, ${profile.full_name}`}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg shadow-blue-200">
                    <p className="text-4xl font-bold">{assignments.length}</p>
                    <p className="text-blue-100 text-sm">{t('assignments.assignedZones')}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg shadow-green-200">
                    <p className="text-4xl font-bold">{mySurveys.length}</p>
                    <p className="text-green-100 text-sm">{t('assignments.surveysCompleted')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg shadow-purple-200">
                    <p className="text-4xl font-bold">{todaysSurveys}</p>
                    <p className="text-purple-100 text-sm">{t('dashboard.todaysSurveys')}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-4 text-white shadow-lg shadow-orange-200">
                    <p className="text-4xl font-bold">{Math.max(0, totalTarget - totalCompleted)}</p>
                    <p className="text-orange-100 text-sm">{t('assignments.targetRemaining')}</p>
                </div>
            </div>

            {/* Overall Progress */}
            {totalTarget > 0 && (
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-800">{t('assignments.progress')}</h3>
                        <span className="text-sm text-gray-500">
                            {totalCompleted} / {totalTarget} ({Math.round((totalCompleted / totalTarget) * 100)}%)
                        </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-4">
                        <div
                            className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                            style={{ width: `${Math.min(100, (totalCompleted / totalTarget) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Assigned Zones */}
            {assignments.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                    <div className="text-6xl mb-4">📭</div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">{t('assignments.noAssignments')}</h3>
                    <p className="text-gray-500">Contact your supervisor or admin to get assigned to a zone.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-800">{t('assignments.assignedZones')}</h2>

                    {assignments.map(zone => {
                        const progress = zone.target_count > 0
                            ? Math.round((zone.completed_count / zone.target_count) * 100)
                            : 0;
                        const isOverdue = zone.due_date && new Date(zone.due_date) < new Date();

                        return (
                            <div
                                key={zone.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Color bar */}
                                <div className="h-1.5" style={{ backgroundColor: zone.color || '#3B82F6' }}></div>

                                <div className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Zone Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-gray-800">{zone.name}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadge(zone.status)}`}>
                                                    {t(`zones.${zone.status?.replace('_', '') || 'pending'}`)}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getPriorityBadge(zone.priority)}`}>
                                                    {t(`zones.${zone.priority}`)}
                                                </span>
                                            </div>

                                            {zone.description && (
                                                <p className="text-gray-500 text-sm mb-3">{zone.description}</p>
                                            )}

                                            {/* Progress */}
                                            <div className="mb-3">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-500">{t('zones.progress')}</span>
                                                    <span className="font-medium text-gray-700">
                                                        {zone.completed_count || 0} / {zone.target_count || 0}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                                    <div
                                                        className={`h-2.5 rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(100, progress)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Meta info */}
                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                                {zone.supervisor && (
                                                    <div className="flex items-center gap-1">
                                                        <span>👤</span>
                                                        <span>Supervisor: {zone.supervisor.full_name || zone.supervisor.email}</span>
                                                    </div>
                                                )}
                                                {zone.due_date && (
                                                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                                                        <span>📅</span>
                                                        <span>{t('assignments.deadline')}: {new Date(zone.due_date).toLocaleDateString()}</span>
                                                        {isOverdue && <span className="text-red-500">⚠️ Overdue</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="flex gap-2">
                                            <Link
                                                to="/survey"
                                                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                {t('assignments.startSurvey')}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Recent Surveys */}
            {mySurveys.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Surveys</h2>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {mySurveys.slice(0, 5).map((survey, idx) => (
                                <div key={survey.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <p className="font-medium text-gray-800">Survey #{survey.id.slice(0, 8)}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(survey.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/survey/${survey.id}`}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                        {t('common.view')} →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyAssignments;

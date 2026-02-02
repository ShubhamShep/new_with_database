import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDataStore } from '../hooks/useDataStore';
import { dataService } from '../utils/dataService';
import RoleGuard, { PermissionMessage } from '../components/RoleGuard';

const ZoneManagement = () => {
    const { t } = useTranslation();
    const { canManageZones } = useAuth();
    const zones = useDataStore('zones');
    const users = useDataStore('users');
    const loading = useDataStore('loading');

    const [showModal, setShowModal] = useState(false);
    const [editingZone, setEditingZone] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        assigned_to: '',
        supervisor_id: '',
        target_count: 0,
        due_date: '',
        priority: 'medium',
        status: 'pending',
        color: '#3B82F6'
    });

    // Manual refresh
    const handleRefresh = async () => {
        await dataService.fetchZones(statusFilter);
    };

    // Handle form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Open modal for new zone
    const openNewZoneModal = () => {
        setEditingZone(null);
        setFormData({
            name: '',
            description: '',
            assigned_to: '',
            supervisor_id: '',
            target_count: 0,
            due_date: '',
            priority: 'medium',
            status: 'pending',
            color: '#3B82F6'
        });
        setShowModal(true);
    };

    // Open modal for editing zone
    const openEditModal = (zone) => {
        setEditingZone(zone);
        setFormData({
            name: zone.name,
            description: zone.description || '',
            assigned_to: zone.assigned_to || '',
            supervisor_id: zone.supervisor_id || '',
            target_count: zone.target_count || 0,
            due_date: zone.due_date || '',
            priority: zone.priority || 'medium',
            status: zone.status || 'pending',
            color: zone.color || '#3B82F6'
        });
        setShowModal(true);
    };

    // Save zone
    const saveZone = async () => {
        try {
            const payload = {
                ...formData,
                target_count: parseInt(formData.target_count) || 0,
                assigned_to: formData.assigned_to || null,
                supervisor_id: formData.supervisor_id || null,
                due_date: formData.due_date || null,
                updated_at: new Date().toISOString()
            };

            if (editingZone) {
                // Update existing
                const { error } = await supabase
                    .from('survey_zones')
                    .update(payload)
                    .eq('id', editingZone.id);
                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('survey_zones')
                    .insert(payload);
                if (error) throw error;
            }

            setShowModal(false);
            setEditingZone(null);
            // Refresh data
            dataService.fetchZones(statusFilter);
        } catch (err) {
            console.error('Error saving zone:', err);
            alert('Failed to save zone');
        }
    };

    // Delete zone
    const deleteZone = async (zoneId) => {
        if (!confirm('Are you sure you want to delete this zone?')) return;

        try {
            const { error } = await supabase
                .from('survey_zones')
                .delete()
                .eq('id', zoneId);
            if (error) throw error;
            // Refresh data
            dataService.fetchZones(statusFilter);
        } catch (err) {
            console.error('Error deleting zone:', err);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'on_hold': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700';
            case 'high': return 'bg-orange-100 text-orange-700';
            case 'medium': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const surveyors = users?.filter(u => u.role === 'surveyor') || [];
    const supervisors = users?.filter(u => u.role === 'supervisor' || u.role === 'admin') || [];

    // Filter zones by status
    const filteredZones = statusFilter === 'all'
        ? zones || []
        : zones?.filter(z => z.status === statusFilter) || [];

    return (
        <RoleGuard roles={['admin', 'supervisor']} fallback={<PermissionMessage message={t('messages.noPermission')} />}>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="text-3xl">🗺️</span>
                            {t('zones.title')}
                        </h1>
                        <p className="text-gray-500 mt-1">Create and manage survey zones</p>
                    </div>
                    <div className="flex gap-2">
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
                        <button
                            onClick={openNewZoneModal}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('zones.createZone')}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-3xl font-bold text-gray-800">{zones?.length || 0}</p>
                        <p className="text-sm text-gray-500">Total Zones</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-3xl font-bold text-gray-600">
                            {zones?.filter(z => z.status === 'pending').length || 0}
                        </p>
                        <p className="text-sm text-gray-500">{t('zones.pending')}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100">
                        <p className="text-3xl font-bold text-blue-600">
                            {zones?.filter(z => z.status === 'in_progress').length || 0}
                        </p>
                        <p className="text-sm text-blue-600">{t('zones.inProgress')}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
                        <p className="text-3xl font-bold text-green-600">
                            {zones?.filter(z => z.status === 'completed').length || 0}
                        </p>
                        <p className="text-sm text-green-600">{t('zones.completed')}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 shadow-sm border border-purple-100">
                        <p className="text-3xl font-bold text-purple-600">
                            {zones?.reduce((sum, z) => sum + (z.completed_count || 0), 0) || 0}
                        </p>
                        <p className="text-sm text-purple-600">Total Surveys</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {['all', 'pending', 'in_progress', 'completed', 'on_hold'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${statusFilter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {status === 'all' ? t('common.all') : t(`zones.${status.replace('_', '')}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Zones Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : !filteredZones || filteredZones.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="text-6xl mb-4">🗺️</div>
                        <p className="text-gray-500 text-lg">{t('zones.noZones')}</p>
                        <button
                            onClick={openNewZoneModal}
                            className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                        >
                            {t('zones.createZone')}
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredZones.map(zone => (
                            <div
                                key={zone.id}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Zone Header with Color Bar */}
                                <div className="h-2" style={{ backgroundColor: zone.color }}></div>
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-bold text-lg text-gray-800">{zone.name}</h3>
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(zone.status)}`}>
                                            {t(`zones.${zone.status?.replace('_', '') || 'pending'}`)}
                                        </span>
                                    </div>

                                    {zone.description && (
                                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{zone.description}</p>
                                    )}

                                    {/* Progress Bar */}
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-500">{t('zones.progress')}</span>
                                            <span className="font-semibold text-gray-800">
                                                {zone.completed_count || 0} / {zone.target_count || 0}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                                            <div
                                                className="h-2.5 rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, ((zone.completed_count || 0) / (zone.target_count || 1)) * 100)}%`,
                                                    backgroundColor: zone.color
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Assigned User */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                                            {zone.assigned_user?.full_name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">
                                                {zone.assigned_user?.full_name || 'Not assigned'}
                                            </p>
                                            <p className="text-xs text-gray-400">{t('zones.assignedTo')}</p>
                                        </div>
                                    </div>

                                    {/* Meta Info */}
                                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(zone.priority)}`}>
                                            {t(`zones.${zone.priority}`)}
                                        </span>
                                        {zone.due_date && (
                                            <span className="flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {new Date(zone.due_date).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(zone)}
                                            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                                        >
                                            {t('common.edit')}
                                        </button>
                                        <button
                                            onClick={() => deleteZone(zone.id)}
                                            className="px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create/Edit Zone Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
                            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editingZone ? t('zones.editZone') : t('zones.createZone')}
                                </h2>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Zone Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('zones.zoneName')} *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="e.g., Ward 5 - North"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={2}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Zone description..."
                                    />
                                </div>

                                {/* Assigned Surveyor */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('zones.assignedTo')}
                                    </label>
                                    <select
                                        name="assigned_to"
                                        value={formData.assigned_to}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">-- Select Surveyor --</option>
                                        {surveyors.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name || user.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Supervisor */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t('zones.supervisor')}
                                    </label>
                                    <select
                                        name="supervisor_id"
                                        value={formData.supervisor_id}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">-- Select Supervisor --</option>
                                        {supervisors.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.full_name || user.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Target Count & Due Date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('zones.targetCount')}
                                        </label>
                                        <input
                                            type="number"
                                            name="target_count"
                                            value={formData.target_count}
                                            onChange={handleChange}
                                            min="0"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('zones.dueDate')}
                                        </label>
                                        <input
                                            type="date"
                                            name="due_date"
                                            value={formData.due_date}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Priority & Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('zones.priority')}
                                        </label>
                                        <select
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="low">{t('zones.low')}</option>
                                            <option value="medium">{t('zones.medium')}</option>
                                            <option value="high">{t('zones.high')}</option>
                                            <option value="urgent">{t('zones.urgent')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {t('zones.status')}
                                        </label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="pending">{t('zones.pending')}</option>
                                            <option value="in_progress">{t('zones.inProgress')}</option>
                                            <option value="completed">{t('zones.completed')}</option>
                                            <option value="on_hold">{t('zones.onHold')}</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Color Picker */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Zone Color
                                    </label>
                                    <div className="flex gap-2">
                                        {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'].map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, color }))}
                                                className={`w-10 h-10 rounded-xl transition-all ${formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
                                <button
                                    onClick={() => { setShowModal(false); setEditingZone(null); }}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    onClick={saveZone}
                                    disabled={!formData.name}
                                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {t('common.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
};

export default ZoneManagement;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import RoleGuard, { PermissionMessage } from '../components/RoleGuard';

const UserManagement = () => {
    const { t } = useTranslation();
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [editingUser, setEditingUser] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Fetch all users
    const fetchUsers = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (roleFilter !== 'all') {
                query = query.eq('role', roleFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [roleFilter]);

    // Filter users by search term
    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
    );

    // Update user role
    const updateUserRole = async (userId, newRole) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ role: newRole, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;
            fetchUsers();
            setShowModal(false);
            setEditingUser(null);
        } catch (err) {
            console.error('Error updating role:', err);
            alert('Failed to update user role');
        }
    };

    // Toggle user active status
    const toggleUserStatus = async (userId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;
            fetchUsers();
        } catch (err) {
            console.error('Error toggling status:', err);
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
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-3xl">👥</span>
                        {t('users.title')}
                    </h1>
                    <p className="text-gray-500 mt-1">Manage user accounts and roles</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-3xl font-bold text-gray-800">{users.length}</p>
                        <p className="text-sm text-gray-500">Total Users</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100">
                        <p className="text-3xl font-bold text-red-600">
                            {users.filter(u => u.role === 'admin').length}
                        </p>
                        <p className="text-sm text-red-600">{t('roles.admin')}s</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 shadow-sm border border-purple-100">
                        <p className="text-3xl font-bold text-purple-600">
                            {users.filter(u => u.role === 'supervisor').length}
                        </p>
                        <p className="text-sm text-purple-600">{t('roles.supervisor')}s</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100">
                        <p className="text-3xl font-bold text-blue-600">
                            {users.filter(u => u.role === 'surveyor').length}
                        </p>
                        <p className="text-sm text-blue-600">{t('roles.surveyor')}s</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder={`${t('common.search')}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Role Filter */}
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">{t('common.all')} Roles</option>
                            <option value="admin">{t('roles.admin')}</option>
                            <option value="supervisor">{t('roles.supervisor')}</option>
                            <option value="surveyor">{t('roles.surveyor')}</option>
                        </select>

                        {/* Refresh */}
                        <button
                            onClick={fetchUsers}
                            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {t('common.refresh')}
                        </button>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-500">{t('users.noUsers')}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('users.fullName')}</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('users.email')}</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('users.phone')}</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('users.role')}</th>
                                        <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('users.status')}</th>
                                        <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.map((user) => (
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
                                            <td className="px-6 py-4 text-gray-600">{user.phone || '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                                                    {t(`roles.${user.role}`)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${user.is_active
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'
                                                        }`}
                                                >
                                                    {user.is_active ? t('users.active') : t('users.inactive')}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => { setEditingUser(user); setShowModal(true); }}
                                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                                >
                                                    {t('common.edit')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Edit User Modal */}
                {showModal && editingUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-fadeIn">
                            <div className="p-6 border-b border-gray-100">
                                <h2 className="text-xl font-bold text-gray-800">{t('users.editUser')}</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.fullName')}</label>
                                    <p className="text-gray-800 font-medium">{editingUser.full_name || editingUser.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('users.email')}</label>
                                    <p className="text-gray-600">{editingUser.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('users.role')}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['admin', 'supervisor', 'surveyor'].map(role => (
                                            <button
                                                key={role}
                                                onClick={() => updateUserRole(editingUser.id, role)}
                                                className={`py-3 rounded-xl font-medium transition-all ${editingUser.role === role
                                                        ? 'bg-blue-600 text-white shadow-lg'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {t(`roles.${role}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={() => { setShowModal(false); setEditingUser(null); }}
                                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                                >
                                    {t('common.close')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RoleGuard>
    );
};

export default UserManagement;

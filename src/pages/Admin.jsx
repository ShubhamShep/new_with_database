import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const Admin = () => {
    const [surveys, setSurveys] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const [surveysData, usersData] = await Promise.all([
            supabase.from('surveys').select('*').order('created_at', { ascending: false }),
            supabase.from('profiles').select('*'),
        ]);

        setSurveys(surveysData.data || []);
        setUsers(usersData.data || []);
        setLoading(false);
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>

            {/* Users Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Users</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left p-3 text-gray-700">Name</th>
                                    <th className="text-left p-3 text-gray-700">Email</th>
                                    <th className="text-left p-3 text-gray-700">Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-3">{user.full_name || 'N/A'}</td>
                                        <td className="p-3">{user.email}</td>
                                        <td className="p-3">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                                {user.role}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* All Surveys Section */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">All Surveys ({surveys.length})</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left p-3 text-gray-700">Building ID</th>
                                    <th className="text-left p-3 text-gray-700">Owner ID</th>
                                    <th className="text-left p-3 text-gray-700">Status</th>
                                    <th className="text-left p-3 text-gray-700">Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {surveys.map((survey) => (
                                    <tr key={survey.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="p-3">{survey.building_id || 'N/A'}</td>
                                        <td className="p-3">{survey.owner_id || 'N/A'}</td>
                                        <td className="p-3">
                                            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(survey.status)}`}>
                                                {survey.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-600">
                                            {new Date(survey.created_at).toLocaleDateString()}
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

const getStatusColor = (status) => {
    switch (status) {
        case 'draft': return 'bg-yellow-100 text-yellow-800';
        case 'submitted': return 'bg-green-100 text-green-800';
        case 'verified': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default Admin;

import React from 'react';
import { useDataStore } from '../hooks/useDataStore';

const LoadingOverlay = () => {
    const loading = useDataStore('loading');

    if (!loading) return null;

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm mx-4">
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                    </div>
                    <p className="mt-4 text-lg font-medium text-gray-900">Loading data...</p>
                    <p className="mt-1 text-sm text-gray-500">Please wait a moment</p>
                </div>
            </div>
        </div>
    );
};

export default LoadingOverlay;

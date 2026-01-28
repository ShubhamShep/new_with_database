import React, { useState, useEffect } from 'react';
import {
    getPendingCount,
    getPendingSurveys,
    isOnline,
    onConnectivityChange,
    updateSurveyStatus,
    removeSurvey
} from '../utils/offlineStore';
import { supabase } from '../supabase';

/**
 * SyncIndicator Component
 * Shows online/offline status and pending survey count
 * Provides manual sync trigger and auto-sync on reconnection
 */
const SyncIndicator = ({ onSyncComplete }) => {
    const [online, setOnline] = useState(isOnline());
    const [pendingCount, setPendingCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    // Monitor connectivity and pending count
    useEffect(() => {
        // Check pending count on mount
        updatePendingCount();

        // Listen for connectivity changes
        const cleanup = onConnectivityChange((isOnlineNow) => {
            setOnline(isOnlineNow);
            if (isOnlineNow) {
                // Auto-sync when coming back online
                handleSync();
            }
        });

        // Periodically check pending count
        const interval = setInterval(updatePendingCount, 5000);

        return () => {
            cleanup();
            clearInterval(interval);
        };
    }, []);

    const updatePendingCount = async () => {
        try {
            const count = await getPendingCount();
            setPendingCount(count);
        } catch (err) {
            console.error('Error getting pending count:', err);
        }
    };

    /**
     * Sync all pending surveys to Supabase
     */
    const handleSync = async () => {
        if (!online || syncing) return;

        setSyncing(true);
        setSyncResult(null);

        try {
            const pendingSurveys = await getPendingSurveys();
            const toSync = pendingSurveys.filter(s => s.status === 'pending' || s.status === 'failed');

            if (toSync.length === 0) {
                setSyncResult({ success: true, synced: 0, message: 'Nothing to sync' });
                setSyncing(false);
                return;
            }

            let synced = 0;
            let failed = 0;

            for (const survey of toSync) {
                try {
                    await updateSurveyStatus(survey.id, 'syncing');

                    // Extract the survey data without IndexedDB metadata
                    const { id: localId, timestamp, status, attempts, lastAttempt, lastError, ...surveyData } = survey;

                    // Submit to Supabase
                    const { error } = await supabase
                        .from('surveys')
                        .insert([surveyData]);

                    if (error) throw error;

                    // Remove from queue after successful sync
                    await removeSurvey(survey.id);
                    synced++;
                } catch (err) {
                    console.error('Error syncing survey:', err);
                    await updateSurveyStatus(survey.id, 'failed', err.message);
                    failed++;
                }
            }

            const message = failed > 0
                ? `Synced ${synced}, failed ${failed}`
                : `Successfully synced ${synced} surveys`;

            setSyncResult({
                success: failed === 0,
                synced,
                failed,
                message
            });

            await updatePendingCount();

            if (onSyncComplete) {
                onSyncComplete({ synced, failed });
            }
        } catch (err) {
            console.error('Sync error:', err);
            setSyncResult({ success: false, message: 'Sync failed: ' + err.message });
        } finally {
            setSyncing(false);
            // Clear result after 5 seconds
            setTimeout(() => setSyncResult(null), 5000);
        }
    };

    // Don't show if online with no pending surveys
    if (online && pendingCount === 0 && !syncResult) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 z-[1500]">
            {/* Main Status Pill */}
            <div
                onClick={() => setShowDetails(!showDetails)}
                className={`flex items-center gap-3 px-4 py-3 rounded-full shadow-lg cursor-pointer transition-all ${!online
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : pendingCount > 0
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                            : 'bg-green-500 text-white'
                    }`}
            >
                {/* Status Icon */}
                <div className="relative">
                    {!online ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                        </svg>
                    ) : syncing ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                    )}
                    {/* Pending badge */}
                    {pendingCount > 0 && (
                        <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {pendingCount}
                        </span>
                    )}
                </div>

                {/* Status Text */}
                <span className="text-sm font-medium">
                    {!online
                        ? 'Offline Mode'
                        : syncing
                            ? 'Syncing...'
                            : pendingCount > 0
                                ? `${pendingCount} Pending`
                                : 'Online'}
                </span>
            </div>

            {/* Expanded Details Panel */}
            {showDetails && (
                <div className="mt-2 bg-white rounded-2xl shadow-xl p-4 min-w-[280px] border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-800">Sync Status</h4>
                        <button
                            onClick={() => setShowDetails(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Connection Status */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`w-3 h-3 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <span className="text-sm text-gray-600">
                            {online ? 'Connected to internet' : 'No internet connection'}
                        </span>
                    </div>

                    {/* Pending Surveys */}
                    {pendingCount > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3 mb-3">
                            <p className="text-sm text-blue-800">
                                <span className="font-semibold">{pendingCount}</span> surveys waiting to sync
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                {online
                                    ? 'Ready to sync when you tap the button'
                                    : 'Will sync automatically when online'}
                            </p>
                        </div>
                    )}

                    {/* Sync Result */}
                    {syncResult && (
                        <div className={`rounded-lg p-3 mb-3 ${syncResult.success ? 'bg-green-50' : 'bg-red-50'
                            }`}>
                            <p className={`text-sm font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'
                                }`}>
                                {syncResult.success ? '✓' : '✕'} {syncResult.message}
                            </p>
                        </div>
                    )}

                    {/* Sync Button */}
                    {online && pendingCount > 0 && (
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {syncing ? (
                                <>
                                    <span className="animate-spin">⏳</span>
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <span>🔄</span>
                                    Sync Now
                                </>
                            )}
                        </button>
                    )}

                    {/* Offline Message */}
                    {!online && (
                        <div className="text-center py-2">
                            <p className="text-sm text-gray-500">
                                Your surveys are saved locally and will sync when you're back online.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SyncIndicator;

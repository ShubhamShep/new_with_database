import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for GPS geolocation
 * Provides location access with permission handling, accuracy tracking, and continuous updates
 */
export const useGeolocation = (options = {}) => {
    const {
        enableHighAccuracy = true,
        timeout = 10000,
        maximumAge = 0,
        watchPosition = false
    } = options;

    const [location, setLocation] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [permissionState, setPermissionState] = useState('prompt'); // 'granted', 'denied', 'prompt'

    const watchIdRef = useRef(null);

    // Check permission status on mount
    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' })
                .then((result) => {
                    setPermissionState(result.state);
                    result.onchange = () => {
                        setPermissionState(result.state);
                    };
                })
                .catch(() => {
                    // Permissions API not supported
                    setPermissionState('prompt');
                });
        }
    }, []);

    // Cleanup watch on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    /**
     * Success callback for geolocation
     */
    const handleSuccess = useCallback((position) => {
        const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;

        setLocation({
            latitude,
            longitude,
            accuracy,
            altitude,
            heading,
            speed,
            timestamp: position.timestamp,
            // Accuracy level classification
            accuracyLevel: getAccuracyLevel(accuracy)
        });
        setError(null);
        setIsLoading(false);
    }, []);

    /**
     * Error callback for geolocation
     */
    const handleError = useCallback((err) => {
        let errorMessage;

        switch (err.code) {
            case err.PERMISSION_DENIED:
                errorMessage = 'Location permission denied. Please enable location access in your device settings.';
                setPermissionState('denied');
                break;
            case err.POSITION_UNAVAILABLE:
                errorMessage = 'Location unavailable. Please ensure GPS is enabled.';
                break;
            case err.TIMEOUT:
                errorMessage = 'Location request timed out. Please try again.';
                break;
            default:
                errorMessage = 'An unknown error occurred while getting location.';
        }

        setError(errorMessage);
        setIsLoading(false);
    }, []);

    /**
     * Get current position (one-time)
     */
    const getCurrentPosition = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        setIsLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy,
                timeout,
                maximumAge
            }
        );
    }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

    /**
     * Start watching position (continuous updates)
     */
    const startWatching = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        if (watchIdRef.current !== null) {
            return; // Already watching
        }

        setIsLoading(true);
        setError(null);

        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy,
                timeout,
                maximumAge
            }
        );
    }, [enableHighAccuracy, timeout, maximumAge, handleSuccess, handleError]);

    /**
     * Stop watching position
     */
    const stopWatching = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
            setIsLoading(false);
        }
    }, []);

    /**
     * Clear location data
     */
    const clearLocation = useCallback(() => {
        setLocation(null);
        setError(null);
    }, []);

    return {
        location,
        error,
        isLoading,
        permissionState,
        getCurrentPosition,
        startWatching,
        stopWatching,
        clearLocation,
        isSupported: 'geolocation' in navigator
    };
};

/**
 * Classify accuracy into levels
 */
const getAccuracyLevel = (accuracy) => {
    if (accuracy <= 5) return { level: 'excellent', color: '#10B981', label: 'GPS accuracy: Excellent' };
    if (accuracy <= 15) return { level: 'good', color: '#22C55E', label: 'GPS accuracy: Good' };
    if (accuracy <= 50) return { level: 'moderate', color: '#F59E0B', label: 'GPS accuracy: Moderate' };
    if (accuracy <= 100) return { level: 'poor', color: '#EF4444', label: 'GPS accuracy: Poor' };
    return { level: 'very_poor', color: '#DC2626', label: 'GPS accuracy: Very Poor' };
};

export default useGeolocation;

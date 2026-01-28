/**
 * Offline Storage Manager using IndexedDB
 * Provides methods to queue surveys for offline submission and sync when online
 */

const DB_NAME = 'indicesSurveyDB';
const DB_VERSION = 1;
const STORES = {
    PENDING_SURVEYS: 'pendingSurveys',
    CACHED_DATA: 'cachedData'
};

let db = null;

/**
 * Initialize the IndexedDB database
 */
export const initDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Error opening IndexedDB:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('IndexedDB initialized successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Create pending surveys store
            if (!database.objectStoreNames.contains(STORES.PENDING_SURVEYS)) {
                const surveyStore = database.createObjectStore(STORES.PENDING_SURVEYS, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                surveyStore.createIndex('timestamp', 'timestamp', { unique: false });
                surveyStore.createIndex('status', 'status', { unique: false });
            }

            // Create cached data store for app data
            if (!database.objectStoreNames.contains(STORES.CACHED_DATA)) {
                database.createObjectStore(STORES.CACHED_DATA, { keyPath: 'key' });
            }
        };
    });
};

/**
 * Add a survey to the pending queue for later sync
 */
export const addPendingSurvey = async (surveyData) => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.PENDING_SURVEYS], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_SURVEYS);

        const pendingSurvey = {
            ...surveyData,
            timestamp: Date.now(),
            status: 'pending', // pending, syncing, failed, synced
            attempts: 0,
            lastAttempt: null
        };

        const request = store.add(pendingSurvey);

        request.onsuccess = () => {
            console.log('Survey added to pending queue, ID:', request.result);
            resolve(request.result);
        };

        request.onerror = () => {
            console.error('Error adding survey to queue:', request.error);
            reject(request.error);
        };
    });
};

/**
 * Get all pending surveys
 */
export const getPendingSurveys = async () => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.PENDING_SURVEYS], 'readonly');
        const store = transaction.objectStore(STORES.PENDING_SURVEYS);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result || []);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
};

/**
 * Get pending surveys count
 */
export const getPendingCount = async () => {
    const surveys = await getPendingSurveys();
    return surveys.filter(s => s.status === 'pending' || s.status === 'failed').length;
};

/**
 * Update a survey's status
 */
export const updateSurveyStatus = async (id, status, error = null) => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.PENDING_SURVEYS], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_SURVEYS);
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
            const survey = getRequest.result;
            if (!survey) {
                reject(new Error('Survey not found'));
                return;
            }

            survey.status = status;
            survey.lastAttempt = Date.now();
            survey.attempts += 1;
            if (error) {
                survey.lastError = error;
            }

            const updateRequest = store.put(survey);
            updateRequest.onsuccess = () => resolve(survey);
            updateRequest.onerror = () => reject(updateRequest.error);
        };

        getRequest.onerror = () => reject(getRequest.error);
    });
};

/**
 * Remove a survey from the queue (after successful sync)
 */
export const removeSurvey = async (id) => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.PENDING_SURVEYS], 'readwrite');
        const store = transaction.objectStore(STORES.PENDING_SURVEYS);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Clear all synced surveys
 */
export const clearSyncedSurveys = async () => {
    const surveys = await getPendingSurveys();
    const synced = surveys.filter(s => s.status === 'synced');

    for (const survey of synced) {
        await removeSurvey(survey.id);
    }

    return synced.length;
};

/**
 * Store cached data (for offline access)
 */
export const setCachedData = async (key, data) => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.CACHED_DATA], 'readwrite');
        const store = transaction.objectStore(STORES.CACHED_DATA);
        const request = store.put({ key, data, timestamp: Date.now() });

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Get cached data
 */
export const getCachedData = async (key) => {
    const database = await initDB();

    return new Promise((resolve, reject) => {
        const transaction = database.transaction([STORES.CACHED_DATA], 'readonly');
        const store = transaction.objectStore(STORES.CACHED_DATA);
        const request = store.get(key);

        request.onsuccess = () => {
            resolve(request.result?.data || null);
        };

        request.onerror = () => reject(request.error);
    });
};

/**
 * Check if browser is online
 */
export const isOnline = () => {
    return navigator.onLine;
};

/**
 * Listen for online/offline events
 */
export const onConnectivityChange = (callback) => {
    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
};

export default {
    initDB,
    addPendingSurvey,
    getPendingSurveys,
    getPendingCount,
    updateSurveyStatus,
    removeSurvey,
    clearSyncedSurveys,
    setCachedData,
    getCachedData,
    isOnline,
    onConnectivityChange
};

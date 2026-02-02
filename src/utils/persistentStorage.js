// Persistent data layer using localStorage
// This ensures data survives React state resets, page refreshes, and session issues

const STORAGE_PREFIX = 'pts_'; // Property Tax Survey
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const persistentStorage = {
    // Save data with timestamp
    set(key, data) {
        try {
            const item = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(item));
        } catch (err) {
            console.error('Error saving to localStorage:', err);
        }
    },

    // Get data if not expired
    get(key, maxAge = CACHE_DURATION) {
        try {
            const itemStr = localStorage.getItem(STORAGE_PREFIX + key);
            if (!itemStr) return null;

            const item = JSON.parse(itemStr);
            const age = Date.now() - item.timestamp;

            // Return data even if expired, but log it
            if (age > maxAge) {
                console.log(`[Storage] ${key} is expired (${Math.floor(age / 1000)}s old)`);
            }

            return item.data;
        } catch (err) {
            console.error('Error reading from localStorage:', err);
            return null;
        }
    },

    // Check if data exists and is fresh
    isFresh(key, maxAge = CACHE_DURATION) {
        try {
            const itemStr = localStorage.getItem(STORAGE_PREFIX + key);
            if (!itemStr) return false;

            const item = JSON.parse(itemStr);
            const age = Date.now() - item.timestamp;
            return age < maxAge;
        } catch {
            return false;
        }
    },

    // Clear specific key
    remove(key) {
        localStorage.removeItem(STORAGE_PREFIX + key);
    },

    // Clear all app data
    clearAll() {
        Object.keys(localStorage)
            .filter(key => key.startsWith(STORAGE_PREFIX))
            .forEach(key => localStorage.removeItem(key));
    }
};

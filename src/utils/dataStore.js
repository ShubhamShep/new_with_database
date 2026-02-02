// ULTRA-SIMPLE Global Data Store
// No complex state management, no auto-refresh, just simple get/set

class SimpleDataStore {
    constructor() {
        this.data = {
            surveys: [],
            stats: { total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
            assignments: [],
            buildings: [],
            zones: [],
            users: [],
            loading: false,
            lastUpdate: null
        };
        this.listeners = [];
    }

    // Get data
    get(key) {
        return this.data[key];
    }

    // Set data and notify listeners
    set(key, value) {
        this.data[key] = value;
        this.data.lastUpdate = new Date();
        this.notify();
    }

    // Set multiple keys at once
    setMultiple(updates) {
        Object.assign(this.data, updates);
        this.data.lastUpdate = new Date();
        this.notify();
    }

    // Subscribe to changes
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // Notify all listeners
    notify() {
        this.listeners.forEach(listener => listener(this.data));
    }

    // Clear all data
    clear() {
        this.data = {
            surveys: [],
            stats: { total: 0, today: 0, thisWeek: 0, thisMonth: 0 },
            assignments: [],
            buildings: [],
            zones: [],
            users: [],
            loading: false,
            lastUpdate: null
        };
        this.notify();
    }
}

export const dataStore = new SimpleDataStore();

import { useState, useEffect } from 'react';
import { dataStore } from '../utils/dataStore';

// Ultra-simple hook to use global data store
export function useDataStore(key) {
    const [value, setValue] = useState(() => dataStore.get(key));

    useEffect(() => {
        // Subscribe to changes
        const unsubscribe = dataStore.subscribe((data) => {
            setValue(data[key]);
        });

        return unsubscribe;
    }, [key]);

    return value;
}

// Hook for all data
export function useAllData() {
    const [data, setData] = useState(() => dataStore.data);

    useEffect(() => {
        const unsubscribe = dataStore.subscribe(setData);
        return unsubscribe;
    }, []);

    return data;
}

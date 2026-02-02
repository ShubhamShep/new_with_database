import { supabase } from '../supabase';
import { dataStore } from './dataStore';

// Simple data service - fetch and store, no complex logic
export const dataService = {
    // Fetch all surveys
    async fetchSurveys() {
        console.log('[DataService] Fetching surveys...');
        dataStore.set('loading', true);

        try {
            const { data, error } = await supabase
                .from('surveys')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[DataService] Survey fetch error:', error);
                return { success: false, error };
            }

            dataStore.setMultiple({
                surveys: data || [],
                loading: false
            });

            console.log(`[DataService] Loaded ${data?.length || 0} surveys`);
            return { success: true, data };
        } catch (err) {
            console.error('[DataService] Survey fetch exception:', err);
            dataStore.set('loading', false);
            return { success: false, error: err };
        }
    },

    // Calculate stats from surveys
    async fetchStats() {
        console.log('[DataService] Fetching stats...');
        dataStore.set('loading', true);

        try {
            const { data, error } = await supabase
                .from('surveys')
                .select('created_at, status');

            if (error) {
                console.error('[DataService] Stats fetch error:', error);
                dataStore.set('loading', false);
                return { success: false, error };
            }

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const stats = {
                total: data.length,
                today: data.filter(s => new Date(s.created_at) >= startOfDay).length,
                thisWeek: data.filter(s => new Date(s.created_at) >= startOfWeek).length,
                thisMonth: data.filter(s => new Date(s.created_at) >= startOfMonth).length
            };

            dataStore.setMultiple({
                stats,
                loading: false
            });

            console.log('[DataService] Stats calculated:', stats);
            return { success: true, data: stats };
        } catch (err) {
            console.error('[DataService] Stats fetch exception:', err);
            dataStore.set('loading', false);
            return { success: false, error: err };
        }
    },

    // Fetch assignments for user
    async fetchAssignments(userId) {
        console.log('[DataService] Fetching assignments for user:', userId);
        dataStore.set('loading', true);

        try {
            const { data, error } = await supabase
                .from('survey_zones')
                .select('*')
                .eq('assigned_to', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[DataService] Assignments fetch error:', error);
                dataStore.set('loading', false);
                return { success: false, error };
            }

            dataStore.setMultiple({
                assignments: data || [],
                loading: false
            });

            console.log(`[DataService] Loaded ${data?.length || 0} assignments`);
            return { success: true, data };
        } catch (err) {
            console.error('[DataService] Assignments fetch exception:', err);
            dataStore.set('loading', false);
            return { success: false, error: err };
        }
    },

    // Fetch buildings with geometry
    async fetchBuildings() {
        console.log('[DataService] Fetching buildings...');
        dataStore.set('loading', true);

        try {
            const { data, error } = await supabase
                .from('surveys')
                .select('*')
                .not('geometry', 'is', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[DataService] Buildings fetch error:', error);
                dataStore.set('loading', false);
                return { success: false, error };
            }

            dataStore.setMultiple({
                buildings: data || [],
                loading: false
            });

            console.log(`[DataService] Loaded ${data?.length || 0} buildings`);
            return { success: true, data };
        } catch (err) {
            console.error('[DataService] Buildings fetch exception:', err);
            dataStore.set('loading', false);
            return { success: false, error: err };
        }
    },

    // Fetch all data at once
    async fetchAll(userId) {
        console.log('[DataService] Fetching ALL data...');

        const results = await Promise.allSettled([
            this.fetchSurveys(),
            this.fetchStats(),
            userId ? this.fetchAssignments(userId) : Promise.resolve({ success: true }),
            this.fetchBuildings()
        ]);

        const success = results.every(r => r.status === 'fulfilled' && r.value.success);
        console.log('[DataService] Fetch all complete. Success:', success);

        return { success };
    }
};

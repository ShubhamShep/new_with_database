import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { useDataStore } from '../hooks/useDataStore';
import { dataService } from '../utils/dataService';
import 'leaflet/dist/leaflet.css';

const SurveyedBuildings = () => {
    const buildings = useDataStore('buildings');
    const loading = useDataStore('loading');
    const [stats, setStats] = useState({ total: 0, residential: 0, commercial: 0, other: 0 });
    const [selectedBuilding, setSelectedBuilding] = useState(null);

    // Calculate stats when buildings change
    useEffect(() => {
        if (buildings && buildings.length > 0) {
            const residential = buildings.filter(b =>
                b.property_type?.toLowerCase().includes('residential') ||
                b.usage_type?.toLowerCase().includes('residential')
            ).length;
            const commercial = buildings.filter(b =>
                b.property_type?.toLowerCase().includes('commercial') ||
                b.usage_type?.toLowerCase().includes('commercial')
            ).length;

            setStats({
                total: buildings.length,
                residential,
                commercial,
                other: buildings.length - residential - commercial
            });
        }
    }, [buildings]);

    // Manual refresh
    const handleRefresh = async () => {
        await dataService.fetchBuildings();
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Surveyed Buildings Map</h1>
                        <p className="text-sm text-gray-600 mt-1">View all surveyed buildings on the map</p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {loading ? 'Loading...' : 'Refresh'}
                    </button>
                </div>

                {/* Stats */}
                <div className="max-w-7xl mx-auto mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-600 font-medium">Total Buildings</p>
                        <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-600 font-medium">Residential</p>
                        <p className="text-2xl font-bold text-green-900 mt-1">{stats.residential}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs text-purple-600 font-medium">Commercial</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">{stats.commercial}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                        <p className="text-xs text-orange-600 font-medium">Other</p>
                        <p className="text-2xl font-bold text-orange-900 mt-1">{stats.other}</p>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading buildings...</p>
                        </div>
                    </div>
                ) : !buildings || buildings.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="text-center">
                            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <p className="text-lg font-medium text-gray-700">No surveyed buildings yet</p>
                            <p className="text-sm text-gray-500 mt-1">Start surveying to see buildings on the map</p>
                        </div>
                    </div>
                ) : (
                    <MapContainer
                        center={[18.5204, 73.8567]} // Pune, India
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        className="z-0"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {buildings.map(building => {
                            if (!building.geometry) return null;

                            try {
                                const geojson = typeof building.geometry === 'string'
                                    ? JSON.parse(building.geometry)
                                    : building.geometry;

                                const color = building.property_type?.toLowerCase().includes('residential') ? '#10b981' :
                                    building.property_type?.toLowerCase().includes('commercial') ? '#8b5cf6' :
                                        '#f59e0b';

                                return (
                                    <GeoJSON
                                        key={building.id}
                                        data={geojson}
                                        style={{
                                            color: color,
                                            weight: 2,
                                            opacity: 0.8,
                                            fillColor: color,
                                            fillOpacity: 0.3
                                        }}
                                        onEachFeature={(feature, layer) => {
                                            layer.on('click', () => setSelectedBuilding(building));
                                            layer.bindPopup(`
                                                <div class="p-2">
                                                    <p class="font-bold">${building.building_id || 'Unknown'}</p>
                                                    <p class="text-sm">Owner: ${building.owner_name || 'N/A'}</p>
                                                    <p class="text-sm">Type: ${building.property_type || 'N/A'}</p>
                                                    <p class="text-sm">Area: ${building.plot_area || 'N/A'} sq.m</p>
                                                </div>
                                            `);
                                        }}
                                    />
                                );
                            } catch (err) {
                                console.error('Error rendering building:', building.id, err);
                                return null;
                            }
                        })}
                    </MapContainer>
                )}

                {/* Building Details Panel */}
                {selectedBuilding && (
                    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-[1000]">
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-lg">{selectedBuilding.building_id || 'Building Details'}</h3>
                            <button
                                onClick={() => setSelectedBuilding(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-gray-600">Owner:</span>
                                <span className="ml-2 font-medium">{selectedBuilding.owner_name || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Property Type:</span>
                                <span className="ml-2 font-medium">{selectedBuilding.property_type || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Plot Area:</span>
                                <span className="ml-2 font-medium">{selectedBuilding.plot_area || 'N/A'} sq.m</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Surveyed:</span>
                                <span className="ml-2 font-medium">
                                    {selectedBuilding.created_at ? new Date(selectedBuilding.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurveyedBuildings;

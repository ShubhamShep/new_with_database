import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { generateSurveyPDF } from '../utils/generatePDF';
import 'leaflet/dist/leaflet.css';

// Component to fit map bounds to buildings
const FitBounds = ({ buildings }) => {
    const map = useMap();

    useEffect(() => {
        if (buildings.length > 0) {
            const allCoords = [];
            buildings.forEach(b => {
                if (b.geometry?.coordinates?.[0]) {
                    b.geometry.coordinates[0].forEach(coord => {
                        allCoords.push([coord[1], coord[0]]);
                    });
                }
            });

            if (allCoords.length > 0) {
                map.fitBounds(allCoords, { padding: [50, 50] });
            }
        }
    }, [buildings, map]);

    return null;
};

const SurveyedBuildings = () => {
    const navigate = useNavigate();
    const [buildings, setBuildings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, residential: 0, commercial: 0, other: 0 });

    useEffect(() => {
        fetchBuildings();
    }, []);

    const fetchBuildings = async () => {
        setLoading(true);

        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            console.warn('Fetch buildings timeout - setting loading to false');
            setLoading(false);
        }, 10000);

        try {
            const { data, error } = await supabase
                .from('surveys')
                .select('*')
                .not('geometry', 'is', null)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setBuildings(data);

                // Calculate stats
                const residential = data.filter(b =>
                    b.property_type?.toLowerCase().includes('residential') ||
                    b.usage_type?.toLowerCase().includes('residential')
                ).length;
                const commercial = data.filter(b =>
                    b.property_type?.toLowerCase().includes('commercial') ||
                    b.usage_type?.toLowerCase().includes('commercial')
                ).length;

                setStats({
                    total: data.length,
                    residential,
                    commercial,
                    other: data.length - residential - commercial
                });
            } else if (error) {
                console.error('Error fetching buildings:', error);
            }
        } catch (err) {
            console.error('Exception in fetchBuildings:', err);
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    // Filter buildings
    const filteredBuildings = buildings.filter(building => {
        const matchesFilter = filter === 'all' ||
            building.property_type?.toLowerCase().includes(filter) ||
            building.usage_type?.toLowerCase().includes(filter);

        const matchesSearch = !searchTerm ||
            building.building_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            building.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            building.address_with_floor?.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    // Style function for polygons
    const getPolygonStyle = (feature) => {
        const propertyType = feature.properties?.property_type?.toLowerCase() ||
            feature.properties?.usage_type?.toLowerCase() || '';

        let fillColor = '#3b82f6'; // Default blue

        if (propertyType.includes('residential')) {
            fillColor = '#10b981'; // Green
        } else if (propertyType.includes('commercial')) {
            fillColor = '#f59e0b'; // Amber
        } else if (propertyType.includes('industrial')) {
            fillColor = '#ef4444'; // Red
        } else if (propertyType.includes('government')) {
            fillColor = '#8b5cf6'; // Purple
        }

        return {
            fillColor,
            weight: 2,
            opacity: 1,
            color: '#1e40af',
            fillOpacity: 0.5,
        };
    };

    // Convert survey to GeoJSON feature
    const surveyToFeature = (survey) => ({
        type: 'Feature',
        properties: {
            id: survey.id,
            building_id: survey.building_id,
            owner_name: survey.owner_name,
            property_type: survey.property_type,
            usage_type: survey.usage_type,
            area_sqm: survey.area_sqm,
            ...survey
        },
        geometry: survey.geometry
    });

    const onEachFeature = (feature, layer) => {
        layer.on({
            click: () => {
                setSelectedBuilding(feature.properties);
            },
            mouseover: (e) => {
                e.target.setStyle({
                    weight: 4,
                    fillOpacity: 0.7,
                });
            },
            mouseout: (e) => {
                e.target.setStyle({
                    weight: 2,
                    fillOpacity: 0.5,
                });
            }
        });
    };

    const handleDownloadPDF = async (survey) => {
        try {
            await generateSurveyPDF(survey);
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* Header */}
            <div className="bg-white shadow-md px-6 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Surveyed Building Footprints</h1>
                            <p className="text-gray-500 text-sm">View all surveyed properties on the map</p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="flex gap-3">
                        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                            <p className="text-xs text-blue-600 font-medium">Total</p>
                            <p className="text-xl font-bold text-blue-700">{stats.total}</p>
                        </div>
                        <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                            <p className="text-xs text-green-600 font-medium">Residential</p>
                            <p className="text-xl font-bold text-green-700">{stats.residential}</p>
                        </div>
                        <div className="bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
                            <p className="text-xs text-amber-600 font-medium">Commercial</p>
                            <p className="text-xl font-bold text-amber-700">{stats.commercial}</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mt-4">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by ID, owner, address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="all">All Types</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="industrial">Industrial</option>
                        <option value="government">Government</option>
                    </select>

                    <button
                        onClick={fetchBuildings}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600 font-medium">Loading buildings...</p>
                        </div>
                    </div>
                ) : (
                    <MapContainer
                        center={[19.0760, 72.8777]}
                        zoom={12}
                        className="h-full w-full"
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {/* Satellite layer option */}
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution='&copy; Esri'
                            opacity={0.3}
                        />

                        {filteredBuildings.map((building) => (
                            building.geometry && (
                                <GeoJSON
                                    key={building.id}
                                    data={surveyToFeature(building)}
                                    style={getPolygonStyle}
                                    onEachFeature={onEachFeature}
                                />
                            )
                        ))}

                        <FitBounds buildings={filteredBuildings} />
                    </MapContainer>
                )}

                {/* Legend */}
                <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 z-[1000]">
                    <h3 className="font-semibold text-gray-700 mb-2 text-sm">Legend</h3>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                            <span>Residential</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                            <span>Commercial</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                            <span>Industrial</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }}></div>
                            <span>Government</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                            <span>Other</span>
                        </div>
                    </div>
                </div>

                {/* Building Info Panel */}
                {selectedBuilding && (
                    <div className="absolute top-4 right-4 bg-white rounded-xl shadow-2xl p-5 z-[1000] w-80 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Building Details</h3>
                            <button
                                onClick={() => setSelectedBuilding(null)}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-blue-600 font-medium">Building ID</p>
                                <p className="font-bold text-blue-900">{selectedBuilding.building_id || 'N/A'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">Owner</p>
                                    <p className="font-medium text-gray-900">{selectedBuilding.owner_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Area</p>
                                    <p className="font-medium text-gray-900">{selectedBuilding.area_sqm || 0} m²</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">Property Type</p>
                                    <p className="font-medium text-gray-900">{selectedBuilding.property_type || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Usage</p>
                                    <p className="font-medium text-gray-900">{selectedBuilding.usage_type || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500">Address</p>
                                <p className="font-medium text-gray-900 text-sm">{selectedBuilding.address_with_floor || 'N/A'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-gray-500">Ward No</p>
                                    <p className="font-medium text-gray-900">{selectedBuilding.new_ward_no || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Property No</p>
                                    <p className="font-medium text-gray-900">{selectedBuilding.new_property_no || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedBuilding.tax_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {selectedBuilding.tax_paid ? '✓ Tax Paid' : '✗ Tax Pending'}
                                </span>
                                {selectedBuilding.water_connection && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                        💧 Water
                                    </span>
                                )}
                                {selectedBuilding.electricity_connection && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                        ⚡ Power
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2 pt-3 border-t">
                                <button
                                    onClick={() => handleDownloadPDF(selectedBuilding)}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    PDF
                                </button>
                                <button
                                    onClick={() => navigate(`/survey/${selectedBuilding.id}`)}
                                    className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results count */}
                <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 z-[1000]">
                    <p className="text-sm text-gray-600">
                        Showing <span className="font-bold text-blue-600">{filteredBuildings.length}</span> of <span className="font-bold">{buildings.length}</span> buildings
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SurveyedBuildings;

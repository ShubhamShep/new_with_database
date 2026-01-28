import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, WMSTileLayer, GeoJSON, Popup } from 'react-leaflet';
import { supabase } from '../supabase';
import PolygonCAD from '../components/PolygonCAD';
import { generateSurveyPDF } from '../utils/generatePDF';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SurveyDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [survey, setSurvey] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showFormData, setShowFormData] = useState(false);

    useEffect(() => {
        fetchSurvey();
    }, [id]);

    const fetchSurvey = async () => {
        const { data, error } = await supabase
            .from('surveys')
            .select('*')
            .eq('id', id)
            .single();

        if (!error && data) {
            setSurvey(data);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading survey...</p>
                </div>
            </div>
        );
    }

    if (!survey) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <p className="text-red-600 text-xl">Survey not found</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Get center from geometry
    const getCenter = () => {
        if (survey.geometry.type === 'Point') {
            return [survey.geometry.coordinates[1], survey.geometry.coordinates[0]];
        } else if (survey.geometry.type === 'Polygon') {
            const coords = survey.geometry.coordinates[0];
            const lats = coords.map(c => c[1]);
            const lngs = coords.map(c => c[0]);
            return [
                (Math.min(...lats) + Math.max(...lats)) / 2,
                (Math.min(...lngs) + Math.max(...lngs)) / 2,
            ];
        }
        return [20.35, 85.85]; // fallback
    };

    const center = getCenter();

    return (
        <div className="relative h-full">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 bg-white shadow-md z-[1000] p-4 flex justify-between items-center">
                <div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                        ← Back to Dashboard
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 mt-1">
                        Survey: {survey.building_id || survey.id}
                    </h2>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => generateSurveyPDF(survey)}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-lg transition-all hover:scale-105 flex items-center space-x-2"
                    >
                        <span>📄</span>
                        <span>Download PDF</span>
                    </button>
                    <button
                        onClick={() => setShowFormData(!showFormData)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                    >
                        {showFormData ? 'Hide Details' : 'Show Details'}
                    </button>
                </div>
            </div>

            {/* Map */}
            <div className="h-full pt-20">
                <MapContainer
                    center={center}
                    zoom={18}
                    maxZoom={24}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                        maxZoom={22}
                    />

                    <WMSTileLayer
                        url="http://localhost:8080/geoserver/RASTER/wms"
                        params={{
                            layers: 'RASTER:67cfea31928570b1a96c327e',
                            format: 'image/png',
                            transparent: true,
                            version: '1.1.0',
                            srs: 'EPSG:32645',
                        }}
                        maxZoom={24}
                        opacity={0.8}
                    />

                    {/* Survey Geometry */}
                    <GeoJSON
                        data={survey.geometry}
                        style={{
                            color: '#f59e0b',
                            weight: 4,
                            fillColor: '#fbbf24',
                            fillOpacity: 0.3,
                        }}
                        eventHandlers={{
                            click: () => setShowFormData(true),
                        }}
                    >
                        <Popup>
                            <div className="p-2">
                                <p className="font-bold text-lg">{survey.building_id}</p>
                                <p className="text-sm text-gray-600">Owner: {survey.owner_name}</p>
                                <p className="text-sm text-gray-600">Area: {survey.area_sqm} m²</p>
                                <button
                                    onClick={() => setShowFormData(true)}
                                    className="mt-2 text-blue-600 hover:underline text-sm font-medium"
                                >
                                    View Full Details →
                                </button>
                            </div>
                        </Popup>
                    </GeoJSON>
                </MapContainer>
            </div>

            {/* Survey Details Modal */}
            {showFormData && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1001] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center rounded-t-2xl">
                            <div>
                                <h2 className="text-2xl font-bold">Survey Details</h2>
                                <p className="text-blue-100 text-sm mt-1">Building ID: {survey.building_id}</p>
                            </div>
                            <button
                                onClick={() => setShowFormData(false)}
                                className="text-white hover:text-gray-200 text-3xl font-light"
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Area */}
                            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                                <p className="text-sm font-semibold text-blue-900">📐 Area</p>
                                <p className="text-2xl font-bold text-blue-700 mt-1">{survey.area_sqm} m²</p>
                            </div>

                            {/* CAD Diagram */}
                            <PolygonCAD geometry={survey.geometry} area={survey.area_sqm} />

                            {/* Owner Information */}
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <span className="mr-2">👤</span> Owner Information
                                </h3>
                                <div className="space-y-3">
                                    <DetailRow label="Owner Name" value={survey.owner_name} />
                                    <DetailRow label="Phone Number" value={survey.phone_number} />
                                    <DetailRow label="Aadhaar Number" value={survey.aadhaar_number} />
                                    {survey.owner_photo_url && (
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-2">Owner Photo</p>
                                            <img
                                                src={survey.owner_photo_url}
                                                alt="Owner"
                                                className="w-48 h-48 object-cover rounded-lg border border-gray-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Property Details */}
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <span className="mr-2">🏠</span> Property Details
                                </h3>
                                <div className="space-y-3">
                                    <DetailRow label="Property Usage" value={survey.property_usage} />
                                    <DetailRow label="Construction Type" value={survey.construction_type} />
                                    <DetailRow label="Ownership Type" value={survey.ownership_type} />
                                    <DetailRow label="Year of Construction" value={survey.year_of_construction} />
                                    {survey.building_photo_url && (
                                        <div>
                                            <p className="text-sm font-semibold text-gray-700 mb-2">Building Photo</p>
                                            <img
                                                src={survey.building_photo_url}
                                                alt="Building"
                                                className="w-full max-w-md h-64 object-cover rounded-lg border border-gray-300"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Utilities */}
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                    <span className="mr-2">⚡</span> Utilities & Amenities
                                </h3>
                                <div className="space-y-2">
                                    <StatusBadge label="💧 Water Connection" active={survey.water_connection} />
                                    <StatusBadge label="⚡ Electricity Connection" active={survey.electricity_connection} />
                                    <StatusBadge label="✅ Property Tax Paid" active={survey.form_data?.tax_paid} />
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Survey Metadata</h3>
                                <div className="space-y-2">
                                    <DetailRow label="Status" value={survey.status} />
                                    <DetailRow label="Created At" value={new Date(survey.created_at).toLocaleString()} />
                                    <DetailRow label="Updated At" value={new Date(survey.updated_at).toLocaleString()} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-sm text-gray-900">{value || 'N/A'}</span>
    </div>
);

const StatusBadge = ({ label, active }) => (
    <div className={`flex items-center space-x-2 p-3 rounded-lg ${active ? 'bg-green-100' : 'bg-gray-100'}`}>
        <span className={`w-4 h-4 rounded-full ${active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
        <span className={`font-medium ${active ? 'text-green-800' : 'text-gray-600'}`}>{label}</span>
    </div>
);

export default SurveyDetail;

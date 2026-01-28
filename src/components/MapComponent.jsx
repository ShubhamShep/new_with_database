import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, FeatureGroup, useMap, Circle, Marker, Popup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';
import proj4 from 'proj4';
import { useGeolocation } from '../hooks/useGeolocation';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Define EPSG:32645
proj4.defs("EPSG:32645", "+proj=utm +zone=45 +datum=WGS84 +units=m +no_defs");

const convertUTMtoWGS84 = (easting, northing) => {
    return proj4('EPSG:32645', 'EPSG:4326', [easting, northing]);
};

//Drone imagery bounding box
const droneImageryBBox = {
    minX: 374675.5284200097,
    minY: 2249422.8492706926,
    maxX: 374819.7744433263,
    maxY: 2249603.845816269,
};

const centerUTM = [
    (droneImageryBBox.minX + droneImageryBBox.maxX) / 2,
    (droneImageryBBox.minY + droneImageryBBox.maxY) / 2,
];

const centerWGS84 = convertUTMtoWGS84(centerUTM[0], centerUTM[1]);

// Map Reference Hook - to get map instance
const MapRefSetter = ({ setMapInstance }) => {
    const map = useMap();
    useEffect(() => {
        setMapInstance(map);
    }, [map, setMapInstance]);
    return null;
};

const MapComponent = ({ onBuildingSelect }) => {
    const featureGroupRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const [liveArea, setLiveArea] = useState(null); // For real-time area display
    const [drawControl, setDrawControl] = useState(null); // Store the draw control instance
    const [showGPSAccuracy, setShowGPSAccuracy] = useState(false);

    // GPS Geolocation hook
    const {
        location: gpsLocation,
        error: gpsError,
        isLoading: gpsLoading,
        getCurrentPosition,
        permissionState
    } = useGeolocation({ enableHighAccuracy: true, timeout: 15000 });

    // Function to enable drawing mode directly via Leaflet.Draw API
    const enableDrawing = (type) => {
        if (!mapInstance) return;

        // Disable any current drawing first
        if (drawControl) {
            try {
                drawControl.disable();
            } catch (e) {
                // Ignore if already disabled
            }
        }

        let handler;
        const shapeOptions = {
            color: type === 'polygon' ? '#10b981' : '#8b5cf6',
            weight: 3,
            fillOpacity: 0.2,
        };

        if (type === 'polygon') {
            handler = new L.Draw.Polygon(mapInstance, {
                shapeOptions,
                allowIntersection: false,
                guidelineDistance: 15,
            });
        } else if (type === 'rectangle') {
            handler = new L.Draw.Rectangle(mapInstance, { shapeOptions });
        } else if (type === 'marker') {
            handler = new L.Draw.Marker(mapInstance);
        }

        if (handler) {
            handler.enable();
            setDrawControl(handler);
            setActiveTool(type);
        }
    };

    // Enhanced GPS location handler
    const handleGeolocation = () => {
        getCurrentPosition();
        setShowGPSAccuracy(true);
    };

    // Fly to GPS location when it updates
    useEffect(() => {
        if (gpsLocation && mapInstance) {
            mapInstance.flyTo([gpsLocation.latitude, gpsLocation.longitude], 18, {
                duration: 1.5
            });
        }
    }, [gpsLocation, mapInstance]);

    const flyToDroneImagery = () => {
        if (mapInstance) {
            mapInstance.flyTo([centerWGS84[1], centerWGS84[0]], 19, {
                duration: 1.5
            });
        }
    };


    // Listen for drawing events to calculate live area and handle created shapes
    useEffect(() => {
        if (!mapInstance) return;

        const handleDrawStart = () => {
            setLiveArea(null);
        };

        const handleDrawStop = () => {
            setLiveArea(null);
            setActiveTool(null);
        };

        const handleCreated = (e) => {
            const layer = e.layer;
            const layerType = e.layerType;

            let geometry;
            let latlng;

            if (layerType === 'polygon' || layerType === 'rectangle') {
                const coords = layer.getLatLngs()[0].map(ll => [ll.lng, ll.lat]);
                geometry = {
                    type: 'Polygon',
                    coordinates: [coords],
                };
                latlng = layer.getBounds().getCenter();
            } else if (layerType === 'marker') {
                latlng = layer.getLatLng();
                geometry = {
                    type: 'Point',
                    coordinates: [latlng.lng, latlng.lat],
                };
            }

            // Calculate area
            let area = 0;
            if (layerType === 'polygon' || layerType === 'rectangle') {
                area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
            }

            const buildingData = {
                id: `BLD-${Date.now()}`,
                geometry,
                latlng,
                area: area.toFixed(2),
                layerType,
            };

            setLiveArea(null);
            setActiveTool(null);
            setDrawControl(null);
            onBuildingSelect(buildingData);
        };

        // Listen for draw events
        mapInstance.on('draw:drawvertex', (e) => {
            // Access the layer being drawn
            const layer = Object.values(e.layers._layers)[0];
            if (layer && layer._latlngs) {
                const latlngs = layer._latlngs;
                if (latlngs.length >= 3) {
                    const area = L.GeometryUtil.geodesicArea(latlngs);
                    setLiveArea(area);
                }
            }
        });

        mapInstance.on('draw:drawstart', handleDrawStart);
        mapInstance.on('draw:drawstop', handleDrawStop);
        mapInstance.on('draw:created', handleCreated);

        return () => {
            mapInstance.off('draw:drawvertex');
            mapInstance.off('draw:drawstart', handleDrawStart);
            mapInstance.off('draw:drawstop', handleDrawStop);
            mapInstance.off('draw:created', handleCreated);
        };
    }, [mapInstance, onBuildingSelect]);


    const handleDrawCreated = (e) => {
        const { layerType, layer } = e;

        let geometry;
        let latlng;

        if (layerType === 'polygon' || layerType === 'rectangle') {
            const coords = layer.getLatLngs()[0].map(ll => [ll.lng, ll.lat]);
            geometry = {
                type: 'Polygon',
                coordinates: [coords],
            };
            latlng = layer.getBounds().getCenter();
        } else if (layerType === 'marker') {
            latlng = layer.getLatLng();
            geometry = {
                type: 'Point',
                coordinates: [latlng.lng, latlng.lat],
            };
        }

        // Calculate area
        let area = 0;
        if (layerType === 'polygon' || layerType === 'rectangle') {
            area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
        }

        const buildingData = {
            id: `BLD-${Date.now()}`,
            geometry,
            latlng,
            area: area.toFixed(2),
            layerType,
        };

        setActiveTool(null);
        onBuildingSelect(buildingData);
    };

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={[centerWGS84[1], centerWGS84[0]]}
                zoom={17}
                maxZoom={24}
                style={{ height: '100%', width: '100%' }}
                tap={true}
                touchZoom={true}
                dragging={true}
                scrollWheelZoom={true}
            >
                <MapRefSetter setMapInstance={setMapInstance} />

                <TileLayer
                    url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                    attribution='&copy; Google Maps'
                    maxZoom={22}
                />

                <WMSTileLayer
                    url="http://localhost:8080/geoserver/RASTER/wms"
                    params={{
                        layers: 'RASTER:67cfea31928570b1a96c327e',
                        format: 'image/png',
                        transparent: true,
                        version: '1.1.0',
                        srs: 'EPSG:4326',
                    }}
                    maxZoom={24}
                    opacity={1}
                />

                <FeatureGroup ref={featureGroupRef}>
                    <EditControl
                        position="topleft"
                        onCreated={handleDrawCreated}
                        draw={{
                            rectangle: {
                                shapeOptions: {
                                    color: '#8b5cf6',
                                    weight: 3,
                                    fillOpacity: 0.2,
                                },
                                touchIcon: new L.DivIcon({
                                    className: 'leaflet-draw-touch-icon',
                                    iconSize: new L.Point(30, 30),
                                    iconAnchor: new L.Point(15, 15),
                                }),
                            },
                            polygon: {
                                allowIntersection: false,
                                guidelineDistance: 15,
                                shapeOptions: {
                                    color: '#10b981',
                                    weight: 3,
                                    fillOpacity: 0.2,
                                },
                                touchIcon: new L.DivIcon({
                                    className: 'leaflet-draw-touch-icon',
                                    iconSize: new L.Point(30, 30),
                                    iconAnchor: new L.Point(15, 15),
                                }),
                            },
                            marker: true,
                            circle: false,
                            circlemarker: false,
                            polyline: false,
                        }}
                        edit={{
                            edit: false,
                            remove: false,
                        }}
                    />
                </FeatureGroup>

                {/* GPS Accuracy Circle on Map */}
                {showGPSAccuracy && gpsLocation && (
                    <>
                        <Circle
                            center={[gpsLocation.latitude, gpsLocation.longitude]}
                            radius={gpsLocation.accuracy}
                            pathOptions={{
                                color: gpsLocation.accuracyLevel?.color || '#3B82F6',
                                fillColor: gpsLocation.accuracyLevel?.color || '#3B82F6',
                                fillOpacity: 0.15,
                                weight: 2
                            }}
                        />
                        <Marker position={[gpsLocation.latitude, gpsLocation.longitude]}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-semibold">📍 Your Location</p>
                                    <p className="text-sm text-gray-600">
                                        Accuracy: {Math.round(gpsLocation.accuracy)}m
                                    </p>
                                    <p className="text-xs" style={{ color: gpsLocation.accuracyLevel?.color }}>
                                        {gpsLocation.accuracyLevel?.label}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    </>
                )}
            </MapContainer>

            {/* Custom Toolbar - Left Side Bottom */}
            <div className="absolute left-4 bottom-8 z-[1000] flex flex-col gap-2">
                {/* Drawing Tools Card */}
                <div className="bg-white rounded-2xl shadow-xl p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 text-center">Draw</p>
                    <div className="flex flex-col gap-2">
                        {/* Polygon Button */}
                        <button
                            onClick={() => enableDrawing('polygon')}
                            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${activeTool === 'polygon'
                                ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                                : 'bg-gradient-to-br from-green-50 to-green-100 text-green-600 hover:from-green-100 hover:to-green-200'
                                }`}
                            title="Draw Polygon"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                            </svg>
                            <span className="text-[9px] font-semibold mt-0.5">Polygon</span>
                        </button>

                        {/* Rectangle Button */}
                        <button
                            onClick={() => enableDrawing('rectangle')}
                            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${activeTool === 'rectangle'
                                ? 'bg-purple-500 text-white shadow-lg shadow-purple-200'
                                : 'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 hover:from-purple-100 hover:to-purple-200'
                                }`}
                            title="Draw Rectangle"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
                            </svg>
                            <span className="text-[9px] font-semibold mt-0.5">Rectangle</span>
                        </button>

                        {/* Marker Button */}
                        <button
                            onClick={() => enableDrawing('marker')}
                            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all ${activeTool === 'marker'
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                                : 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-600 hover:from-orange-100 hover:to-orange-200'
                                }`}
                            title="Drop Marker"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-[9px] font-semibold mt-0.5">Marker</span>
                        </button>
                    </div>
                </div>

                {/* Location & Drone Buttons Card */}
                <div className="bg-white rounded-2xl shadow-xl p-3 border border-gray-100 flex flex-col gap-2">
                    {/* Fly to Drone Imagery */}
                    <button
                        onClick={flyToDroneImagery}
                        className="w-14 h-14 bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-600 rounded-xl flex flex-col items-center justify-center hover:from-cyan-100 hover:to-cyan-200 transition-all"
                        title="Go to Drone Imagery"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <circle cx="12" cy="13" r="3" strokeWidth={2} />
                        </svg>
                        <span className="text-[9px] font-semibold mt-0.5">Drone</span>
                    </button>

                    {/* My Location - Enhanced with loading and accuracy states */}
                    <button
                        onClick={handleGeolocation}
                        disabled={gpsLoading}
                        className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all relative ${gpsLoading
                            ? 'bg-blue-500 text-white animate-pulse'
                            : gpsLocation
                                ? 'bg-gradient-to-br from-green-50 to-green-100 text-green-600 hover:from-green-100 hover:to-green-200'
                                : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 hover:from-blue-100 hover:to-blue-200'
                            }`}
                        title={gpsError || (gpsLocation ? `Accuracy: ${Math.round(gpsLocation.accuracy)}m` : 'Get My Location')}
                    >
                        {gpsLoading ? (
                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                        )}
                        <span className="text-[9px] font-semibold mt-0.5">
                            {gpsLoading ? 'Finding...' : gpsLocation ? 'Located' : 'Location'}
                        </span>
                        {/* Accuracy indicator dot */}
                        {gpsLocation && (
                            <div
                                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
                                style={{ backgroundColor: gpsLocation.accuracyLevel?.color || '#10B981' }}
                                title={gpsLocation.accuracyLevel?.label}
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* Hide original Leaflet draw toolbar - use visibility:hidden so buttons are still clickable */}
            <style>{`
                .leaflet-draw-toolbar {
                    position: absolute !important;
                    left: -9999px !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
                .leaflet-draw-section {
                    position: absolute !important;
                    left: -9999px !important;
                }
            `}</style>

            {/* Instruction Banner - Only show when not drawing */}
            {!activeTool && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
                    <div className="bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-full shadow-lg border border-gray-100">
                        <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <span className="text-lg">🎯</span>
                            <span>Select a tool and draw around the building</span>
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapComponent;

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const PolygonCAD = ({ geometry, area }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!geometry || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        drawGrid(ctx, width, height);

        if (geometry.type === 'Polygon') {
            const coords = geometry.coordinates[0];
            drawPolygon(ctx, coords, width, height);
        } else if (geometry.type === 'Point') {
            drawPoint(ctx, geometry.coordinates, width, height);
        }
    }, [geometry]);

    const drawGrid = (ctx, width, height) => {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 0.5;

        // Vertical lines
        for (let x = 0; x <= width; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= height; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw border
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, width, height);
    };

    const drawPolygon = (ctx, coords, width, height) => {
        // Convert lat/lng to canvas coordinates
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);

        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);

        const padding = 40;
        const scaleX = (width - 2 * padding) / (maxLng - minLng);
        const scaleY = (height - 2 * padding) / (maxLat - minLat);
        const scale = Math.min(scaleX, scaleY);

        const toCanvasX = (lng) => padding + (lng - minLng) * scale;
        const toCanvasY = (lat) => height - (padding + (lat - minLat) * scale);

        // Draw polygon fill
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.beginPath();
        coords.forEach((coord, i) => {
            const x = toCanvasX(coord[0]);
            const y = toCanvasY(coord[1]);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.closePath();
        ctx.fill();

        // Draw polygon outline
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw vertices
        ctx.fillStyle = '#1e40af';
        coords.forEach((coord) => {
            const x = toCanvasX(coord[0]);
            const y = toCanvasY(coord[1]);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw measurements on edges
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';

        for (let i = 0; i < coords.length; i++) {
            const start = coords[i];
            const end = coords[(i + 1) % coords.length];

            const startX = toCanvasX(start[0]);
            const startY = toCanvasY(start[1]);
            const endX = toCanvasX(end[0]);
            const endY = toCanvasY(end[1]);

            // Calculate distance in meters
            const distance = calculateDistance(start[1], start[0], end[1], end[0]);

            // Draw measurement text at midpoint
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;

            // Background for text
            ctx.fillStyle = 'white';
            ctx.fillRect(midX - 25, midY - 10, 50, 16);

            ctx.fillStyle = '#1e40af';
            ctx.fillText(`${distance.toFixed(1)}m`, midX, midY + 3);
        }

        // Draw area label
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = 'white';
        ctx.fillRect(width / 2 - 60, 15, 120, 25);
        ctx.fillStyle = '#1e40af';
        ctx.fillText(`Area: ${area} m²`, width / 2, 32);

        // Draw compass/north arrow
        drawNorthArrow(ctx, width - 40, 40);
    };

    const drawPoint = (ctx, coords, width, height) => {
        const x = width / 2;
        const y = height / 2;

        // Draw crosshair
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x - 20, y);
        ctx.lineTo(x + 20, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x, y + 20);
        ctx.stroke();

        // Draw point
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Label
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Survey Point', width / 2, height - 20);
    };

    const drawNorthArrow = (ctx, x, y) => {
        ctx.save();
        ctx.translate(x, y);

        // Arrow
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.closePath();
        ctx.fill();

        // South
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.lineTo(-5, 0);
        ctx.lineTo(5, 0);
        ctx.closePath();
        ctx.fill();

        // N label
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N', 0, -20);

        ctx.restore();
    };

    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371000; // Earth radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lng2 - lng1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    return (
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                    📐 Building Footprint - CAD View
                </h4>
                <span className="text-xs text-gray-500 font-mono">Scale: Auto-fit</span>
            </div>
            <canvas
                ref={canvasRef}
                width={500}
                height={400}
                className="w-full border border-gray-200 rounded"
            />
            <div className="mt-2 text-xs text-gray-500 font-mono">
                All measurements in meters (m) | Grid spacing: 20px
            </div>
        </div>
    );
};

export default PolygonCAD;

import jsPDF from 'jspdf';

// Helper function to convert image URL to base64
const getBase64FromUrl = async (url) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Error loading image:', error);
        return null;
    }
};

// Helper function to generate CAD diagram as base64
const generateCADImage = (geometry, area) => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 450;
        const ctx = canvas.getContext('2d');

        // Professional gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw professional grid
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.3;
        for (let x = 0; x <= canvas.width; x += 25) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += 25) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        // Professional border with shadow effect
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
        ctx.shadowBlur = 0;

        if (geometry && geometry.type === 'Polygon') {
            const coords = geometry.coordinates[0];
            const lngs = coords.map(c => c[0]);
            const lats = coords.map(c => c[1]);

            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);

            const padding = 60;
            const scaleX = (canvas.width - 2 * padding) / (maxLng - minLng);
            const scaleY = (canvas.height - 2 * padding) / (maxLat - minLat);
            const scale = Math.min(scaleX, scaleY);

            const toCanvasX = (lng) => padding + (lng - minLng) * scale;
            const toCanvasY = (lat) => canvas.height - (padding + (lat - minLat) * scale);

            // Draw polygon shadow
            ctx.shadowColor = 'rgba(37, 99, 235, 0.3)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;

            // Draw polygon fill with gradient
            const polyGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            polyGradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
            polyGradient.addColorStop(1, 'rgba(37, 99, 235, 0.3)');
            ctx.fillStyle = polyGradient;
            ctx.beginPath();
            coords.forEach((coord, i) => {
                const x = toCanvasX(coord[0]);
                const y = toCanvasY(coord[1]);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Draw polygon outline with gradient stroke effect
            ctx.strokeStyle = '#1d4ed8';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Draw vertices with glow effect
            coords.forEach((coord, i) => {
                if (i < coords.length - 1) {
                    const x = toCanvasX(coord[0]);
                    const y = toCanvasY(coord[1]);

                    // Outer glow
                    ctx.beginPath();
                    ctx.arc(x, y, 8, 0, 2 * Math.PI);
                    ctx.fillStyle = 'rgba(37, 99, 235, 0.3)';
                    ctx.fill();

                    // Inner point
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    ctx.fillStyle = '#1e40af';
                    ctx.fill();

                    // White center
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, 2 * Math.PI);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();

                    // Vertex label
                    ctx.fillStyle = '#1e293b';
                    ctx.font = 'bold 10px Arial';
                    ctx.fillText(`P${i + 1}`, x + 10, y - 10);
                }
            });

            // Draw measurements with professional styling
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';

            for (let i = 0; i < coords.length - 1; i++) {
                const start = coords[i];
                const end = coords[(i + 1) % (coords.length - 1)] || coords[i + 1];
                const startX = toCanvasX(start[0]);
                const startY = toCanvasY(start[1]);
                const endX = toCanvasX(end[0]);
                const endY = toCanvasY(end[1]);

                // Calculate distance
                const R = 6371000;
                const φ1 = (start[1] * Math.PI) / 180;
                const φ2 = (end[1] * Math.PI) / 180;
                const Δφ = ((end[1] - start[1]) * Math.PI) / 180;
                const Δλ = ((end[0] - start[0]) * Math.PI) / 180;
                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distance = R * c;

                const midX = (startX + endX) / 2;
                const midY = (startY + endY) / 2;

                // Measurement badge
                ctx.fillStyle = '#1e40af';
                const badgeWidth = 55;
                const badgeHeight = 18;
                ctx.beginPath();
                ctx.roundRect(midX - badgeWidth / 2, midY - badgeHeight / 2, badgeWidth, badgeHeight, 4);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${distance.toFixed(1)}m`, midX, midY + 4);
            }

            // Area badge at center
            const centerX = canvas.width / 2;
            ctx.fillStyle = '#059669';
            ctx.beginPath();
            ctx.roundRect(centerX - 60, 20, 120, 30, 6);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`Area: ${area || 0} m²`, centerX, 40);
        }

        // North arrow with professional design
        const arrowX = canvas.width - 50;
        const arrowY = 50;

        // Arrow circle background
        ctx.beginPath();
        ctx.arc(arrowX, arrowY, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrow
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY - 12);
        ctx.lineTo(arrowX - 6, arrowY + 5);
        ctx.lineTo(arrowX, arrowY);
        ctx.lineTo(arrowX + 6, arrowY + 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('N', arrowX, arrowY + 15);

        // Scale indicator
        ctx.fillStyle = '#64748b';
        ctx.font = '9px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Scale: Approximate', 15, canvas.height - 15);

        resolve(canvas.toDataURL('image/png'));
    });
};

// Color palette
const colors = {
    primary: [37, 99, 235],      // Blue
    primaryDark: [30, 64, 175],  // Dark Blue
    success: [5, 150, 105],      // Green
    warning: [245, 158, 11],     // Amber
    danger: [220, 38, 38],       // Red
    gray: [100, 116, 139],       // Slate
    grayLight: [241, 245, 249],  // Light gray
    white: [255, 255, 255],
    black: [15, 23, 42],
};

export const generateSurveyPDF = async (survey) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    let yPos = 0;

    // Helper functions
    const setColor = (color) => pdf.setTextColor(color[0], color[1], color[2]);
    const setFillColor = (color) => pdf.setFillColor(color[0], color[1], color[2]);
    const setDrawColor = (color) => pdf.setDrawColor(color[0], color[1], color[2]);

    const checkNewPage = (spaceNeeded = 50) => {
        if (yPos > pageHeight - spaceNeeded) {
            pdf.addPage();
            yPos = margin + 10;
            return true;
        }
        return false;
    };

    const drawSectionHeader = (title, icon, yPosition) => {
        // Section header with gradient effect
        setFillColor(colors.primary);
        pdf.roundedRect(margin, yPosition, contentWidth, 10, 2, 2, 'F');

        // Accent line
        setFillColor(colors.primaryDark);
        pdf.rect(margin, yPosition, 4, 10, 'F');

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        setColor(colors.white);
        pdf.text(`${icon}  ${title}`, margin + 8, yPosition + 7);

        return yPosition + 14;
    };

    const drawField = (label, value, x, y, width = 80) => {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        setColor(colors.gray);
        pdf.text(label, x, y);

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        setColor(colors.black);
        const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '—';
        pdf.text(displayValue.substring(0, 40), x, y + 4);
    };

    const drawCheckItem = (label, checked, x, y) => {
        // Checkbox
        setDrawColor(colors.gray);
        pdf.setLineWidth(0.3);
        pdf.rect(x, y - 3, 3.5, 3.5);

        if (checked) {
            setFillColor(colors.success);
            pdf.rect(x + 0.5, y - 2.5, 2.5, 2.5, 'F');
        }

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        setColor(colors.black);
        pdf.text(label, x + 5, y);
    };

    const drawInfoCard = (x, y, width, height, title, value, color) => {
        setFillColor(color);
        pdf.roundedRect(x, y, width, height, 2, 2, 'F');

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        setColor(colors.white);
        pdf.text(title, x + width / 2, y + 6, { align: 'center' });

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(value || '—'), x + width / 2, y + 14, { align: 'center' });
    };

    // ========== PAGE 1: COVER & HEADER ==========

    // Professional header with gradient effect
    setFillColor(colors.primary);
    pdf.rect(0, 0, pageWidth, 45, 'F');

    // Header accent
    setFillColor(colors.primaryDark);
    pdf.rect(0, 40, pageWidth, 5, 'F');

    // Government/Organization logo area (placeholder)
    setFillColor(colors.white);
    pdf.circle(20, 20, 10, 'F');
    pdf.setFontSize(6);
    setColor(colors.primary);
    pdf.text('LOGO', 20, 21, { align: 'center' });

    // Title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    setColor(colors.white);
    pdf.text('Property Tax Assessment Report', 35, 18);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Annexure-A Form | Official Survey Document', 35, 26);

    // Document info
    pdf.setFontSize(8);
    pdf.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 18, { align: 'right' });
    pdf.text(`Document ID: ${survey.id?.substring(0, 8) || 'N/A'}`, pageWidth - margin, 24, { align: 'right' });

    yPos = 52;

    // Quick Info Cards Row
    const cardWidth = (contentWidth - 9) / 4;
    drawInfoCard(margin, yPos, cardWidth, 18, 'Building ID', survey.building_id || 'N/A', colors.primary);
    drawInfoCard(margin + cardWidth + 3, yPos, cardWidth, 18, 'Total Area', `${survey.area_sqm || 0} m²`, colors.success);
    drawInfoCard(margin + (cardWidth + 3) * 2, yPos, cardWidth, 18, 'Floor', `${survey.floor_number || 1}/${survey.total_floors || 1}`, colors.warning);
    drawInfoCard(margin + (cardWidth + 3) * 3, yPos, cardWidth, 18, 'Status', survey.status || 'Pending', colors.gray);

    yPos += 25;

    // CAD Diagram Section
    if (survey.geometry) {
        try {
            setFillColor(colors.grayLight);
            pdf.roundedRect(margin, yPos, contentWidth, 75, 3, 3, 'F');
            setDrawColor([203, 213, 225]);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(margin, yPos, contentWidth, 75, 3, 3);

            const cadImage = await generateCADImage(survey.geometry, survey.area_sqm);
            pdf.addImage(cadImage, 'PNG', margin + 5, yPos + 3, contentWidth - 10, 69);

            yPos += 80;
        } catch (error) {
            console.error('Error adding CAD diagram:', error);
            yPos += 10;
        }
    }

    checkNewPage(60);

    // ========== SECTION 1: OWNER DETAILS ==========
    yPos = drawSectionHeader('Owner Information', '👤', yPos);

    const leftCol = margin + 3;
    const midCol = margin + contentWidth / 3 + 3;
    const rightCol = margin + (contentWidth / 3) * 2 + 3;
    const colWidth = contentWidth / 3 - 6;

    drawField('Owner Name', survey.owner_name, leftCol, yPos);
    drawField('Phone Number', survey.phone_number, midCol, yPos);
    drawField('Aadhaar Number', survey.aadhaar_number, rightCol, yPos);
    yPos += 12;

    drawField('Email Address', survey.email_address, leftCol, yPos);
    drawField('Family Members', survey.family_members_count, midCol, yPos);
    drawField('Ownership Type', survey.ownership_type, rightCol, yPos);
    yPos += 12;

    drawField('Occupier Name', survey.occupier_name, leftCol, yPos);
    yPos += 15;

    checkNewPage(50);

    // ========== SECTION 2: LOCATION DETAILS ==========
    yPos = drawSectionHeader('Location Details', '📍', yPos);

    drawField('7/12 Survey/Gat No', survey.survey_gat_no, leftCol, yPos);
    drawField('City Survey No', survey.city_survey_no, midCol, yPos);
    drawField('Layout/Plot No', survey.layout_name_plot_no, rightCol, yPos);
    yPos += 12;

    drawField('Building Name', survey.building_name, leftCol, yPos);
    drawField('Nearest Road Type', survey.nearest_road_type, midCol, yPos);
    drawField('Pin Code', survey.pin_code, rightCol, yPos);
    yPos += 12;

    drawField('Property Type', survey.property_type, leftCol, yPos);
    drawField('Usage Type', survey.usage_type, midCol, yPos);
    drawField('Usage Sub-Type', survey.usage_sub_type, rightCol, yPos);
    yPos += 12;

    // Full width field
    drawField('Full Address with Floor', survey.address_with_floor, leftCol, yPos, contentWidth - 6);
    yPos += 15;

    checkNewPage(50);

    // ========== SECTION 3: CONSTRUCTION DETAILS ==========
    yPos = drawSectionHeader('Construction Details', '🏗️', yPos);

    drawField('Construction Type', survey.construction_type, leftCol, yPos);
    drawField('Year of Construction', survey.year_of_construction, midCol, yPos);
    if (survey.year_of_construction) {
        const age = new Date().getFullYear() - survey.year_of_construction;
        drawField('Building Age', `${age} years`, rightCol, yPos);
    }
    yPos += 12;

    drawField('Permission No', survey.permission_no, leftCol, yPos);
    drawField('Permission Date', survey.permission_date, midCol, yPos);
    yPos += 10;

    // Checkboxes
    drawCheckItem('Building Permission', survey.building_permission, leftCol, yPos);
    drawCheckItem('Occupancy Certificate', survey.occupancy_certificate, midCol, yPos);
    yPos += 12;

    checkNewPage(50);

    // ========== SECTION 4: WATER SUPPLY ==========
    yPos = drawSectionHeader('Water Supply Details', '💧', yPos);

    drawCheckItem('Water Connection Available', survey.water_connection, leftCol, yPos);
    yPos += 8;

    if (survey.water_connection) {
        drawField('Connection Type', survey.water_connection_type, leftCol, yPos);
        drawField('Authorization', survey.water_authorized, midCol, yPos);
        drawField('Pipe Size', survey.pipe_size, rightCol, yPos);
        yPos += 12;

        drawField('Meter No', survey.water_meter_no, leftCol, yPos);
        drawField('Consumer No', survey.water_consumer_no, midCol, yPos);
        drawField('Connection Date', survey.water_connection_date, rightCol, yPos);
        yPos += 12;
    }
    yPos += 5;

    checkNewPage(50);

    // ========== SECTION 5: SANITATION & UTILITIES ==========
    yPos = drawSectionHeader('Sanitation & Utilities', '🚽', yPos);

    // Two-column checkbox layout
    const checkCol1 = leftCol;
    const checkCol2 = margin + contentWidth / 2;

    drawCheckItem('Has Toilet', survey.has_toilet, checkCol1, yPos);
    drawCheckItem('Electricity Connection', survey.electricity_connection, checkCol2, yPos);
    yPos += 7;

    drawCheckItem('Septic Tank', survey.has_septic_tank, checkCol1, yPos);
    drawCheckItem('Solar Panels', survey.has_solar, checkCol2, yPos);
    yPos += 7;

    drawCheckItem('Sewerage Connection', survey.has_sewerage, checkCol1, yPos);
    drawCheckItem('Rain Water Harvesting', survey.has_rainwater_harvesting, checkCol2, yPos);
    yPos += 7;

    drawCheckItem('Property Tax Paid', survey.tax_paid, checkCol1, yPos);
    if (survey.has_toilet && survey.toilet_count) {
        drawField('Toilet Count', survey.toilet_count, checkCol2, yPos - 2);
    }
    yPos += 12;

    checkNewPage(60);

    // ========== SECTION 6: ASSESSMENT DETAILS ==========
    yPos = drawSectionHeader('Assessment Details', '📋', yPos);

    drawField('ULB Name', survey.ulb_name, leftCol, yPos);
    drawField('District', survey.district, midCol, yPos);
    drawField('Town', survey.town, rightCol, yPos);
    yPos += 12;

    drawField('Zone No', survey.zone_no, leftCol, yPos);
    drawField('New Ward No', survey.new_ward_no, midCol, yPos);
    drawField('Old Ward No', survey.old_ward_no, rightCol, yPos);
    yPos += 12;

    drawField('Old Property No', survey.old_property_no, leftCol, yPos);
    drawField('New Property No', survey.new_property_no, midCol, yPos);
    yPos += 12;

    // Area calculations with highlight
    setFillColor([240, 253, 244]); // Light green
    pdf.roundedRect(margin, yPos, contentWidth, 16, 2, 2, 'F');
    yPos += 4;

    drawField('Total Carpet Area (m²)', survey.total_carpet_area, leftCol, yPos);
    drawField('Exempted Area (m²)', survey.exempted_area, midCol, yPos);
    drawField('Assessable Area (m²)', survey.assessable_area, rightCol, yPos);
    yPos += 18;

    checkNewPage(80);

    // ========== SECTION 7: PHOTOS ==========
    yPos = drawSectionHeader('Photo Documentation', '📷', yPos);

    let photoX = margin + 5;
    const photoWidth = 45;
    const photoHeight = 55;

    // Owner Photo
    if (survey.owner_photo_url) {
        try {
            const ownerPhotoBase64 = await getBase64FromUrl(survey.owner_photo_url);
            if (ownerPhotoBase64) {
                setFillColor(colors.grayLight);
                pdf.roundedRect(photoX - 2, yPos, photoWidth + 4, photoHeight + 12, 2, 2, 'F');
                pdf.addImage(ownerPhotoBase64, 'JPEG', photoX, yPos + 2, photoWidth, photoHeight);

                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'bold');
                setColor(colors.gray);
                pdf.text('Owner Photo', photoX + photoWidth / 2, yPos + photoHeight + 8, { align: 'center' });
                photoX += photoWidth + 15;
            }
        } catch (error) {
            console.error('Error adding owner photo:', error);
        }
    }

    // Building Photo 1
    if (survey.building_photo_url) {
        try {
            const buildingPhotoBase64 = await getBase64FromUrl(survey.building_photo_url);
            if (buildingPhotoBase64) {
                setFillColor(colors.grayLight);
                pdf.roundedRect(photoX - 2, yPos, photoWidth + 4, photoHeight + 12, 2, 2, 'F');
                pdf.addImage(buildingPhotoBase64, 'JPEG', photoX, yPos + 2, photoWidth, photoHeight);

                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'bold');
                setColor(colors.gray);
                pdf.text('Building Front', photoX + photoWidth / 2, yPos + photoHeight + 8, { align: 'center' });
                photoX += photoWidth + 15;
            }
        } catch (error) {
            console.error('Error adding building photo 1:', error);
        }
    }

    // Building Photo 2
    if (survey.building_photo_url_2) {
        try {
            const buildingPhoto2Base64 = await getBase64FromUrl(survey.building_photo_url_2);
            if (buildingPhoto2Base64) {
                setFillColor(colors.grayLight);
                pdf.roundedRect(photoX - 2, yPos, photoWidth + 4, photoHeight + 12, 2, 2, 'F');
                pdf.addImage(buildingPhoto2Base64, 'JPEG', photoX, yPos + 2, photoWidth, photoHeight);

                pdf.setFontSize(7);
                pdf.setFont('helvetica', 'bold');
                setColor(colors.gray);
                pdf.text('Building Side', photoX + photoWidth / 2, yPos + photoHeight + 8, { align: 'center' });
            }
        } catch (error) {
            console.error('Error adding building photo 2:', error);
        }
    }

    yPos += photoHeight + 20;

    checkNewPage(30);

    // ========== SURVEY METADATA FOOTER ==========
    setFillColor(colors.grayLight);
    pdf.roundedRect(margin, yPos, contentWidth, 20, 2, 2, 'F');

    yPos += 6;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    setColor(colors.gray);
    pdf.text('Survey Metadata', margin + 5, yPos);

    yPos += 6;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text(`Survey ID: ${survey.id || 'N/A'}`, margin + 5, yPos);
    pdf.text(`Created: ${survey.created_at ? new Date(survey.created_at).toLocaleString('en-IN') : 'N/A'}`, margin + 70, yPos);
    pdf.text(`Surveyor ID: ${survey.surveyor_id?.substring(0, 12) || 'N/A'}...`, margin + 140, yPos);

    // Footer on each page
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        // Footer line
        setDrawColor(colors.primary);
        pdf.setLineWidth(0.5);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        // Footer text
        pdf.setFontSize(7);
        setColor(colors.gray);
        pdf.text('Property Tax Assessment System | Annexure-A Form | Official Document | Confidential', pageWidth / 2, pageHeight - 8, { align: 'center' });

        pdf.setFont('helvetica', 'bold');
        setColor(colors.primary);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    }

    // Save the PDF
    const fileName = `Annexure_A_${survey.building_id || survey.id?.substring(0, 8) || 'Survey'}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
};

export default generateSurveyPDF;

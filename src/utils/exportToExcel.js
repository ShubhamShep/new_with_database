import * as XLSX from 'xlsx';

/**
 * Export survey data to Excel format with all Annexure-A fields
 * @param {Array} surveys - Array of survey objects
 * @param {string} filename - Output filename (without extension)
 */
export const exportToExcel = (surveys, filename = `Survey_Export_${Date.now()}`) => {
    if (!surveys || surveys.length === 0) {
        alert('No data to export');
        return;
    }

    // Prepare data for export with all Annexure-A fields
    const exportData = surveys.map(survey => ({
        // Building Information
        'Building ID': survey.building_id || '',
        'Survey ID': survey.id || '',
        'Floor Number': survey.floor_number || '',
        'Total Floors': survey.total_floors || '',
        'Unit Identifier': survey.unit_identifier || '',
        'Total Area (m²)': survey.area_sqm || '',
        'Status': survey.status || '',

        // Section 1: Owner Details
        'Owner Name': survey.owner_name || '',
        'Phone Number': survey.phone_number || '',
        'Aadhaar Number': survey.aadhaar_number || '',
        'Email Address': survey.email_address || '',
        'Family Members Count': survey.family_members_count || '',
        'Occupier Name': survey.occupier_name || '',
        'Ownership Type': survey.ownership_type || '',

        // Section 2: Location Details
        '7/12 Survey/Gat No': survey.survey_gat_no || '',
        'City Survey No': survey.city_survey_no || '',
        'Layout Name/Plot No': survey.layout_name_plot_no || '',
        'Building Name': survey.building_name || '',
        'Address with Floor': survey.address_with_floor || '',
        'Nearest Road Type': survey.nearest_road_type || '',
        'Pin Code': survey.pin_code || '',
        'Property Type': survey.property_type || '',
        'Usage Type': survey.usage_type || '',
        'Usage Sub-Type': survey.usage_sub_type || '',

        // Section 3: Construction Details
        'Building Permission': survey.building_permission ? 'Yes' : 'No',
        'Permission No': survey.permission_no || '',
        'Permission Date': survey.permission_date || '',
        'Occupancy Certificate': survey.occupancy_certificate ? 'Yes' : 'No',
        'Construction Type': survey.construction_type || '',
        'Year of Construction': survey.year_of_construction || '',
        'Construction Age (years)': survey.year_of_construction ? new Date().getFullYear() - survey.year_of_construction : '',

        // Section 4: Water Supply Details
        'Water Connection': survey.water_connection ? 'Yes' : 'No',
        'Water Connection Type': survey.water_connection_type || '',
        'Water Authorization': survey.water_authorized || '',
        'Water Meter No': survey.water_meter_no || '',
        'Water Consumer No': survey.water_consumer_no || '',
        'Water Connection Date': survey.water_connection_date || '',
        'Pipe Size': survey.pipe_size || '',

        // Section 5: Sanitation & Utilities
        'Has Toilet': survey.has_toilet ? 'Yes' : 'No',
        'Toilet Count': survey.toilet_count || '',
        'Septic Tank': survey.has_septic_tank ? 'Yes' : 'No',
        'Sewerage Connection': survey.has_sewerage ? 'Yes' : 'No',
        'Electricity Connection': survey.electricity_connection ? 'Yes' : 'No',
        'Solar Panels': survey.has_solar ? 'Yes' : 'No',
        'Rain Water Harvesting': survey.has_rainwater_harvesting ? 'Yes' : 'No',
        'Property Tax Paid': survey.tax_paid ? 'Yes' : 'No',

        // Section 6: Assessment Details
        'ULB Name': survey.ulb_name || '',
        'District': survey.district || '',
        'Town': survey.town || '',
        'Zone No': survey.zone_no || '',
        'New Ward No': survey.new_ward_no || '',
        'Old Ward No': survey.old_ward_no || '',
        'Old Property No': survey.old_property_no || '',
        'New Property No': survey.new_property_no || '',
        'Total Carpet Area (m²)': survey.total_carpet_area || '',
        'Exempted Area (m²)': survey.exempted_area || '',
        'Assessable Area (m²)': survey.assessable_area || '',
        'Current Tax Details': survey.current_tax_details || '',

        // Photos URLs
        'Owner Photo URL': survey.owner_photo_url || '',
        'Building Photo 1 URL': survey.building_photo_url || '',
        'Building Photo 2 URL': survey.building_photo_url_2 || '',

        // Metadata
        'Created At': new Date(survey.created_at).toLocaleString(),
        'Updated At': new Date(survey.updated_at).toLocaleString(),
        'Surveyor ID': survey.user_id || '',
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    const colWidths = [
        { wch: 15 }, // Building ID
        { wch: 12 }, // Survey ID
        { wch: 10 }, // Floor Number
        { wch: 12 }, // Total Floors
        { wch: 15 }, // Unit Identifier
        { wch: 12 }, // Area
        { wch: 10 }, // Status
        { wch: 25 }, // Owner Name
        { wch: 15 }, // Phone
        { wch: 15 }, // Aadhaar
        { wch: 25 }, // Email
        { wch: 15 }, // Family Members
        { wch: 25 }, // Occupier
        { wch: 15 }, // Ownership Type
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Survey Data');

    // Add summary sheet
    const summaryData = [
        { 'Metric': 'Total Surveys', 'Value': surveys.length },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleString() },
        { 'Metric': 'Total Area (m²)', 'Value': surveys.reduce((sum, s) => sum + (parseFloat(s.area_sqm) || 0), 0).toFixed(2) },
        { 'Metric': 'Properties with Water Connection', 'Value': surveys.filter(s => s.water_connection).length },
        { 'Metric': 'Properties with Electricity', 'Value': surveys.filter(s => s.electricity_connection).length },
        { 'Metric': 'Properties with Tax Paid', 'Value': surveys.filter(s => s.tax_paid).length },
    ];

    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Save file
    XLSX.writeFile(wb, `${filename}.xlsx`);

    return true;
};

/**
 * Export survey data to CSV format
 * @param {Array} surveys - Array of survey objects
 * @param {string} filename - Output filename (without extension)
 */
export const exportToCSV = (surveys, filename = `Survey_Export_${Date.now()}`) => {
    if (!surveys || surveys.length === 0) {
        alert('No data to export');
        return;
    }

    // Prepare data (same as Excel export)
    const exportData = surveys.map(survey => ({
        'Building ID': survey.building_id || '',
        'Survey ID': survey.id || '',
        'Floor Number': survey.floor_number || '',
        'Total Floors': survey.total_floors || '',
        'Owner Name': survey.owner_name || '',
        'Phone Number': survey.phone_number || '',
        'Aadhaar Number': survey.aadhaar_number || '',
        'Email Address': survey.email_address || '',
        'Property Type': survey.property_type || '',
        'Construction Type': survey.construction_type || '',
        'Year of Construction': survey.year_of_construction || '',
        'Total Area (m²)': survey.area_sqm || '',
        'Water Connection': survey.water_connection ? 'Yes' : 'No',
        'Electricity Connection': survey.electricity_connection ? 'Yes' : 'No',
        'Tax Paid': survey.tax_paid ? 'Yes' : 'No',
        'District': survey.district || '',
        'Town': survey.town || '',
        'Ward No': survey.new_ward_no || '',
        'Property No': survey.new_property_no || '',
        'Created At': new Date(survey.created_at).toLocaleString(),
    }));

    // Create worksheet and export
    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
};

/**
 * Export filtered survey data based on criteria
 * @param {Array} surveys - Array of survey objects
 * @param {Object} filters - Filter criteria
 * @param {string} format - Export format ('excel' or 'csv')
 * @param {string} filename - Output filename
 */
export const exportFilteredData = (surveys, filters = {}, format = 'excel', filename) => {
    let filteredSurveys = [...surveys];

    // Apply filters
    if (filters.propertyType) {
        filteredSurveys = filteredSurveys.filter(s => s.property_type === filters.propertyType);
    }

    if (filters.district) {
        filteredSurveys = filteredSurveys.filter(s => s.district === filters.district);
    }

    if (filters.town) {
        filteredSurveys = filteredSurveys.filter(s => s.town === filters.town);
    }

    if (filters.taxPaid !== undefined) {
        filteredSurveys = filteredSurveys.filter(s => s.tax_paid === filters.taxPaid);
    }

    if (filters.dateFrom) {
        filteredSurveys = filteredSurveys.filter(s => new Date(s.created_at) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
        filteredSurveys = filteredSurveys.filter(s => new Date(s.created_at) <= new Date(filters.dateTo));
    }

    // Export based on format
    if (format === 'excel') {
        return exportToExcel(filteredSurveys, filename);
    } else {
        return exportToCSV(filteredSurveys, filename);
    }
};

export default { exportToExcel, exportToCSV, exportFilteredData };

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import PolygonCAD from './PolygonCAD';
import CameraCapture from './CameraCapture';
import { useFormValidation } from '../hooks/useFormValidation';
import { addPendingSurvey, isOnline } from '../utils/offlineStore';
const DRAFT_KEY = 'survey_form_draft';

const SurveyForm = ({ buildingData, floorNumber = 1, totalFloors = 1, unitIdentifier = null, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        // === OWNER DETAILS ===
        owner_name: '',
        phone_number: '',
        aadhaar_number: '',
        email_address: '',
        family_members_count: '',
        occupier_name: '',

        // === LOCATION DETAILS ===
        survey_gat_no: '',
        city_survey_no: '',
        layout_name_plot_no: '',
        building_name: '',
        address_with_floor: '',
        nearest_road_type: '',
        pin_code: '',
        property_type: 'Residential',
        usage_type: '',
        usage_sub_type: '',

        // === CONSTRUCTION DETAILS ===
        building_permission: false,
        permission_no: '',
        permission_date: '',
        occupancy_certificate: false,
        construction_type: 'RCC',
        year_of_construction: '',

        // === WATER SUPPLY ===
        water_connection: false,
        water_connection_type: '',
        water_authorized: 'Authorised',
        water_meter_no: '',
        water_consumer_no: '',
        water_connection_date: '',
        pipe_size: '',

        // === SANITATION ===
        has_toilet: false,
        toilet_count: '',
        has_septic_tank: false,
        has_sewerage: false,

        // === UTILITIES ===
        electricity_connection: false,
        has_solar: false,
        has_rainwater_harvesting: false,

        // === ASSESSMENT DETAILS ===
        zone_no: '',
        new_ward_no: '',
        old_ward_no: '',
        old_property_no: '',
        new_property_no: '',
        total_carpet_area: '',
        exempted_area: '',
        assessable_area: '',
        ownership_type: 'owned',
        current_tax_details: '',
        ulb_name: '',
        district: '',
        town: '',

        // === LEGACY FIELDS ===
        tax_paid: false,
    });
    const [ownerPhoto, setOwnerPhoto] = useState(null);
    const [buildingPhoto, setBuildingPhoto] = useState(null);
    const [buildingPhoto2, setBuildingPhoto2] = useState(null); // Second building photo as per Annexure-A
    const [loading, setLoading] = useState(false);
    const [draftRestored, setDraftRestored] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [activeSection, setActiveSection] = useState('owner'); // For section navigation

    // Form validation
    const { errors, validateForm, handleBlur, clearError, getError, hasError } = useFormValidation();

    // Load draft from localStorage on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                // Only restore if it's for the same building
                if (parsed.buildingId === buildingData?.id) {
                    setFormData(prev => ({ ...prev, ...parsed.formData }));
                    setDraftRestored(true);
                    setTimeout(() => setDraftRestored(false), 3000);
                }
            } catch (e) {
                console.error('Error restoring draft:', e);
            }
        }
    }, [buildingData?.id]);

    // Auto-save to localStorage when form changes
    useEffect(() => {
        const saveTimer = setTimeout(() => {
            const draftData = {
                buildingId: buildingData?.id,
                formData,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
            setLastSaved(new Date());
        }, 2000); // Save 2 seconds after last change

        return () => clearTimeout(saveTimer);
    }, [formData, buildingData?.id]);

    // Clear draft after successful submission
    const clearDraft = useCallback(() => {
        localStorage.removeItem(DRAFT_KEY);
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({
            ...prev,
            [name]: newValue
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            clearError(name);
        }
    };

    const handleFieldBlur = (e) => {
        const { name, value } = e.target;
        handleBlur(name, value);
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (type === 'owner') {
            setOwnerPhoto(file);
        } else {
            setBuildingPhoto(file);
        }
    };

    const uploadPhoto = async (file, path) => {
        if (!file) return null;

        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from('survey-photos')
            .upload(`${path}/${fileName}`, file);

        if (error) {
            console.error('Upload error:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('survey-photos')
            .getPublicUrl(data.path);

        return publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitAttempted(true);

        // Validate form before submission
        if (!validateForm(formData)) {
            // Scroll to first error
            const firstError = document.querySelector('.field-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setLoading(true);

        try {
            const user = (await supabase.auth.getUser()).data.user;

            // Upload photos
            const ownerPhotoUrl = await uploadPhoto(ownerPhoto, 'owners');
            const buildingPhotoUrl = await uploadPhoto(buildingPhoto, 'buildings');

            // Prepare survey data - Include ALL Annexure-A fields
            const surveyData = {
                // Meta fields
                surveyor_id: user.id,
                building_id: buildingData.id,
                geometry: buildingData.geometry,
                area_sqm: buildingData.area,
                floor_number: floorNumber,
                total_floors: totalFloors,
                unit_identifier: unitIdentifier,
                status: 'submitted',

                // Section 1: Owner Details
                owner_name: formData.owner_name,
                phone_number: formData.phone_number,
                aadhaar_number: formData.aadhaar_number || null,
                email_address: formData.email_address || null,
                family_members_count: formData.family_members_count ? parseInt(formData.family_members_count) : null,
                occupier_name: formData.occupier_name || null,
                ownership_type: formData.ownership_type || null,

                // Section 2: Location Details
                survey_gat_no: formData.survey_gat_no || null,
                city_survey_no: formData.city_survey_no || null,
                layout_name_plot_no: formData.layout_name_plot_no || null,
                building_name: formData.building_name || null,
                address_with_floor: formData.address_with_floor || null,
                nearest_road_type: formData.nearest_road_type || null,
                pin_code: formData.pin_code || null,
                property_type: formData.property_type || null,
                usage_type: formData.usage_type || null,
                usage_sub_type: formData.usage_sub_type || null,

                // Section 3: Construction Details
                building_permission: formData.building_permission || false,
                permission_no: formData.permission_no || null,
                permission_date: formData.permission_date || null,
                occupancy_certificate: formData.occupancy_certificate || false,
                construction_type: formData.construction_type || null,
                year_of_construction: formData.year_of_construction ? parseInt(formData.year_of_construction) : null,

                // Section 4: Water Supply Details
                water_connection: formData.water_connection || false,
                water_connection_type: formData.water_connection_type || null,
                water_authorized: formData.water_authorized || null,
                water_meter_no: formData.water_meter_no || null,
                water_consumer_no: formData.water_consumer_no || null,
                water_connection_date: formData.water_connection_date || null,
                pipe_size: formData.pipe_size || null,

                // Section 5: Sanitation & Utilities
                has_toilet: formData.has_toilet || false,
                toilet_count: formData.toilet_count ? parseInt(formData.toilet_count) : null,
                has_septic_tank: formData.has_septic_tank || false,
                has_sewerage: formData.has_sewerage || false,
                electricity_connection: formData.electricity_connection || false,
                has_solar: formData.has_solar || false,
                has_rainwater_harvesting: formData.has_rainwater_harvesting || false,
                tax_paid: formData.tax_paid || false,

                // Section 6: Assessment Details
                ulb_name: formData.ulb_name || null,
                district: formData.district || null,
                town: formData.town || null,
                zone_no: formData.zone_no || null,
                new_ward_no: formData.new_ward_no || null,
                old_ward_no: formData.old_ward_no || null,
                old_property_no: formData.old_property_no || null,
                new_property_no: formData.new_property_no || null,
                total_carpet_area: formData.total_carpet_area ? parseFloat(formData.total_carpet_area) : null,
                exempted_area: formData.exempted_area ? parseFloat(formData.exempted_area) : null,
                assessable_area: formData.assessable_area ? parseFloat(formData.assessable_area) : null,
                current_tax_details: formData.current_tax_details || null,

                // Section 7: Photos
                owner_photo_url: ownerPhotoUrl,
                building_photo_url: buildingPhotoUrl,
                building_photo_url_2: formData.building_photo_url_2 || null,

                // Legacy fields for backward compatibility
                property_usage: formData.usage_type || formData.property_usage || null,

                // Store complete form data as JSONB backup
                form_data: formData,
            };

            // Check if online
            if (!isOnline()) {
                // Save to offline queue
                await addPendingSurvey(surveyData);
                clearDraft();
                alert('📴 Survey saved offline! It will sync automatically when you\'re back online.');
                if (onSuccess) onSuccess(formData);
                return;
            }

            // Online - submit directly to Supabase
            const { error } = await supabase
                .from('surveys')
                .insert(surveyData);

            if (error) throw error;

            // Clear draft on successful submission
            clearDraft();

            // Pass formData to parent for success modal
            if (onSuccess) onSuccess(formData);
        } catch (error) {
            console.error('Error submitting survey:', error);

            // If submission fails due to network, save offline
            if (!isOnline() || error.message.includes('network') || error.message.includes('Failed to fetch')) {
                try {
                    // Reuse the same surveyData structure
                    const offlineSurveyData = {
                        ...surveyData,
                        status: 'pending_sync',
                    };
                    await addPendingSurvey(offlineSurveyData);
                    clearDraft();
                    alert('📴 Network error - Survey saved offline! It will sync when connected.');
                    if (onSuccess) onSuccess(formData);
                    return;
                } catch (offlineErr) {
                    console.error('Failed to save offline:', offlineErr);
                }
            }

            alert('Failed to submit survey: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center rounded-t-2xl z-10">
                <div>
                    <h2 className="text-2xl font-bold">Property Assessment Form</h2>
                    <p className="text-blue-100 text-sm mt-1">
                        Building ID: {buildingData.id}
                        {totalFloors > 1 && ` • Floor ${floorNumber}/${totalFloors}`}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Auto-save indicator */}
                    {lastSaved && (
                        <span className="text-xs text-blue-200 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                            </svg>
                            Draft saved
                        </span>
                    )}
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 text-3xl font-light"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Draft Restored Notification */}
            {draftRestored && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 mx-6 mt-4 rounded-r-lg">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-amber-700 font-medium">Previous draft restored</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-6">

                {/* Section Navigation Tabs */}
                <div className="flex overflow-x-auto pb-2 gap-2 -mx-6 px-6 scrollbar-hide">
                    {[
                        { id: 'owner', label: '👤 Owner', icon: '👤' },
                        { id: 'location', label: '📍 Location', icon: '📍' },
                        { id: 'construction', label: '🏗️ Construction', icon: '🏗️' },
                        { id: 'water', label: '💧 Water', icon: '💧' },
                        { id: 'sanitation', label: '🚽 Sanitation', icon: '🚽' },
                        { id: 'assessment', label: '📋 Assessment', icon: '📋' },
                        { id: 'photos', label: '📷 Photos', icon: '📷' },
                    ].map((section) => (
                        <button
                            key={section.id}
                            type="button"
                            onClick={() => setActiveSection(section.id)}
                            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeSection === section.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>

                {/* Auto-calculated Area */}
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                    <p className="text-sm font-semibold text-blue-900">📐 Auto-calculated Area</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{buildingData.area} m²</p>
                </div>

                {/* CAD Diagram */}
                <PolygonCAD geometry={buildingData.geometry} area={buildingData.area} />

                {/* ========== SECTION 1: OWNER DETAILS ========== */}
                {activeSection === 'owner' && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="mr-2">👤</span> Owner Details
                        </h3>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Owner Name *</label>
                            <input
                                type="text"
                                name="owner_name"
                                required
                                value={formData.owner_name}
                                onChange={handleChange}
                                onBlur={handleFieldBlur}
                                className={`w-full p-4 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${hasError('owner_name') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                placeholder="Enter owner's full name"
                            />
                            {getError('owner_name') && <p className="field-error text-sm text-red-600 mt-1">⚠️ {getError('owner_name')}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    name="phone_number"
                                    required
                                    value={formData.phone_number}
                                    onChange={handleChange}
                                    onBlur={handleFieldBlur}
                                    className={`w-full p-4 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${hasError('phone_number') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                    placeholder="10-digit number"
                                    maxLength="10"
                                />
                                {getError('phone_number') && <p className="field-error text-sm text-red-600 mt-1">⚠️ {getError('phone_number')}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Aadhaar Number *</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="aadhaar_number"
                                    required
                                    value={formData.aadhaar_number}
                                    onChange={handleChange}
                                    onBlur={handleFieldBlur}
                                    className={`w-full p-4 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${hasError('aadhaar_number') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                    placeholder="12-digit number"
                                    maxLength="12"
                                />
                                {getError('aadhaar_number') && <p className="field-error text-sm text-red-600 mt-1">⚠️ {getError('aadhaar_number')}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    name="email_address"
                                    value={formData.email_address}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Family Members in Survey</label>
                                <input
                                    type="number"
                                    name="family_members_count"
                                    value={formData.family_members_count}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Number of family members"
                                    min="1"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Occupier Name (if different from owner)</label>
                            <input
                                type="text"
                                name="occupier_name"
                                value={formData.occupier_name}
                                onChange={handleChange}
                                className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter occupier's name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Ownership Type *</label>
                            <select
                                name="ownership_type"
                                value={formData.ownership_type}
                                onChange={handleChange}
                                className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="owned">Owned</option>
                                <option value="rented">Rented</option>
                                <option value="leased">Leased</option>
                                <option value="government">Government</option>
                            </select>
                        </div>

                        <button type="button" onClick={() => setActiveSection('location')} className="w-full py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                            Next: Location Details →
                        </button>
                    </div>
                )}

                {/* ========== SECTION 2: LOCATION DETAILS ========== */}
                {activeSection === 'location' && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="mr-2">📍</span> Location Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">7/12 Survey / Gat No</label>
                                <input
                                    type="text"
                                    name="survey_gat_no"
                                    value={formData.survey_gat_no}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter Survey/Gat number"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">City Survey No</label>
                                <input
                                    type="text"
                                    name="city_survey_no"
                                    value={formData.city_survey_no}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="City Survey number (if existing)"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Layout Name and Plot No</label>
                            <input
                                type="text"
                                name="layout_name_plot_no"
                                value={formData.layout_name_plot_no}
                                onChange={handleChange}
                                className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter layout name and plot number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Building Name</label>
                            <input
                                type="text"
                                name="building_name"
                                value={formData.building_name}
                                onChange={handleChange}
                                className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter building name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Address with Floor No</label>
                            <textarea
                                name="address_with_floor"
                                value={formData.address_with_floor}
                                onChange={handleChange}
                                rows="2"
                                className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter complete address including floor number"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Nearest Road Type</label>
                                <select
                                    name="nearest_road_type"
                                    value={formData.nearest_road_type}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">Select road type</option>
                                    <option value="National Highway">National Highway</option>
                                    <option value="State Highway">State Highway</option>
                                    <option value="District Road">District Road</option>
                                    <option value="Municipal Road">Municipal Road</option>
                                    <option value="Internal Road">Internal Road</option>
                                    <option value="Kachcha Road">Kachcha Road</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Pin Code</label>
                                <input
                                    type="text"
                                    name="pin_code"
                                    value={formData.pin_code}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="6-digit pin code"
                                    maxLength="6"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Property Type *</label>
                                <select
                                    name="property_type"
                                    value={formData.property_type}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="Residential">Residential</option>
                                    <option value="Commercial">Commercial</option>
                                    <option value="Industrial">Industrial</option>
                                    <option value="Mixed">Mixed Use</option>
                                    <option value="Agricultural">Agricultural</option>
                                    <option value="Vacant">Vacant Land</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Usage Type</label>
                                <input
                                    type="text"
                                    name="usage_type"
                                    value={formData.usage_type}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g., Shop, Office"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Usage Sub-Type</label>
                                <input
                                    type="text"
                                    name="usage_sub_type"
                                    value={formData.usage_sub_type}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g., Grocery, IT"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setActiveSection('owner')} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                ← Back
                            </button>
                            <button type="button" onClick={() => setActiveSection('construction')} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                                Next: Construction →
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== SECTION 3: CONSTRUCTION DETAILS ========== */}
                {activeSection === 'construction' && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="mr-2">🏗️</span> Construction Details
                        </h3>

                        <div className="space-y-3">
                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-blue-50">
                                <input
                                    type="checkbox"
                                    name="building_permission"
                                    checked={formData.building_permission}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-blue-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">Building Permission Obtained</span>
                            </label>

                            {formData.building_permission && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-4 border-blue-200">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Permission No</label>
                                        <input
                                            type="text"
                                            name="permission_no"
                                            value={formData.permission_no}
                                            onChange={handleChange}
                                            className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Enter permission number"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Permission</label>
                                        <input
                                            type="date"
                                            name="permission_date"
                                            value={formData.permission_date}
                                            onChange={handleChange}
                                            className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-green-50">
                                <input
                                    type="checkbox"
                                    name="occupancy_certificate"
                                    checked={formData.occupancy_certificate}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-green-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">Occupancy / Gunthewari Certificate</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Construction Type *</label>
                                <select
                                    name="construction_type"
                                    value={formData.construction_type}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="RCC">RCC (Reinforced Cement Concrete)</option>
                                    <option value="Load Bearing">Load Bearing</option>
                                    <option value="Steel Frame">Steel Frame</option>
                                    <option value="Kachcha">Kachcha</option>
                                    <option value="Semi-Pucca">Semi-Pucca</option>
                                    <option value="Pucca">Pucca</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Year of Construction *</label>
                                <input
                                    type="number"
                                    name="year_of_construction"
                                    value={formData.year_of_construction}
                                    onChange={handleChange}
                                    onBlur={handleFieldBlur}
                                    className={`w-full p-4 text-base border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${hasError('year_of_construction') ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                                    placeholder="e.g., 2010"
                                    min="1900"
                                    max={new Date().getFullYear()}
                                />
                                {getError('year_of_construction') && <p className="field-error text-sm text-red-600 mt-1">⚠️ {getError('year_of_construction')}</p>}
                            </div>
                        </div>

                        {/* Auto-calculated Construction Age */}
                        {formData.year_of_construction && (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-lg">
                                <p className="text-sm text-amber-800">
                                    <strong>Construction Age:</strong> {new Date().getFullYear() - parseInt(formData.year_of_construction)} years
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setActiveSection('location')} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                ← Back
                            </button>
                            <button type="button" onClick={() => setActiveSection('water')} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                                Next: Water Supply →
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== SECTION 4: WATER SUPPLY ========== */}
                {activeSection === 'water' && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="mr-2">💧</span> Water Supply
                        </h3>

                        <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-blue-50">
                            <input
                                type="checkbox"
                                name="water_connection"
                                checked={formData.water_connection}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 rounded"
                            />
                            <span className="text-gray-800 font-medium">Water Connection Available</span>
                        </label>

                        {formData.water_connection && (
                            <div className="space-y-4 pl-4 border-l-4 border-blue-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Connection Type</label>
                                        <select
                                            name="water_connection_type"
                                            value={formData.water_connection_type}
                                            onChange={handleChange}
                                            className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="">Select type</option>
                                            <option value="Municipal">Municipal</option>
                                            <option value="Borewell">Borewell</option>
                                            <option value="Well">Well</option>
                                            <option value="Tanker">Tanker</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Authorization Status</label>
                                        <select
                                            name="water_authorized"
                                            value={formData.water_authorized}
                                            onChange={handleChange}
                                            className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="Authorised">Authorised</option>
                                            <option value="Unauthorised">Unauthorised</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Water Meter No</label>
                                        <input
                                            type="text"
                                            name="water_meter_no"
                                            value={formData.water_meter_no}
                                            onChange={handleChange}
                                            className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Meter number"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Consumer No</label>
                                        <input
                                            type="text"
                                            name="water_consumer_no"
                                            value={formData.water_consumer_no}
                                            onChange={handleChange}
                                            className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Consumer number"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Connection</label>
                                        <input
                                            type="date"
                                            name="water_connection_date"
                                            value={formData.water_connection_date}
                                            onChange={handleChange}
                                            className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Pipe Size</label>
                                        <select
                                            name="pipe_size"
                                            value={formData.pipe_size}
                                            onChange={handleChange}
                                            className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="">Select size</option>
                                            <option value="0.5 inch">0.5 inch</option>
                                            <option value="0.75 inch">0.75 inch</option>
                                            <option value="1 inch">1 inch</option>
                                            <option value="1.5 inch">1.5 inch</option>
                                            <option value="2 inch">2 inch</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setActiveSection('construction')} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                ← Back
                            </button>
                            <button type="button" onClick={() => setActiveSection('sanitation')} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                                Next: Sanitation →
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== SECTION 5: SANITATION & UTILITIES ========== */}
                {activeSection === 'sanitation' && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="mr-2">🚽</span> Sanitation & Utilities
                        </h3>

                        {/* Sanitation */}
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-gray-700">Sanitation Facilities</p>

                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-blue-50">
                                <input
                                    type="checkbox"
                                    name="has_toilet"
                                    checked={formData.has_toilet}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-blue-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">🚽 Toilet Available</span>
                            </label>

                            {formData.has_toilet && (
                                <div className="pl-4 border-l-4 border-blue-200">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Toilets</label>
                                    <input
                                        type="number"
                                        name="toilet_count"
                                        value={formData.toilet_count}
                                        onChange={handleChange}
                                        className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Enter count"
                                        min="1"
                                    />
                                </div>
                            )}

                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-green-50">
                                <input
                                    type="checkbox"
                                    name="has_septic_tank"
                                    checked={formData.has_septic_tank}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-green-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">Septic Tank</span>
                            </label>

                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-green-50">
                                <input
                                    type="checkbox"
                                    name="has_sewerage"
                                    checked={formData.has_sewerage}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-green-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">Sewerage Connection</span>
                            </label>
                        </div>

                        {/* Utilities */}
                        <div className="space-y-3 pt-4 border-t">
                            <p className="text-sm font-semibold text-gray-700">Other Utilities</p>

                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-yellow-50">
                                <input
                                    type="checkbox"
                                    name="electricity_connection"
                                    checked={formData.electricity_connection}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-yellow-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">⚡ Electricity Connection</span>
                            </label>

                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-orange-50">
                                <input
                                    type="checkbox"
                                    name="has_solar"
                                    checked={formData.has_solar}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-orange-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">☀️ Solar Panels</span>
                            </label>

                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-cyan-50">
                                <input
                                    type="checkbox"
                                    name="has_rainwater_harvesting"
                                    checked={formData.has_rainwater_harvesting}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-cyan-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">🌧️ Rain Water Harvesting</span>
                            </label>

                            <label className="flex items-center space-x-3 p-4 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-green-50">
                                <input
                                    type="checkbox"
                                    name="tax_paid"
                                    checked={formData.tax_paid}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-green-600 rounded"
                                />
                                <span className="text-gray-800 font-medium">✅ Property Tax Paid (Current Year)</span>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setActiveSection('water')} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                ← Back
                            </button>
                            <button type="button" onClick={() => setActiveSection('assessment')} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                                Next: Assessment →
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== SECTION 6: ASSESSMENT DETAILS ========== */}
                {activeSection === 'assessment' && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="mr-2">📋</span> Assessment Details
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">ULB Name</label>
                                <input
                                    type="text"
                                    name="ulb_name"
                                    value={formData.ulb_name}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Urban Local Body"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">District</label>
                                <input
                                    type="text"
                                    name="district"
                                    value={formData.district}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter district"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Town</label>
                                <input
                                    type="text"
                                    name="town"
                                    value={formData.town}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Enter town"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Zone No</label>
                                <input
                                    type="text"
                                    name="zone_no"
                                    value={formData.zone_no}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Zone number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">New Ward No</label>
                                <input
                                    type="text"
                                    name="new_ward_no"
                                    value={formData.new_ward_no}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="New ward number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Old Ward No</label>
                                <input
                                    type="text"
                                    name="old_ward_no"
                                    value={formData.old_ward_no}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Old ward number"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Old Property No</label>
                                <input
                                    type="text"
                                    name="old_property_no"
                                    value={formData.old_property_no}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Old property number"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">New Property No</label>
                                <input
                                    type="text"
                                    name="new_property_no"
                                    value={formData.new_property_no}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="New property number"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Total Carpet Area (sq.m)</label>
                                <input
                                    type="number"
                                    name="total_carpet_area"
                                    value={formData.total_carpet_area}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Area in sq.m"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Exempted Area (sq.m)</label>
                                <input
                                    type="number"
                                    name="exempted_area"
                                    value={formData.exempted_area}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Exempted area"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Assessable Area (sq.m)</label>
                                <input
                                    type="number"
                                    name="assessable_area"
                                    value={formData.assessable_area}
                                    onChange={handleChange}
                                    className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Assessable area"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Current Tax Details</label>
                            <textarea
                                name="current_tax_details"
                                value={formData.current_tax_details}
                                onChange={handleChange}
                                rows="2"
                                className="w-full p-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Enter current tax details/amount"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setActiveSection('sanitation')} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                ← Back
                            </button>
                            <button type="button" onClick={() => setActiveSection('photos')} className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200">
                                Next: Photos →
                            </button>
                        </div>
                    </div>
                )}

                {/* ========== SECTION 7: PHOTOS ========== */}
                {activeSection === 'photos' && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                            <span className="mr-2">📷</span> Photos Documentation
                        </h3>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                            <p><strong>Required Photos as per Annexure-A:</strong></p>
                            <ul className="list-disc list-inside mt-1">
                                <li>1 Owner Photo (30mm × 30mm at 150 dpi)</li>
                                <li>2 Property Photos (100mm × 75mm at 150 dpi)</li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <CameraCapture
                                label="Owner Photo"
                                onCapture={(file) => setOwnerPhoto(file)}
                                currentPhoto={ownerPhoto}
                                required={true}
                            />

                            <CameraCapture
                                label="Building Photo 1 (Front View)"
                                onCapture={(file) => setBuildingPhoto(file)}
                                currentPhoto={buildingPhoto}
                                required={true}
                            />

                            <CameraCapture
                                label="Building Photo 2 (Side/Additional View)"
                                onCapture={(file) => setBuildingPhoto2(file)}
                                currentPhoto={buildingPhoto2}
                                required={false}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setActiveSection('assessment')} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                ← Back
                            </button>
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex space-x-4 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors text-base"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex-1 py-4 px-6 rounded-lg font-semibold text-white text-base transition-all ${loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                            }`}
                    >
                        {loading ? 'Submitting...' : '✓ Submit Assessment'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SurveyForm;



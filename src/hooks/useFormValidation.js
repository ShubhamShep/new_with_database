import { useState, useCallback } from 'react';

/**
 * Validation rules for survey form fields
 */
const validationRules = {
    owner_name: {
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z\s.'-]+$/,
        message: 'Please enter a valid name (letters, spaces, dots, hyphens only)',
    },
    phone_number: {
        required: true,
        pattern: /^[6-9]\d{9}$/,
        message: 'Please enter a valid 10-digit Indian mobile number (starting with 6-9)',
    },
    aadhaar_number: {
        required: false, // Made optional
        pattern: /^\d{12}$/,
        validate: (value) => {
            // Basic Aadhaar validation (12 digits, no starting with 0 or 1)
            if (!value || value.length === 0) return true; // Allow empty
            if (value.length !== 12) return false;
            if (value[0] === '0' || value[0] === '1') return false;
            return true;
        },
        message: 'Please enter a valid 12-digit Aadhaar number (cannot start with 0 or 1)',
    },
    year_of_construction: {
        required: false,
        validate: (value) => {
            if (!value) return true; // Optional field
            const year = parseInt(value);
            const currentYear = new Date().getFullYear();
            return year >= 1900 && year <= currentYear;
        },
        message: `Year must be between 1900 and ${new Date().getFullYear()}`,
    },
    property_usage: {
        required: false, // Made optional
        message: 'Please select a property usage type',
    },
    construction_type: {
        required: false, // Made optional
        message: 'Please select a construction type',
    },
    ownership_type: {
        required: false, // Made optional
        message: 'Please select ownership type',
    },
};

/**
 * Custom hook for form validation
 * @returns {Object} Validation state and methods
 */
export const useFormValidation = () => {
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    /**
     * Validate a single field
     */
    const validateField = useCallback((name, value) => {
        const rule = validationRules[name];
        if (!rule) return null;

        // Check required
        if (rule.required && (!value || value.toString().trim() === '')) {
            return `${formatFieldName(name)} is required`;
        }

        // Skip further validation if empty and not required
        if (!value || value.toString().trim() === '') {
            return null;
        }

        // Check pattern
        if (rule.pattern && !rule.pattern.test(value)) {
            return rule.message;
        }

        // Check min length
        if (rule.minLength && value.length < rule.minLength) {
            return `${formatFieldName(name)} must be at least ${rule.minLength} characters`;
        }

        // Check max length
        if (rule.maxLength && value.length > rule.maxLength) {
            return `${formatFieldName(name)} must be less than ${rule.maxLength} characters`;
        }

        // Custom validation
        if (rule.validate && !rule.validate(value)) {
            return rule.message;
        }

        return null;
    }, []);

    /**
     * Validate entire form
     */
    const validateForm = useCallback((formData) => {
        const newErrors = {};
        let isValid = true;

        Object.keys(validationRules).forEach((field) => {
            const error = validateField(field, formData[field]);
            if (error) {
                newErrors[field] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        // Mark all fields as touched
        const allTouched = {};
        Object.keys(validationRules).forEach((field) => {
            allTouched[field] = true;
        });
        setTouched(allTouched);

        return isValid;
    }, [validateField]);

    /**
     * Handle field blur - validate single field
     */
    const handleBlur = useCallback((name, value) => {
        setTouched((prev) => ({ ...prev, [name]: true }));
        const error = validateField(name, value);
        setErrors((prev) => ({
            ...prev,
            [name]: error,
        }));
    }, [validateField]);

    /**
     * Clear error for a field (on focus)
     */
    const clearError = useCallback((name) => {
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[name];
            return newErrors;
        });
    }, []);

    /**
     * Reset all validation state
     */
    const resetValidation = useCallback(() => {
        setErrors({});
        setTouched({});
    }, []);

    /**
     * Check if field has error and was touched
     */
    const hasError = useCallback((name) => {
        return touched[name] && errors[name];
    }, [touched, errors]);

    /**
     * Get error message for field
     */
    const getError = useCallback((name) => {
        return touched[name] ? errors[name] : null;
    }, [touched, errors]);

    return {
        errors,
        touched,
        validateField,
        validateForm,
        handleBlur,
        clearError,
        resetValidation,
        hasError,
        getError,
    };
};

/**
 * Format field name for display
 */
const formatFieldName = (name) => {
    return name
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default useFormValidation;

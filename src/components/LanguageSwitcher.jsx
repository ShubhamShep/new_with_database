import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', nativeName: 'हिंदी' },
    { code: 'mr', name: 'Marathi', flag: '🇮🇳', nativeName: 'मराठी' }
];

const LanguageSwitcher = ({ variant = 'dropdown' }) => {
    const { i18n, t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode);
        localStorage.setItem('preferredLanguage', langCode);
        setIsOpen(false);
    };

    // Compact variant for mobile
    if (variant === 'compact') {
        return (
            <div className="flex gap-1">
                {languages.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${i18n.language === lang.code
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        title={lang.name}
                    >
                        {lang.code.toUpperCase()}
                    </button>
                ))}
            </div>
        );
    }

    // Full dropdown variant
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all"
            >
                <span className="text-lg">{currentLanguage.flag}</span>
                <span className="text-sm font-medium text-gray-700">{currentLanguage.nativeName}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-fadeIn">
                    <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        {t('language.select')}
                    </p>
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i18n.language === lang.code
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'hover:bg-gray-50 text-gray-700'
                                }`}
                        >
                            <span className="text-xl">{lang.flag}</span>
                            <div>
                                <p className="font-medium">{lang.nativeName}</p>
                                <p className="text-xs text-gray-400">{lang.name}</p>
                            </div>
                            {i18n.language === lang.code && (
                                <svg className="w-5 h-5 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageSwitcher;

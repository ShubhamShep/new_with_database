import React, { useEffect, useState } from 'react';

const SuccessModal = ({ isOpen, onClose, surveyData, onNewSurvey }) => {
    const [showConfetti, setShowConfetti] = useState(false);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Trigger haptic feedback on mobile
            if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
            }

            // Animation sequence
            setTimeout(() => setShowConfetti(true), 100);
            setTimeout(() => setShowContent(true), 300);
        } else {
            setShowConfetti(false);
            setShowContent(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Confetti Animation */}
            {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][Math.floor(Math.random() * 5)],
                                width: `${8 + Math.random() * 8}px`,
                                height: `${8 + Math.random() * 8}px`,
                                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Modal Content */}
            <div
                className={`relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                    }`}
            >
                {/* Success Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-bounce-in">
                        <svg className="w-14 h-14 text-green-500 animate-checkmark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                                className="animate-draw-check"
                            />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                    Survey Submitted!
                </h2>
                <p className="text-gray-500 text-center mb-6">
                    Property assessment has been recorded successfully
                </p>

                {/* Survey Summary */}
                {surveyData && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Building ID</span>
                            <span className="font-medium text-gray-900">{surveyData.buildingId}</span>
                        </div>
                        {surveyData.area && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Area</span>
                                <span className="font-medium text-gray-900">{surveyData.area} m²</span>
                            </div>
                        )}
                        {surveyData.floor && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Floor/Unit</span>
                                <span className="font-medium text-gray-900">{surveyData.floor}</span>
                            </div>
                        )}
                        {surveyData.ownerName && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Owner</span>
                                <span className="font-medium text-gray-900">{surveyData.ownerName}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onNewSurvey}
                        className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                    >
                        New Survey
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                    >
                        View Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;

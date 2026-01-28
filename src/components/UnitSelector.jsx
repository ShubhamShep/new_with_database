import React, { useState } from 'react';

const UnitSelector = ({ floorNumber, onConfirm, onSkip }) => {
    const [unitsCount, setUnitsCount] = useState(1);
    const [customUnits, setCustomUnits] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    const handleConfirm = () => {
        const units = useCustom ? parseInt(customUnits) : unitsCount;
        if (units && units > 0 && units <= 20) {
            onConfirm(units);
        } else {
            alert('Please enter a valid number of units (1-20)');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8">
            <div className="text-center mb-6">
                <div className="text-4xl sm:text-5xl mb-3">🚪</div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Floor {floorNumber}</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-2">How many units/flats on this floor?</p>
            </div>

            {/* Quick Select Buttons */}
            {!useCustom && (
                <div className="space-y-3 mb-5">
                    <p className="text-sm font-semibold text-gray-700 text-center">Quick Select</p>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <button
                                key={num}
                                onClick={() => setUnitsCount(num)}
                                className={`p-3 sm:p-4 rounded-lg border-2 font-bold text-base sm:text-lg transition-all ${unitsCount === num && !useCustom
                                    ? 'border-green-600 bg-green-50 text-green-700'
                                    : 'border-gray-300 hover:border-green-400 text-gray-700'
                                    }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Input */}
            <div className="mb-5">
                <label className="flex items-center space-x-2 sm:space-x-3 mb-3">
                    <input
                        type="checkbox"
                        checked={useCustom}
                        onChange={(e) => setUseCustom(e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 rounded"
                    />
                    <span className="text-sm sm:text-base font-medium text-gray-700">Custom number of units</span>
                </label>

                {useCustom && (
                    <input
                        type="number"
                        inputMode="numeric"
                        value={customUnits}
                        onChange={(e) => setCustomUnits(e.target.value)}
                        placeholder="Enter number (1-20)"
                        min="1"
                        max="20"
                        className="w-full p-3 sm:p-4 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-center text-lg sm:text-xl font-bold"
                    />
                )}
            </div>

            {/* Info Box */}
            <div className="bg-green-50 border-l-4 border-green-600 p-3 sm:p-4 rounded mb-5">
                <p className="text-xs sm:text-sm text-green-900">
                    <strong>Note:</strong> Each unit will have a separate form for owner details
                    (e.g., Unit A, Unit B, or Flat 1, Flat 2).
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3 sm:gap-0">
                <button
                    onClick={() => onSkip()}
                    className="sm:flex-1 py-3 sm:py-4 px-4 sm:px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors text-base"
                >
                    Single Owner (Skip)
                </button>
                <button
                    onClick={handleConfirm}
                    className="sm:flex-1 py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold shadow-lg transition-all hover:scale-105 text-base"
                >
                    Continue →
                </button>
            </div>
        </div>
    );
};

export default UnitSelector;

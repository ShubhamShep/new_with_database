import React, { useState } from 'react';

const FloorSelector = ({ onConfirm, onCancel }) => {
    const [totalFloors, setTotalFloors] = useState(1);
    const [customFloors, setCustomFloors] = useState('');
    const [useCustom, setUseCustom] = useState(false);

    const handleConfirm = () => {
        const floors = useCustom ? parseInt(customFloors) : totalFloors;
        if (floors && floors > 0 && floors <= 50) {
            onConfirm(floors);
        } else {
            alert('Please enter a valid number of floors (1-50)');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8">
            <div className="text-center mb-6">
                <div className="text-5xl mb-4">🏢</div>
                <h2 className="text-2xl font-bold text-gray-900">Building Footprint Captured</h2>
                <p className="text-gray-600 mt-2">How many floors or units does this building have?</p>
            </div>

            {/* Quick Select Buttons */}
            {!useCustom && (
                <div className="space-y-4 mb-6">
                    <p className="text-sm font-semibold text-gray-700 text-center">Quick Select</p>
                    <div className="grid grid-cols-5 gap-3">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <button
                                key={num}
                                onClick={() => setTotalFloors(num)}
                                className={`p-4 rounded-lg border-2 font-bold text-lg transition-all ${totalFloors === num && !useCustom
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 hover:border-blue-400 text-gray-700'
                                    }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Input */}
            <div className="mb-6">
                <label className="flex items-center space-x-3 mb-3">
                    <input
                        type="checkbox"
                        checked={useCustom}
                        onChange={(e) => setUseCustom(e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="font-medium text-gray-700">Custom number of floors</span>
                </label>

                {useCustom && (
                    <input
                        type="number"
                        value={customFloors}
                        onChange={(e) => setCustomFloors(e.target.value)}
                        placeholder="Enter number (1-50)"
                        min="1"
                        max="50"
                        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center text-xl font-bold"
                    />
                )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded mb-6">
                <p className="text-sm text-blue-900">
                    <strong>Note:</strong> You'll fill out a separate assessment form for each floor/unit,
                    allowing different owners and property details per floor.
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConfirm}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg transition-all hover:scale-105"
                >
                    Continue →
                </button>
            </div>
        </div>
    );
};

export default FloorSelector;

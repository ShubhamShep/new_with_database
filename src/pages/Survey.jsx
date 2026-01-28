import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapComponent from '../components/MapComponent';
import FloorSelector from '../components/FloorSelector';
import UnitSelector from '../components/UnitSelector';
import SurveyForm from '../components/SurveyForm';
import SuccessModal from '../components/SuccessModal';
import { useToast } from '../components/Toast';

const Survey = () => {
    const navigate = useNavigate();
    const toast = useToast();

    const [selectedBuilding, setSelectedBuilding] = useState(null);
    const [showFloorSelector, setShowFloorSelector] = useState(false);
    const [showUnitSelector, setShowUnitSelector] = useState(false);

    // Floor and unit tracking
    const [totalFloors, setTotalFloors] = useState(1);
    const [currentFloor, setCurrentFloor] = useState(1);
    const [floorUnitsConfig, setFloorUnitsConfig] = useState({}); // {1: 3, 2: 2} = floor 1 has 3 units, floor 2 has 2 units
    const [currentUnit, setCurrentUnit] = useState(1);

    const [showForm, setShowForm] = useState(false);
    const [completedSurveys, setCompletedSurveys] = useState([]); // [{floor: 1, unit: 1}, {floor: 1, unit: 2}]

    // Success Modal
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastSurveyData, setLastSurveyData] = useState(null);

    const handleBuildingSelect = (building) => {
        setSelectedBuilding(building);
        setShowFloorSelector(true);
        toast.info('Building selected! Now select number of floors.');
    };

    const handleFloorConfirm = (floors) => {
        setTotalFloors(floors);
        setCurrentFloor(1);
        setShowFloorSelector(false);
        setShowUnitSelector(true); // Ask for units on first floor
    };

    const handleFloorCancel = () => {
        setShowFloorSelector(false);
        setSelectedBuilding(null);
    };

    const handleUnitConfirm = (units) => {
        // Save units count for current floor
        setFloorUnitsConfig(prev => ({
            ...prev,
            [currentFloor]: units
        }));
        setCurrentUnit(1);
        setShowUnitSelector(false);
        setShowForm(true);
    };

    const handleUnitSkip = () => {
        // Single owner for this floor (1 unit)
        setFloorUnitsConfig(prev => ({
            ...prev,
            [currentFloor]: 1
        }));
        setCurrentUnit(1);
        setShowUnitSelector(false);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setShowUnitSelector(false);
        setSelectedBuilding(null);
        setCurrentFloor(1);
        setCurrentUnit(1);
        setFloorUnitsConfig({});
        setCompletedSurveys([]);
    };

    const handleFormSuccess = (formData) => {
        // Mark current survey as complete
        const newCompleted = [...completedSurveys, { floor: currentFloor, unit: currentUnit }];
        setCompletedSurveys(newCompleted);

        const currentFloorUnits = floorUnitsConfig[currentFloor] || 1;

        if (currentUnit < currentFloorUnits) {
            // More units on current floor
            setCurrentUnit(currentUnit + 1);
            toast.success(`Unit ${currentUnit} completed! Moving to next unit.`);
        } else if (currentFloor < totalFloors) {
            // Move to next floor
            setCurrentFloor(currentFloor + 1);
            setCurrentUnit(1);
            setShowForm(false);
            setShowUnitSelector(true); // Ask units for next floor
            toast.success(`Floor ${currentFloor} completed! Moving to next floor.`);
        } else {
            // All floors and units completed - Show success modal
            setShowForm(false);
            setLastSurveyData({
                buildingId: selectedBuilding?.id,
                area: selectedBuilding?.area,
                floor: getUnitIdentifier(currentFloor, currentUnit, currentFloorUnits),
                ownerName: formData?.owner_name,
                totalSurveys: newCompleted.length,
                totalFloors: totalFloors
            });
            setShowSuccessModal(true);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        handleFormClose();
        navigate('/dashboard');
    };

    const handleNewSurvey = () => {
        setShowSuccessModal(false);
        handleFormClose();
        toast.info('Ready for new survey! Draw on the map to begin.');
    };

    // Calculate total expected surveys
    const getTotalExpectedSurveys = () => {
        return Object.values(floorUnitsConfig).reduce((sum, units) => sum + units, 0);
    };

    // Generate unit identifier
    const getUnitIdentifier = (floor, unit, totalUnits) => {
        if (totalUnits === 1) {
            return `Floor ${floor}`;
        }
        // Use letters for units: A, B, C, etc.
        const letter = String.fromCharCode(64 + unit); // 65=A, 66=B, etc.
        return `${floor}${letter}`;
    };

    return (
        <div className="relative h-full">
            {/* Map fills the entire space */}
            <MapComponent onBuildingSelect={handleBuildingSelect} />

            {/* Floor Selector Modal */}
            {showFloorSelector && selectedBuilding && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
                    <FloorSelector
                        onConfirm={handleFloorConfirm}
                        onCancel={handleFloorCancel}
                    />
                </div>
            )}

            {/* Unit Selector Modal */}
            {showUnitSelector && selectedBuilding && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm">
                    <UnitSelector
                        floorNumber={currentFloor}
                        onConfirm={handleUnitConfirm}
                        onSkip={handleUnitSkip}
                    />
                </div>
            )}

            {/* Survey Form Modal */}
            {showForm && selectedBuilding && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="relative max-w-3xl w-full my-4">
                        {/* Progress Bar */}
                        {getTotalExpectedSurveys() > 1 && (
                            <div className="bg-white rounded-t-xl p-3 sm:p-4 shadow-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs sm:text-sm font-semibold text-gray-700">
                                        Floor {currentFloor} - Unit {currentUnit}/{floorUnitsConfig[currentFloor] || 1}
                                    </span>
                                    <span className="text-xs sm:text-sm text-gray-600">
                                        {completedSurveys.length}/{getTotalExpectedSurveys()} completed
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(completedSurveys.length / getTotalExpectedSurveys()) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Survey Form */}
                        <SurveyForm
                            buildingData={selectedBuilding}
                            floorNumber={currentFloor}
                            totalFloors={totalFloors}
                            unitIdentifier={getUnitIdentifier(currentFloor, currentUnit, floorUnitsConfig[currentFloor] || 1)}
                            onClose={handleFormClose}
                            onSuccess={handleFormSuccess}
                        />
                    </div>
                </div>
            )}

            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessClose}
                surveyData={lastSurveyData}
                onNewSurvey={handleNewSurvey}
            />
        </div>
    );
};

export default Survey;

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import Login from './components/Login';
import MapComponent from './components/MapComponent';
import SurveyForm from './components/SurveyForm';

function App() {
  const [session, setSession] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Map Section - Mobile: Hidden when form is active (optional), Desktop: 50% or 60% */}
      <div className={`${selectedBuilding ? 'hidden md:block' : 'block'} w-full md:w-3/5 h-full relative`}>
        <MapComponent onBuildingSelect={setSelectedBuilding} />

        {/* Logout Button Overlay */}
        <button
          onClick={() => supabase.auth.signOut()}
          className="absolute top-4 right-4 z-[1000] bg-white text-red-600 px-4 py-2 rounded shadow-lg font-bold"
        >
          Logout
        </button>
      </div>

      {/* Form Section */}
      <div className={`${selectedBuilding ? 'block' : 'hidden md:block'} w-full md:w-2/5 h-full bg-white overflow-y-auto border-l border-gray-200 shadow-xl z-10`}>
        {selectedBuilding ? (
          <SurveyForm building={selectedBuilding} onBack={() => setSelectedBuilding(null)} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 flex-col p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Ready to Survey</h2>
            <p>Select a building on the map to start a property assessment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

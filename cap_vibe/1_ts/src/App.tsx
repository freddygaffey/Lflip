import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { BleProvider } from './context/BleContext';
import { TripProvider } from './context/TripContext';
import { TabBar } from './components/TabBar';
import { Dashboard } from './pages/Dashboard';
import { StartTrip } from './pages/StartTrip';
import { ActiveTrip } from './pages/ActiveTrip';
import { StopTrip } from './pages/StopTrip';
import { TripHistory } from './pages/TripHistory';
import { TripDetail } from './pages/TripDetail';
import { Supervisors } from './pages/Supervisors';
import { DeviceManagement } from './pages/DeviceManagement';
import { Settings } from './pages/Settings';
import { SyncStatus } from './pages/SyncStatus';

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <BleProvider>
          <TripProvider>
            <div className="app-shell">
              <div className="page-content">
                <Routes>
                  <Route path="/"             element={<Dashboard />} />
                  <Route path="/start"         element={<StartTrip />} />
                  <Route path="/active"        element={<ActiveTrip />} />
                  <Route path="/stop"          element={<StopTrip />} />
                  <Route path="/history"       element={<TripHistory />} />
                  <Route path="/trips/:id"     element={<TripDetail />} />
                  <Route path="/supervisors"   element={<Supervisors />} />
                  <Route path="/device"        element={<DeviceManagement />} />
                  <Route path="/settings"      element={<Settings />} />
                  <Route path="/sync"          element={<SyncStatus />} />
                </Routes>
              </div>
              <TabBar />
            </div>
          </TripProvider>
        </BleProvider>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

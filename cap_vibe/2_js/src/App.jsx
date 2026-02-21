import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { BleProvider } from './context/BleContext.jsx';
import { TripProvider } from './context/TripContext.jsx';
import { TabBar } from './components/TabBar.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { StartTrip } from './pages/StartTrip.jsx';
import { ActiveTrip } from './pages/ActiveTrip.jsx';
import { StopTrip } from './pages/StopTrip.jsx';
import { TripHistory } from './pages/TripHistory.jsx';
import { TripDetail } from './pages/TripDetail.jsx';
import { Supervisors } from './pages/Supervisors.jsx';
import { CarManagement } from './pages/CarManagement.jsx';
import { Settings } from './pages/Settings.jsx';
import { SyncStatus } from './pages/SyncStatus.jsx';

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
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/start" element={<StartTrip />} />
                    <Route path="/active" element={<ActiveTrip />} />
                    <Route path="/stop" element={<StopTrip />} />
                    <Route path="/history" element={<TripHistory />} />
                    <Route path="/trips/:id" element={<TripDetail />} />
                    <Route path="/supervisors" element={<Supervisors />} />
                    <Route path="/car" element={<CarManagement />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/sync" element={<SyncStatus />} />
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

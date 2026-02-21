import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { BleProvider } from './context/BleContext.jsx';
import { CarsProvider } from './context/CarsContext.jsx';
import { SupervisorsProvider } from './context/SupervisorsContext.jsx';
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
import { ManualLogTrip } from './pages/ManualLogTrip.jsx';
import { ParentApprovals } from './pages/ParentApprovals.jsx';
import { PairWithParent } from './pages/PairWithParent.jsx';
import { ScanToPair } from './pages/ScanToPair.jsx';
import { Login } from './pages/Login.jsx';
import { AutoSync } from './components/AutoSync.jsx';
import { useAuth } from './context/AuthContext.jsx';

function AppRoutes() {
  const { user, restoring } = useAuth();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (restoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-slate-600 dark:text-slate-400">Loading…</div>
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return <Navigate to="/login" replace />;
  }

  if (user && isLoginPage) {
    return <Navigate to="/" replace />;
  }

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <>
      <AutoSync />
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
            <Route path="/manual-log" element={<ManualLogTrip />} />
            <Route path="/approvals" element={<ParentApprovals />} />
            <Route path="/pair" element={<PairWithParent />} />
            <Route path="/scan-pair" element={<ScanToPair />} />
          </Routes>
        </div>
        <TabBar />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <BleProvider>
            <CarsProvider>
            <SupervisorsProvider>
            <TripProvider>
              <AppRoutes />
            </TripProvider>
            </SupervisorsProvider>
            </CarsProvider>
          </BleProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

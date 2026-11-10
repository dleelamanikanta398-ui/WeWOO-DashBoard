import React, { useState } from 'react';
import { HospitalProvider, useHospital } from './context/HospitalContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { DemoBanner } from './components/layout/DemoBanner';
import { LoginPage } from './components/auth/LoginPage';
import { HospitalRegistrationPage } from './components/auth/HospitalRegistrationPage';
import { PendingVerificationView } from './components/auth/PendingVerificationView';
import { CommandCenterView } from './components/command/CommandCenterView';
import { EmergenciesView } from './components/emergencies/EmergenciesView';
import { LiveTrackingView } from './components/tracking/LiveTrackingView';
import { ResourceManagementView } from './components/resources/ResourceManagementView';
import { HospitalDetailsView } from './components/hospital/HospitalDetailsView';
import { HospitalSpecialitiesView } from './components/specialities/HospitalSpecialitiesView';
import { PreparationView } from './components/preparation/PreparationView';
import { EmergencyHistoryView } from './components/history/EmergencyHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { DriverAppView } from './components/driver/DriverAppView';
import { PatientAppView } from './components/patient/PatientAppView';
import { AlertCircle, ArrowRight } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const {
    isAuthenticated,
    activeTab,
    setActiveTab,
    verificationStatus,
    registeredProfile,
    isDemoMode,
  } = useHospital();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Unauthenticated routing: login or registration
  if (!isAuthenticated) {
    if (activeTab === 'register') {
      return <HospitalRegistrationPage />;
    }
    return <LoginPage />;
  }

  // Account awaiting approval: Show pending verification screen
  if (verificationStatus === 'pendingVerification') {
    return <PendingVerificationView />;
  }

  // Profile completion status check for live mode
  const isProfileIncomplete =
    !isDemoMode &&
    registeredProfile !== null &&
    !registeredProfile.isProfileCompleted &&
    !registeredProfile.hospitalName;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070b19] text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Persistent Left Sidebar */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Sticky Top Header */}
        <TopBar onOpenMobile={() => setMobileMenuOpen(true)} />

        {/* Demonstration Mode Status Banner */}
        <DemoBanner />

        {/* Incomplete Hospital Profile Prompt Banner */}
        {isProfileIncomplete && activeTab !== 'details' && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border-b border-amber-300 dark:border-amber-800/80 px-4 py-3 sm:px-6 animate-in fade-in">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>Hospital Details Incomplete:</strong> Your administrator account is active, but hospital credentials, location, and emergency capabilities have not been completed yet.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Complete Hospital Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic View Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'command' && <CommandCenterView />}
          {activeTab === 'emergencies' && <EmergenciesView />}
          {activeTab === 'tracking' && <LiveTrackingView />}
          {activeTab === 'resources' && <ResourceManagementView />}
          {activeTab === 'details' && <HospitalDetailsView />}
          {activeTab === 'specialities' && <HospitalSpecialitiesView />}
          {activeTab === 'preparation' && <PreparationView />}
          {activeTab === 'history' && <EmergencyHistoryView />}
          {activeTab === 'driver-app' && <DriverAppView />}
          {activeTab === 'patient-app' && <PatientAppView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <HospitalProvider>
      <DashboardContent />
    </HospitalProvider>
  );
}

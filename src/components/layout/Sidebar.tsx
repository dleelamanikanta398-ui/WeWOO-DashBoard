import {
  Activity,
  AlertCircle,
  Building2,
  Clock,
  Compass,
  FileCheck2,
  Layers,
  Settings,
  ShieldAlert,
  Stethoscope,
  X,
  Navigation,
  HeartPulse,
} from 'lucide-react';
import { NavigationTab, useHospital } from '../../context/HospitalContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
  const { activeTab, setActiveTab, emergencies, readiness, hospitalProfile } = useHospital();

  const activeEmergencyCount = emergencies.filter(
    (e) => e.journeyStatus !== 'Handover Completed' && e.hospitalAcceptanceStatus !== 'Declined'
  ).length;

  const criticalCount = emergencies.filter(
    (e) => e.priority === 'P1' && e.journeyStatus !== 'Handover Completed' && e.hospitalAcceptanceStatus !== 'Declined'
  ).length;

  const navItems: { id: NavigationTab; label: string; icon: React.ElementType; badge?: number; badgeColor?: string }[] = [
    { id: 'command', label: 'Command Center', icon: Activity },
    {
      id: 'emergencies',
      label: 'Incoming Emergencies',
      icon: AlertCircle,
      badge: activeEmergencyCount,
      badgeColor: criticalCount > 0 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white',
    },
    { id: 'tracking', label: 'Live Ambulance Tracking', icon: Compass },
    { id: 'resources', label: 'Hospital Resources', icon: Layers },
    { id: 'details', label: 'Hospital Details & Location', icon: Building2 },
    { id: 'specialities', label: 'Specialities & Capabilities', icon: Stethoscope },
    { id: 'preparation', label: 'Emergency Preparation', icon: FileCheck2 },
    { id: 'history', label: 'Emergency History', icon: Clock },
    { id: 'driver-app', label: 'Driver App (Navigation)', icon: Navigation },
    { id: 'patient-app', label: 'Patient App (Portal)', icon: HeartPulse },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: NavigationTab) => {
    setActiveTab(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0b1329] border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-lg shadow-rose-900/40">
                <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold tracking-wider text-white text-base">WEWOO</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.2 rounded">
                    Command
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium truncate max-w-[170px]">
                  Emergency Coordination
                </div>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Hospital Identity Mini-Header */}
          <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-800/60">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Assigned Facility
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
              {hospitalProfile.name}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
              {hospitalProfile.traumaLevel}
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Readiness Mini-Card */}
        <div className="p-4 border-t border-slate-800/80 bg-[#090f20]">
          <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Readiness Score</span>
              {readiness && typeof readiness.score === 'number' ? (
                <span
                  className={`font-mono font-bold ${
                    readiness.score >= 70
                      ? 'text-emerald-400'
                      : readiness.score >= 50
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {readiness.score} / 100
                </span>
              ) : (
                <span className="font-mono text-[11px] text-amber-400 font-medium">
                  Awaiting Data
                </span>
              )}
            </div>

            {/* Progress Bar or Empty State */}
            {readiness && typeof readiness.score === 'number' ? (
              <>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      readiness.score >= 70
                        ? 'bg-emerald-500'
                        : readiness.score >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${readiness.score}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-[10px]">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`font-semibold ${
                      readiness.status === 'Optimal'
                        ? 'text-emerald-400'
                        : readiness.status === 'Adequate'
                        ? 'text-blue-400'
                        : readiness.status === 'Constrained'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {readiness.status}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800/60 mt-1">
                Insufficient data to calculate readiness.
              </div>
            )}
            <div className="text-[9px] text-slate-500 mt-1.5 italic">
              *Prototype estimate model
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

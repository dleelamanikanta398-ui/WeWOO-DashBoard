import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Menu,
  Moon,
  Radio,
  Sun,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  User,
  LogOut,
  AlertTriangle,
  Flame,
  ShieldAlert,
  MapPin,
  Activity,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { AppSyncMonitorModal } from '../common/AppSyncMonitorModal';

interface TopBarProps {
  onOpenMobile: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobile }) => {
  const {
    hospitalProfile,
    officialLocation,
    connectionStatus,
    connectionError,
    isDemoMode,
    unreadNotificationCount,
    notifications,
    markNotificationsRead,
    setSelectedEmergencyId,
    setActiveTab,
    settings,
    toggleSound,
    toggleTheme,
    theme,
    currentUser,
    logout,
    reconnectBackend,
  } = useHospital();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showNotifMenu, setShowNotifMenu] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Live ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (emergencyId?: string) => {
    if (emergencyId) {
      setSelectedEmergencyId(emergencyId);
      setActiveTab('emergencies');
    }
    setShowNotifMenu(false);
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#0b1329]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 flex items-center justify-between transition-colors">
      {/* Left side: Hamburger & Hospital Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          type="button"
          className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                {hospitalProfile.name}
              </h1>
              <span className="hidden md:inline-block text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                · Command Center
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono">{currentDate}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{currentTime} UTC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Telemetry status, alerts, sound, theme toggle, user */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Centralized Hospital Location Pill */}
        <button
          type="button"
          onClick={() => setShowSyncModal(true)}
          title="Audit 3-Way Realtime Sync across Hospital Dashboard, Driver App, and Patient App"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
        >
          <MapPin className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span className="font-semibold">{officialLocation?.city || 'Hyderabad'}, {officialLocation?.state ? 'TS' : 'Telangana'}</span>
          {officialLocation?.locationVerified && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Verified Location" />
          )}
          <span className="text-[10px] uppercase font-bold px-1 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 ml-0.5">Sync</span>
        </button>

        {/* Connection Status Pill */}
        <button
          onClick={() => {
            if (connectionStatus === 'AUTHENTICATION REQUIRED' || connectionStatus === 'AUTH REQUIRED' || connectionStatus === 'TOKEN EXPIRED') {
              setActiveTab('login');
            } else if (connectionStatus !== 'FIREBASE CONNECTED' && connectionStatus !== 'Connected' && connectionStatus !== 'BACKEND ONLINE' && !isDemoMode) {
              reconnectBackend();
            }
          }}
          type="button"
          title={connectionError || `Status: ${connectionStatus}. Click to test & reconnect.`}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
            connectionStatus === 'FIREBASE CONNECTED' || connectionStatus === 'Connected' || connectionStatus === 'BACKEND ONLINE'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 cursor-default'
              : connectionStatus === 'AUTHENTICATION REQUIRED' || connectionStatus === 'AUTH REQUIRED' || connectionStatus === 'TOKEN EXPIRED'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60'
              : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          {isDemoMode ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-700 dark:text-amber-300 font-mono text-[11px] font-semibold">
                DEMO MODE
              </span>
            </>
          ) : connectionStatus === 'FIREBASE CONNECTED' || connectionStatus === 'Connected' || connectionStatus === 'BACKEND ONLINE' ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-semibold">
                FIREBASE CONNECTED
              </span>
            </>
          ) : connectionStatus === 'FIREBASE RECONNECTING' || connectionStatus === 'RECONNECTING' || connectionStatus === 'CONNECTING' || connectionStatus === 'Connecting' ? (
            <>
              <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-amber-700 dark:text-amber-400 font-mono text-[11px] font-semibold">
                FIREBASE RECONNECTING
              </span>
            </>
          ) : connectionStatus === 'DATABASE PERMISSION DENIED' || connectionStatus === 'Permission Denied' ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span className="text-rose-600 dark:text-rose-400 font-mono text-[11px] font-semibold">
                DATABASE PERMISSION DENIED
              </span>
            </>
          ) : connectionStatus === 'AUTHENTICATION REQUIRED' || connectionStatus === 'AUTH REQUIRED' || connectionStatus === 'TOKEN EXPIRED' ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span className="text-amber-700 dark:text-amber-300 font-mono text-[11px] font-semibold">
                AUTH REQUIRED (LOG IN)
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span className="text-rose-600 dark:text-rose-400 font-mono text-[11px] font-semibold">
                FIREBASE DISCONNECTED
              </span>
            </>
          )}
        </button>

        {/* Sound Alerts Toggle */}
        <button
          onClick={toggleSound}
          type="button"
          title={settings.soundAlertsEnabled ? 'Sound alerts active' : 'Sound alerts muted'}
          className={`p-2 rounded-lg border transition-colors cursor-pointer ${
            settings.soundAlertsEnabled
              ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              : 'bg-rose-50 dark:bg-slate-900 border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400'
          }`}
          aria-label="Toggle sound alerts"
        >
          {settings.soundAlertsEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          )}
        </button>

        {/* Full Working Light / Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          type="button"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg border bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer flex items-center justify-center group"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform group-hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 transition-transform group-hover:-rotate-12" />
          )}
        </button>

        {/* Notifications Bell & Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              if (!showNotifMenu && unreadNotificationCount > 0) {
                markNotificationsRead();
              }
            }}
            type="button"
            className="relative p-2 rounded-lg border bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold flex items-center justify-center animate-bounce">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Emergency Broadcasts
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={markNotificationsRead}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 mt-1">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No active emergency alerts recorded.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n.emergencyId)}
                      className={`py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors ${
                        !n.read ? 'bg-rose-50/50 dark:bg-slate-800/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {n.priority === 'P1' ? (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          ) : n.priority === 'P2' ? (
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {n.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {n.time}
                        </span>
                      </div>
                      {n.details && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-3.5">
                          {n.details}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            type="button"
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg border bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-850 transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {currentUser?.displayName?.[0] || 'S'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 dark:text-white leading-tight truncate max-w-[110px]">
                {currentUser?.displayName || 'Staff Member'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[110px]">
                {currentUser?.role || 'Emergency Staff'}
              </div>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser?.displayName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {currentUser?.email}
                </div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                  Role: {currentUser?.role}
                </div>
              </div>

              <div className="px-3 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 mb-1">
                Facility ID: <span className="font-mono text-slate-700 dark:text-slate-300">{hospitalProfile.hospitalId}</span>
              </div>

              <button
                onClick={() => {
                  logout();
                  setShowProfileMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Command Center</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3-Way Realtime Sync Auditor Modal */}
      <AppSyncMonitorModal isOpen={showSyncModal} onClose={() => setShowSyncModal(false)} />
    </header>
  );
};

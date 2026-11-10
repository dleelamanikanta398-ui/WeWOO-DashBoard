import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Stethoscope,
  ShieldCheck,
  Clock,
  RotateCcw,
  Hospital,
  Info,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import {
  STANDARD_SPECIALITIES,
  STANDARD_EMERGENCY_CAPABILITIES,
} from '../../types/emergency';

export const HospitalSpecialitiesView: React.FC = () => {
  const {
    hospitalProfile,
    registeredProfile,
    updateSpecialitiesAndCapabilities,
    currentUser,
  } = useHospital();

  const initialSpecialities =
    registeredProfile?.specialities || [
      'Trauma and Emergency Medicine',
      'Cardiology',
      'General Surgery',
      'Pediatrics',
    ];

  const initialCapabilities =
    registeredProfile?.emergencyCapabilities || [
      '24/7 Emergency Department',
      'ICU',
      'Cardiac Emergency Care',
      'Ambulance Receiving Availability',
    ];

  const [specialities, setSpecialities] = useState<string[]>(initialSpecialities);
  const [capabilities, setCapabilities] = useState<string[]>(initialCapabilities);
  const [customSpecialityInput, setCustomSpecialityInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (registeredProfile) {
      if (registeredProfile.specialities) setSpecialities(registeredProfile.specialities);
      if (registeredProfile.emergencyCapabilities) setCapabilities(registeredProfile.emergencyCapabilities);
    }
  }, [registeredProfile]);

  const toggleSpeciality = (item: string) => {
    setSpecialities((prev) =>
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  const addCustomSpeciality = () => {
    const val = customSpecialityInput.trim();
    if (!val) return;
    if (!specialities.includes(val)) {
      setSpecialities((prev) => [...prev, val]);
    }
    setCustomSpecialityInput('');
  };

  const removeSpeciality = (item: string) => {
    setSpecialities((prev) => prev.filter((s) => s !== item));
  };

  const toggleCapability = (item: string) => {
    setCapabilities((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (specialities.length === 0) {
      setErrorMessage('Please maintain at least one clinical speciality.');
      return;
    }
    if (capabilities.length === 0) {
      setErrorMessage('Please confirm at least one emergency response capability.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      await updateSpecialitiesAndCapabilities(specialities, capabilities);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update specialities in backend.');
    } finally {
      setIsSaving(false);
    }
  };

  const lastUpdated = registeredProfile?.updatedAt
    ? new Date(registeredProfile.updatedAt).toLocaleString()
    : 'Recently Synchronized';

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Hospital Specialities & Emergency Capabilities</span>
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage certified medical departments and emergency receiving services for{' '}
            <strong className="text-slate-800 dark:text-slate-200">{hospitalProfile.name}</strong>.
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Last modified: <strong className="text-slate-800 dark:text-slate-200">{lastUpdated}</strong></span>
        </div>
      </div>

      {/* Driver Destination Matching Banner */}
      <div className="bg-cyan-50 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800/60 p-4 rounded-xl text-xs text-cyan-900 dark:text-cyan-200 flex items-start gap-3 shadow-xs">
        <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Ambulance Triage Matching Integration:</strong> When field paramedics or IoT ambulance systems dispatch an emergency (e.g. STEMI Cardiac, Polytrauma, Acute Stroke, Neonatal distress), the WEWOO platform cross-references your active specialities and emergency capabilities to verify hospital receiving eligibility.
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Specialities and emergency capabilities successfully saved to backend database (PostgreSQL) and broadcast to driver network.</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: Registered Specialities */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Active Medical Specialities ({specialities.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              Facility ID: {hospitalProfile.hospitalId}
            </span>
          </div>

          {/* Active Speciality Tags */}
          <div>
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Currently Selected Specialities:
            </div>
            <div className="flex flex-wrap gap-2">
              {specialities.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800/80 text-cyan-800 dark:text-cyan-300 text-xs rounded-lg font-medium"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeSpeciality(item)}
                    className="text-cyan-600 dark:text-cyan-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Add Speciality from Standard Catalog */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Quick Toggle from Recognized Department Catalog:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
              {STANDARD_SPECIALITIES.map((spec) => {
                const isActive = specialities.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSpeciality(spec)}
                    className={`p-2 rounded-lg text-left text-xs transition-colors flex items-center justify-between border cursor-pointer ${
                      isActive
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-xs font-semibold'
                        : 'bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate mr-1">{spec}</span>
                    <span className="text-xs">{isActive ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Speciality Input */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            <input
              type="text"
              value={customSpecialityInput}
              onChange={(e) => setCustomSpecialityInput(e.target.value)}
              placeholder="Add other medical speciality..."
              className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={addCustomSpeciality}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: Emergency & Resuscitation Capabilities */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs transition-colors">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Emergency Care Facilities ({capabilities.length} Available)
              </h3>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
              24/7 Availability Required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {STANDARD_EMERGENCY_CAPABILITIES.map((cap) => {
              const isChecked = capabilities.includes(cap);
              return (
                <label
                  key={cap}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-500/60 text-amber-900 dark:text-amber-200'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCapability(cap)}
                      className="w-4 h-4 rounded text-amber-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
                    />
                    <span className="font-semibold text-xs">{cap}</span>
                  </div>

                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      isChecked
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isChecked ? 'Operational' : 'Unavailable'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes & Sync to Ambulance Network</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

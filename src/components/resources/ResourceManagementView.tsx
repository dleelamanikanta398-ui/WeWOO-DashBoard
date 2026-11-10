import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Bed,
  HeartPulse,
  Stethoscope,
  Users,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  Activity,
  PlusCircle,
  Edit3,
  X,
  Clock,
  AlertTriangle,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Sparkles,
} from 'lucide-react';
import { useHospital } from '../../context/HospitalContext';
import { HospitalResources } from '../../types/emergency';
import { calculateHospitalReadiness } from '../../services/readiness';

const ED_STATUS_OPTIONS = [
  { value: 'Normal Operations', label: 'Normal Operations', desc: 'Standard intake capacity and triage flow.' },
  { value: 'Elevated Demand', label: 'Elevated Demand', desc: 'High volume; triage wait times are elevated.' },
  { value: 'Critical Surge', label: 'Critical Surge', desc: 'Mass casualty / critical trauma surge protocol.' },
  { value: 'Diversion Recommended', label: 'Diversion Recommended', desc: 'Advise ambulances to divert non-critical cases.' },
];

const DEFAULT_RESOURCE_TEMPLATE: HospitalResources = {
  hospitalId: '',
  totalBeds: 100,
  availableBeds: 30,
  occupiedBeds: 70,
  totalICUBeds: 20,
  availableICUBeds: 6,
  occupiedICUBeds: 14,
  totalEmergencyDoctors: 12,
  availableEmergencyDoctors: 4,
  assignedEmergencyDoctors: 8,
  totalNurses: 36,
  availableNurses: 14,
  assignedNurses: 22,
  emergencyDepartmentStatus: 'Normal Operations',
  emergency24x7: true,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'Authorized Administrator',
  availableGeneralBeds: 30,
  availableIcuBeds: 6,
  availableDoctors: 4,
  availableTraumaBays: 3,
  emergencyStatus: 'Normal Operations',
};

export const ResourceManagementView: React.FC = () => {
  const {
    resources: contextResources,
    capacity,
    updateResources: contextUpdateResources,
    hospitalProfile,
    registeredProfile,
    currentUser,
    settings,
  } = useHospital();

  const activeHospitalId = registeredProfile?.hospitalId || currentUser?.hospitalId || hospitalProfile.hospitalId;
  const hospitalName = registeredProfile?.hospitalName || hospitalProfile.name;

  // --------------------------------------------------------------------------
  // SEPARATE STATES (SPECIFICATION REQUIREMENT):
  // - savedResources: last confirmed backend PostgreSQL values
  // - formResources: controlled editable state with automatic balancing
  // - isEditing: controls View Mode vs Edit Mode
  // - isSaving: prevents duplicate submits & shows loading indicator
  // --------------------------------------------------------------------------
  const [savedResources, setSavedResources] = useState<HospitalResources | null>(() => {
    const cached = localStorage.getItem(`wewoo_resources_${activeHospitalId}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed) {
          // Normalize assigned staff if missing in older cached records
          parsed.assignedEmergencyDoctors = parsed.assignedEmergencyDoctors ?? Math.max(0, (Number(parsed.totalEmergencyDoctors) || 0) - (Number(parsed.availableEmergencyDoctors) || 0));
          parsed.assignedNurses = parsed.assignedNurses ?? Math.max(0, (Number(parsed.totalNurses) || 0) - (Number(parsed.availableNurses) || 0));
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return contextResources || null;
  });

  const [formResources, setFormResources] = useState<HospitalResources>(() => {
    if (savedResources) {
      return {
        ...savedResources,
        assignedEmergencyDoctors: savedResources.assignedEmergencyDoctors ?? Math.max(0, (Number(savedResources.totalEmergencyDoctors) || 0) - (Number(savedResources.availableEmergencyDoctors) || 0)),
        assignedNurses: savedResources.assignedNurses ?? Math.max(0, (Number(savedResources.totalNurses) || 0) - (Number(savedResources.availableNurses) || 0)),
      };
    }
    return { ...DEFAULT_RESOURCE_TEMPLATE, hospitalId: activeHospitalId };
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Ref tracking isEditing to prevent incoming backend updates from overwriting active edits
  const isEditingRef = useRef<boolean>(isEditing);
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // --------------------------------------------------------------------------
  // LIVE BACKEND RESOURCE SYNC WITH EDIT-PROTECTION
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (contextResources) {
      const normalized: HospitalResources = {
        ...contextResources,
        assignedEmergencyDoctors: contextResources.assignedEmergencyDoctors ?? Math.max(0, (Number(contextResources.totalEmergencyDoctors) || 0) - (Number(contextResources.availableEmergencyDoctors) || 0)),
        assignedNurses: contextResources.assignedNurses ?? Math.max(0, (Number(contextResources.totalNurses) || 0) - (Number(contextResources.availableNurses) || 0)),
      };

      setSavedResources(normalized);
      localStorage.setItem(`wewoo_resources_${activeHospitalId}`, JSON.stringify(normalized));

      // Only sync form state if user is NOT actively editing
      if (!isEditingRef.current) {
        setFormResources(normalized);
      }
    }
  }, [contextResources, activeHospitalId]);

  // Sync savedResources when context updates
  useEffect(() => {
    if (contextResources && !savedResources) {
      const normalized: HospitalResources = {
        ...contextResources,
        assignedEmergencyDoctors: contextResources.assignedEmergencyDoctors ?? Math.max(0, (Number(contextResources.totalEmergencyDoctors) || 0) - (Number(contextResources.availableEmergencyDoctors) || 0)),
        assignedNurses: contextResources.assignedNurses ?? Math.max(0, (Number(contextResources.totalNurses) || 0) - (Number(contextResources.availableNurses) || 0)),
      };
      setSavedResources(normalized);
      if (!isEditingRef.current) {
        setFormResources(normalized);
      }
    }
  }, [contextResources, savedResources]);

  // --------------------------------------------------------------------------
  // READINESS SCORE: Recalculated dynamically from ACTUAL SAVED data only
  // (Do not recalculate from unsaved form inputs)
  // --------------------------------------------------------------------------
  const displayedReadiness = useMemo(() => {
    return calculateHospitalReadiness(savedResources, capacity, settings.readinessWeights);
  }, [savedResources, capacity, settings.readinessWeights]);

  // --------------------------------------------------------------------------
  // AUTOMATIC BALANCING HANDLERS
  // --------------------------------------------------------------------------

  // --- 1. NORMAL HOSPITAL BEDS ---
  // Total Beds = Available Beds + Occupied Beds

  const handleTotalBedsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const curOccupied = Number(prev.occupiedBeds) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, totalBeds: isNaN(val) ? 0 : val };
      }
      if (val < curOccupied) {
        // Conflict: new total lower than occupied beds
        return { ...prev, totalBeds: val };
      }
      // Preserve occupied beds, recalculate available = total - occupied
      const newAvail = Math.max(0, val - curOccupied);
      return { ...prev, totalBeds: val, availableBeds: newAvail };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.totalBeds;
      delete errs.availableBeds;
      delete errs.occupiedBeds;
      delete errs.bedSum;

      if (isNaN(val) || val < 0) {
        errs.totalBeds = 'Total beds cannot be negative.';
      } else if (val < (Number(formResources.occupiedBeds) || 0)) {
        errs.totalBeds = `Total beds (${val}) cannot be lower than currently occupied beds (${formResources.occupiedBeds}). Please decrease occupied beds first.`;
      }
      return errs;
    });
  };

  const handleAvailableBedsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const total = Number(prev.totalBeds) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, availableBeds: isNaN(val) ? 0 : val };
      }
      if (val > total) {
        return { ...prev, availableBeds: val };
      }
      // Automatic balance: Occupied = Total - Available
      const newOccupied = Math.max(0, total - val);
      return { ...prev, availableBeds: val, occupiedBeds: newOccupied };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.availableBeds;
      delete errs.occupiedBeds;
      delete errs.bedSum;

      if (isNaN(val) || val < 0) {
        errs.availableBeds = 'Available beds cannot be negative.';
      } else if (val > (Number(formResources.totalBeds) || 0)) {
        errs.availableBeds = `Available beds (${val}) cannot exceed total beds (${formResources.totalBeds}).`;
      }
      return errs;
    });
  };

  const handleOccupiedBedsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const total = Number(prev.totalBeds) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, occupiedBeds: isNaN(val) ? 0 : val };
      }
      if (val > total) {
        return { ...prev, occupiedBeds: val };
      }
      // Automatic balance: Available = Total - Occupied
      const newAvail = Math.max(0, total - val);
      return { ...prev, occupiedBeds: val, availableBeds: newAvail };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.availableBeds;
      delete errs.occupiedBeds;
      delete errs.bedSum;

      if (isNaN(val) || val < 0) {
        errs.occupiedBeds = 'Occupied beds cannot be negative.';
      } else if (val > (Number(formResources.totalBeds) || 0)) {
        errs.occupiedBeds = `Occupied beds (${val}) cannot exceed total beds (${formResources.totalBeds}).`;
      }
      return errs;
    });
  };

  // --- 2. ICU BEDS ---
  // Total ICU Beds = Available ICU Beds + Occupied ICU Beds

  const handleTotalICUBedsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const curOccupied = Number(prev.occupiedICUBeds) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, totalICUBeds: isNaN(val) ? 0 : val };
      }
      if (val < curOccupied) {
        return { ...prev, totalICUBeds: val };
      }
      const newAvail = Math.max(0, val - curOccupied);
      return { ...prev, totalICUBeds: val, availableICUBeds: newAvail };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.totalICUBeds;
      delete errs.availableICUBeds;
      delete errs.occupiedICUBeds;
      delete errs.icuSum;

      if (isNaN(val) || val < 0) {
        errs.totalICUBeds = 'Total ICU beds cannot be negative.';
      } else if (val < (Number(formResources.occupiedICUBeds) || 0)) {
        errs.totalICUBeds = `Total ICU beds (${val}) cannot be lower than currently occupied ICU beds (${formResources.occupiedICUBeds}). Please decrease occupied ICU beds first.`;
      }
      return errs;
    });
  };

  const handleAvailableICUBedsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const total = Number(prev.totalICUBeds) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, availableICUBeds: isNaN(val) ? 0 : val };
      }
      if (val > total) {
        return { ...prev, availableICUBeds: val };
      }
      const newOccupied = Math.max(0, total - val);
      return { ...prev, availableICUBeds: val, occupiedICUBeds: newOccupied };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.availableICUBeds;
      delete errs.occupiedICUBeds;
      delete errs.icuSum;

      if (isNaN(val) || val < 0) {
        errs.availableICUBeds = 'Available ICU beds cannot be negative.';
      } else if (val > (Number(formResources.totalICUBeds) || 0)) {
        errs.availableICUBeds = `Available ICU beds (${val}) cannot exceed total ICU beds (${formResources.totalICUBeds}).`;
      }
      return errs;
    });
  };

  const handleOccupiedICUBedsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const total = Number(prev.totalICUBeds) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, occupiedICUBeds: isNaN(val) ? 0 : val };
      }
      if (val > total) {
        return { ...prev, occupiedICUBeds: val };
      }
      const newAvail = Math.max(0, total - val);
      return { ...prev, occupiedICUBeds: val, availableICUBeds: newAvail };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.availableICUBeds;
      delete errs.occupiedICUBeds;
      delete errs.icuSum;

      if (isNaN(val) || val < 0) {
        errs.occupiedICUBeds = 'Occupied ICU beds cannot be negative.';
      } else if (val > (Number(formResources.totalICUBeds) || 0)) {
        errs.occupiedICUBeds = `Occupied ICU beds (${val}) cannot exceed total ICU beds (${formResources.totalICUBeds}).`;
      }
      return errs;
    });
  };

  // --- 3. MEDICAL STAFF: EMERGENCY DOCTORS ---
  // Total Emergency Doctors = Available Emergency Doctors + Assigned Emergency Doctors

  const handleTotalDoctorsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const curAssigned = Number(prev.assignedEmergencyDoctors) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, totalEmergencyDoctors: isNaN(val) ? 0 : val };
      }
      if (val < curAssigned) {
        return { ...prev, totalEmergencyDoctors: val };
      }
      const newAvail = Math.max(0, val - curAssigned);
      return { ...prev, totalEmergencyDoctors: val, availableEmergencyDoctors: newAvail };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.totalEmergencyDoctors;
      delete errs.availableEmergencyDoctors;
      delete errs.assignedEmergencyDoctors;
      delete errs.doctorSum;

      if (isNaN(val) || val < 0) {
        errs.totalEmergencyDoctors = 'Total doctors cannot be negative.';
      } else if (val < (Number(formResources.assignedEmergencyDoctors) || 0)) {
        errs.totalEmergencyDoctors = `Total emergency doctors (${val}) cannot be lower than currently assigned doctors (${formResources.assignedEmergencyDoctors}). Please decrease assigned doctors first.`;
      }
      return errs;
    });
  };

  const handleAvailableDoctorsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const total = Number(prev.totalEmergencyDoctors) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, availableEmergencyDoctors: isNaN(val) ? 0 : val };
      }
      if (val > total) {
        return { ...prev, availableEmergencyDoctors: val };
      }
      const newAssigned = Math.max(0, total - val);
      return { ...prev, availableEmergencyDoctors: val, assignedEmergencyDoctors: newAssigned };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.availableEmergencyDoctors;
      delete errs.assignedEmergencyDoctors;
      delete errs.doctorSum;

      if (isNaN(val) || val < 0) {
        errs.availableEmergencyDoctors = 'Available doctors cannot be negative.';
      } else if (val > (Number(formResources.totalEmergencyDoctors) || 0)) {
        errs.availableEmergencyDoctors = `Available emergency doctors (${val}) cannot exceed total roster (${formResources.totalEmergencyDoctors}).`;
      }
      return errs;
    });
  };

  const handleAssignedDoctorsChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const total = Number(prev.totalEmergencyDoctors) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, assignedEmergencyDoctors: isNaN(val) ? 0 : val };
      }
      if (val > total) {
        return { ...prev, assignedEmergencyDoctors: val };
      }
      const newAvail = Math.max(0, total - val);
      return { ...prev, assignedEmergencyDoctors: val, availableEmergencyDoctors: newAvail };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.availableEmergencyDoctors;
      delete errs.assignedEmergencyDoctors;
      delete errs.doctorSum;

      if (isNaN(val) || val < 0) {
        errs.assignedEmergencyDoctors = 'Assigned doctors cannot be negative.';
      } else if (val > (Number(formResources.totalEmergencyDoctors) || 0)) {
        errs.assignedEmergencyDoctors = `Assigned emergency doctors (${val}) cannot exceed total roster (${formResources.totalEmergencyDoctors}).`;
      }
      return errs;
    });
  };

  // --- 4. MEDICAL STAFF: EMERGENCY NURSES ---
  // Total Nurses = Available Nurses + Assigned Nurses

  const handleTotalNursesChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const curAssigned = Number(prev.assignedNurses) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, totalNurses: isNaN(val) ? 0 : val };
      }
      if (val < curAssigned) {
        return { ...prev, totalNurses: val };
      }
      const newAvail = Math.max(0, val - curAssigned);
      return { ...prev, totalNurses: val, availableNurses: newAvail };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.totalNurses;
      delete errs.availableNurses;
      delete errs.assignedNurses;
      delete errs.nurseSum;

      if (isNaN(val) || val < 0) {
        errs.totalNurses = 'Total nurses cannot be negative.';
      } else if (val < (Number(formResources.assignedNurses) || 0)) {
        errs.totalNurses = `Total nurses (${val}) cannot be lower than currently assigned nurses (${formResources.assignedNurses}). Please decrease assigned nurses first.`;
      }
      return errs;
    });
  };

  const handleAvailableNursesChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const total = Number(prev.totalNurses) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, availableNurses: isNaN(val) ? 0 : val };
      }
      if (val > total) {
        return { ...prev, availableNurses: val };
      }
      const newAssigned = Math.max(0, total - val);
      return { ...prev, availableNurses: val, assignedNurses: newAssigned };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.availableNurses;
      delete errs.assignedNurses;
      delete errs.nurseSum;

      if (isNaN(val) || val < 0) {
        errs.availableNurses = 'Available nurses cannot be negative.';
      } else if (val > (Number(formResources.totalNurses) || 0)) {
        errs.availableNurses = `Available nurses (${val}) cannot exceed total roster (${formResources.totalNurses}).`;
      }
      return errs;
    });
  };

  const handleAssignedNursesChange = (raw: string | number) => {
    const val = typeof raw === 'number' ? raw : (raw === '' ? 0 : parseInt(raw, 10));
    setFormResources((prev) => {
      const total = Number(prev.totalNurses) || 0;
      if (isNaN(val) || val < 0) {
        return { ...prev, assignedNurses: isNaN(val) ? 0 : val };
      }
      if (val > total) {
        return { ...prev, assignedNurses: val };
      }
      const newAvail = Math.max(0, total - val);
      return { ...prev, assignedNurses: val, availableNurses: newAvail };
    });

    setValidationErrors((prev) => {
      const errs = { ...prev };
      delete errs.availableNurses;
      delete errs.assignedNurses;
      delete errs.nurseSum;

      if (isNaN(val) || val < 0) {
        errs.assignedNurses = 'Assigned nurses cannot be negative.';
      } else if (val > (Number(formResources.totalNurses) || 0)) {
        errs.assignedNurses = `Assigned nurses (${val}) cannot exceed total roster (${formResources.totalNurses}).`;
      }
      return errs;
    });
  };

  // --- 5. DEPARTMENT STATUS & 24/7 TOGGLES ---
  const handleDepartmentStatusChange = (status: string) => {
    setFormResources((prev) => ({ ...prev, emergencyDepartmentStatus: status }));
  };

  const handleEmergency24x7Change = (enabled: boolean) => {
    setFormResources((prev) => ({ ...prev, emergency24x7: enabled }));
  };

  // --------------------------------------------------------------------------
  // STRICT FORM VALIDATION
  // --------------------------------------------------------------------------
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    const totalBeds = Number(formResources.totalBeds);
    const availBeds = Number(formResources.availableBeds);
    const occBeds = Number(formResources.occupiedBeds);

    const totalICU = Number(formResources.totalICUBeds);
    const availICU = Number(formResources.availableICUBeds);
    const occICU = Number(formResources.occupiedICUBeds);

    const totalDocs = Number(formResources.totalEmergencyDoctors);
    const availDocs = Number(formResources.availableEmergencyDoctors);
    const assignedDocs = Number(formResources.assignedEmergencyDoctors ?? (totalDocs - availDocs));

    const totalNurses = Number(formResources.totalNurses);
    const availNurses = Number(formResources.availableNurses);
    const assignedNurses = Number(formResources.assignedNurses ?? (totalNurses - availNurses));

    // Non-negative integer checks
    if (isNaN(totalBeds) || totalBeds < 0) errs.totalBeds = 'Total beds cannot be negative.';
    if (isNaN(availBeds) || availBeds < 0) errs.availableBeds = 'Available beds cannot be negative.';
    if (isNaN(occBeds) || occBeds < 0) errs.occupiedBeds = 'Occupied beds cannot be negative.';

    if (isNaN(totalICU) || totalICU < 0) errs.totalICUBeds = 'Total ICU beds cannot be negative.';
    if (isNaN(availICU) || availICU < 0) errs.availableICUBeds = 'Available ICU beds cannot be negative.';
    if (isNaN(occICU) || occICU < 0) errs.occupiedICUBeds = 'Occupied ICU beds cannot be negative.';

    if (isNaN(totalDocs) || totalDocs < 0) errs.totalEmergencyDoctors = 'Total doctors cannot be negative.';
    if (isNaN(availDocs) || availDocs < 0) errs.availableEmergencyDoctors = 'Available doctors cannot be negative.';
    if (isNaN(assignedDocs) || assignedDocs < 0) errs.assignedEmergencyDoctors = 'Assigned doctors cannot be negative.';

    if (isNaN(totalNurses) || totalNurses < 0) errs.totalNurses = 'Total nurses cannot be negative.';
    if (isNaN(availNurses) || availNurses < 0) errs.availableNurses = 'Available nurses cannot be negative.';
    if (isNaN(assignedNurses) || assignedNurses < 0) errs.assignedNurses = 'Assigned nurses cannot be negative.';

    // Equality balancing checks: Available + Occupied/Assigned must equal Total
    if (availBeds + occBeds !== totalBeds) {
      errs.bedSum = `Available beds (${availBeds}) + Occupied beds (${occBeds}) must equal Total beds (${totalBeds}). Current sum is ${availBeds + occBeds}.`;
    }

    if (availICU + occICU !== totalICU) {
      errs.icuSum = `Available ICU beds (${availICU}) + Occupied ICU beds (${occICU}) must equal Total ICU beds (${totalICU}). Current sum is ${availICU + occICU}.`;
    }

    if (availDocs + assignedDocs !== totalDocs) {
      errs.doctorSum = `Available doctors (${availDocs}) + Assigned doctors (${assignedDocs}) must equal Total doctors (${totalDocs}). Current sum is ${availDocs + assignedDocs}.`;
    }

    if (availNurses + assignedNurses !== totalNurses) {
      errs.nurseSum = `Available nurses (${availNurses}) + Assigned nurses (${assignedNurses}) must equal Total nurses (${totalNurses}). Current sum is ${availNurses + assignedNurses}.`;
    }

    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // --------------------------------------------------------------------------
  // EDIT, CANCEL, & SAVE ACTIONS
  // --------------------------------------------------------------------------
  const handleStartEdit = () => {
    setSaveError(null);
    setSaveSuccess(false);
    setValidationErrors({});

    if (savedResources) {
      setFormResources({
        ...savedResources,
        assignedEmergencyDoctors: savedResources.assignedEmergencyDoctors ?? Math.max(0, (Number(savedResources.totalEmergencyDoctors) || 0) - (Number(savedResources.availableEmergencyDoctors) || 0)),
        assignedNurses: savedResources.assignedNurses ?? Math.max(0, (Number(savedResources.totalNurses) || 0) - (Number(savedResources.availableNurses) || 0)),
      });
    } else {
      setFormResources({
        ...DEFAULT_RESOURCE_TEMPLATE,
        hospitalId: activeHospitalId,
      });
    }

    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (savedResources) {
      setFormResources({
        ...savedResources,
        assignedEmergencyDoctors: savedResources.assignedEmergencyDoctors ?? Math.max(0, (Number(savedResources.totalEmergencyDoctors) || 0) - (Number(savedResources.availableEmergencyDoctors) || 0)),
        assignedNurses: savedResources.assignedNurses ?? Math.max(0, (Number(savedResources.totalNurses) || 0) - (Number(savedResources.availableNurses) || 0)),
      });
    }
    setIsEditing(false);
    setValidationErrors({});
    setSaveError(null);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const nowIso = new Date().toISOString();
      const updatedUser = currentUser?.displayName || 'Authorized Administrator';

      const totalBeds = Math.round(Number(formResources.totalBeds));
      const availBeds = Math.round(Number(formResources.availableBeds));
      const occBeds = Math.round(Number(formResources.occupiedBeds));

      const totalICU = Math.round(Number(formResources.totalICUBeds));
      const availICU = Math.round(Number(formResources.availableICUBeds));
      const occICU = Math.round(Number(formResources.occupiedICUBeds));

      const totalDocs = Math.round(Number(formResources.totalEmergencyDoctors));
      const availDocs = Math.round(Number(formResources.availableEmergencyDoctors));
      const assignedDocs = Math.round(Number(formResources.assignedEmergencyDoctors ?? (totalDocs - availDocs)));

      const totalNurses = Math.round(Number(formResources.totalNurses));
      const availNurses = Math.round(Number(formResources.availableNurses));
      const assignedNurses = Math.round(Number(formResources.assignedNurses ?? (totalNurses - availNurses)));

      const cleanPayload: HospitalResources = {
        hospitalId: activeHospitalId,
        totalBeds,
        availableBeds: availBeds,
        occupiedBeds: occBeds,
        totalICUBeds: totalICU,
        availableICUBeds: availICU,
        occupiedICUBeds: occICU,
        totalEmergencyDoctors: totalDocs,
        availableEmergencyDoctors: availDocs,
        assignedEmergencyDoctors: assignedDocs,
        totalNurses,
        availableNurses: availNurses,
        assignedNurses,
        emergencyDepartmentStatus: formResources.emergencyDepartmentStatus || 'Normal Operations',
        emergency24x7: Boolean(formResources.emergency24x7),
        lastUpdated: nowIso,
        updatedBy: updatedUser,
        availableGeneralBeds: availBeds,
        availableIcuBeds: availICU,
        availableDoctors: availDocs,
        availableTraumaBays: Number(formResources.availableTraumaBays ?? 3),
        emergencyStatus: (formResources.emergencyDepartmentStatus as any) || 'Normal Operations',
      };

      const newReadiness = calculateHospitalReadiness(cleanPayload, capacity, settings.readinessWeights);

      // 1. Save through Centralized Backend API & broadcast via Socket.IO
      await contextUpdateResources(cleanPayload);

      // 2. Cache in localStorage for instant refresh persistence
      localStorage.setItem(`wewoo_resources_${activeHospitalId}`, JSON.stringify(cleanPayload));

      // 3. Update confirmed saved state
      setSavedResources(cleanPayload);
      setFormResources(cleanPayload);
      setIsEditing(false);
      setSaveSuccess(true);

      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      console.error('[WEWOO Resource Save Error]', err);
      setSaveError(err?.message || 'Failed to update hospital resources on backend server. Please verify connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // Values currently displayed
  const currentView = isEditing ? formResources : (savedResources || formResources);

  // Derived balance status
  const bedSum = Number(currentView.availableBeds) + Number(currentView.occupiedBeds);
  const icuSum = Number(currentView.availableICUBeds) + Number(currentView.occupiedICUBeds);
  const docSum = Number(currentView.availableEmergencyDoctors) + Number(currentView.assignedEmergencyDoctors ?? 0);
  const nurseSum = Number(currentView.availableNurses) + Number(currentView.assignedNurses ?? 0);

  const bedOccupancy = currentView.totalBeds > 0 ? Math.round((currentView.occupiedBeds / currentView.totalBeds) * 100) : 0;
  const icuOccupancy = currentView.totalICUBeds > 0 ? Math.round((currentView.occupiedICUBeds / currentView.totalICUBeds) * 100) : 0;
  const docAssignedPercent = currentView.totalEmergencyDoctors > 0 ? Math.round(((currentView.assignedEmergencyDoctors ?? 0) / currentView.totalEmergencyDoctors) * 100) : 0;
  const nurseAssignedPercent = currentView.totalNurses > 0 ? Math.round(((currentView.assignedNurses ?? 0) / currentView.totalNurses) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------------------- */}
      {/* TOP HEADER & CONTROLS                                                 */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Hospital Emergency Resources
            </h2>
            {savedResources ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
                Live RTDB Synced
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50">
                Not Configured
              </span>
            )}
            {isEditing && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>Auto-Balancing Mode</span>
              </span>
            )}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
            <span>Hospital: <strong className="text-slate-800 dark:text-slate-200">{hospitalName}</strong></span>
            <span>·</span>
            <span className="font-mono text-slate-500">ID: {activeHospitalId}</span>
            {savedResources?.lastUpdated && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Last synced: {new Date(savedResources.lastUpdated).toLocaleTimeString()}</span>
                  {savedResources.updatedBy && <span className="text-slate-400">({savedResources.updatedBy})</span>}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Resources</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* NOTIFICATIONS: SUCCESS & ERROR FEEDBACK                                */}
      {/* --------------------------------------------------------------------- */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs flex items-center gap-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-sm">Emergency Resources Successfully Saved & Balanced</div>
            <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
              Balanced resource counts (available, occupied/assigned, and total capacity) were saved to WEWOO Backend (PostgreSQL) and broadcast to driver network via Socket.IO.
            </p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs flex items-start gap-3 shadow-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Save Operation Failed</div>
            <p className="mt-0.5 text-rose-700 dark:text-rose-300 leading-relaxed">{saveError}</p>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* UNCONFIGURED BANNER                                                   */}
      {/* --------------------------------------------------------------------- */}
      {!savedResources && !isEditing && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Hospital resources not configured
              </div>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300 leading-relaxed">
                No active operational resource records were found in the backend database for hospital ID <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">{activeHospitalId}</code>.
                Enter your hospital's actual beds, ICU capacity, doctors, and nurses to begin live automatic balancing and ambulance coordination.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStartEdit}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-semibold rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Enter Actual Values</span>
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* READINESS SCORE DISPLAY                                               */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Emergency Readiness Score
              </span>
              {displayedReadiness?.score !== null && displayedReadiness?.score !== undefined ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {displayedReadiness.status}
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                  Awaiting Saved Data
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Calculated dynamically from live saved resource records: available vs total general beds, ICU beds, emergency doctors, and nurses, combined with the facility emergency status and 24/7 coverage status.
            </p>

            {displayedReadiness?.score === null || displayedReadiness?.score === undefined ? (
              <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Insufficient data to calculate readiness.</span>
                <span className="text-slate-500 font-normal">
                  ({displayedReadiness?.insufficientReason || 'Save actual hospital capacity to compute score.'})
                </span>
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                <span>General Beds: <strong className="text-slate-700 dark:text-slate-300">{savedResources?.availableBeds}/{savedResources?.totalBeds}</strong></span>
                <span>·</span>
                <span>ICU: <strong className="text-slate-700 dark:text-slate-300">{savedResources?.availableICUBeds}/{savedResources?.totalICUBeds}</strong></span>
                <span>·</span>
                <span>Doctors: <strong className="text-slate-700 dark:text-slate-300">{savedResources?.availableEmergencyDoctors}/{savedResources?.totalEmergencyDoctors}</strong></span>
                <span>·</span>
                <span>Nurses: <strong className="text-slate-700 dark:text-slate-300">{savedResources?.availableNurses}/{savedResources?.totalNurses}</strong></span>
              </div>
            )}
          </div>

          {/* Readiness Score Gauge */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center min-w-[180px] shrink-0">
            {displayedReadiness?.score !== null && displayedReadiness?.score !== undefined ? (
              <>
                <div
                  className={`text-4xl font-mono font-extrabold ${
                    displayedReadiness.score >= 70
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : displayedReadiness.score >= 50
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {displayedReadiness.score}%
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  {displayedReadiness.status}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-mono font-bold text-slate-400">--</div>
                <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-1">
                  Insufficient data to calculate readiness
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* VALIDATION WARNING SUMMARY IN EDIT MODE                               */}
      {/* --------------------------------------------------------------------- */}
      {isEditing && Object.keys(validationErrors).length > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-sm">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Validation Errors Detected:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-2 text-rose-700 dark:text-rose-300">
            {Object.entries(validationErrors).map(([key, msg]) => (
              <li key={key}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 6 RESOURCE CARDS (WITH AUTOMATIC BALANCING IN EDIT MODE)               */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* =================================================================== */}
        {/* 1. HOSPITAL BEDS (Automatic Balancing: Total = Avail + Occupied)    */}
        {/* =================================================================== */}
        <div className={`bg-white dark:bg-slate-900 border ${
          validationErrors.bedSum || validationErrors.totalBeds || validationErrors.availableBeds || validationErrors.occupiedBeds
            ? 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/10'
            : isEditing
            ? 'border-emerald-300 dark:border-emerald-800 ring-2 ring-emerald-500/10'
            : 'border-slate-200 dark:border-slate-800'
        } p-5 rounded-2xl shadow-xs transition-all space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hospital Beds</h3>
                <p className="text-[11px] text-slate-500">Total = Available + Occupied</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
              Total: {isEditing ? formResources.totalBeds : currentView.totalBeds}
            </span>
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Available Beds</div>
                  <div className="text-2xl font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {currentView.availableBeds}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Occupied Beds</div>
                  <div className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {currentView.occupiedBeds}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Occupancy</span>
                  <span className="font-mono font-semibold">{bedOccupancy}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, bedOccupancy)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE WITH AUTOMATIC BALANCING */
            <div className="space-y-3 pt-1">
              {/* Total Beds */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Hospital Beds
                  </label>
                  <span className="text-[10px] text-slate-400">Total capacity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTotalBedsChange(Math.max(0, formResources.totalBeds - 10))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Decrease total capacity by 10"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formResources.totalBeds}
                    onChange={(e) => handleTotalBedsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleTotalBedsChange(formResources.totalBeds + 10)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Increase total capacity by 10"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.totalBeds && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.totalBeds}</p>
                )}
              </div>

              {/* Available Beds (auto-balances Occupied Beds) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Available Beds
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">auto-balances occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAvailableBedsChange(Math.max(0, formResources.availableBeds - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Decrease available beds (increases occupied)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={formResources.totalBeds}
                    step={1}
                    value={formResources.availableBeds}
                    onChange={(e) => handleAvailableBedsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAvailableBedsChange(formResources.availableBeds + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Increase available beds (decreases occupied)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.availableBeds && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.availableBeds}</p>
                )}
              </div>

              {/* Occupied Beds (auto-balances Available Beds) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Occupied Beds
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">auto-balances available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOccupiedBedsChange(Math.max(0, formResources.occupiedBeds - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Decrease occupied beds (increases available)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={formResources.totalBeds}
                    step={1}
                    value={formResources.occupiedBeds}
                    onChange={(e) => handleOccupiedBedsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleOccupiedBedsChange(formResources.occupiedBeds + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Increase occupied beds (decreases available)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.occupiedBeds && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.occupiedBeds}</p>
                )}
              </div>

              {/* Automatic Balancing Indicator */}
              {validationErrors.bedSum ? (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  {validationErrors.bedSum}
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Auto-Balanced:</span>
                  </span>
                  <span className="font-mono font-semibold">
                    {formResources.availableBeds} avail + {formResources.occupiedBeds} occ = {bedSum} / {formResources.totalBeds} beds
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 2. ICU BEDS (Automatic Balancing: Total = Avail + Occupied)         */}
        {/* =================================================================== */}
        <div className={`bg-white dark:bg-slate-900 border ${
          validationErrors.icuSum || validationErrors.totalICUBeds || validationErrors.availableICUBeds || validationErrors.occupiedICUBeds
            ? 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/10'
            : isEditing
            ? 'border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/10'
            : 'border-slate-200 dark:border-slate-800'
        } p-5 rounded-2xl shadow-xs transition-all space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">ICU Beds</h3>
                <p className="text-[11px] text-slate-500">Total = Available + Occupied</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
              Total: {isEditing ? formResources.totalICUBeds : currentView.totalICUBeds}
            </span>
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Available ICU</div>
                  <div className="text-2xl font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    {currentView.availableICUBeds}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Occupied ICU</div>
                  <div className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {currentView.occupiedICUBeds}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Critical Care Load</span>
                  <span className="font-mono font-semibold">{icuOccupancy}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, icuOccupancy)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE WITH AUTOMATIC BALANCING */
            <div className="space-y-3 pt-1">
              {/* Total ICU Beds */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total ICU Beds
                  </label>
                  <span className="text-[10px] text-slate-400">Total capacity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTotalICUBedsChange(Math.max(0, formResources.totalICUBeds - 2))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Decrease total ICU capacity by 2"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formResources.totalICUBeds}
                    onChange={(e) => handleTotalICUBedsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleTotalICUBedsChange(formResources.totalICUBeds + 2)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Increase total ICU capacity by 2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.totalICUBeds && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.totalICUBeds}</p>
                )}
              </div>

              {/* Available ICU Beds (auto-balances Occupied ICU Beds) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    Available ICU Beds
                  </label>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">auto-balances occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAvailableICUBedsChange(Math.max(0, formResources.availableICUBeds - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Decrease available ICU beds (increases occupied)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={formResources.totalICUBeds}
                    step={1}
                    value={formResources.availableICUBeds}
                    onChange={(e) => handleAvailableICUBedsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-rose-600 dark:text-rose-400 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAvailableICUBedsChange(formResources.availableICUBeds + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Increase available ICU beds (decreases occupied)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.availableICUBeds && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.availableICUBeds}</p>
                )}
              </div>

              {/* Occupied ICU Beds (auto-balances Available ICU Beds) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Occupied ICU Beds
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">auto-balances available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOccupiedICUBedsChange(Math.max(0, formResources.occupiedICUBeds - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Decrease occupied ICU beds (increases available)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={formResources.totalICUBeds}
                    step={1}
                    value={formResources.occupiedICUBeds}
                    onChange={(e) => handleOccupiedICUBedsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleOccupiedICUBedsChange(formResources.occupiedICUBeds + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Increase occupied ICU beds (decreases available)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.occupiedICUBeds && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.occupiedICUBeds}</p>
                )}
              </div>

              {/* ICU Balancing Status */}
              {validationErrors.icuSum ? (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  {validationErrors.icuSum}
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-800 dark:text-rose-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-rose-600" />
                    <span>Auto-Balanced:</span>
                  </span>
                  <span className="font-mono font-semibold">
                    {formResources.availableICUBeds} avail + {formResources.occupiedICUBeds} occ = {icuSum} / {formResources.totalICUBeds} ICU beds
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 3. EMERGENCY DOCTORS (Total = Available + Assigned)                 */}
        {/* =================================================================== */}
        <div className={`bg-white dark:bg-slate-900 border ${
          validationErrors.doctorSum || validationErrors.totalEmergencyDoctors || validationErrors.availableEmergencyDoctors || validationErrors.assignedEmergencyDoctors
            ? 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/10'
            : isEditing
            ? 'border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/10'
            : 'border-slate-200 dark:border-slate-800'
        } p-5 rounded-2xl shadow-xs transition-all space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Emergency Doctors</h3>
                <p className="text-[11px] text-slate-500">Total = Available + Assigned</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
              Total: {isEditing ? formResources.totalEmergencyDoctors : currentView.totalEmergencyDoctors}
            </span>
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Available On Duty</div>
                  <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {currentView.availableEmergencyDoctors}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Assigned (Active)</div>
                  <div className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {currentView.assignedEmergencyDoctors ?? Math.max(0, currentView.totalEmergencyDoctors - currentView.availableEmergencyDoctors)}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Assigned Clinical Load</span>
                  <span className="font-mono font-semibold">{docAssignedPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, docAssignedPercent)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE WITH AUTOMATIC BALANCING */
            <div className="space-y-3 pt-1">
              {/* Total Emergency Doctors */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Emergency Doctors (Roster)
                  </label>
                  <span className="text-[10px] text-slate-400">Total capacity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTotalDoctorsChange(Math.max(0, formResources.totalEmergencyDoctors - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formResources.totalEmergencyDoctors}
                    onChange={(e) => handleTotalDoctorsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleTotalDoctorsChange(formResources.totalEmergencyDoctors + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.totalEmergencyDoctors && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.totalEmergencyDoctors}</p>
                )}
              </div>

              {/* Available Emergency Doctors (auto-balances Assigned Doctors) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    Available Emergency Doctors (On Duty / Standby)
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">auto-balances assigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAvailableDoctorsChange(Math.max(0, formResources.availableEmergencyDoctors - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={formResources.totalEmergencyDoctors}
                    step={1}
                    value={formResources.availableEmergencyDoctors}
                    onChange={(e) => handleAvailableDoctorsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-blue-600 dark:text-blue-400 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAvailableDoctorsChange(formResources.availableEmergencyDoctors + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.availableEmergencyDoctors && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.availableEmergencyDoctors}</p>
                )}
              </div>

              {/* Assigned Emergency Doctors (auto-balances Available Doctors) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assigned Emergency Doctors (Active Resuscitations / Cases)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">auto-balances available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAssignedDoctorsChange(Math.max(0, (Number(formResources.assignedEmergencyDoctors) || 0) - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={formResources.totalEmergencyDoctors}
                    step={1}
                    value={formResources.assignedEmergencyDoctors ?? Math.max(0, formResources.totalEmergencyDoctors - formResources.availableEmergencyDoctors)}
                    onChange={(e) => handleAssignedDoctorsChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAssignedDoctorsChange((Number(formResources.assignedEmergencyDoctors) || 0) + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.assignedEmergencyDoctors && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.assignedEmergencyDoctors}</p>
                )}
              </div>

              {/* Doctors Balancing Status */}
              {validationErrors.doctorSum ? (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  {validationErrors.doctorSum}
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-[11px] text-blue-800 dark:text-blue-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-blue-600" />
                    <span>Auto-Balanced:</span>
                  </span>
                  <span className="font-mono font-semibold">
                    {formResources.availableEmergencyDoctors} avail + {formResources.assignedEmergencyDoctors ?? (formResources.totalEmergencyDoctors - formResources.availableEmergencyDoctors)} assigned = {docSum} / {formResources.totalEmergencyDoctors} doctors
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 4. EMERGENCY NURSES (Total = Available + Assigned)                  */}
        {/* =================================================================== */}
        <div className={`bg-white dark:bg-slate-900 border ${
          validationErrors.nurseSum || validationErrors.totalNurses || validationErrors.availableNurses || validationErrors.assignedNurses
            ? 'border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/10'
            : isEditing
            ? 'border-cyan-300 dark:border-cyan-800 ring-2 ring-cyan-500/10'
            : 'border-slate-200 dark:border-slate-800'
        } p-5 rounded-2xl shadow-xs transition-all space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/60">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Emergency Nurses</h3>
                <p className="text-[11px] text-slate-500">Total = Available + Assigned</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
              Total: {isEditing ? formResources.totalNurses : currentView.totalNurses}
            </span>
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Available On Duty</div>
                  <div className="text-2xl font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                    {currentView.availableNurses}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Assigned (Bedside)</div>
                  <div className="text-2xl font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {currentView.assignedNurses ?? Math.max(0, currentView.totalNurses - currentView.availableNurses)}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Assigned Nursing Load</span>
                  <span className="font-mono font-semibold">{nurseAssignedPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, nurseAssignedPercent)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* EDIT MODE WITH AUTOMATIC BALANCING */
            <div className="space-y-3 pt-1">
              {/* Total Nurses */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total Nurses (Roster)
                  </label>
                  <span className="text-[10px] text-slate-400">Total capacity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTotalNursesChange(Math.max(0, formResources.totalNurses - 2))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={formResources.totalNurses}
                    onChange={(e) => handleTotalNursesChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleTotalNursesChange(formResources.totalNurses + 2)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.totalNurses && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.totalNurses}</p>
                )}
              </div>

              {/* Available Nurses (auto-balances Assigned Nurses) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                    Available Nurses (Triage / Standby)
                  </label>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">auto-balances assigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAvailableNursesChange(Math.max(0, formResources.availableNurses - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={formResources.totalNurses}
                    step={1}
                    value={formResources.availableNurses}
                    onChange={(e) => handleAvailableNursesChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAvailableNursesChange(formResources.availableNurses + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.availableNurses && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.availableNurses}</p>
                )}
              </div>

              {/* Assigned Nurses (auto-balances Available Nurses) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assigned Nurses (Bedside / Active Care)
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">auto-balances available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAssignedNursesChange(Math.max(0, (Number(formResources.assignedNurses) || 0) - 1))}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={formResources.totalNurses}
                    step={1}
                    value={formResources.assignedNurses ?? Math.max(0, formResources.totalNurses - formResources.availableNurses)}
                    onChange={(e) => handleAssignedNursesChange(e.target.value)}
                    className="flex-1 text-base font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-center focus:outline-hidden focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAssignedNursesChange((Number(formResources.assignedNurses) || 0) + 1)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {validationErrors.assignedNurses && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">{validationErrors.assignedNurses}</p>
                )}
              </div>

              {/* Nurses Balancing Status */}
              {validationErrors.nurseSum ? (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  {validationErrors.nurseSum}
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900 text-[11px] text-cyan-800 dark:text-cyan-300 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-cyan-600" />
                    <span>Auto-Balanced:</span>
                  </span>
                  <span className="font-mono font-semibold">
                    {formResources.availableNurses} avail + {formResources.assignedNurses ?? (formResources.totalNurses - formResources.availableNurses)} assigned = {nurseSum} / {formResources.totalNurses} nurses
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 5. EMERGENCY DEPARTMENT STATUS                                      */}
        {/* =================================================================== */}
        <div className={`bg-white dark:bg-slate-900 border ${
          isEditing ? 'border-purple-300 dark:border-purple-800 ring-2 ring-purple-500/10' : 'border-slate-200 dark:border-slate-800'
        } p-5 rounded-2xl shadow-xs transition-all space-y-4`}>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Emergency Department Status</h3>
              <p className="text-[11px] text-slate-500">Intake & diversion state</p>
            </div>
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="pt-2 space-y-3">
              <span
                className={`inline-block px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider border ${
                  currentView.emergencyDepartmentStatus === 'Normal Operations'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : currentView.emergencyDepartmentStatus === 'Elevated Demand'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : currentView.emergencyDepartmentStatus === 'Critical Surge'
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    : 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                }`}
              >
                {currentView.emergencyDepartmentStatus || 'Normal Operations'}
              </span>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {currentView.emergencyDepartmentStatus === 'Normal Operations' && 'Facility is operating under normal triage flow and accepting incoming dispatches.'}
                {currentView.emergencyDepartmentStatus === 'Elevated Demand' && 'High emergency intake; triage wait times are elevated.'}
                {currentView.emergencyDepartmentStatus === 'Critical Surge' && 'Mass casualty protocol active; only priority P1 traumas accepted without delay.'}
                {currentView.emergencyDepartmentStatus === 'Diversion Recommended' && 'Regional coordination networks advised to divert ambulances to adjacent trauma centers.'}
              </p>
            </div>
          ) : (
            /* EDIT MODE */
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Department Status
              </label>
              <select
                value={formResources.emergencyDepartmentStatus}
                onChange={(e) => handleDepartmentStatusChange(e.target.value)}
                className="w-full text-sm font-semibold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 focus:outline-hidden focus:border-purple-500 cursor-pointer"
              >
                {ED_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                {ED_STATUS_OPTIONS.find((o) => o.value === formResources.emergencyDepartmentStatus)?.desc}
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 6. 24/7 EMERGENCY AVAILABILITY                                      */}
        {/* =================================================================== */}
        <div className={`bg-white dark:bg-slate-900 border ${
          isEditing ? 'border-amber-300 dark:border-amber-800 ring-2 ring-amber-500/10' : 'border-slate-200 dark:border-slate-800'
        } p-5 rounded-2xl shadow-xs transition-all space-y-4`}>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">24/7 Emergency Availability</h3>
              <p className="text-[11px] text-slate-500">Continuous coverage protocol</p>
            </div>
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-3.5 h-3.5 rounded-full ${
                    currentView.emergency24x7 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {currentView.emergency24x7 ? '24/7 Emergency Active' : 'Restricted Hours Only'}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {currentView.emergency24x7
                  ? 'Continuous round-the-clock emergency and trauma coverage with active physician staffing.'
                  : 'Emergency department has limited operating hours. Ambulances will be flagged accordingly.'}
              </p>
            </div>
          ) : (
            /* EDIT MODE */
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Availability Mode
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleEmergency24x7Change(true)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    formResources.emergency24x7
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>24/7 Active</span>
                    {formResources.emergency24x7 && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <div className="text-[10px] mt-0.5 opacity-80">Full 24/7 availability</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleEmergency24x7Change(false)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    !formResources.emergency24x7
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="font-bold text-xs flex items-center justify-between">
                    <span>Restricted</span>
                    {!formResources.emergency24x7 && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </div>
                  <div className="text-[10px] mt-0.5 opacity-80">Limited operational hours</div>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Signals to regional dispatchers whether this emergency facility is continuously accessible.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* BOTTOM ACTION BAR IN EDIT MODE                                        */}
      {/* --------------------------------------------------------------------- */}
      {isEditing && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Auto-balancing active: Available and occupied/assigned counts automatically adjust to match total capacity.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Discard Changes
            </button>

            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Balanced Values to Backend...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import { HospitalCapacity, HospitalReadiness, HospitalResources, ReadinessWeights } from '../types/emergency';

/**
 * Transparent Hospital Emergency Readiness Scoring Service
 *
 * NOTE: This calculates readiness dynamically from actual saved hospital resource data.
 * If required data is missing or unconfigured, it returns null with
 * "Insufficient data to calculate readiness".
 *
 * Ratios:
 * - Available Beds / Total Beds
 * - Available ICU Beds / Total ICU Beds
 * - Available Emergency Doctors / Total Emergency Doctors
 * - Available Nurses / Total Nurses
 *
 * Department Status Modifiers:
 * - Normal Operations: 1.0
 * - Elevated Demand: 0.85
 * - Critical Surge / Mass Casualty Protocol: 0.50
 * - Diversion Recommended / Emergency Divert: capped at 20
 *
 * 24/7 Availability:
 * - If not 24/7: scaled by 0.80
 */
export function calculateHospitalReadiness(
  resources: HospitalResources | null | undefined,
  capacity: HospitalCapacity | null | undefined,
  weights: ReadinessWeights
): HospitalReadiness | null {
  if (!resources) {
    return {
      score: null,
      status: 'Insufficient data to calculate readiness',
      isEstimate: true,
      formulaWeights: { ...weights },
      lastCalculated: new Date().toISOString(),
      insufficientReason: 'Hospital resources not configured.',
    };
  }

  const effectiveTotalBeds = resources.totalBeds ?? capacity?.totalGeneralBeds ?? 0;
  const effectiveAvailBeds = resources.availableBeds ?? resources.availableGeneralBeds;
  const effectiveTotalICU = resources.totalICUBeds ?? capacity?.totalIcuBeds ?? 0;
  const effectiveAvailICU = resources.availableICUBeds ?? resources.availableIcuBeds;
  const effectiveTotalDoctors = resources.totalEmergencyDoctors ?? capacity?.totalDoctors ?? 0;
  const effectiveAvailDoctors = resources.availableEmergencyDoctors ?? resources.availableDoctors;
  const effectiveTotalNurses = resources.totalNurses ?? capacity?.totalNurses ?? 0;
  const effectiveAvailNurses = resources.availableNurses;

  if (
    typeof effectiveAvailBeds !== 'number' ||
    typeof effectiveAvailICU !== 'number' ||
    typeof effectiveAvailDoctors !== 'number' ||
    typeof effectiveAvailNurses !== 'number' ||
    effectiveTotalBeds <= 0 ||
    effectiveTotalICU <= 0 ||
    effectiveTotalDoctors <= 0 ||
    effectiveTotalNurses <= 0
  ) {
    return {
      score: null,
      status: 'Insufficient data to calculate readiness',
      isEstimate: true,
      formulaWeights: { ...weights },
      lastCalculated: new Date().toISOString(),
      insufficientReason: 'Insufficient data to calculate readiness. Required resource totals missing or incomplete.',
    };
  }

  const totalWeight =
    weights.generalBedWeight +
    weights.icuBedWeight +
    weights.doctorWeight +
    weights.nurseWeight;

  const normGenWeight = totalWeight > 0 ? weights.generalBedWeight / totalWeight : 0.20;
  const normIcuWeight = totalWeight > 0 ? weights.icuBedWeight / totalWeight : 0.40;
  const normDocWeight = totalWeight > 0 ? weights.doctorWeight / totalWeight : 0.25;
  const normNurseWeight = totalWeight > 0 ? weights.nurseWeight / totalWeight : 0.15;

  const genBedRatio = Math.max(0, Math.min(1, effectiveAvailBeds / effectiveTotalBeds));
  const icuBedRatio = Math.max(0, Math.min(1, effectiveAvailICU / effectiveTotalICU));
  const docRatio = Math.max(0, Math.min(1, effectiveAvailDoctors / effectiveTotalDoctors));
  const nurseRatio = Math.max(0, Math.min(1, effectiveAvailNurses / effectiveTotalNurses));

  let rawScore =
    (genBedRatio * normGenWeight +
      icuBedRatio * normIcuWeight +
      docRatio * normDocWeight +
      nurseRatio * normNurseWeight) * 100;

  // Department status modifier
  const statusStr = resources.emergencyDepartmentStatus || resources.emergencyStatus || 'Normal Operations';
  switch (statusStr) {
    case 'Normal Operations':
      break;
    case 'Elevated Demand':
      rawScore *= 0.85;
      break;
    case 'Critical Surge':
    case 'Mass Casualty Protocol':
      rawScore *= 0.50;
      break;
    case 'Diversion Recommended':
    case 'Emergency Divert':
      rawScore = Math.min(rawScore * 0.2, 20);
      break;
  }

  // 24/7 emergency availability adjustment
  if (resources.emergency24x7 === false) {
    rawScore *= 0.8;
  }

  const finalScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  let status: HospitalReadiness['status'];
  if (
    statusStr === 'Diversion Recommended' ||
    statusStr === 'Emergency Divert' ||
    finalScore < 30
  ) {
    status = 'Critical / Divert';
  } else if (finalScore < 55) {
    status = 'Constrained';
  } else if (finalScore < 80) {
    status = 'Adequate';
  } else {
    status = 'Optimal';
  }

  return {
    score: finalScore,
    status,
    isEstimate: true,
    formulaWeights: { ...weights },
    lastCalculated: new Date().toISOString(),
  };
}

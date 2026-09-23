import { ClinicalTrack } from '../types';

/**
 * Referral Code Utility
 * Generates secure, personalized referral codes distinguishing:
 * - Diabetes Track (with glucose telemetry): e.g., NUTRI-DIAB-JULIANA-7X9K, MED-DIAB-ROBERTO-4M2P
 * - Nutrition & Health Track (non-diabetic, pure nutrition/prevention): e.g., NUTRI-SAUDE-JULIANA-7X9K, MED-SAUDE-ROBERTO-4M2P
 */

export function sanitizeNameForCode(fullName: string): string {
  if (!fullName) return 'ESPECIALISTA';
  
  // Remove common medical/clinical titles
  let clean = fullName
    .replace(/^(dr|dra|doutor|doutora|nutri|nutricionista|prof|professor|professora)\.?\s+/i, '')
    .trim();

  // Remove accents
  clean = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Extract first name or primary identifier (letters only)
  const parts = clean.split(/\s+/).filter(Boolean);
  const firstName = parts[0]?.replace(/[^a-zA-Z]/g, '').toUpperCase();

  if (!firstName || firstName.length < 2) {
    return 'CLINICA';
  }

  return firstName.slice(0, 10);
}

export function getRolePrefix(role?: string): string {
  if (!role) return 'NUTRI';
  const lower = role.toLowerCase();
  if (lower.includes('médic') || lower.includes('medic') || lower.includes('med')) return 'MED';
  if (lower.includes('nutri')) return 'NUTRI';
  if (lower.includes('personal') || lower.includes('trein') || lower.includes('educad')) return 'TRAINER';
  return 'PRO';
}

/**
 * Generates a random alphanumeric token with high visual readability (no confusing 0/O, 1/I).
 */
export function generateRandomToken(length = 4): string {
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let token = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    token += charset[randomIndex];
  }
  return token;
}

/**
 * Generates a secure referral code classified by clinical track.
 * 
 * Examples:
 * - Diabetes Track: NUTRI-DIAB-JULIANA-7X9K, MED-DIAB-ROBERTO-4M2P
 * - Nutrition Track: NUTRI-SAUDE-JULIANA-7X9K, MED-SAUDE-ROBERTO-4M2P
 */
export function generateSecureReferralCode(
  role: string = 'Nutricionista',
  professionalName: string = '',
  patientNameOptional?: string,
  track: ClinicalTrack = 'diabetes',
  entropyLength: number = 4
): string {
  const rolePrefix = getRolePrefix(role);
  const trackTag = track === 'nutrition' ? 'SAUDE' : 'DIAB';
  const namePart = sanitizeNameForCode(professionalName);
  const token = generateRandomToken(entropyLength);

  if (patientNameOptional && patientNameOptional.trim()) {
    const patientPart = sanitizeNameForCode(patientNameOptional);
    return `${rolePrefix}-${trackTag}-${namePart}-${patientPart}-${token}`;
  }

  return `${rolePrefix}-${trackTag}-${namePart}-${token}`;
}

/**
 * Detects the intended clinical track from a referral code string.
 * Returns 'nutrition' if the code contains health/nutrition tags (SAUDE, PLANO, PREV, FIT)
 * Returns 'diabetes' if the code contains diabetes tags (DIAB, GLICO, INSUL) or defaults to 'diabetes'.
 */
export function detectTrackFromReferralCode(code?: string): ClinicalTrack {
  if (!code) return 'diabetes';
  const upper = code.toUpperCase();
  
  if (
    upper.includes('SAUDE') ||
    upper.includes('NUTRI-SAUDE') ||
    upper.includes('PLANO') ||
    upper.includes('NUTRI-PLANO') ||
    upper.includes('PREV') ||
    upper.includes('FIT') ||
    upper.includes('NUTRICAO')
  ) {
    return 'nutrition';
  }
  
  if (
    upper.includes('DIAB') ||
    upper.includes('GLICO') ||
    upper.includes('INSUL') ||
    upper.includes('DIABETES')
  ) {
    return 'diabetes';
  }

  return 'diabetes';
}

/**
 * Checks if a referral code corresponds specifically to a non-diabetic patient (pure nutrition/prevention).
 */
export function isNutritionOnlyCode(code?: string): boolean {
  return detectTrackFromReferralCode(code) === 'nutrition';
}

/**
 * Checks if a referral code corresponds to a diabetic patient (glucose telemetry active).
 */
export function isDiabeticCode(code?: string): boolean {
  return detectTrackFromReferralCode(code) === 'diabetes';
}


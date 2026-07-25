import { UserProfile, GlucoseReading, Recipe, View } from '../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'glycocare_user_profile',
  GLUCOSE_READINGS: 'glycocare_glucose_readings',
  CUSTOM_RECIPES: 'glycocare_recipes',
  LAST_VIEW: 'glycocare_last_view',
  LAST_SYNC: 'glycocare_last_sync',
};

export interface AppDataBackup {
  version: number;
  exportedAt: string;
  userProfile: UserProfile | null;
  glucoseReadings: GlucoseReading[];
  recipes: Recipe[];
}

export const saveUserProfile = (profile: UserProfile | null): void => {
  try {
    if (profile) {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    }
  } catch (err) {
    console.error('Failed to save user profile to storage:', err);
  }
};

export const loadUserProfile = (): UserProfile | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!data) return null;
    return JSON.parse(data) as UserProfile;
  } catch (err) {
    console.error('Failed to load user profile from storage:', err);
    return null;
  }
};

export const saveGlucoseReadings = (readings: GlucoseReading[]): void => {
  try {
    const formatted = readings.map(r => ({
      ...r,
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp
    }));
    localStorage.setItem(STORAGE_KEYS.GLUCOSE_READINGS, JSON.stringify(formatted));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save glucose readings to storage:', err);
  }
};

export const loadGlucoseReadings = (): GlucoseReading[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GLUCOSE_READINGS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.map((item: { value: number; timestamp: string }) => ({
        value: Number(item.value),
        timestamp: new Date(item.timestamp)
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to load glucose readings from storage:', err);
    return [];
  }
};

export const saveRecipes = (recipes: Recipe[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_RECIPES, JSON.stringify(recipes));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save recipes to storage:', err);
  }
};

export const loadRecipes = (defaultRecipes: Recipe[]): Recipe[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_RECIPES);
    if (!data) return defaultRecipes;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultRecipes;
  } catch (err) {
    console.error('Failed to load recipes from storage:', err);
    return defaultRecipes;
  }
};

export const exportDataBackup = (userProfile: UserProfile | null, glucoseReadings: GlucoseReading[], recipes: Recipe[]): void => {
  const backup: AppDataBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userProfile,
    glucoseReadings,
    recipes,
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('download', `GlycoCare_Backup_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const importDataBackup = (jsonString: string): AppDataBackup => {
  const parsed = JSON.parse(jsonString) as AppDataBackup;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Arquivo de backup inválido ou corrompido.');
  }

  if (parsed.userProfile) {
    saveUserProfile(parsed.userProfile);
  }

  if (Array.isArray(parsed.glucoseReadings)) {
    const restoredReadings = parsed.glucoseReadings.map(r => ({
      value: Number(r.value),
      timestamp: new Date(r.timestamp)
    }));
    saveGlucoseReadings(restoredReadings);
  }

  if (Array.isArray(parsed.recipes)) {
    saveRecipes(parsed.recipes);
  }

  return parsed;
};

export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  localStorage.removeItem(STORAGE_KEYS.GLUCOSE_READINGS);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_RECIPES);
  localStorage.removeItem(STORAGE_KEYS.LAST_VIEW);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
};

export const getLastSyncTime = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
};

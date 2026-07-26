import { UserProfile, GlucoseReading, Recipe, MealLog, WeightLog, View } from '../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'glycocare_user_profile',
  GLUCOSE_READINGS: 'glycocare_glucose_readings',
  CUSTOM_RECIPES: 'glycocare_recipes',
  MEAL_LOGS: 'glycocare_meal_logs',
  WEIGHT_LOGS: 'glycocare_weight_logs',
  LAST_VIEW: 'glycocare_last_view',
  LAST_SYNC: 'glycocare_last_sync',
};

export interface AppDataBackup {
  version: number;
  exportedAt: string;
  userProfile: UserProfile | null;
  glucoseReadings: GlucoseReading[];
  recipes: Recipe[];
  mealLogs?: MealLog[];
  weightLogs?: WeightLog[];
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

export const saveMealLogs = (logs: MealLog[]): void => {
  try {
    const formatted = logs.map(l => ({
      ...l,
      timestamp: l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp,
      deletedAt: l.deletedAt ? (l.deletedAt instanceof Date ? l.deletedAt.toISOString() : l.deletedAt) : undefined
    }));
    localStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(formatted));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save meal logs to storage:', err);
  }
};

export const loadMealLogs = (): MealLog[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEAL_LOGS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        id: item.id || String(Date.now()),
        name: item.name || 'Refeição Registrada',
        carbohydrates: Number(item.carbohydrates || 0),
        sugars: Number(item.sugars || 0),
        proteins: Number(item.proteins || 0),
        fats: Number(item.fats || 0),
        calories: Number(item.calories || 0),
        timestamp: new Date(item.timestamp),
        isDeleted: !!item.isDeleted,
        deletionReason: item.deletionReason || undefined,
        deletedAt: item.deletedAt ? new Date(item.deletedAt) : undefined
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to load meal logs from storage:', err);
    return [];
  }
};

export const saveWeightLogs = (logs: WeightLog[]): void => {
  try {
    const formatted = logs.map(w => ({
      ...w,
      timestamp: w.timestamp instanceof Date ? w.timestamp.toISOString() : w.timestamp
    }));
    localStorage.setItem(STORAGE_KEYS.WEIGHT_LOGS, JSON.stringify(formatted));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (err) {
    console.error('Failed to save weight logs to storage:', err);
  }
};

export const loadWeightLogs = (): WeightLog[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.WEIGHT_LOGS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return parsed.map((item: any) => ({
        id: item.id || String(Date.now()),
        weightKg: Number(item.weightKg || 0),
        timestamp: new Date(item.timestamp),
        notes: item.notes
      }));
    }
    return [];
  } catch (err) {
    console.error('Failed to load weight logs from storage:', err);
    return [];
  }
};

export const exportDataBackup = (
  userProfile: UserProfile | null,
  glucoseReadings: GlucoseReading[],
  recipes: Recipe[],
  mealLogs?: MealLog[],
  weightLogs?: WeightLog[]
): void => {
  const backup: AppDataBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userProfile,
    glucoseReadings,
    recipes,
    mealLogs: mealLogs || loadMealLogs(),
    weightLogs: weightLogs || loadWeightLogs()
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backup, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('download', `NutriSaudeVital_Backup_${dateStr}.json`);
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

  if (Array.isArray(parsed.mealLogs)) {
    const restoredLogs = parsed.mealLogs.map(m => ({
      id: m.id || String(Date.now()),
      name: m.name || 'Refeição Registrada',
      carbohydrates: Number(m.carbohydrates || 0),
      sugars: Number(m.sugars || 0),
      proteins: Number(m.proteins || 0),
      fats: Number(m.fats || 0),
      calories: Number(m.calories || 0),
      timestamp: new Date(m.timestamp)
    }));
    saveMealLogs(restoredLogs);
  }

  return parsed;
};

export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  localStorage.removeItem(STORAGE_KEYS.GLUCOSE_READINGS);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_RECIPES);
  localStorage.removeItem(STORAGE_KEYS.MEAL_LOGS);
  localStorage.removeItem(STORAGE_KEYS.WEIGHT_LOGS);
  localStorage.removeItem(STORAGE_KEYS.LAST_VIEW);
  localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
};

export const getLastSyncTime = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
};

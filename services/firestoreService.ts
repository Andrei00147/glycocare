import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../src/firebase';
import { UserProfile, GlucoseReading, MealLog, WeightLog, Recipe } from '../types';

// ==========================================
// Anti-CSRF & Payload Security Helpers
// ==========================================

let sessionCsrfToken: string | null = null;

export function getOrCreateCsrfToken(): string {
  if (typeof window === 'undefined') return 'SSR_SESSION';
  if (!sessionCsrfToken) {
    const stored = sessionStorage.getItem('nsv_csrf_token');
    if (stored) {
      sessionCsrfToken = stored;
    } else {
      sessionCsrfToken = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      sessionStorage.setItem('nsv_csrf_token', sessionCsrfToken);
    }
  }
  return sessionCsrfToken;
}

export function validateCsrfAndOrigin(): boolean {
  if (typeof window === 'undefined') return true;
  
  // Verify token presence
  const token = getOrCreateCsrfToken();
  const stored = sessionStorage.getItem('nsv_csrf_token');
  if (!stored || stored !== token) {
    console.warn('CSRF validation failed: Session token mismatch.');
    return false;
  }

  // Validate allowed origin (AdSense Passive Security Policy)
  const origin = window.location.origin;
  const isAllowedHost = 
    origin.includes('nutrisaudevital') || 
    origin.includes('glycocare') || 
    origin.includes('vercel.app') || 
    origin.includes('localhost') || 
    origin.includes('run.app');

  if (!isAllowedHost) {
    console.warn('Origin verification failed for host:', origin);
    return false;
  }

  return true;
}

export function sanitizeText(input?: string, maxLength: number = 500): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim()
    .substring(0, maxLength);
}

// ==========================================
// Firestore Service Operations
// ==========================================

// Save or Update User Profile
export async function syncUserProfileToFirestore(userId: string, profile: UserProfile) {
  const path = `users/${userId}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.WRITE, path);
    return;
  }

  if (auth.currentUser && auth.currentUser.uid !== userId) {
    handleFirestoreError(new Error('Unauthorized User Profile Sync'), OperationType.WRITE, path);
    return;
  }

  try {
    const sanitizedProfile = {
      ...profile,
      name: sanitizeText(profile.name, 100),
      diabetesType: sanitizeText(profile.diabetesType, 100),
      healthGoal: sanitizeText(profile.healthGoal, 200),
      insulinType: profile.insulinType ? sanitizeText(profile.insulinType, 100) : undefined,
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', userId), sanitizedProfile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch User Profile
export async function fetchUserProfileFromFirestore(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Sync Glucose Reading
export async function addGlucoseReadingToFirestore(userId: string, reading: GlucoseReading) {
  const path = `users/${userId}/glucoseReadings`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.WRITE, path);
    return;
  }

  if (reading.value < 10 || reading.value > 1000) {
    handleFirestoreError(new Error('Out-of-bounds glucose reading value'), OperationType.WRITE, path);
    return;
  }

  try {
    await addDoc(collection(db, 'users', userId, 'glucoseReadings'), {
      value: Number(reading.value),
      timestamp: reading.timestamp instanceof Date ? reading.timestamp.toISOString() : new Date(reading.timestamp).toISOString(),
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch Glucose Readings
export async function fetchGlucoseReadingsFromFirestore(userId: string): Promise<GlucoseReading[]> {
  const path = `users/${userId}/glucoseReadings`;
  try {
    const q = query(collection(db, 'users', userId, 'glucoseReadings'), orderBy('timestamp', 'asc'));
    const querySnap = await getDocs(q);
    const results: GlucoseReading[] = [];
    querySnap.forEach(d => {
      const data = d.data();
      results.push({
        value: Number(data.value),
        timestamp: new Date(data.timestamp)
      });
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Sync Meal Log
export async function addMealLogToFirestore(userId: string, mealLog: MealLog) {
  const path = `users/${userId}/mealLogs`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.WRITE, path);
    return;
  }

  try {
    const timestampIso = mealLog.timestamp instanceof Date ? mealLog.timestamp.toISOString() : new Date(mealLog.timestamp).toISOString();
    const deletedAtIso = mealLog.deletedAt ? (mealLog.deletedAt instanceof Date ? mealLog.deletedAt.toISOString() : new Date(mealLog.deletedAt).toISOString()) : null;

    await setDoc(doc(db, 'users', userId, 'mealLogs', mealLog.id), {
      ...mealLog,
      name: sanitizeText(mealLog.name, 200),
      carbohydrates: Math.max(0, Number(mealLog.carbohydrates || 0)),
      sugars: Math.max(0, Number(mealLog.sugars || 0)),
      proteins: Math.max(0, Number(mealLog.proteins || 0)),
      fats: Math.max(0, Number(mealLog.fats || 0)),
      calories: Math.max(0, Number(mealLog.calories || 0)),
      timestamp: timestampIso,
      deletedAt: deletedAtIso,
      isDeleted: !!mealLog.isDeleted,
      deletionReason: mealLog.deletionReason ? sanitizeText(mealLog.deletionReason, 200) : null,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMealLogFromFirestore(userId: string, mealId: string) {
  const path = `users/${userId}/mealLogs/${mealId}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.DELETE, path);
    return;
  }

  try {
    await deleteDoc(doc(db, 'users', userId, 'mealLogs', mealId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Fetch Meal Logs
export async function fetchMealLogsFromFirestore(userId: string): Promise<MealLog[]> {
  const path = `users/${userId}/mealLogs`;
  try {
    const q = query(collection(db, 'users', userId, 'mealLogs'), orderBy('timestamp', 'asc'));
    const querySnap = await getDocs(q);
    const results: MealLog[] = [];
    querySnap.forEach(d => {
      const data = d.data();
      results.push({
        ...data,
        id: d.id,
        timestamp: new Date(data.timestamp),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : undefined,
        isDeleted: !!data.isDeleted,
        deletionReason: data.deletionReason || undefined
      } as MealLog);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Clear all user profile data from Firestore
export async function clearUserDataFromFirestore(userId: string) {
  if (!validateCsrfAndOrigin()) {
    console.warn('CSRF validation failed for clearUserDataFromFirestore');
    return;
  }

  try {
    await deleteDoc(doc(db, 'users', userId));

    const readings = await getDocs(collection(db, 'users', userId, 'glucoseReadings'));
    for (const d of readings.docs) {
      await deleteDoc(d.ref);
    }

    const meals = await getDocs(collection(db, 'users', userId, 'mealLogs'));
    for (const d of meals.docs) {
      await deleteDoc(d.ref);
    }

    const weights = await getDocs(collection(db, 'users', userId, 'weightLogs'));
    for (const d of weights.docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    console.warn("Erro ao limpar dados do perfil no Firestore:", error);
  }
}

// Sync Weight Log
export async function addWeightLogToFirestore(userId: string, weightLog: WeightLog) {
  const path = `users/${userId}/weightLogs`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.WRITE, path);
    return;
  }

  try {
    await setDoc(doc(db, 'users', userId, 'weightLogs', weightLog.id), {
      ...weightLog,
      weightKg: Number(weightLog.weightKg),
      notes: sanitizeText(weightLog.notes, 500),
      timestamp: weightLog.timestamp.toISOString(),
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch Weight Logs
export async function fetchWeightLogsFromFirestore(userId: string): Promise<WeightLog[]> {
  const path = `users/${userId}/weightLogs`;
  try {
    const q = query(collection(db, 'users', userId, 'weightLogs'), orderBy('timestamp', 'asc'));
    const querySnap = await getDocs(q);
    const results: WeightLog[] = [];
    querySnap.forEach(d => {
      const data = d.data();
      results.push({
        ...data,
        id: d.id,
        timestamp: new Date(data.timestamp)
      } as WeightLog);
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Sync Community Recipe
export async function addRecipeToFirestore(authorUid: string, recipe: Recipe) {
  const path = `communityRecipes`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.WRITE, path);
    return;
  }

  try {
    await addDoc(collection(db, 'communityRecipes'), {
      title: sanitizeText(recipe.title, 200),
      author: sanitizeText(recipe.author, 100),
      description: sanitizeText(recipe.description, 1000),
      ingredients: sanitizeText(recipe.ingredients, 2000),
      instructions: sanitizeText(recipe.instructions, 5000),
      carbohydrates: Math.max(0, Number(recipe.carbohydrates || 0)),
      calories: Math.max(0, Number(recipe.calories || 0)),
      externalLink: recipe.externalLink ? sanitizeText(recipe.externalLink, 500) : null,
      authorUid,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch Community Recipes
export async function fetchRecipesFromFirestore(): Promise<Recipe[]> {
  const path = `communityRecipes`;
  try {
    const querySnap = await getDocs(collection(db, 'communityRecipes'));
    const results: Recipe[] = [];
    querySnap.forEach(d => {
      const data = d.data();
      results.push({
        id: d.id,
        title: data.title,
        author: data.author,
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions,
        carbohydrates: data.carbohydrates,
        calories: data.calories,
        externalLink: data.externalLink
      });
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}


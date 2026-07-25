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
import { db, OperationType, handleFirestoreError } from '../src/firebase';
import { UserProfile, GlucoseReading, MealLog, WeightLog, Recipe } from '../types';

// Save or Update User Profile
export async function syncUserProfileToFirestore(userId: string, profile: UserProfile) {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, 'users', userId), {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true });
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
  try {
    await addDoc(collection(db, 'users', userId, 'glucoseReadings'), {
      value: reading.value,
      timestamp: reading.timestamp.toISOString(),
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
        value: data.value,
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
  try {
    const timestampIso = mealLog.timestamp instanceof Date ? mealLog.timestamp.toISOString() : new Date(mealLog.timestamp).toISOString();
    const deletedAtIso = mealLog.deletedAt ? (mealLog.deletedAt instanceof Date ? mealLog.deletedAt.toISOString() : new Date(mealLog.deletedAt).toISOString()) : null;

    await setDoc(doc(db, 'users', userId, 'mealLogs', mealLog.id), {
      ...mealLog,
      timestamp: timestampIso,
      deletedAt: deletedAtIso,
      isDeleted: !!mealLog.isDeleted,
      deletionReason: mealLog.deletionReason || null,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteMealLogFromFirestore(userId: string, mealId: string) {
  const path = `users/${userId}/mealLogs/${mealId}`;
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
  try {
    await setDoc(doc(db, 'users', userId, 'weightLogs', weightLog.id), {
      ...weightLog,
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
  try {
    await addDoc(collection(db, 'communityRecipes'), {
      ...recipe,
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

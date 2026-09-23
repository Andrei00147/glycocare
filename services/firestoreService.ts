import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../src/firebase';
import { UserProfile, GlucoseReading, MealLog, WeightLog, Recipe, ProfessionalPartner, PatientLink, ConsultationMessage, ClinicalNote } from '../types';

export const SUPER_ADMIN_EMAIL = 'oliveirandrei001@gmail.com';

export function isUserSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

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
      clinicalTrack: profile.clinicalTrack || undefined,
      healthGoal: sanitizeText(profile.healthGoal, 200),
      insulinType: profile.insulinType ? sanitizeText(profile.insulinType, 100) : undefined,
      oralMedications: Array.isArray(profile.oralMedications) 
        ? profile.oralMedications.map(item => ({
            id: String(item.id || `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
            name: sanitizeText(item.name, 100),
            category: item.category || 'medication',
            brand: item.brand ? sanitizeText(item.brand, 100) : '',
            unit: item.unit || 'comprimidos',
            stock: Number(item.stock) || 0,
            threshold: Number(item.threshold) || 0,
            dailyDoses: Number(item.dailyDoses) || 0,
            source: item.source ? sanitizeText(item.source, 100) : '',
            cost: Number(item.cost) || 0,
            expiryDate: item.expiryDate || ''
          }))
        : [],
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

// ==========================================
// Professional Partners Management (SuperAdmin Only)
// ==========================================

export async function fetchProfessionalPartners(): Promise<ProfessionalPartner[]> {
  const path = 'professionals';
  try {
    const querySnap = await getDocs(collection(db, 'professionals'));
    const list: ProfessionalPartner[] = [];
    querySnap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        name: data.name,
        email: data.email,
        role: data.role,
        specialty: data.specialty,
        registrationNumber: data.registrationNumber,
        referralCode: data.referralCode,
        whatsapp: data.whatsapp,
        bio: data.bio,
        photoUrl: data.photoUrl,
        isActive: data.isActive !== false,
        assignedUid: data.assignedUid,
        createdAt: data.createdAt,
        addedByAdmin: data.addedByAdmin || 'SuperAdmin'
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function saveProfessionalPartner(partner: ProfessionalPartner): Promise<void> {
  const path = `professionals/${partner.id}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.WRITE, path);
    return;
  }

  const currentUserEmail = auth.currentUser?.email || '';
  if (!isUserSuperAdmin(currentUserEmail)) {
    handleFirestoreError(new Error('Apenas o SuperAdmin pode adicionar ou editar profissionais parceiros.'), OperationType.WRITE, path);
    return;
  }

  try {
    const cleanDoc = {
      name: sanitizeText(partner.name, 100),
      email: sanitizeText(partner.email, 150).toLowerCase(),
      role: partner.role,
      specialty: sanitizeText(partner.specialty, 150),
      registrationNumber: sanitizeText(partner.registrationNumber, 50).toUpperCase(),
      referralCode: sanitizeText(partner.referralCode, 50).toUpperCase(),
      whatsapp: partner.whatsapp ? sanitizeText(partner.whatsapp, 30) : '',
      bio: sanitizeText(partner.bio, 1000),
      photoUrl: partner.photoUrl ? sanitizeText(partner.photoUrl, 500) : '',
      isActive: partner.isActive !== false,
      assignedUid: partner.assignedUid || '',
      addedByAdmin: currentUserEmail,
      createdAt: partner.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'professionals', partner.id), cleanDoc, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProfessionalPartner(partnerId: string): Promise<void> {
  const path = `professionals/${partnerId}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.DELETE, path);
    return;
  }

  const currentUserEmail = auth.currentUser?.email || '';
  if (!isUserSuperAdmin(currentUserEmail)) {
    handleFirestoreError(new Error('Apenas o SuperAdmin pode remover profissionais parceiros.'), OperationType.DELETE, path);
    return;
  }

  try {
    await deleteDoc(doc(db, 'professionals', partnerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updatePartnerReferralCode(partnerId: string, newReferralCode: string): Promise<void> {
  const path = `professionals/${partnerId}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.WRITE, path);
    return;
  }

  try {
    const cleanCode = sanitizeText(newReferralCode, 60).toUpperCase().replace(/\s+/g, '-');
    await setDoc(doc(db, 'professionals', partnerId), { referralCode: cleanCode, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function findPartnerByReferralCode(rawCode: string): Promise<ProfessionalPartner | null> {
  if (!rawCode) return null;
  const normalized = rawCode.trim().toUpperCase().replace(/\s+/g, '-');
  const path = 'professionals';

  try {
    const q = query(collection(db, 'professionals'), where('referralCode', '==', normalized));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data();
      if (data.isActive !== false) {
        return {
          id: d.id,
          name: data.name,
          email: data.email,
          role: data.role,
          specialty: data.specialty,
          registrationNumber: data.registrationNumber,
          referralCode: data.referralCode,
          whatsapp: data.whatsapp,
          bio: data.bio,
          photoUrl: data.photoUrl,
          isActive: true,
          createdAt: data.createdAt,
          addedByAdmin: data.addedByAdmin
        };
      }
    }
    return null;
  } catch (error) {
    console.warn('Erro ao buscar parceiro por código:', error);
    return null;
  }
}

// ==========================================
// Patient Link Management (Exclusive Clinic Link)
// ==========================================

export async function createOrUpdatePatientLink(link: PatientLink): Promise<void> {
  const path = `patientLinks/${link.id}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.WRITE, path);
    return;
  }

  try {
    const payload = {
      patientUid: link.patientUid,
      patientEmail: sanitizeText(link.patientEmail, 150).toLowerCase(),
      patientName: sanitizeText(link.patientName, 100),
      clinicalTrack: link.clinicalTrack || undefined,
      professionalUid: link.professionalUid || '',
      professionalEmail: sanitizeText(link.professionalEmail, 150).toLowerCase(),
      professionalName: sanitizeText(link.professionalName, 100),
      professionalRole: link.professionalRole,
      referralCode: sanitizeText(link.referralCode, 50).toUpperCase(),
      discountPercentage: Number(link.discountPercentage || 0),
      monthlyPriceBrl: Number(link.monthlyPriceBrl || 0),
      status: link.status || 'active',
      linkedAt: link.linkedAt || new Date().toISOString(),
      notes: link.notes ? sanitizeText(link.notes, 1000) : ''
    };

    await setDoc(doc(db, 'patientLinks', link.id), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchPatientLinkForUser(patientUid: string): Promise<PatientLink | null> {
  const path = 'patientLinks';
  try {
    const q = query(
      collection(db, 'patientLinks'),
      where('patientUid', '==', patientUid),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      const data = d.data();
      return {
        id: d.id,
        patientUid: data.patientUid,
        patientEmail: data.patientEmail,
        patientName: data.patientName,
        clinicalTrack: data.clinicalTrack || undefined,
        professionalUid: data.professionalUid,
        professionalEmail: data.professionalEmail,
        professionalName: data.professionalName,
        professionalRole: data.professionalRole,
        referralCode: data.referralCode,
        discountPercentage: data.discountPercentage,
        monthlyPriceBrl: data.monthlyPriceBrl,
        status: data.status,
        linkedAt: data.linkedAt,
        notes: data.notes
      };
    }
    return null;
  } catch (error) {
    console.warn('Nenhum vínculo ativo encontrado:', error);
    return null;
  }
}

export async function fetchPatientsForProfessional(professionalEmail: string): Promise<PatientLink[]> {
  const path = 'patientLinks';
  try {
    const q = query(
      collection(db, 'patientLinks'),
      where('professionalEmail', '==', professionalEmail.trim().toLowerCase()),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    const list: PatientLink[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        patientUid: data.patientUid,
        patientEmail: data.patientEmail,
        patientName: data.patientName,
        clinicalTrack: data.clinicalTrack || undefined,
        professionalUid: data.professionalUid,
        professionalEmail: data.professionalEmail,
        professionalName: data.professionalName,
        professionalRole: data.professionalRole,
        referralCode: data.referralCode,
        discountPercentage: data.discountPercentage,
        monthlyPriceBrl: data.monthlyPriceBrl,
        status: data.status,
        linkedAt: data.linkedAt,
        notes: data.notes
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function archiveOrUnlinkPatient(linkId: string): Promise<void> {
  const path = `patientLinks/${linkId}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.UPDATE, path);
    return;
  }

  try {
    await updateDoc(doc(db, 'patientLinks', linkId), {
      status: 'archived',
      archivedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Fetch complete clinical dossier for a linked patient
export async function fetchPatientClinicalDossier(patientUid: string) {
  try {
    const [profile, readings, meals, weights] = await Promise.all([
      fetchUserProfileFromFirestore(patientUid),
      fetchGlucoseReadingsFromFirestore(patientUid),
      fetchMealLogsFromFirestore(patientUid),
      fetchWeightLogsFromFirestore(patientUid)
    ]);

    return {
      profile,
      readings,
      meals,
      weights
    };
  } catch (error) {
    console.error('Erro ao carregar prontuário do paciente:', error);
    return null;
  }
}

// ==========================================
// Patient <-> Specialist Consultation Messaging
// ==========================================

export async function sendConsultationMessage(msg: ConsultationMessage): Promise<void> {
  const path = `consultationMessages/${msg.id}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.CREATE, path);
    return;
  }

  try {
    const cleanPayload = {
      ...msg,
      timestamp: msg.timestamp || new Date().toISOString(),
      readByRecipient: msg.readByRecipient ?? false
    };
    await setDoc(doc(db, 'consultationMessages', msg.id), cleanPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchConsultationMessages(patientUid: string, professionalEmail?: string): Promise<ConsultationMessage[]> {
  try {
    const q = query(
      collection(db, 'consultationMessages'),
      where('patientUid', '==', patientUid),
      orderBy('timestamp', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ConsultationMessage);
  } catch (error) {
    console.warn('Consultation messages query error:', error);
    return [];
  }
}

export async function markConsultationMessagesAsRead(patientUid: string, readerRole: 'patient' | 'professional'): Promise<void> {
  try {
    const senderToMark = readerRole === 'patient' ? 'professional' : 'patient';
    const q = query(
      collection(db, 'consultationMessages'),
      where('patientUid', '==', patientUid),
      where('sender', '==', senderToMark)
    );
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map(d => updateDoc(d.ref, { readByRecipient: true }));
    await Promise.all(updates);
  } catch (error) {
    console.warn('Error marking messages as read:', error);
  }
}

// ==========================================
// Nutritionist & Doctor Private Clinical Notes
// ==========================================

export async function savePatientClinicalNote(note: ClinicalNote): Promise<void> {
  const path = `clinicalNotes/${note.id}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.CREATE, path);
    return;
  }

  try {
    const payload = {
      ...note,
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'clinicalNotes', note.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchPatientClinicalNotes(patientUid: string, professionalEmail?: string): Promise<ClinicalNote[]> {
  try {
    let q;
    if (professionalEmail) {
      q = query(
        collection(db, 'clinicalNotes'),
        where('patientUid', '==', patientUid),
        where('professionalEmail', '==', professionalEmail.trim().toLowerCase()),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'clinicalNotes'),
        where('patientUid', '==', patientUid),
        orderBy('createdAt', 'desc')
      );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as ClinicalNote);
  } catch (error) {
    console.warn('Error fetching clinical notes:', error);
    return [];
  }
}

export async function deletePatientClinicalNote(noteId: string): Promise<void> {
  const path = `clinicalNotes/${noteId}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.DELETE, path);
    return;
  }

  try {
    await deleteDoc(doc(db, 'clinicalNotes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updatePatientLinkNotes(linkId: string, notes: string): Promise<void> {
  const path = `patientLinks/${linkId}`;
  if (!validateCsrfAndOrigin()) {
    handleFirestoreError(new Error('CSRF/Origin Validation Failed'), OperationType.UPDATE, path);
    return;
  }

  try {
    await updateDoc(doc(db, 'patientLinks', linkId), {
      notes: notes.trim(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}


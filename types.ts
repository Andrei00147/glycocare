export enum DiabetesType {
  Type1 = "Tipo 1",
  Type2 = "Tipo 2",
  Gestational = "Gestacional",
  Other = "Outro",
}

export interface Reminder { // Glucose Reminders
  id: string;
  name: string;
  time: string; // HH:mm format
  isActive: boolean;
}

export interface OralMedication {
  id: string;
  name: string;
  stock: number;
  threshold: number;
  dailyDoses: number;
  source?: string;
  cost?: number;
  expiryDate?: string;
}

export interface MedicationReminder {
  id: string;
  medicationName: string;
  time: string;
  dose: string;
  isActive: boolean;
}

export interface UserProfile {
  name: string;
  diabetesType: DiabetesType;
  diagnosisDate: string;
  useInsulin: boolean;
  insulinType?: string;
  dailyDoses?: number;
  useOralMedication: boolean;
  oralMedications?: OralMedication[];
  medicationReminders?: MedicationReminder[];
  glucoseTargetMin: number;
  glucoseTargetMax: number;
  measurementFrequency: number;
  insulinStockPens?: number;
  insulinUnitsPerPen?: number;
  averageDailyUnits?: number;
  currentInsulinStockUnits?: number;
  insulinStockThreshold?: number; // This can now be deprecated in favor of dynamic calculation
  reminders: Reminder[];
  remindersGloballyActive: boolean;
  theme: 'light' | 'dark';
}

export enum View {
  Onboarding,
  Dashboard,
  Reports,
  StockManagement,
  CommunityRecipes,
  Settings,
  Feedback,
}

export interface GlucoseReading {
  value: number;
  timestamp: Date;
}

export interface InsulinDose {
    units: number;
    timestamp: Date;
}

export interface FoodAnalysisResult {
    foodItems: string[];
    carbohydrates: number;
    calories: number;
    sugars: number;
    fats: number;
    proteins: number;
    smartAlert: string;
    mealTimingAdvice: string;
}

export interface Recipe {
  id: string;
  title: string;
  author: string;
  description: string;
  ingredients: string;
  instructions: string;
  carbohydrates: number;
  calories: number;
  externalLink?: string;
}
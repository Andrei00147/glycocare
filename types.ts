export enum DiabetesType {
  None = "Não tenho diabetes (Saúde & Prevenção)",
  PreDiabetes = "Pré-diabetes",
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

export interface BioimpedanceData {
  date?: string;
  bodyFatPercentage?: number; // %
  muscleMassKg?: number; // kg de massa magra/muscular
  visceralFatLevel?: number; // nível 1-59
  basalMetabolicRateKcal?: number; // TMB em kcal
  waterPercentage?: number; // % de água corporal
  professionalName?: string; // Nome do Nutricionista / Médico
  professionalNotes?: string; // Observações e orientações do profissional
}

export interface UserProfile {
  name: string;
  diabetesType: DiabetesType;
  weightKg?: number;
  heightCm?: number;
  healthGoal?: string; // e.g. "Prevenção de Diabetes", "Perda de Peso", "Controle de Açúcar", "Ganho Muscular", "Saúde e Bem-Estar"
  bioimpedance?: BioimpedanceData;
  diagnosisDate?: string;
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
  insulinStockThreshold?: number;
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

export interface WeightLog {
  id: string;
  weightKg: number;
  timestamp: Date;
  notes?: string;
}

export interface MealLog {
  id: string;
  name?: string;
  carbohydrates: number;
  sugars: number;
  proteins?: number;
  fats?: number;
  calories?: number;
  timestamp: Date;
}

export interface SmartMealPairing {
  title: string;
  description: string;
  carbohydrates: number;
  sugars: number;
  proteins: number;
  fats: number;
  calories: number;
  pairingReason: string;
}

export interface SmartMealSuggestionResult {
  glucoseContextSummary: string;
  suggestions: SmartMealPairing[];
}

export interface GoalEvaluationResult {
  status: 'positive' | 'warning' | 'neutral';
  scoreTitle: string;
  detailedFeedback: string;
  suggestedNextStep: string;
}
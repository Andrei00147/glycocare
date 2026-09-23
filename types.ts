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
  category?: 'medication' | 'supplement';
  brand?: string; // Marca / Patrocinador (ex: Growth, Max Titanium, IntegralMedica, Dux, etc.)
  unit?: 'comprimidos' | 'cápsulas' | 'scoops' | 'doses' | 'gramas' | 'sachês' | 'gotas' | 'unidades';
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

export type ClinicalTrack = 'diabetes' | 'nutrition';

export interface UserProfile {
  name: string;
  diabetesType: DiabetesType;
  clinicalTrack?: ClinicalTrack;
  weightKg?: number;
  heightCm?: number;
  targetWeightKg?: number;
  targetMuscleMassKg?: number;
  targetBodyFatPercentage?: number;
  healthGoal?: string; // e.g. "Prevenção de Diabetes", "Perda de Peso", "Controle de Açúcar", "Ganho Muscular", "Saúde e Bem-Estar"
  bioimpedance?: BioimpedanceData;
  diagnosisDate?: string;
  useInsulin: boolean;
  insulinType?: string;
  dailyDoses?: number;
  useOralMedication: boolean;
  trackSupplements?: boolean; // Usuários que desejam gerenciar estoque de suplementos/vitaminas (Whey, Creatina, etc.)
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
  role?: UserRole;
  referralCode?: string;
  referredByProfessionalId?: string;
  referredByProfessionalName?: string;
  referredByProfessionalRole?: 'Nutricionista' | 'Médico';
  discountPercentage?: number;
  monthlyPlanPrice?: number;
}

export enum View {
  Onboarding,
  Dashboard,
  Reports,
  StockManagement,
  CommunityRecipes,
  Settings,
  Feedback,
  PrivacyPolicy,
  TermsOfService,
  CookiePolicy,
  AdminPartners,
  ProfessionalPortal,
  PricingPlans,
}

export type UserRole = 'patient' | 'nutritionist' | 'doctor' | 'admin';

export interface ProfessionalPartner {
  id: string;
  name: string;
  email: string;
  role: 'Nutricionista' | 'Médico';
  specialty: string;
  registrationNumber: string; // CRN or CRM
  referralCode: string;
  defaultTrack?: ClinicalTrack;
  whatsapp?: string;
  bio: string;
  photoUrl?: string;
  isActive: boolean;
  assignedUid?: string;
  createdAt: string;
  addedByAdmin: string;
  totalPatients?: number;
}

export interface PatientLink {
  id: string;
  patientUid: string;
  patientEmail: string;
  patientName: string;
  clinicalTrack?: ClinicalTrack;
  professionalUid?: string;
  professionalEmail: string;
  professionalName: string;
  professionalRole: 'Nutricionista' | 'Médico';
  referralCode: string;
  discountPercentage: number; // 65 for nutri, 70 for doctor
  monthlyPriceBrl: number; // 12.25 or 10.50
  status: 'active' | 'archived';
  linkedAt: string;
  notes?: string;
}

export interface ConsultationMessage {
  id: string;
  patientUid: string;
  patientEmail: string;
  patientName: string;
  professionalEmail: string;
  professionalName: string;
  sender: 'patient' | 'professional';
  message: string;
  timestamp: string;
  category?: 'doubt' | 'meal_adjustment' | 'glucose_alert' | 'prescription' | 'general';
  readByRecipient?: boolean;
}

export interface ClinicalNote {
  id: string;
  patientUid: string;
  patientEmail: string;
  patientName: string;
  professionalEmail: string;
  professionalName: string;
  note: string;
  category?: 'evolution' | 'dietary_plan' | 'glucose_alert' | 'weight_goal' | 'general';
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface PricingPlanTier {
  id: string;
  name: string;
  description: string;
  regularPriceMonthly: number;
  regularPriceAnnualMonthly: number;
  discountedPriceMonthly?: number;
  discountPercent?: number;
  badge?: string;
  features: string[];
  recommendedFor: string;
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
  isDeleted?: boolean;
  deletionReason?: string;
  deletedAt?: Date;
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

export interface PartnerSpecialist {
  id: string;
  name: string;
  role: 'Médico' | 'Nutricionista' | 'Personal Trainer';
  specialty: string;
  registrationNumber: string;
  photoUrl?: string;
  bio: string;
  whatsapp?: string;
  supportsMonthlyMonitoring: boolean;
  rating: number;
}
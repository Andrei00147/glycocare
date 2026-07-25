import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, GlucoseReading, View, Reminder, MedicationReminder, MealLog, GoalEvaluationResult } from '../types';
import FoodAnalyzer from './FoodAnalyzer';
import DoseRegistrationModal from './DoseRegistrationModal';
import GlucoseRegistrationModal from './GlucoseRegistrationModal';
import MealRegistrationModal from './MealRegistrationModal';
import DailyTip from './DailyTip';
import { evaluateMealsAgainstGoal } from '../services/geminiService';

interface DashboardProps {
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  navigateTo: (view: View) => void;
  glucoseReadings: GlucoseReading[];
  onAddGlucoseReading: (value: number, timestamp: Date) => void;
  mealLogs: MealLog[];
  onAddMealLog: (carbs: number, sugars: number, name?: string, proteins?: number, fats?: number, calories?: number) => void;
  onRemoveMealLog: (id: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

interface AlertProps {
  onManageStock: () => void;
  messages: string[];
  severity: 'warning' | 'critical';
}

const Alert: React.FC<AlertProps> = ({ onManageStock, messages, severity }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const config = {
        warning: {
            bg: 'bg-yellow-500 dark:bg-yellow-600',
            icon: 'fa-exclamation-triangle',
            text: 'text-white',
            buttonBg: 'bg-white',
            buttonText: 'text-yellow-600',
            title: 'ALERTA DE ESTOQUE BAIXO'
        },
        critical: {
            bg: 'bg-red-600 dark:bg-red-700',
            icon: 'fa-exclamation-circle',
            text: 'text-white',
            buttonBg: 'bg-white',
            buttonText: 'text-red-600',
            title: 'ALERTA DE ESTOQUE CRÍTICO'
        }
    };

    const currentConfig = config[severity];

    return (
        <div
            className={`sticky top-0 z-40 ${currentConfig.bg} ${currentConfig.text} p-3 shadow-xl flex items-center justify-between transform transition-all duration-700 ease-out ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'}`}
            role="alert"
        >
            <div className="flex items-center">
                <i className={`fas ${currentConfig.icon} text-3xl mr-4 animate-pulse`}></i>
                <div>
                    <p className="font-bold text-lg tracking-wide">{currentConfig.title}</p>
                    <ul className="text-sm list-disc list-inside">
                        {messages.map((msg, idx) => <li key={idx}>{msg}</li>)}
                    </ul>
                </div>
            </div>
            <button
                onClick={onManageStock}
                className={`${currentConfig.buttonBg} ${currentConfig.buttonText} font-bold py-2 px-4 rounded-md text-sm hover:bg-opacity-90 transition-colors whitespace-nowrap ml-4 flex-shrink-0`}
            >
                Gerenciar Estoque
            </button>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ userProfile, updateUserProfile, navigateTo, glucoseReadings, onAddGlucoseReading, mealLogs, onAddMealLog, onRemoveMealLog, theme, toggleTheme }) => {
  const [dailyInsulinDoses, setDailyInsulinDoses] = useState(0);
  const [isAnalyzerOpen, setAnalyzerOpen] = useState(false);
  const [isDoseModalOpen, setDoseModalOpen] = useState(false);
  const [isGlucoseModalOpen, setGlucoseModalOpen] = useState(false);
  const [isMealModalOpen, setMealModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<{id: string, severity: 'warning' | 'critical', message: string}[]>([]);

  // AI Goal Evaluation state
  const [goalEvaluation, setGoalEvaluation] = useState<GoalEvaluationResult | null>(null);
  const [isEvaluatingGoal, setIsEvaluatingGoal] = useState(false);
  const [goalEvaluationError, setGoalEvaluationError] = useState<string | null>(null);

  const lastGlucose = useMemo(() => {
    if (glucoseReadings.length === 0) return null;
    return glucoseReadings[glucoseReadings.length - 1];
  }, [glucoseReadings]);

  const todayMealLogs = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return (mealLogs || []).filter(m => new Date(m.timestamp) >= startOfDay);
  }, [mealLogs]);

  const carbsToday = useMemo(() => {
    return todayMealLogs.reduce((acc, curr) => acc + (Number(curr.carbohydrates) || 0), 0);
  }, [todayMealLogs]);

  const sugarsToday = useMemo(() => {
    return todayMealLogs.reduce((acc, curr) => acc + (Number(curr.sugars) || 0), 0);
  }, [todayMealLogs]);

  const proteinsToday = useMemo(() => {
    return todayMealLogs.reduce((acc, curr) => acc + (Number(curr.proteins) || 0), 0);
  }, [todayMealLogs]);

  const fatsToday = useMemo(() => {
    return todayMealLogs.reduce((acc, curr) => acc + (Number(curr.fats) || 0), 0);
  }, [todayMealLogs]);

  const caloriesToday = useMemo(() => {
    return todayMealLogs.reduce((acc, curr) => acc + (Number(curr.calories) || 0), 0);
  }, [todayMealLogs]);

  const handleEvaluateGoals = async () => {
    if (todayMealLogs.length === 0) {
      setGoalEvaluationError("Registre pelo menos uma refeição hoje para a IA avaliar seu progresso!");
      return;
    }
    setIsEvaluatingGoal(true);
    setGoalEvaluationError(null);
    try {
      const result = await evaluateMealsAgainstGoal(userProfile, todayMealLogs);
      setGoalEvaluation({ ...result, evaluatedAt: new Date() });
    } catch (err: any) {
      console.error('Goal evaluation error:', err);
      setGoalEvaluationError(err.message || "Não foi possível analisar os objetivos no momento.");
    } finally {
      setIsEvaluatingGoal(false);
    }
  };
  
  useEffect(() => {
    const newAlerts: {id: string, severity: 'warning' | 'critical', message: string}[] = [];
    const averageDailyUnits = userProfile.averageDailyUnits || 0;
    
    // Insulin Alerts
    if (userProfile.useInsulin && averageDailyUnits > 0) {
      const remainingUnits = userProfile.currentInsulinStockUnits || 0;
      const criticalThreshold = averageDailyUnits * 3;
      const warningThreshold = averageDailyUnits * 5;
      
      if (remainingUnits <= criticalThreshold) {
        newAlerts.push({id: 'insulin', severity: 'critical', message: `Insulina suficiente para ~3 dias ou menos.`});
      } else if (remainingUnits <= warningThreshold) {
        newAlerts.push({id: 'insulin', severity: 'warning', message: `Insulina suficiente para ~5 dias.`});
      }
    }

    // Oral Medication Alerts
    if(userProfile.useOralMedication && userProfile.oralMedications) {
        userProfile.oralMedications.forEach(med => {
            if(med.stock <= med.threshold) {
                newAlerts.push({id: med.id, severity: 'warning', message: `Estoque de ${med.name} está baixo (${med.stock} unidades).`});
            }
        });
    }

    setAlerts(newAlerts);

  }, [userProfile]);


  const handleRegisterDose = (units: number) => {
    if (!userProfile.useInsulin) return;
    
    const oldStock = userProfile.currentInsulinStockUnits || 0;
    const newStock = oldStock - units;

    const updatedProfile = { ...userProfile, currentInsulinStockUnits: newStock < 0 ? 0 : newStock };
    updateUserProfile(updatedProfile);
    setDailyInsulinDoses(prev => prev + units);
    setDoseModalOpen(false);
  };

  const handleRegisterGlucose = (value: number, timestamp: Date) => {
      onAddGlucoseReading(value, timestamp);
      setGlucoseModalOpen(false);
  };

  const handleToggleAllReminders = () => {
      updateUserProfile({ remindersGloballyActive: !userProfile.remindersGloballyActive });
  };

  const nextReminder = useMemo(() => {
    if (!userProfile.remindersGloballyActive) return null;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const activeGlucoseReminders = (userProfile.reminders || [])
        .filter(r => r.isActive)
        .map(r => ({ ...r, type: 'Glicose' }));

    const activeMedicationReminders = (userProfile.medicationReminders || [])
        .filter(r => r.isActive)
        .map(r => ({...r, type: 'Medicação', name: r.medicationName}));

    const allReminders = [...activeGlucoseReminders, ...activeMedicationReminders]
        .sort((a, b) => a.time.localeCompare(b.time));

    if (allReminders.length === 0) return null;

    const upcomingToday = allReminders.find(r => r.time > currentTime);

    return upcomingToday || allReminders[0];
  }, [userProfile.reminders, userProfile.medicationReminders, userProfile.remindersGloballyActive]);
  
  const FAB: React.FC<{ icon: string; onClick: () => void; label: string; }> = ({ icon, onClick, label }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center bg-teal-500 text-white w-16 h-16 rounded-full shadow-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform hover:scale-110 transition-transform duration-200">
        <i className={`fas ${icon} text-2xl`}></i>
        <span className="text-xs mt-1">{label}</span>
    </button>
  );

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');


  return (
    <div className="pb-24">
       {criticalAlerts.length > 0 && (
          <Alert onManageStock={() => navigateTo(View.StockManagement)} messages={criticalAlerts.map(a => a.message)} severity="critical" />
       )}
       {warningAlerts.length > 0 && (
          <Alert onManageStock={() => navigateTo(View.StockManagement)} messages={warningAlerts.map(a => a.message)} severity="warning" />
       )}
      
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Olá, {userProfile.name}!</h1>
            <p className="text-gray-600 dark:text-gray-400">Aqui está o resumo do seu dia.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
            <button 
                onClick={handleToggleAllReminders}
                className="relative text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                aria-label="Ativar/Desativar Lembretes"
            >
                <i className={`fas ${userProfile.remindersGloballyActive ? 'fa-bell' : 'fa-bell-slash'} text-2xl`}></i>
            </button>
            <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition" aria-label="Mudar Tema">
                <i className={`fas ${theme === 'light' ? 'fa-moon' : 'fa-sun'} text-2xl`}></i>
            </button>
            <button onClick={() => navigateTo(View.Reports)} className="text-teal-500 hover:text-teal-700 p-2 rounded-full hover:bg-teal-50 dark:hover:bg-gray-700 transition" aria-label="Relatórios">
                <i className="fas fa-chart-line text-2xl"></i>
            </button>
            <button onClick={() => navigateTo(View.Settings)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition" aria-label="Ajustes">
                <i className="fas fa-cog text-2xl"></i>
            </button>
        </div>
      </header>

      <main className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tip of the Day Widget */}
        <div className="md:col-span-2 lg:col-span-3">
          <DailyTip />
        </div>

        {/* Daily Summary Widget */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b dark:border-gray-700 gap-2">
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <i className="fas fa-chart-pie text-teal-500"></i>
                  Resumo Nutricional de Hoje
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhamento de carboidratos, açúcares, proteínas, gorduras e calorias</p>
              </div>
              <button
                onClick={() => setMealModalOpen(true)}
                className="text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <i className="fas fa-utensils"></i>
                Registrar Refeição
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              {/* Última Glicemia */}
              <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-100 dark:border-teal-900/50 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider mb-1">Glicemia</span>
                  {lastGlucose ? (
                      <>
                          <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">{lastGlucose.value} <span className="text-xs font-normal">mg/dL</span></p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{lastGlucose.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </>
                  ) : <p className="text-sm font-medium text-gray-400 my-1">N/A</p>}
              </div>

              {/* Carboidratos Totais */}
              <div className="p-3 bg-orange-50/60 dark:bg-orange-950/30 rounded-xl border border-orange-100 dark:border-orange-900/50 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-1">Carboidratos</span>
                  <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400">{carbsToday.toFixed(0)} <span className="text-xs font-normal">g</span></p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{todayMealLogs.length} refeições</p>
              </div>

              {/* Açúcares / Glicose */}
              <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900/50 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1">
                    Açúcares
                  </span>
                  <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{sugarsToday.toFixed(0)} <span className="text-xs font-normal">g</span></p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Simples/adição</p>
              </div>

              {/* Proteínas */}
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1">
                    Proteínas
                  </span>
                  <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{proteinsToday.toFixed(0)} <span className="text-xs font-normal">g</span></p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Construção</p>
              </div>

              {/* Gorduras */}
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl border border-amber-100 dark:border-amber-900/50 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1">
                    Gorduras
                  </span>
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{fatsToday.toFixed(0)} <span className="text-xs font-normal">g</span></p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Saciantes</p>
              </div>

              {/* Calorias */}
              <div className="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">
                    Calorias
                  </span>
                  <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">{caloriesToday.toFixed(0)} <span className="text-xs font-normal">kcal</span></p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Energia total</p>
              </div>
            </div>
        </div>

        {/* AI Goal Progress Evaluation Widget */}
        <div className="md:col-span-2 lg:col-span-3 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl shadow-lg p-5 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/20 pb-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <i className="fas fa-bullseye text-2xl text-yellow-300"></i>
                <h3 className="font-bold text-lg">Análise do Seu Objetivo de Saúde (IA)</h3>
              </div>
              <p className="text-xs text-white/90 mt-1">
                Sua meta atual: <span className="font-bold underline">{userProfile.healthGoal || 'Prevenção de Diabetes & Saúde'}</span> 
                {userProfile.weightKg && ` • Peso: ${userProfile.weightKg}kg`}
                {userProfile.heightCm && ` • Altura: ${userProfile.heightCm}cm`}
              </p>
            </div>
            <button
              onClick={handleEvaluateGoals}
              disabled={isEvaluatingGoal}
              className="bg-white text-teal-700 font-bold px-4 py-2 rounded-lg hover:bg-teal-50 transition text-xs shadow flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              {isEvaluatingGoal ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Analisando...
                </>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles text-amber-500"></i>
                  Avaliar Minhas Refeições com IA
                </>
              )}
            </button>
          </div>

          {goalEvaluationError && (
            <div className="bg-red-500/80 text-white p-3 rounded-lg text-xs font-medium mb-2">
              ⚠️ {goalEvaluationError}
            </div>
          )}

          {goalEvaluation ? (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20 space-y-2">
              <div className="flex items-center gap-2">
                {goalEvaluation.status === 'positive' && (
                  <span className="bg-emerald-400 text-emerald-950 text-xs font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                    <i className="fas fa-check-circle"></i> Perto do Objetivo
                  </span>
                )}
                {goalEvaluation.status === 'warning' && (
                  <span className="bg-amber-400 text-amber-950 text-xs font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                    <i className="fas fa-exclamation-triangle"></i> Atenção Requerida
                  </span>
                )}
                {goalEvaluation.status === 'neutral' && (
                  <span className="bg-blue-300 text-blue-950 text-xs font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1">
                    <i className="fas fa-info-circle"></i> Em Progresso
                  </span>
                )}
                <h4 className="font-bold text-base text-white">{goalEvaluation.scoreTitle}</h4>
              </div>

              <p className="text-sm text-white/95 leading-relaxed">
                {goalEvaluation.detailedFeedback}
              </p>

              <div className="bg-white/20 p-3 rounded-lg border border-white/20 text-xs text-white">
                💡 <strong>Próximo Passo Recomendado:</strong> {goalEvaluation.suggestedNextStep}
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/80 italic">
              Clique no botão acima para a IA calcular se o que você comeu hoje está te aproximando ou afastando do seu objetivo ({userProfile.healthGoal || 'Prevenção'}).
            </p>
          )}
        </div>

        {/* Bioimpedance & Clinical Guidance Widget */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3 pb-2 border-b dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-lg">
                <i className="fas fa-weight-scale text-lg"></i>
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  Bioimpedância Clínica
                  {userProfile.bioimpedance?.professionalName && (
                    <span className="text-[11px] font-normal text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                      <i className="fas fa-user-doctor mr-1"></i>
                      {userProfile.bioimpedance.professionalName}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {userProfile.bioimpedance?.date ? `Avaliação de ${userProfile.bioimpedance.date}` : 'Acompanhada pelo seu nutricionista/médico'}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate(View.Settings)}
              className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-xs font-semibold flex items-center gap-1 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800/60"
            >
              <i className="fas fa-edit"></i>
              {userProfile.bioimpedance?.bodyFatPercentage ? 'Atualizar Dados' : 'Cadastrar Exame'}
            </button>
          </div>

          {userProfile.bioimpedance?.bodyFatPercentage || userProfile.bioimpedance?.basalMetabolicRateKcal || userProfile.bioimpedance?.professionalNotes ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Gordura Corporal</span>
                  <span className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                    {userProfile.bioimpedance.bodyFatPercentage !== undefined ? `${userProfile.bioimpedance.bodyFatPercentage}%` : '--'}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Massa Magra</span>
                  <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                    {userProfile.bioimpedance.muscleMassKg !== undefined ? `${userProfile.bioimpedance.muscleMassKg} kg` : '--'}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Gordura Visceral</span>
                  <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                    {userProfile.bioimpedance.visceralFatLevel !== undefined ? `Nível ${userProfile.bioimpedance.visceralFatLevel}` : '--'}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Taxa Metab. Basal</span>
                  <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                    {userProfile.bioimpedance.basalMetabolicRateKcal !== undefined ? `${userProfile.bioimpedance.basalMetabolicRateKcal} kcal` : '--'}
                  </span>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Água Corporal</span>
                  <span className="text-base font-extrabold text-cyan-600 dark:text-cyan-400">
                    {userProfile.bioimpedance.waterPercentage !== undefined ? `${userProfile.bioimpedance.waterPercentage}%` : '--'}
                  </span>
                </div>
              </div>

              {userProfile.bioimpedance.professionalNotes && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                    <i className="fas fa-clipboard-user"></i>
                    Orientações do Seu Profissional:
                  </p>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 italic leading-relaxed">
                    "{userProfile.bioimpedance.professionalNotes}"
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mb-2">
                Nenhum resultado de bioimpedância cadastrado ainda.
              </p>
              <p className="text-[11px] text-gray-400 mb-3 max-w-lg mx-auto">
                Ao cadastrar a % de gordura, massa magra, TMB e orientações do seu profissional, nossa IA cruzará estes dados com suas refeições para fornecer análises ainda mais assertivas.
              </p>
              <button
                onClick={() => onNavigate(View.Settings)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs shadow transition inline-flex items-center gap-1.5"
              >
                <i className="fas fa-plus-circle"></i>
                Cadastrar Bioimpedância em Ajustes
              </button>
            </div>
          )}
        </div>

        {/* Refeições Registradas Hoje */}
        {todayMealLogs.length > 0 && (
          <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <i className="fas fa-list-ul text-orange-500"></i>
              Refeições Registradas Hoje ({todayMealLogs.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {todayMealLogs.map(meal => (
                <div key={meal.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/60 p-3 rounded-lg border dark:border-gray-600">
                  <div className="overflow-hidden mr-2">
                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                      {meal.name || 'Refeição'}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-1">
                      {meal.proteins ? <span className="text-blue-600 dark:text-blue-400">{meal.proteins}g Prot</span> : null}
                      {meal.fats ? <span className="text-amber-600 dark:text-amber-400">{meal.fats}g Gord</span> : null}
                      {meal.calories ? <span className="text-purple-600 dark:text-purple-400">{meal.calories} kcal</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-orange-600 dark:text-orange-400">
                        {meal.carbohydrates}g Carbs
                      </div>
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {meal.sugars || 0}g Açúcar
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveMealLog(meal.id)}
                      className="text-gray-400 hover:text-red-500 transition text-sm p-1 ml-1"
                      title="Excluir este registro"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insulin Stock Widget */}
        {userProfile.useInsulin && (
             <button onClick={() => navigateTo(View.StockManagement)} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md text-left w-full hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">ESTOQUE DE INSULINA</h2>
                <p className="text-4xl font-bold text-indigo-500 dark:text-indigo-400">{userProfile.currentInsulinStockUnits || 0} <span className="text-lg font-normal">UI</span></p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Unidades restantes</p>
            </button>
        )}

        {/* Reminders Widget */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">PRÓXIMO LEMBRETE</h2>
            {nextReminder ? (
                <div className="flex items-center">
                    <i className={`fas ${nextReminder.type === 'Glicose' ? 'fa-tint' : 'fa-pills'} text-2xl text-blue-500 dark:text-blue-400 mr-3`}></i>
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{nextReminder.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Às {nextReminder.time}</p>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                     <i className={`fas ${userProfile.remindersGloballyActive ? 'fa-check-circle' : 'fa-bell-slash'} text-2xl ${userProfile.remindersGloballyActive ? 'text-green-500' : 'text-yellow-500'} mb-2`}></i>
                    <p className="text-sm">{userProfile.remindersGloballyActive ? 'Nenhum lembrete para hoje.' : 'Lembretes desativados.'} <br/> <a href="#" onClick={(e) => { e.preventDefault(); navigateTo(View.Settings); }} className="text-teal-500 font-semibold">Configure</a></p>
                </div>
            )}
        </div>
        
        {/* This is a spacer to fill the grid if the user doesn't use insulin */}
        {!userProfile.useInsulin && <div className="hidden lg:block"></div>}
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="max-w-lg mx-auto flex justify-around">
            <FAB icon="fa-plus-circle" onClick={() => setGlucoseModalOpen(true)} label="Glicose" />
            <FAB icon="fa-utensils" onClick={() => setMealModalOpen(true)} label="Refeição" />
            <FAB icon="fa-camera" onClick={() => setAnalyzerOpen(true)} label="Analisar IA" />
            <FAB icon="fa-syringe" onClick={() => userProfile.useInsulin ? setDoseModalOpen(true) : alert('Função para usuários de insulina.')} label="Dose" />
            <FAB icon="fa-book-open" onClick={() => navigateTo(View.CommunityRecipes)} label="Receitas" />
        </div>
      </div>
      
      {isAnalyzerOpen && (
          <FoodAnalyzer userProfile={userProfile} onClose={() => setAnalyzerOpen(false)} onAnalysisComplete={(result) => {
              onAddMealLog(result.carbohydrates, result.sugars, result.foodItems.join(', '), result.proteins, result.fats, result.calories);
              setAnalyzerOpen(false);
          }} />
      )}

      {isMealModalOpen && (
          <MealRegistrationModal
            onClose={() => setMealModalOpen(false)}
            onRegister={(carbs, sugars, name, proteins, fats, calories) => {
              onAddMealLog(carbs, sugars, name, proteins, fats, calories);
              setMealModalOpen(false);
            }}
          />
      )}

      {isDoseModalOpen && (
          <DoseRegistrationModal 
            onClose={() => setDoseModalOpen(false)}
            onRegister={handleRegisterDose}
          />
      )}

      {isGlucoseModalOpen && (
          <GlucoseRegistrationModal
            onClose={() => setGlucoseModalOpen(false)}
            onRegister={handleRegisterGlucose}
           />
      )}
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, GlucoseReading, View, Reminder, MedicationReminder } from '../types';
import FoodAnalyzer from './FoodAnalyzer';
import DoseRegistrationModal from './DoseRegistrationModal';
import GlucoseRegistrationModal from './GlucoseRegistrationModal';

interface DashboardProps {
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  navigateTo: (view: View) => void;
  glucoseReadings: GlucoseReading[];
  onAddGlucoseReading: (value: number, timestamp: Date) => void;
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


const Dashboard: React.FC<DashboardProps> = ({ userProfile, updateUserProfile, navigateTo, glucoseReadings, onAddGlucoseReading, theme, toggleTheme }) => {
  const [carbsToday, setCarbsToday] = useState(0);
  const [dailyInsulinDoses, setDailyInsulinDoses] = useState(0);
  const [isAnalyzerOpen, setAnalyzerOpen] = useState(false);
  const [isDoseModalOpen, setDoseModalOpen] = useState(false);
  const [isGlucoseModalOpen, setGlucoseModalOpen] = useState(false);
  const [alerts, setAlerts] = useState<{id: string, severity: 'warning' | 'critical', message: string}[]>([]);

  const lastGlucose = useMemo(() => {
    if (glucoseReadings.length === 0) return null;
    return glucoseReadings[glucoseReadings.length - 1];
  }, [glucoseReadings]);
  
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
        {/* Daily Summary Widget */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-around items-center text-center">
            <div className="p-2 w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">ÚLTIMA GLICEMIA</h2>
                {lastGlucose ? (
                    <>
                        <p className="text-4xl font-bold text-teal-600 dark:text-teal-400">{lastGlucose.value} <span className="text-lg font-normal">mg/dL</span></p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{lastGlucose.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </>
                ) : <p className="text-lg text-gray-500">N/A</p>}
            </div>
            <div className="p-2 w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-gray-700">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">CARBOIDRATOS (HOJE)</h2>
                <p className="text-4xl font-bold text-orange-500 dark:text-orange-400">{carbsToday} <span className="text-lg font-normal">g</span></p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Nenhum registro hoje</p>
            </div>
            <div className="p-2 w-full sm:w-1/3">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">INSULINA (HOJE)</h2>
                <p className="text-4xl font-bold text-indigo-500 dark:text-indigo-400">{dailyInsulinDoses} <span className="text-lg font-normal">UI</span></p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma dose hoje</p>
            </div>
        </div>

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
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-lg mx-auto flex justify-around">
            <FAB icon="fa-plus-circle" onClick={() => setGlucoseModalOpen(true)} label="Glicose" />
            <FAB icon="fa-camera" onClick={() => setAnalyzerOpen(true)} label="Analisar" />
            <FAB icon="fa-syringe" onClick={() => userProfile.useInsulin ? setDoseModalOpen(true) : alert('Função para usuários de insulina.')} label="Dose" />
            <FAB icon="fa-book-open" onClick={() => navigateTo(View.CommunityRecipes)} label="Receitas" />
        </div>
      </div>
      
      {isAnalyzerOpen && (
          <FoodAnalyzer userProfile={userProfile} onClose={() => setAnalyzerOpen(false)} onAnalysisComplete={(result) => {
              setCarbsToday(prev => prev + result.carbohydrates);
              setAnalyzerOpen(false);
          }} />
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
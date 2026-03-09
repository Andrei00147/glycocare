import React, { useState, useMemo } from 'react';
import { UserProfile, DiabetesType, Reminder, GlucoseReading, OralMedication } from '../types';

interface OnboardingProps {
  onComplete: (profile: UserProfile, initialGlucose?: GlucoseReading) => void;
}

// Helper Components defined outside the main component to prevent re-creation on re-renders.
const AnimatedStep: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="animate-fade-in-up w-full max-w-md">{children}</div>
);

const QuestionCard: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl shadow-xl w-full max-w-md border border-white/30">
        <h3 className="text-2xl font-bold text-white text-center mb-6">{title}</h3>
        {children}
    </div>
);

const OptionButton: React.FC<{onClick: () => void, children: React.ReactNode, icon: string}> = ({ onClick, children, icon }) => (
    <button 
      onClick={onClick} 
      className="w-full text-left p-4 mb-3 bg-white/20 border border-white/30 rounded-lg hover:bg-white/40 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white flex items-center"
    >
        <i className={`fas ${icon} text-xl w-8 text-center mr-4`}></i>
        <span className="font-semibold">{children}</span>
    </button>
);

interface NavButtonsProps {
    onBack: () => void;
    onNext: () => void;
    nextLabel?: string;
    disabled?: boolean;
}

const NavButtons: React.FC<NavButtonsProps> = ({ onBack, onNext, nextLabel = 'Avançar', disabled = false }) => (
    <div className="mt-8 flex justify-between items-center w-full">
       <button onClick={onBack} className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg transition-colors">
          <i className="fas fa-arrow-left mr-2"></i>Voltar
       </button>
       <button onClick={onNext} disabled={disabled} className="bg-white text-teal-500 font-bold py-2 px-6 rounded-lg hover:bg-gray-100 transition-colors disabled:bg-white/50 disabled:text-teal-300 disabled:cursor-not-allowed">
          {nextLabel}
       </button>
    </div>
);

const defaultReminders: Omit<Reminder, 'id'>[] = [
    { name: 'Ao acordar', time: '08:00', isActive: true },
    { name: 'Antes do almoço', time: '12:00', isActive: true },
    { name: 'Antes do jantar', time: '19:00', isActive: true },
    { name: 'Antes de dormir', time: '22:00', isActive: false },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile & { oralMedicationsString?: string }>>({
    name: '',
    diabetesType: DiabetesType.Type1,
    useInsulin: false,
    useOralMedication: false,
    glucoseTargetMin: 70,
    glucoseTargetMax: 180,
    measurementFrequency: 4,
    insulinStockPens: 3,
    insulinUnitsPerPen: 300,
    averageDailyUnits: 30,
    insulinStockThreshold: 150,
    reminders: defaultReminders.map((r, i) => ({ ...r, id: `default-${i}` })),
    oralMedicationsString: '',
  });
  const [initialGlucose, setInitialGlucose] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setProfile(prev => ({ ...prev, [name]: checked }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSelectOption = (name: keyof UserProfile, value: any) => {
      setProfile(prev => ({ ...prev, [name]: value }));
      setTimeout(() => {
        handleNextStep();
      }, 300);
  };
  
  const handleReminderChange = (id: string, field: 'time' | 'isActive', value: string | boolean) => {
      setProfile(prev => ({
          ...prev,
          reminders: prev.reminders?.map(r => r.id === id ? { ...r, [field]: value } : r)
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProfile: Partial<UserProfile> = { ...profile };
    
    // Convert oral medications string to array of objects
    if (finalProfile.useOralMedication && profile.oralMedicationsString) {
        const medNames = profile.oralMedicationsString.split(',').map(name => name.trim()).filter(Boolean);
        finalProfile.oralMedications = medNames.map((name, index): OralMedication => ({
            id: `oral-med-${new Date().getTime()}-${index}`,
            name: name,
            stock: 0,
            threshold: 15, // Default threshold: 15 pills
            dailyDoses: 1, // Default daily doses
        }));
    }
    delete (finalProfile as any).oralMedicationsString;


    if (finalProfile.useInsulin) {
      finalProfile.currentInsulinStockUnits = (finalProfile.insulinStockPens || 0) * (finalProfile.insulinUnitsPerPen || 0);
    }

    finalProfile.theme = 'light';
    finalProfile.remindersGloballyActive = true;
    finalProfile.medicationReminders = [];
    
    let initialReading: GlucoseReading | undefined = undefined;
    const glucoseValue = parseInt(initialGlucose, 10);
    if (!isNaN(glucoseValue) && glucoseValue > 0) {
        initialReading = { value: glucoseValue, timestamp: new Date() };
    }

    onComplete(finalProfile as UserProfile, initialReading);
  };

  const steps = useMemo(() => {
    const baseSteps = [
      'disclaimer',
      'diabetesType',
      'useInsulin',
    ];
    if (profile.useInsulin) {
      baseSteps.push('averageDailyUnits', 'dailyDoses');
    }
    baseSteps.push('useOralMedication');
    if (profile.useOralMedication) {
      baseSteps.push('oralMedications');
    }
    baseSteps.push('reminders', 'name', 'glucoseTarget', 'initialReading', 'final');
    return baseSteps;
  }, [profile.useInsulin, profile.useOralMedication]);

  const currentStepName = steps[step - 1];
  const progress = useMemo(() => (step > 0 ? (step / steps.length) * 100 : 0), [step, steps]);
  
  const handleNextStep = () => {
      setStep(s => s + 1);
  };
  
  const handlePrevStep = () => {
      setStep(s => s - 1);
  };

  // Welcome Screen (Landing Page)
  if (step === 0) {
    const features = [
        { icon: 'fa-camera-retro', title: 'Coma com Confiança', description: 'Use nossa IA para analisar suas refeições a partir de uma foto e entender o impacto na sua glicose.' },
        { icon: 'fa-chart-pie', title: 'Entenda Seus Padrões', description: 'Gere relatórios inteligentes para visualizar suas tendências e compartilhar facilmente com seu médico.' },
        { icon: 'fa-box', title: 'Nunca Fique sem Suprimentos', description: 'Gerencie seu estoque de insulina com alertas personalizáveis para evitar surpresas.' },
        { icon: 'fa-book-open', title: 'Inspire-se na Cozinha', description: 'Descubra e compartilhe receitas deliciosas e seguras com uma comunidade que te entende.' },
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-teal-400 to-cyan-500 text-white text-center overflow-y-auto">
            <div className="animate-fade-in w-full max-w-4xl mx-auto py-8">
                <i className="fas fa-heart-pulse text-5xl text-white mb-4"></i>
                <h1 className="text-5xl font-bold mb-4">Uma vida mais saudável com GlycoCare</h1>
                <p className="text-xl max-w-2xl mx-auto mb-10">Sua plataforma completa para gerenciar o diabetes com mais confiança e tranquilidade.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {features.map(feature => (
                        <div key={feature.title} className="bg-white/20 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-white/30 text-left transform hover:-translate-y-2 transition-transform duration-300">
                            <i className={`fas ${feature.icon} text-3xl mb-4 text-white`}></i>
                            <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                            <p className="text-sm text-white/90">{feature.description}</p>
                        </div>
                    ))}
                </div>

                <button onClick={() => setStep(1)} className="bg-white text-teal-500 font-bold py-3 px-10 rounded-full shadow-lg hover:bg-gray-100 transition-transform transform hover:scale-105 text-lg">
                    Começar Agora
                </button>
            </div>
        </div>
    );
  }

  // Questionnaire Screens
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-400 to-cyan-500 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-full max-w-md mb-4">
             <div className="w-full bg-white/20 rounded-full h-2.5">
                <div className="bg-white h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      
        <AnimatedStep>
            {currentStepName === 'disclaimer' && (
                <QuestionCard title="Aviso Importante">
                    <div className="bg-yellow-400/80 border-l-4 border-yellow-600 text-yellow-900 p-4 rounded-md mb-6 text-sm" role="alert">
                        <p className="font-bold">O GlycoCare é uma ferramenta de apoio e não substitui o acompanhamento de um profissional de saúde. Consulte sempre seu médico.</p>
                    </div>
                    <label className="flex items-center p-3 bg-white/20 rounded-lg cursor-pointer">
                        <input type="checkbox" className="form-checkbox h-5 w-5 bg-transparent border-white text-teal-500 rounded focus:ring-white/50" checked={disclaimerAccepted} onChange={(e) => setDisclaimerAccepted(e.target.checked)} />
                        <span className="ml-3 font-semibold">Li e concordo com os termos.</span>
                    </label>
                    <div className="mt-6 text-right">
                        <button onClick={handleNextStep} disabled={!disclaimerAccepted} className="bg-white text-teal-500 font-bold py-2 px-6 rounded-lg hover:bg-gray-100 transition duration-300 disabled:bg-white/50 disabled:text-teal-300 disabled:cursor-not-allowed">
                            Continuar
                        </button>
                    </div>
                </QuestionCard>
            )}

            {currentStepName === 'diabetesType' && (
                <QuestionCard title="Qual o seu tipo de diabetes?">
                    <OptionButton icon="fa-syringe" onClick={() => handleSelectOption('diabetesType', DiabetesType.Type1)}>{DiabetesType.Type1}</OptionButton>
                    <OptionButton icon="fa-pills" onClick={() => handleSelectOption('diabetesType', DiabetesType.Type2)}>{DiabetesType.Type2}</OptionButton>
                    <OptionButton icon="fa-baby" onClick={() => handleSelectOption('diabetesType', DiabetesType.Gestational)}>{DiabetesType.Gestational}</OptionButton>
                    <OptionButton icon="fa-question-circle" onClick={() => handleSelectOption('diabetesType', DiabetesType.Other)}>{DiabetesType.Other}</OptionButton>
                </QuestionCard>
            )}
            
            {currentStepName === 'useInsulin' && (
                <QuestionCard title="Você toma insulina?">
                    <OptionButton icon="fa-check" onClick={() => handleSelectOption('useInsulin', true)}>Sim</OptionButton>
                    <OptionButton icon="fa-times" onClick={() => handleSelectOption('useInsulin', false)}>Não</OptionButton>
                </QuestionCard>
            )}

            {currentStepName === 'averageDailyUnits' && (
                <QuestionCard title="Qual sua média de unidades de insulina por dia?">
                     <p className="text-sm text-white/80 text-center mb-4">
                        Isso nos ajudará a criar alertas de estoque mais inteligentes.
                    </p>
                    <input
                        type="number"
                        id="averageDailyUnits"
                        name="averageDailyUnits"
                        value={profile.averageDailyUnits || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-white text-center text-lg placeholder-white/70"
                        placeholder="Ex: 35"
                        required
                    />
                    <NavButtons onBack={handlePrevStep} onNext={handleNextStep} disabled={!profile.averageDailyUnits || profile.averageDailyUnits <=0} />
                </QuestionCard>
            )}
            
            {currentStepName === 'dailyDoses' && (
                <QuestionCard title="Quantas aplicações de insulina você faz por dia?">
                    <input
                        type="number"
                        id="dailyDoses"
                        name="dailyDoses"
                        value={profile.dailyDoses || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-white text-center text-lg placeholder-white/70"
                        placeholder="Ex: 4"
                        required
                    />
                    <NavButtons onBack={handlePrevStep} onNext={handleNextStep} disabled={!profile.dailyDoses} />
                </QuestionCard>
            )}
            
            {currentStepName === 'useOralMedication' && (
                <QuestionCard title="Você usa medicamentos orais?">
                    <OptionButton icon="fa-check" onClick={() => handleSelectOption('useOralMedication', true)}>Sim</OptionButton>
                    <OptionButton icon="fa-times" onClick={() => handleSelectOption('useOralMedication', false)}>Não</OptionButton>
                </QuestionCard>
            )}

            {currentStepName === 'oralMedications' && (
                <QuestionCard title="Quais medicamentos orais você usa?">
                    <input
                        type="text"
                        id="oralMedicationsString"
                        name="oralMedicationsString"
                        value={profile.oralMedicationsString || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-white placeholder-white/70"
                        placeholder="Ex: Metformina, Glibenclamida"
                        required
                    />
                    <p className="text-xs text-white/80 mt-1">Separe os nomes por vírgula.</p>
                    <NavButtons onBack={handlePrevStep} onNext={handleNextStep} disabled={!profile.oralMedicationsString} />
                </QuestionCard>
            )}

            {currentStepName === 'reminders' && (
                <QuestionCard title="Configure seus lembretes">
                     <p className="text-sm text-white/80 text-center mb-4">
                        Defina os horários para medir sua glicose. Você pode alterá-los depois.
                    </p>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {profile.reminders?.map(reminder => (
                            <div key={reminder.id} className="flex items-center justify-between p-3 bg-white/20 rounded-lg">
                                <span className="font-semibold">{reminder.name}</span>
                                <div className="flex items-center gap-2">
                                    <input type="time" value={reminder.time} onChange={e => handleReminderChange(reminder.id, 'time', e.target.value)} className="bg-white/20 border border-white/30 rounded-md p-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-white" />
                                     <label htmlFor={`toggle-${reminder.id}`} className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input type="checkbox" id={`toggle-${reminder.id}`} className="sr-only" checked={reminder.isActive} onChange={e => handleReminderChange(reminder.id, 'isActive', e.target.checked)} />
                                            <div className={`block ${reminder.isActive ? 'bg-white' : 'bg-white/30'} w-10 h-6 rounded-full transition`}></div>
                                            <div className={`dot absolute left-1 top-1 bg-teal-500 w-4 h-4 rounded-full transition ${reminder.isActive ? 'translate-x-full' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                    <NavButtons onBack={handlePrevStep} onNext={handleNextStep} />
                </QuestionCard>
            )}
            
            {currentStepName === 'name' && (
                <QuestionCard title="Como podemos te chamar?">
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={profile.name || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-white text-center text-lg placeholder-white/70"
                        placeholder="Digite seu nome"
                        required
                    />
                    <NavButtons onBack={handlePrevStep} onNext={handleNextStep} disabled={!profile.name} />
                </QuestionCard>
            )}

            {currentStepName === 'glucoseTarget' && (
                <QuestionCard title="Qual sua faixa de meta glicêmica?">
                    <div className="flex items-center justify-center gap-4">
                        <input type="number" name="glucoseTargetMin" value={profile.glucoseTargetMin || ''} onChange={handleChange} className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-white text-center placeholder-white/70" placeholder="Mínimo" />
                        <span className="font-bold">até</span>
                        <input type="number" name="glucoseTargetMax" value={profile.glucoseTargetMax || ''} onChange={handleChange} className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-white text-center placeholder-white/70" placeholder="Máximo"/>
                    </div>
                    <p className="text-xs text-center text-white/80 mt-2">(mg/dL)</p>
                    <NavButtons onBack={handlePrevStep} onNext={handleNextStep} disabled={!profile.glucoseTargetMin || !profile.glucoseTargetMax} />
                </QuestionCard>
            )}
            
            {currentStepName === 'initialReading' && (
                <QuestionCard title="Seu Ponto de Partida">
                    <p className="text-sm text-white/80 text-center mb-4">
                        Para começar a acompanhar, por favor, insira sua leitura de glicemia mais recente.
                    </p>
                    <input
                        type="number"
                        id="initialGlucose"
                        name="initialGlucose"
                        value={initialGlucose}
                        onChange={(e) => setInitialGlucose(e.target.value)}
                        className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-white text-center text-lg placeholder-white/70"
                        placeholder="Ex: 125"
                        autoFocus
                        required
                    />
                    <p className="text-xs text-center text-white/80 mt-2">(mg/dL)</p>
                    <NavButtons onBack={handlePrevStep} onNext={handleNextStep} disabled={!initialGlucose} />
                </QuestionCard>
            )}

            {currentStepName === 'final' && (
                <QuestionCard title="Tudo pronto!">
                    <div className="text-center">
                        <p className="text-lg">Suas informações foram salvas com sucesso!</p>
                        <p className="my-4 text-6xl animate-bounce">🎉</p>
                        <p>Clique em concluir para acessar seu painel personalizado.</p>
                    </div>
                    <div className="mt-6">
                        <button onClick={handleSubmit} className="w-full bg-white text-teal-500 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors transform hover:scale-105">
                            Concluir e ir para o Dashboard
                        </button>
                    </div>
                </QuestionCard>
            )}
        </AnimatedStep>
    </div>
  );
};

export default Onboarding;
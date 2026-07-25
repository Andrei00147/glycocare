import React, { useState, useRef } from 'react';
import { UserProfile, Reminder, View, MedicationReminder, GlucoseReading, Recipe, DiabetesType } from '../types';
import { exportDataBackup, importDataBackup, clearAllData, getLastSyncTime } from '../services/storageService';

interface SettingsProps {
  userProfile: UserProfile;
  glucoseReadings?: GlucoseReading[];
  recipes?: Recipe[];
  onUpdateProfile: (profile: Partial<UserProfile>) => void;
  onBack: () => void;
  navigateTo: (view: View) => void;
  onRestoreData?: (data: { userProfile: UserProfile | null; glucoseReadings: GlucoseReading[]; recipes: Recipe[] }) => void;
  onResetData?: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  userProfile,
  glucoseReadings = [],
  recipes = [],
  onUpdateProfile,
  onBack,
  navigateTo,
  onRestoreData,
  onResetData
}) => {
    const [reminders, setReminders] = useState<Reminder[]>(userProfile.reminders || []);
    const [medReminders, setMedReminders] = useState<MedicationReminder[]>(userProfile.medicationReminders || []);
    const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Profile physical metrics state
    const [name, setName] = useState(userProfile.name || '');
    const [diabetesType, setDiabetesType] = useState<DiabetesType>(userProfile.diabetesType || DiabetesType.None);
    const [weightKg, setWeightKg] = useState<string>(userProfile.weightKg ? String(userProfile.weightKg) : '');
    const [heightCm, setHeightCm] = useState<string>(userProfile.heightCm ? String(userProfile.heightCm) : '');
    const [targetWeightKg, setTargetWeightKg] = useState<string>(userProfile.targetWeightKg ? String(userProfile.targetWeightKg) : '');
    const [targetMuscleMassKg, setTargetMuscleMassKg] = useState<string>(userProfile.targetMuscleMassKg ? String(userProfile.targetMuscleMassKg) : '');
    const [targetBodyFatPercentage, setTargetBodyFatPercentage] = useState<string>(userProfile.targetBodyFatPercentage ? String(userProfile.targetBodyFatPercentage) : '');
    const [healthGoal, setHealthGoal] = useState<string>(userProfile.healthGoal || 'Prevenção de Diabetes & Saúde');
    const [profileSavedMsg, setProfileSavedMsg] = useState(false);

    // Bioimpedance state
    const bio = userProfile.bioimpedance || {};
    const [bioDate, setBioDate] = useState<string>(bio.date || new Date().toISOString().split('T')[0]);
    const [bodyFatPercentage, setBodyFatPercentage] = useState<string>(bio.bodyFatPercentage !== undefined ? String(bio.bodyFatPercentage) : '');
    const [muscleMassKg, setMuscleMassKg] = useState<string>(bio.muscleMassKg !== undefined ? String(bio.muscleMassKg) : '');
    const [visceralFatLevel, setVisceralFatLevel] = useState<string>(bio.visceralFatLevel !== undefined ? String(bio.visceralFatLevel) : '');
    const [basalMetabolicRateKcal, setBasalMetabolicRateKcal] = useState<string>(bio.basalMetabolicRateKcal !== undefined ? String(bio.basalMetabolicRateKcal) : '');
    const [waterPercentage, setWaterPercentage] = useState<string>(bio.waterPercentage !== undefined ? String(bio.waterPercentage) : '');
    const [professionalName, setProfessionalName] = useState<string>(bio.professionalName || '');
    const [professionalNotes, setProfessionalNotes] = useState<string>(bio.professionalNotes || '');

    // State for adding new reminders
    const [newReminderName, setNewReminderName] = useState('');
    const [newReminderTime, setNewReminderTime] = useState('09:00');
    
    const [newMedReminder, setNewMedReminder] = useState({ medicationName: '', time: '08:00', dose: '1 comprimido'});

    const handleSavePhysicalProfile = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdateProfile({
            name: name.trim() || userProfile.name,
            diabetesType,
            weightKg: parseFloat(weightKg) || undefined,
            heightCm: parseFloat(heightCm) || undefined,
            targetWeightKg: parseFloat(targetWeightKg) || undefined,
            targetMuscleMassKg: parseFloat(targetMuscleMassKg) || undefined,
            targetBodyFatPercentage: parseFloat(targetBodyFatPercentage) || undefined,
            healthGoal: healthGoal.trim() || 'Prevenção de Diabetes & Saúde',
            bioimpedance: {
                date: bioDate,
                bodyFatPercentage: parseFloat(bodyFatPercentage) || undefined,
                muscleMassKg: parseFloat(muscleMassKg) || undefined,
                visceralFatLevel: parseFloat(visceralFatLevel) || undefined,
                basalMetabolicRateKcal: parseFloat(basalMetabolicRateKcal) || undefined,
                waterPercentage: parseFloat(waterPercentage) || undefined,
                professionalName: professionalName.trim() || undefined,
                professionalNotes: professionalNotes.trim() || undefined,
            }
        });
        setProfileSavedMsg(true);
        setTimeout(() => setProfileSavedMsg(false), 3000);
    };

    const handleExportBackup = () => {
        try {
            exportDataBackup(userProfile, glucoseReadings, recipes);
            setBackupMsg({ type: 'success', text: 'Backup exportado com sucesso!' });
        } catch (err) {
            setBackupMsg({ type: 'error', text: 'Erro ao gerar arquivo de backup.' });
        }
    };

    const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const imported = importDataBackup(content);
                if (onRestoreData) {
                    onRestoreData({
                        userProfile: imported.userProfile,
                        glucoseReadings: imported.glucoseReadings,
                        recipes: imported.recipes,
                    });
                }
                setBackupMsg({ type: 'success', text: 'Dados importados e restaurados com sucesso!' });
            } catch (err) {
                console.error(err);
                setBackupMsg({ type: 'error', text: 'Arquivo de backup inválido ou incompatível.' });
            }
        };
        reader.readAsText(file);
    };

    const handleClearDatabase = () => {
        if (window.confirm('Tem certeza que deseja apagar todos os dados salvos neste dispositivo? Esta ação não poderá ser desfeita.')) {
            clearAllData();
            if (onResetData) {
                onResetData();
            }
        }
    };

    const handleUpdateReminders = (updatedReminders: Reminder[]) => {
        setReminders(updatedReminders);
        onUpdateProfile({ reminders: updatedReminders });
    };
    
    const handleUpdateMedReminders = (updatedReminders: MedicationReminder[]) => {
        setMedReminders(updatedReminders);
        onUpdateProfile({ medicationReminders: updatedReminders });
    };


    const handleAddReminder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReminderName.trim()) { alert('Por favor, dê um nome ao lembrete.'); return; }
        const newReminder: Reminder = { id: new Date().toISOString(), name: newReminderName.trim(), time: newReminderTime, isActive: true };
        handleUpdateReminders([...reminders, newReminder]);
        setNewReminderName('');
        setNewReminderTime('09:00');
    };
    
    const handleAddMedReminder = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newMedReminder.medicationName) { alert("Selecione um medicamento."); return; }
        const newReminder: MedicationReminder = { ...newMedReminder, id: new Date().toISOString(), isActive: true };
        handleUpdateMedReminders([...medReminders, newReminder]);
        setNewMedReminder({ medicationName: '', time: '08:00', dose: '1 comprimido'});
    }

    const handleRemoveReminder = (id: string) => handleUpdateReminders(reminders.filter(r => r.id !== id));
    const handleRemoveMedReminder = (id: string) => handleUpdateMedReminders(medReminders.filter(r => r.id !== id));
    
    const handleToggleReminder = (id: string, isActive: boolean) => handleUpdateReminders(reminders.map(r => r.id === id ? { ...r, isActive } : r));
    const handleToggleMedReminder = (id: string, isActive: boolean) => handleUpdateMedReminders(medReminders.map(r => r.id === id ? { ...r, isActive } : r));

    const ToggleSwitch: React.FC<{id: string, checked: boolean, onChange: (checked: boolean) => void}> = ({id, checked, onChange}) => (
         <label htmlFor={id} className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" id={id} className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className="block bg-gray-300 dark:bg-gray-600 w-12 h-7 rounded-full peer-checked:bg-teal-500 transition"></div>
                <div className="dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform peer-checked:transform peer-checked:translate-x-full"></div>
            </div>
        </label>
    );

    const inputStyle = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
    const buttonPrimary = "bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 transition";


    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 md:p-8">
            <header className="flex items-center mb-6">
                <button onClick={onBack} className="text-teal-500 hover:text-teal-700 flex items-center">
                    <i className="fas fa-arrow-left mr-2"></i> Voltar
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mx-auto">Ajustes do Perfil e Lembretes</h1>
            </header>

            {/* Physical Profile & Health Goals Form */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-6 border dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-2">
                    <i className="fas fa-user-circle text-teal-500"></i>
                    Perfil Físico & Objetivos
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    Estes dados são usados pela IA para avaliar se as suas refeições estão levando você mais perto do seu objetivo.
                </p>

                {profileSavedMsg && (
                    <div className="mb-4 p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-2">
                        <i className="fas fa-check-circle"></i>
                        Perfil e objetivos atualizados com sucesso!
                    </div>
                )}

                <form onSubmit={handleSavePhysicalProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Nome
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={inputStyle}
                                placeholder="Seu nome"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Condição Atual
                            </label>
                            <select
                                value={diabetesType}
                                onChange={(e) => setDiabetesType(e.target.value as DiabetesType)}
                                className={inputStyle}
                            >
                                <option value={DiabetesType.None}>{DiabetesType.None}</option>
                                <option value={DiabetesType.PreDiabetes}>{DiabetesType.PreDiabetes}</option>
                                <option value={DiabetesType.Type1}>{DiabetesType.Type1}</option>
                                <option value={DiabetesType.Type2}>{DiabetesType.Type2}</option>
                                <option value={DiabetesType.Gestational}>{DiabetesType.Gestational}</option>
                                <option value={DiabetesType.Other}>{DiabetesType.Other}</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Peso Atual (kg)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value)}
                                placeholder="Ex: 72.5"
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                                Altura (cm)
                            </label>
                            <input
                                type="number"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value)}
                                placeholder="Ex: 175"
                                className={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Metas e Objetivos de Composição Corporal */}
                    <div className="p-3.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 space-y-3">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-bullseye text-purple-600 dark:text-purple-400"></i>
                            <h4 className="text-xs font-bold text-purple-900 dark:text-purple-200">
                                Metas de Composição Corporal (Personal & Nutri)
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Objetivo de Peso (kg)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={targetWeightKg}
                                    onChange={(e) => setTargetWeightKg(e.target.value)}
                                    placeholder="Ex: 68.0"
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Meta Massa Muscular (kg)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={targetMuscleMassKg}
                                    onChange={(e) => setTargetMuscleMassKg(e.target.value)}
                                    placeholder="Ex: 34.0"
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Meta % Gordura Corporal
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={targetBodyFatPercentage}
                                    onChange={(e) => setTargetBodyFatPercentage(e.target.value)}
                                    placeholder="Ex: 18.0"
                                    className={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Objetivo Principal de Saúde
                        </label>
                        <select
                            value={healthGoal}
                            onChange={(e) => setHealthGoal(e.target.value)}
                            className={inputStyle}
                        >
                            <option value="Prevenção de Diabetes & Saúde">Prevenção de Diabetes & Saúde</option>
                            <option value="Perda de Peso & Queima de Gordura">Perda de Peso & Queima de Gordura</option>
                            <option value="Controle Estável de Glicemia">Controle Estável de Glicemia</option>
                            <option value="Ganho Muscular & Nutrição">Ganho Muscular & Nutrição</option>
                            <option value="Redução do Consumo de Açúcar">Redução do Consumo de Açúcar</option>
                        </select>
                    </div>

                    {/* Seção de Bioimpedância Clínica */}
                    <div className="pt-4 border-t dark:border-gray-700 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <i className="fas fa-file-medical text-teal-600 dark:text-teal-400 text-lg"></i>
                            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">
                                Bioimpedância & Acompanhamento Profissional
                            </h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Cadastre aqui os resultados do seu exame de bioimpedância e as orientações do seu nutricionista/médico. A IA utilizará estes dados metabólicos para dar conselhos ultra-precisos!
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Data da Bioimpedância
                                </label>
                                <input
                                    type="date"
                                    value={bioDate}
                                    onChange={(e) => setBioDate(e.target.value)}
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Gordura Corporal (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={bodyFatPercentage}
                                    onChange={(e) => setBodyFatPercentage(e.target.value)}
                                    placeholder="Ex: 22.5"
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Massa Magra / Muscular (kg)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={muscleMassKg}
                                    onChange={(e) => setMuscleMassKg(e.target.value)}
                                    placeholder="Ex: 34.0"
                                    className={inputStyle}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Gordura Visceral (Nível)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max="59"
                                    value={visceralFatLevel}
                                    onChange={(e) => setVisceralFatLevel(e.target.value)}
                                    placeholder="Ex: 6"
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Taxa Metabólica Basal (kcal)
                                </label>
                                <input
                                    type="number"
                                    step="1"
                                    value={basalMetabolicRateKcal}
                                    onChange={(e) => setBasalMetabolicRateKcal(e.target.value)}
                                    placeholder="Ex: 1650"
                                    className={inputStyle}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Água Corporal (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={waterPercentage}
                                    onChange={(e) => setWaterPercentage(e.target.value)}
                                    placeholder="Ex: 58.0"
                                    className={inputStyle}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Nome do Nutricionista / Profissional Responsável
                                </label>
                                <input
                                    type="text"
                                    value={professionalName}
                                    onChange={(e) => setProfessionalName(e.target.value)}
                                    placeholder="Ex: Dra. Ana Silva (CRN 12345)"
                                    className={inputStyle}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Orientações & Observações do Profissional
                                </label>
                                <textarea
                                    value={professionalNotes}
                                    onChange={(e) => setProfessionalNotes(e.target.value)}
                                    placeholder="Ex: Focar em ingerir pelo menos 80g de proteína por dia, manter carboidratos complexos no almoço e evitar jejum prolongado."
                                    rows={3}
                                    className={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-lg transition shadow-sm flex items-center justify-center gap-2 text-sm"
                        >
                            <i className="fas fa-save"></i>
                            Salvar Perfil, Bioimpedância e Objetivos
                        </button>
                    </div>
                </form>
            </div>

            {/* Personal Health & Routine Reminders */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md mb-6 border dark:border-gray-700">
                <div className="flex items-center justify-between mb-2 border-b dark:border-gray-700 pb-3">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <i className="fas fa-bell text-teal-500"></i>
                        {userProfile.diabetesType !== DiabetesType.None ? 'Lembretes de Glicemia e Saúde' : 'Lembretes e Alertas Personalizados'}
                    </h2>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    {userProfile.diabetesType !== DiabetesType.None 
                      ? 'Configure horários para medir sua glicemia, tomar água, medicamentos ou hábitos de saúde.' 
                      : 'Configure lembretes para sua rotina de saúde como beber água, aferir pressão, praticar exercícios e refeições.'}
                </p>

                {/* Quick Presets for Custom Reminders */}
                <div className="mb-4">
                    <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">
                        Atalhos Rápidos de Lembretes:
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {[
                            { name: '🚰 Beber Água', time: '10:00' },
                            { name: '🩺 Aferir Pressão', time: '08:00' },
                            { name: '🥗 Refeição Principal', time: '12:30' },
                            { name: '💊 Vitamina / Suplemento', time: '07:30' },
                            { name: '🏃 Exercício / Caminhada', time: '18:00' },
                            ...(userProfile.diabetesType !== DiabetesType.None ? [{ name: '🩸 Medir Glicemia', time: '14:00' }] : [])
                        ].map((preset, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    setNewReminderName(preset.name);
                                    setNewReminderTime(preset.time);
                                }}
                                className="text-xs bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 font-medium px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 transition shadow-sm"
                            >
                                + {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {reminders.length > 0 ? reminders.map(reminder => (
                         <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/60 rounded-xl border dark:border-gray-600">
                            <div>
                                <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{reminder.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">⏰ às {reminder.time}</p>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4">
                                <ToggleSwitch id={`toggle-${reminder.id}`} checked={reminder.isActive} onChange={(checked) => handleToggleReminder(reminder.id, checked)} />
                                <button onClick={() => handleRemoveReminder(reminder.id)} className="text-gray-400 hover:text-red-500 transition p-1"><i className="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    )) : <p className="text-center text-xs text-gray-500 py-4 italic">Nenhum lembrete cadastrado ainda. Adicione um abaixo!</p>}
                </div>

                <form onSubmit={handleAddReminder} className="flex flex-col sm:flex-row gap-3">
                    <input 
                        type="text" 
                        value={newReminderName} 
                        onChange={(e) => setNewReminderName(e.target.value)} 
                        placeholder={userProfile.diabetesType !== DiabetesType.None ? "Motivo (ex: Medir Glicemia, Beber Água)" : "Motivo (ex: Beber Água, Aferir Pressão, Exercício)"} 
                        className={`flex-grow ${inputStyle}`}
                    />
                    <input type="time" value={newReminderTime} onChange={(e) => setNewReminderTime(e.target.value)} className={inputStyle}/>
                    <button type="submit" className={buttonPrimary}><i className="fas fa-plus mr-1.5"></i>Adicionar</button>
                </form>
            </div>

            {/* Medication Reminders */}
            {userProfile.useOralMedication && (
                 <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-2">Lembretes de Medicação</h2>
                     <div className="space-y-3 mb-6">
                        {medReminders.length > 0 ? medReminders.map(reminder => (
                            <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{reminder.medicationName} ({reminder.dose})</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{reminder.time}</p>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <ToggleSwitch id={`toggle-med-${reminder.id}`} checked={reminder.isActive} onChange={(checked) => handleToggleMedReminder(reminder.id, checked)} />
                                    <button onClick={() => handleRemoveMedReminder(reminder.id)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash-alt"></i></button>
                                </div>
                            </div>
                        )) : <p className="text-center text-gray-500 py-4">Nenhum lembrete de medicação.</p>}
                     </div>
                     <form onSubmit={handleAddMedReminder} className="space-y-3">
                        <select value={newMedReminder.medicationName} onChange={e => setNewMedReminder(p => ({...p, medicationName: e.target.value}))} className={`w-full ${inputStyle}`}>
                            <option value="">Selecione o medicamento</option>
                            {(userProfile.oralMedications || []).map(med => <option key={med.id} value={med.name}>{med.name}</option>)}
                        </select>
                         <div className="flex flex-col sm:flex-row gap-3">
                            <input type="text" value={newMedReminder.dose} onChange={e => setNewMedReminder(p => ({...p, dose: e.target.value}))} placeholder="Dose (ex: 1 comprimido)" className={`flex-grow ${inputStyle}`}/>
                            <input type="time" value={newMedReminder.time} onChange={e => setNewMedReminder(p => ({...p, time: e.target.value}))} className={inputStyle}/>
                            <button type="submit" className={buttonPrimary}><i className="fas fa-plus mr-2"></i>Adicionar</button>
                         </div>
                     </form>
                </div>
            )}
            
            {/* Stock Management Shortcut */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
                <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-2">Gerenciamento de Estoque</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Acesse para adicionar ou editar seu estoque de insulina e medicamentos.</p>
                <button onClick={() => navigateTo(View.StockManagement)} className="w-full bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-600 transition duration-300 flex items-center justify-center">
                    <i className="fas fa-box-open mr-2"></i>
                    Ir para o Estoque
                </button>
            </div>

            {/* Database & Backup Management */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
                <div className="flex items-center justify-between mb-4 border-b dark:border-gray-700 pb-2">
                    <h2 className="text-xl font-semibold flex items-center">
                        <i className="fas fa-database text-teal-500 mr-2"></i>
                        Banco de Dados Local & Backup
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                        <span className="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Sincronizado
                    </span>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Suas medições de glicose, perfil, estoque de remédios e receitas personalizadas são salvos automaticamente no banco de dados do seu navegador.
                </p>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4 text-xs sm:text-sm space-y-2 text-gray-700 dark:text-gray-300">
                    <div className="flex justify-between">
                        <span className="font-medium">Perfil ativo:</span>
                        <span>{userProfile.name} ({userProfile.diabetesType})</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-medium">Leituras salvas:</span>
                        <span>{glucoseReadings.length} registros</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-medium">Receitas salvas:</span>
                        <span>{recipes.length} receitas</span>
                    </div>
                    <div className="flex justify-between border-t dark:border-gray-600 pt-2">
                        <span className="font-medium">Última sincronização:</span>
                        <span>{getLastSyncTime() ? new Date(getLastSyncTime()!).toLocaleString('pt-BR') : 'Agora'}</span>
                    </div>
                </div>

                {backupMsg && (
                    <div className={`p-3 rounded-lg text-sm mb-4 ${backupMsg.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
                        {backupMsg.text}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <button
                        onClick={handleExportBackup}
                        className="w-full bg-teal-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-600 transition flex items-center justify-center text-sm"
                    >
                        <i className="fas fa-download mr-2"></i>
                        Exportar Backup (JSON)
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-indigo-600 transition flex items-center justify-center text-sm"
                    >
                        <i className="fas fa-upload mr-2"></i>
                        Importar Backup
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportBackup}
                        accept=".json"
                        className="hidden"
                    />
                </div>

                <button
                    onClick={() => navigateTo(View.Onboarding)}
                    className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold py-2.5 px-4 rounded-lg hover:from-teal-700 hover:to-emerald-700 transition flex items-center justify-center text-sm shadow-sm"
                >
                    <i className="fas fa-clipboard-question mr-2"></i>
                    Refazer Questionário Inicial
                </button>

                <div className="mt-4 pt-4 border-t dark:border-gray-700">
                    <button
                        onClick={handleClearDatabase}
                        className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 underline flex items-center"
                    >
                        <i className="fas fa-trash mr-1.5"></i>
                        Limpar dados locais e reiniciar aplicativo
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6">
                <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-2">Suporte & Feedback</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Sua opinião é muito importante para nós! Ajude-nos a melhorar o GlycoCare.</p>
                <button onClick={() => navigateTo(View.Feedback)} className="w-full bg-blue-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300 flex items-center justify-center">
                    <i className="fas fa-comment-alt mr-2"></i>
                    Enviar Feedback
                </button>
            </div>
        </div>
    );
};

export default Settings;
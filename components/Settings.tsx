import React, { useState, useRef } from 'react';
import { UserProfile, Reminder, View, MedicationReminder, GlucoseReading, Recipe } from '../types';
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

    // State for adding new reminders
    const [newReminderName, setNewReminderName] = useState('');
    const [newReminderTime, setNewReminderTime] = useState('09:00');
    
    const [newMedReminder, setNewMedReminder] = useState({ medicationName: '', time: '08:00', dose: '1 comprimido'});

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
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mx-auto">Ajustes e Lembretes</h1>
            </header>

            {/* Glucose Reminders */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-2">Lembretes de Glicemia</h2>
                <div className="space-y-3 mb-6">
                    {reminders.length > 0 ? reminders.map(reminder => (
                         <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{reminder.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{reminder.time}</p>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4">
                                <ToggleSwitch id={`toggle-${reminder.id}`} checked={reminder.isActive} onChange={(checked) => handleToggleReminder(reminder.id, checked)} />
                                <button onClick={() => handleRemoveReminder(reminder.id)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    )) : <p className="text-center text-gray-500 py-4">Nenhum lembrete de glicemia.</p>}
                </div>
                <form onSubmit={handleAddReminder} className="flex flex-col sm:flex-row gap-3">
                    <input type="text" value={newReminderName} onChange={(e) => setNewReminderName(e.target.value)} placeholder="Nome (ex: Após o almoço)" className={`flex-grow ${inputStyle}`}/>
                    <input type="time" value={newReminderTime} onChange={(e) => setNewReminderTime(e.target.value)} className={inputStyle}/>
                    <button type="submit" className={buttonPrimary}><i className="fas fa-plus mr-2"></i>Adicionar</button>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
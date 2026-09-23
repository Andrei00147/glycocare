import React, { useState, useEffect } from 'react';
import { UserProfile, PatientLink, MealLog, GlucoseReading, ConsultationMessage } from '../types';
import { sendConsultationMessage, fetchConsultationMessages, markConsultationMessagesAsRead } from '../services/firestoreService';
import { auth } from '../src/firebase';

interface PatientDirectCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  activePatientLink: PatientLink;
  mealLogs?: MealLog[];
  glucoseReadings?: GlucoseReading[];
}

type MessageCategory = 'doubt' | 'meal_adjustment' | 'glucose_alert' | 'prescription' | 'general';

export const PatientDirectCareModal: React.FC<PatientDirectCareModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  activePatientLink,
  mealLogs = [],
  glucoseReadings = []
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'inapp' | 'dossier' | 'info'>('whatsapp');
  
  // WhatsApp Message Preset State
  const [selectedPreset, setSelectedPreset] = useState<string>('doubt');
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // In-App Chat Messages State
  const [inAppMessages, setInAppMessages] = useState<ConsultationMessage[]>([]);
  const [newInAppText, setNewInAppText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory>('doubt');
  const [sendingInApp, setSendingInApp] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Calculate today metrics for context
  const today = new Date().toDateString();
  const todayMeals = mealLogs.filter(m => !m.isDeleted && new Date(m.timestamp).toDateString() === today);
  const todayCarbs = todayMeals.reduce((acc, m) => acc + (m.carbohydrates || 0), 0);
  const todaySugars = todayMeals.reduce((acc, m) => acc + (m.sugars || 0), 0);
  const todayProteins = todayMeals.reduce((acc, m) => acc + (m.proteins || 0), 0);
  const todayCalories = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

  const todayReadings = glucoseReadings.filter(r => new Date(r.timestamp).toDateString() === today);
  const avgGlucose = todayReadings.length > 0 
    ? Math.round(todayReadings.reduce((acc, r) => acc + r.value, 0) / todayReadings.length) 
    : null;

  // Generate presets based on context
  useEffect(() => {
    const professionalTitle = activePatientLink.professionalRole === 'Médico' ? 'Dr(a).' : 'Nutri';
    const name = userProfile.name || 'Paciente';
    const weightStr = userProfile.weightKg ? `${userProfile.weightKg} kg` : 'não informado';
    const glucoseStr = avgGlucose ? `${avgGlucose} mg/dL (média de hoje)` : 'não registrada hoje';

    let body = '';

    switch (selectedPreset) {
      case 'doubt':
        body = `Olá, ${professionalTitle} ${activePatientLink.professionalName}! Aqui é o(a) seu(sua) paciente ${name}.\n\nEstou com uma dúvida sobre minha alimentação de hoje no app NutriSaúdeVital:\n• Glicemia média hoje: ${glucoseStr}\n• Carboidratos consumidos: ${todayCarbs}g | Açúcares: ${todaySugars}g | Proteínas: ${todayProteins}g\n\nDúvida: [Escreva sua dúvida sobre o alimento ou refeição aqui]`;
        break;
      case 'adjustment':
        body = `Olá, ${professionalTitle} ${activePatientLink.professionalName}! Sou ${name}.\n\nGostaria de solicitar uma reavaliação ou ajuste no meu plano nutricional no NutriSaúdeVital.\n• Peso Atual: ${weightStr}\n• Meta: ${userProfile.healthGoal || 'Saúde & Composição Corporal'}\n• Glicemia média recente: ${glucoseStr}\n\nPoderíamos alinhar um ajuste de macros ou calorias?`;
        break;
      case 'glucose_report':
        const recentReadingsStr = glucoseReadings.slice(-6).map(r => `${r.value} mg/dL em ${new Date(r.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`).join('\n• ');
        body = `Olá, ${professionalTitle} ${activePatientLink.professionalName}! Segue meu relatório de controle glicêmico do NutriSaúdeVital:\n\n• Paciente: ${name}\n• Alvo Glicêmico: ${userProfile.glucoseTargetMin} a ${userProfile.glucoseTargetMax} mg/dL\n• Últimas medições registradas:\n• ${recentReadingsStr || 'Nenhuma recente'}\n\nO que acha dos meus resultados dessa semana?`;
        break;
      case 'hypo_alert':
        body = `⚠️ AVISO DE GLICEMIA - Paciente: ${name}\nOlá, ${professionalTitle} ${activePatientLink.professionalName}! Gostaria de relatar um pico/queda importante de glicemia que registrei no NutriSaúdeVital:\n\n• Valor registrado: [Informe o valor mg/dL]\n• Sintomas sentidos: [Ex: tontura, sudorese, fraqueza]\n• Refeição anterior: [Descreva o que consumiu]\n\nAguardo suas orientações para correção!`;
        break;
      case 'appointment':
        body = `Olá, ${professionalTitle} ${activePatientLink.professionalName}! Gostaria de verificar sua disponibilidade de horários para agendarmos nossa próxima consulta de retorno e acompanhamento pelo NutriSaúdeVital.`;
        break;
      default:
        body = `Olá, ${professionalTitle} ${activePatientLink.professionalName}! Aqui é o(a) seu(sua) paciente ${name} do NutriSaúdeVital.`;
    }

    setCustomWhatsAppMsg(body);
  }, [selectedPreset, activePatientLink, userProfile, avgGlucose, todayCarbs, todaySugars, todayProteins]);

  // Load In-App messages when tab switches to inapp
  const loadMessages = async () => {
    if (!auth.currentUser) return;
    setLoadingMessages(true);
    try {
      const msgs = await fetchConsultationMessages(auth.currentUser.uid, activePatientLink.professionalEmail);
      setInAppMessages(msgs);
      markConsultationMessagesAsRead(auth.currentUser.uid, 'patient');
    } catch (err) {
      console.warn('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'inapp') {
      loadMessages();
    }
  }, [isOpen, activeTab]);

  const handleSendInAppMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInAppText.trim() || !auth.currentUser) return;

    setSendingInApp(true);
    try {
      const msg: ConsultationMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        patientUid: auth.currentUser.uid,
        patientEmail: auth.currentUser.email || userProfile.name,
        patientName: userProfile.name || 'Paciente',
        professionalEmail: activePatientLink.professionalEmail,
        professionalName: activePatientLink.professionalName,
        sender: 'patient',
        message: newInAppText.trim(),
        category: selectedCategory,
        timestamp: new Date().toISOString(),
        readByRecipient: false
      };

      await sendConsultationMessage(msg);
      setInAppMessages(prev => [...prev, msg]);
      setNewInAppText('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSendingInApp(false);
    }
  };

  const handleSendWhatsApp = () => {
    const encoded = encodeURIComponent(customWhatsAppMsg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(customWhatsAppMsg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-6 border-b dark:border-gray-700 bg-gradient-to-r from-teal-50 via-teal-100/40 to-emerald-50 dark:from-teal-950/60 dark:to-emerald-950/40 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl shadow-md border-2 border-white dark:border-gray-800">
              <i className="fas fa-user-doctor"></i>
            </div>
            <div>
              <span className="bg-teal-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                Canal Direto de Acompanhamento
              </span>
              <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mt-1">
                {activePatientLink.professionalName}
              </h3>
              <p className="text-xs text-teal-800 dark:text-teal-300 font-semibold">
                {activePatientLink.professionalRole} • Código: {activePatientLink.referralCode}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold rounded-xl"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-6 pt-2 gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <i className="fab fa-whatsapp text-emerald-500 text-sm"></i>
            WhatsApp Clínico
          </button>

          <button
            onClick={() => setActiveTab('inapp')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'inapp'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <i className="fas fa-comments text-teal-500"></i>
            Mural de Mensagens
            {inAppMessages.length > 0 && (
              <span className="bg-teal-500 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                {inAppMessages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dossier')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dossier'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <i className="fas fa-file-medical text-blue-500"></i>
            Dossiê Telemetria
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400 font-black'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <i className="fas fa-id-card text-purple-500"></i>
            Dados do Consultório
          </button>
        </div>

        {/* Tab 1: WhatsApp Direct with Context */}
        {activeTab === 'whatsapp' && (
          <div className="p-6 space-y-5">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 space-y-1">
              <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <i className="fab fa-whatsapp text-emerald-600 text-base"></i>
                Contato Direto com Contexto Metabólico
              </h4>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                Selecione o tipo de assunto abaixo para preencher automaticamente com seus dados de glicemia, carboidratos e metas de hoje.
              </p>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                O que você deseja falar com seu {activePatientLink.professionalRole}?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'doubt', icon: 'fa-apple-whole', label: 'Dúvida Alimentar' },
                  { id: 'adjustment', icon: 'fa-sliders', label: 'Ajuste de Dieta' },
                  { id: 'glucose_report', icon: 'fa-chart-line', label: 'Relatório Glicemia' },
                  { id: 'hypo_alert', icon: 'fa-triangle-exclamation', label: 'Aviso de Glicemia' },
                  { id: 'appointment', icon: 'fa-calendar-check', label: 'Consulta / Retorno' }
                ].map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center gap-2 ${
                      selectedPreset === preset.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <i className={`fas ${preset.icon} text-emerald-600`}></i>
                    <span className="truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Preview */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-gray-700 dark:text-gray-300">
                  Mensagem formatada para o WhatsApp:
                </label>
                <span className="text-[10px] text-gray-400">Você pode editar o texto antes de enviar</span>
              </div>
              <textarea
                rows={6}
                value={customWhatsAppMsg}
                onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                className="w-full p-3 border rounded-2xl text-xs dark:bg-gray-900 dark:border-gray-700 dark:text-white font-mono leading-relaxed focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="w-full sm:w-1/2 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
              >
                <i className={`fas ${copiedWhatsApp ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                {copiedWhatsApp ? 'Copiado com Sucesso!' : 'Copiar Texto da Mensagem'}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full sm:w-1/2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2"
              >
                <i className="fab fa-whatsapp text-lg"></i>
                Abrir WhatsApp Direto
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: In-App Message Thread */}
        {activeTab === 'inapp' && (
          <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
            {/* Thread Container */}
            <div className="space-y-3 max-h-72 overflow-y-auto p-1">
              {loadingMessages ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Carregando mensagens...
                </div>
              ) : inAppMessages.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl text-center border border-dashed border-gray-300 dark:border-gray-700 space-y-2">
                  <i className="fas fa-comments text-3xl text-gray-400"></i>
                  <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300">
                    Nenhuma mensagem registrada ainda
                  </h4>
                  <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                    Envie recados, dúvidas sobre alimentos ou avisos clínicos diretamente para o painel do seu especialista.
                  </p>
                </div>
              ) : (
                inAppMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'patient' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs space-y-1 ${
                        msg.sender === 'patient'
                          ? 'bg-teal-600 text-white rounded-tr-none shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 border-b border-white/20 pb-1">
                        <span className="font-bold">
                          {msg.sender === 'patient' ? 'Você (Paciente)' : activePatientLink.professionalName}
                        </span>
                        <span>{new Date(msg.timestamp).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendInAppMessage} className="space-y-3 pt-3 border-t dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500">Categoria:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as MessageCategory)}
                  className="px-2.5 py-1 text-xs rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none"
                >
                  <option value="doubt">Dúvida sobre Refeição / Alimento</option>
                  <option value="meal_adjustment">Solicitação de Ajuste de Plano</option>
                  <option value="glucose_alert">Aviso de Glicemia / Hipoglicemia</option>
                  <option value="prescription">Dúvida sobre Prescrição / Suplemento</option>
                  <option value="general">Mensagem Geral</option>
                </select>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={newInAppText}
                  onChange={(e) => setNewInAppText(e.target.value)}
                  placeholder="Escreva sua dúvida ou recado para o nutricionista..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={sendingInApp || !newInAppText.trim()}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5"
                >
                  <i className="fas fa-paper-plane"></i>
                  {sendingInApp ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Complete Dossier Summary */}
        {activeTab === 'dossier' && (
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/50">
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <i className="fas fa-file-medical text-blue-600"></i>
                Dossiê Clínico Sincronizado
              </h4>
              <p className="text-[11px] text-blue-800 dark:text-blue-300">
                Seu especialista tem acesso em tempo real a todas as suas entradas através do Portal do Profissional.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border dark:border-gray-700 text-center">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Glicemia Média</span>
                <p className="font-black text-sm text-teal-600">{avgGlucose ? `${avgGlucose} mg/dL` : 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Carboidratos Hoje</span>
                <p className="font-black text-sm text-amber-600">{todayCarbs}g</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Proteínas Hoje</span>
                <p className="font-black text-sm text-blue-600">{todayProteins}g</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Calorias Hoje</span>
                <p className="font-black text-sm text-emerald-600">{todayCalories} kcal</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200">
                Últimas Refeições Registradas no Diário
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {mealLogs.filter(m => !m.isDeleted).slice(-6).reverse().map(meal => (
                  <div
                    key={meal.id}
                    className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 flex justify-between items-center text-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">{meal.name || 'Refeição'}</p>
                      <p className="text-[10px] text-gray-400">{new Date(meal.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span className="text-amber-600">{meal.carbohydrates}g carb</span>
                      <span className="text-blue-600">{meal.proteins || 0}g prot</span>
                      <span className="text-emerald-600">{meal.calories || 0} kcal</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Office & Specialty Info */}
        {activeTab === 'info' && (
          <div className="p-6 space-y-4 text-xs">
            <div className="bg-gray-50 dark:bg-gray-900/60 p-5 rounded-2xl border dark:border-gray-700 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 rounded-2xl flex items-center justify-center text-xl font-bold">
                  {activePatientLink.professionalName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-gray-100">
                    {activePatientLink.professionalName}
                  </h4>
                  <p className="text-teal-600 dark:text-teal-400 font-semibold">
                    {activePatientLink.professionalRole} • Código {activePatientLink.referralCode}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t dark:border-gray-700">
                <p className="flex justify-between">
                  <span className="text-gray-500">E-mail Profissional:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{activePatientLink.professionalEmail}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500">Status de Acompanhamento:</span>
                  <span className="font-bold text-emerald-600">Ativo (65%-70% OFF)</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-gray-500">Início do Acompanhamento:</span>
                  <span className="text-gray-700 dark:text-gray-300">{new Date(activePatientLink.linkedAt).toLocaleDateString('pt-BR')}</span>
                </p>
              </div>
            </div>

            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800/60 text-[11px] text-teal-900 dark:text-teal-200 leading-relaxed">
              <i className="fas fa-shield-halved text-teal-600 mr-1.5"></i>
              Seus registros e métricas no NutriSaúdeVital estão protegidos e compartilhados exclusivamente com o seu especialista responsável.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDirectCareModal;

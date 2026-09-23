import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  PatientLink,
  UserProfile,
  GlucoseReading,
  MealLog,
  WeightLog,
  ClinicalNote,
  ConsultationMessage,
  ProfessionalPartner,
  DiabetesType
} from '../types';
import {
  fetchPatientClinicalDossier,
  fetchPatientClinicalNotes,
  savePatientClinicalNote,
  deletePatientClinicalNote,
  fetchConsultationMessages,
  sendConsultationMessage,
  markConsultationMessagesAsRead
} from '../services/firestoreService';
import { auth } from '../src/firebase';

interface PatientDetailViewProps {
  patient: PatientLink;
  currentProfessional?: ProfessionalPartner | null;
  professionalEmail: string;
  onClose: () => void;
  onRefreshParent?: () => void;
}

const NUTRITIONIST_PRESETS = [
  {
    category: 'dietary_plan' as const,
    title: 'Ajuste do Aporte Proteico',
    text: 'Ajustada meta diária de proteínas para suporte à massa magra e aumento de saciedade. Orientada inclusão de fontes de alto valor biológico nas 3 principais refeições.',
    tag: '#Proteina #Saciedade'
  },
  {
    category: 'dietary_plan' as const,
    title: 'Aumento de Fibras & Fracionamento',
    text: 'Orientado aumento no consumo de vegetais folhosos, sementes (chia/linhaça) e grãos integrais (>25g de fibras/dia) para modulação da curva glicêmica pós-prandial.',
    tag: '#Fibras #DensidadeNutricional'
  },
  {
    category: 'evolution' as const,
    title: 'Boa Aderência e Consciência Nutricional',
    text: 'Paciente demonstrando excelente registro das refeições e compreensão da composição dos pratos. Melhora na qualidade global das escolhas alimentares.',
    tag: '#Aderencia #EducacaoNutricional'
  },
  {
    category: 'weight_goal' as const,
    title: 'Evolução Ponderal & Metas de Composição',
    text: 'Acompanhamento de peso dentro do planejado. Preservação de massa muscular com redução gradual de tecido adiposo. Hidratação orientada em 35ml/kg.',
    tag: '#ComposicaoCorporal #Metas'
  },
  {
    category: 'glucose_alert' as const,
    title: 'Readequação de Carga Glicêmica',
    text: 'Identificado pico glicêmico após refeições com carboidratos simples isolados. Recomendada combinação obrigatória com fibras, proteínas ou gorduras boas.',
    tag: '#CargaGlicemica #CombinacaoInteligente'
  }
];

const MACRO_COLORS = {
  carbs: '#0d9488', // Teal
  protein: '#6366f1', // Indigo
  fats: '#f59e0b', // Amber
  fiber: '#10b981', // Emerald
  calories: '#ec4899' // Pink
};

const PIE_COLORS = ['#0d9488', '#6366f1', '#f59e0b'];

export const PatientDetailView: React.FC<PatientDetailViewProps> = ({
  patient,
  currentProfessional,
  professionalEmail,
  onClose,
  onRefreshParent
}) => {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'weight' | 'glycemia' | 'clinical_notes' | 'messages'>('nutrition');
  const [periodDays, setPeriodDays] = useState<number>(14);
  const [loading, setLoading] = useState(true);

  // Dossier data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);

  // Note creation form state
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<ClinicalNote['category']>('dietary_plan');
  const [noteTagsInput, setNoteTagsInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Messaging state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const isNutritionist = (currentProfessional?.role || patient.professionalRole) === 'Nutricionista';
  const roleName = currentProfessional?.role || patient.professionalRole || 'Nutricionista';

  // Load all patient data
  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [dossier, patientNotes, patientMsgs] = await Promise.all([
        fetchPatientClinicalDossier(patient.patientUid),
        fetchPatientClinicalNotes(patient.patientUid, professionalEmail),
        fetchConsultationMessages(patient.patientUid, professionalEmail)
      ]);

      if (dossier) {
        setProfile(dossier.profile);
        setReadings(dossier.readings || []);
        setMeals(dossier.meals || []);
        setWeights(dossier.weights || []);
      }
      setNotes(patientNotes || []);
      setMessages(patientMsgs || []);
      markConsultationMessagesAsRead(patient.patientUid, 'professional');
    } catch (err) {
      console.error('Erro ao carregar prontuário completo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [patient.patientUid, professionalEmail]);

  // Date Filtered Datasets
  const cutoffDate = useMemo(() => {
    if (periodDays === 0) return new Date(0); // All time
    const d = new Date();
    d.setDate(d.getDate() - periodDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [periodDays]);

  const filteredMeals = useMemo(() => {
    return meals
      .filter(m => !m.isDeleted && new Date(m.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [meals, cutoffDate]);

  const filteredWeights = useMemo(() => {
    return weights
      .filter(w => new Date(w.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [weights, cutoffDate]);

  const filteredReadings = useMemo(() => {
    return readings
      .filter(r => new Date(r.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [readings, cutoffDate]);

  // Grouped Daily Nutrition Data for Charts
  const dailyNutritionData = useMemo(() => {
    const map: Record<string, {
      date: string;
      formattedDate: string;
      carbs: number;
      proteins: number;
      fats: number;
      sugars: number;
      calories: number;
      mealsCount: number;
    }> = {};

    filteredMeals.forEach(meal => {
      const d = new Date(meal.timestamp);
      const key = d.toISOString().split('T')[0];
      const formattedDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      if (!map[key]) {
        map[key] = {
          date: key,
          formattedDate,
          carbs: 0,
          proteins: 0,
          fats: 0,
          sugars: 0,
          calories: 0,
          mealsCount: 0
        };
      }

      map[key].carbs += Number(meal.carbohydrates) || 0;
      map[key].proteins += Number(meal.proteins) || 0;
      map[key].fats += Number(meal.fats) || 0;
      map[key].sugars += Number(meal.sugars) || 0;
      map[key].calories += Number(meal.calories) || 0;
      map[key].mealsCount += 1;
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredMeals]);

  const isPatientDiabetic = useMemo(() => {
    if (patient.clinicalTrack) {
      return patient.clinicalTrack === 'diabetes';
    }
    if (profile?.clinicalTrack) {
      return profile.clinicalTrack === 'diabetes';
    }
    if (profile?.diabetesType) {
      return profile.diabetesType !== DiabetesType.None;
    }
    return Boolean(profile?.useInsulin || profile?.useOralMedication);
  }, [profile, patient.clinicalTrack]);

  // Aggregate Nutritional Metrics
  const nutritionTotals = useMemo(() => {
    const totalDays = dailyNutritionData.length || 1;
    const totalCarbs = filteredMeals.reduce((acc, m) => acc + (Number(m.carbohydrates) || 0), 0);
    const totalProteins = filteredMeals.reduce((acc, m) => acc + (Number(m.proteins) || 0), 0);
    const totalFats = filteredMeals.reduce((acc, m) => acc + (Number(m.fats) || 0), 0);
    const totalSugars = filteredMeals.reduce((acc, m) => acc + (Number(m.sugars) || 0), 0);
    const totalCalories = filteredMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);

    const avgCarbs = Math.round(totalCarbs / totalDays);
    const avgProteins = Math.round(totalProteins / totalDays);
    const avgFats = Math.round(totalFats / totalDays);
    const avgSugars = Math.round(totalSugars / totalDays);
    const avgCalories = Math.round(totalCalories / totalDays);

    const weight = profile?.weightKg || 70;
    const proteinPerKg = Number((avgProteins / weight).toFixed(2));

    // Calories from each macro (4 kcal/g carbs & protein, 9 kcal/g fat)
    const calFromCarbs = totalCarbs * 4;
    const calFromProtein = totalProteins * 4;
    const calFromFat = totalFats * 9;
    const totalMacroCals = calFromCarbs + calFromProtein + calFromFat || 1;

    const macroPercent = [
      { name: 'Carboidratos', value: Math.round((calFromCarbs / totalMacroCals) * 100), grams: avgCarbs },
      { name: 'Proteínas', value: Math.round((calFromProtein / totalMacroCals) * 100), grams: avgProteins },
      { name: 'Gorduras', value: Math.round((calFromFat / totalMacroCals) * 100), grams: avgFats }
    ];

    return {
      totalMeals: filteredMeals.length,
      daysLogged: dailyNutritionData.length,
      avgCalories,
      avgCarbs,
      avgProteins,
      avgFats,
      avgSugars,
      proteinPerKg,
      macroPercent
    };
  }, [filteredMeals, dailyNutritionData, profile]);

  // Weight Trend Data for Recharts
  const weightChartData = useMemo(() => {
    return filteredWeights.map(w => {
      const d = new Date(w.timestamp);
      return {
        timestamp: d.getTime(),
        formattedDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: d.toLocaleDateString('pt-BR'),
        weightKg: Number(w.weightKg.toFixed(1)),
        targetWeightKg: profile?.targetWeightKg || null
      };
    });
  }, [filteredWeights, profile]);

  // Glycemia Data for Recharts
  const glycemiaChartData = useMemo(() => {
    const targetMin = profile?.glucoseTargetMin ?? 70;
    const targetMax = profile?.glucoseTargetMax ?? 140;

    return filteredReadings.map(r => {
      const d = new Date(r.timestamp);
      return {
        timestamp: d.getTime(),
        formattedDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        value: r.value,
        targetMin,
        targetMax
      };
    });
  }, [filteredReadings, profile]);

  // Save Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setSavingNote(true);
    try {
      const parsedTags = noteTagsInput
        .split(/[,\s#]+/)
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => `#${t.replace(/^#/, '')}`);

      const newNote: ClinicalNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patientUid: patient.patientUid,
        patientEmail: patient.patientEmail,
        patientName: patient.patientName,
        professionalEmail: professionalEmail.trim().toLowerCase(),
        professionalName: currentProfessional?.name || professionalEmail,
        note: noteContent.trim(),
        category: noteCategory,
        tags: parsedTags,
        createdAt: new Date().toISOString()
      };

      await savePatientClinicalNote(newNote);
      setNotes(prev => [newNote, ...prev]);
      setNoteContent('');
      setNoteTagsInput('');
      setFeedbackMsg({ type: 'success', text: 'Anotação clínica salva com sucesso no prontuário!' });
      setTimeout(() => setFeedbackMsg(null), 3500);
      onRefreshParent?.();
    } catch (err) {
      console.error('Erro ao salvar nota:', err);
      setFeedbackMsg({ type: 'error', text: 'Não foi possível salvar a anotação.' });
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Deseja remover esta anotação do prontuário do paciente?')) return;
    try {
      await deletePatientClinicalNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      onRefreshParent?.();
    } catch (err) {
      console.error('Erro ao deletar nota:', err);
    }
  };

  const handleApplyPreset = (preset: typeof NUTRITIONIST_PRESETS[0]) => {
    setNoteCategory(preset.category);
    setNoteContent(preset.text);
    setNoteTagsInput(preset.tag);
  };

  // Send Direct Message to Patient
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setSendingReply(true);
    try {
      const msg: ConsultationMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        patientUid: patient.patientUid,
        patientEmail: patient.patientEmail,
        patientName: patient.patientName,
        professionalEmail: professionalEmail.trim().toLowerCase(),
        professionalName: currentProfessional?.name || professionalEmail,
        sender: 'professional',
        message: replyText.trim(),
        timestamp: new Date().toISOString(),
        category: 'meal_adjustment',
        readByRecipient: false
      };

      await sendConsultationMessage(msg);
      setMessages(prev => [...prev, msg]);
      setReplyText('');
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md animate-fade-in" id="patient-detail-view-modal">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-950 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-teal-300 text-2xl font-black shadow-inner">
              {patient.patientName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {patient.patientName}
                </h2>
                <span className="bg-teal-500/30 text-teal-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-teal-400/30">
                  {patient.status === 'active' ? 'Paciente Ativo' : 'Arquivado'}
                </span>
                {isPatientDiabetic ? (
                  <span className="bg-rose-500/30 text-rose-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-rose-400/30 flex items-center gap-1">
                    <i className="fas fa-droplet"></i> {profile?.diabetesType || 'Diabético'}
                  </span>
                ) : (
                  <span className="bg-emerald-500/30 text-emerald-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                    <i className="fas fa-leaf"></i> Sem Diabetes (Nutrição & Saúde)
                  </span>
                )}
                <span className="bg-white/10 text-white text-[11px] font-mono px-2 py-0.5 rounded-lg border border-white/10">
                  Ref: {patient.referralCode}
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span><i className="fas fa-envelope mr-1 opacity-70"></i>{patient.patientEmail}</span>
                <span><i className="fas fa-calendar-check mr-1 opacity-70"></i>Vinculado em: {new Date(patient.linkedAt).toLocaleDateString('pt-BR')}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Period Selector */}
            <div className="flex items-center bg-black/30 rounded-xl p-1 border border-white/15 text-xs font-bold">
              {[
                { label: '7D', value: 7 },
                { label: '14D', value: 14 },
                { label: '30D', value: 30 },
                { label: 'Tudo', value: 0 }
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriodDays(p.value)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    periodDays === p.value
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'text-teal-200 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/15"
              title="Imprimir prontuário em PDF"
            >
              <i className="fas fa-print"></i>
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-rose-500 text-white flex items-center justify-center transition"
            >
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* Nutritional Role Context Banner */}
        <div className="px-6 py-2.5 bg-teal-50/70 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-medium">
            <span className="p-1 bg-teal-600 text-white rounded-md text-[10px] font-black">
              {isNutritionist ? 'NUTRIÇÃO & MACROS' : 'CLÍNICA MÉDICA'}
            </span>
            <span>
              {isNutritionist
                ? 'Foco Nutricional: Análise da ingestão real de macronutrientes, distribuição energética e qualidade das refeições.'
                : 'Foco Clínico: Avaliação de variabilidade metabólica, estabilidade glicêmica e conduta terapêutica.'}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {profile?.healthGoal ? `Meta: ${profile.healthGoal}` : (isPatientDiabetic ? `Condição: ${profile?.diabetesType || 'Diabético'}` : 'Condição: Sem Diabetes')}
          </span>
        </div>

        {/* Tabs Bar */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-1 sm:gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'nutrition'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <i className="fas fa-utensils"></i>
            Nutrição & Macronutrientes
            <span className="text-[10px] px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-full font-bold">
              {filteredMeals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('weight')}
            className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'weight'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <i className="fas fa-weight-scale"></i>
            Evolução de Peso & Metas
            <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full font-bold">
              {profile?.weightKg ? `${profile.weightKg} kg` : `${filteredWeights.length} logs`}
            </span>
          </button>

          {isPatientDiabetic && (
            <button
              onClick={() => setActiveTab('glycemia')}
              className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'glycemia'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <i className="fas fa-heart-pulse"></i>
              Glicemia & Telemetria
              <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full font-bold">
                {filteredReadings.length}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('clinical_notes')}
            className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'clinical_notes'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <i className="fas fa-notes-medical"></i>
            Anotações Privadas
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full font-bold">
              {notes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={`py-3 px-3 sm:px-4 text-xs font-black border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'messages'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <i className="fas fa-comments"></i>
            Orientações Diretas
            <span className="text-[10px] px-1.5 py-0.2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full font-bold">
              {messages.length}
            </span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
                Carregando histórico e logs de saúde do paciente...
              </p>
            </div>
          ) : (
            <>
              {/* ============================================================== */}
              {/* TAB 1: NUTRIÇÃO & MACRONUTRIENTES */}
              {/* ============================================================== */}
              {activeTab === 'nutrition' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900">
                      <p className="text-[10px] font-extrabold uppercase text-teal-800 dark:text-teal-300">Calorias Médias</p>
                      <h4 className="text-xl font-black text-teal-950 dark:text-teal-100 mt-1">
                        {nutritionTotals.avgCalories} <span className="text-xs font-semibold">kcal/dia</span>
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">{nutritionTotals.totalMeals} refeições logadas</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900">
                      <p className="text-[10px] font-extrabold uppercase text-teal-800 dark:text-teal-300">Carboidratos</p>
                      <h4 className="text-xl font-black text-teal-600 dark:text-teal-400 mt-1">
                        {nutritionTotals.avgCarbs}g <span className="text-xs font-semibold">/dia</span>
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">{nutritionTotals.avgSugars}g açúcares</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900">
                      <p className="text-[10px] font-extrabold uppercase text-indigo-800 dark:text-indigo-300">Proteínas</p>
                      <h4 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {nutritionTotals.avgProteins}g <span className="text-xs font-semibold">/dia</span>
                      </h4>
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold mt-0.5">
                        {nutritionTotals.proteinPerKg} g/kg corporal
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                      <p className="text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-300">Gorduras Totais</p>
                      <h4 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                        {nutritionTotals.avgFats}g <span className="text-xs font-semibold">/dia</span>
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Lipídios calculados</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                      <p className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300">Dias com Registros</p>
                      <h4 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {nutritionTotals.daysLogged} <span className="text-xs font-semibold">dias</span>
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Neste período ({periodDays === 0 ? 'Total' : `${periodDays}d`})</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                      <p className="text-[10px] font-extrabold uppercase text-gray-600 dark:text-gray-300">Meta Calórica / TMB</p>
                      <h4 className="text-xl font-black text-gray-900 dark:text-gray-100 mt-1">
                        {profile?.bioimpedance?.basalMetabolicRateKcal ? `${profile.bioimpedance.basalMetabolicRateKcal} kcal` : 'N/A'}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Taxa metabólica basal</p>
                    </div>
                  </div>

                  {/* Nutritional Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Bar Chart: Daily Macros Evolution */}
                    <div className="lg:col-span-8 bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <i className="fas fa-chart-column text-teal-600"></i>
                            Ingestão Diária de Macronutrientes (Gramas)
                          </h4>
                          <p className="text-[11px] text-gray-500">
                            Acompanhamento diário de carboidratos, proteínas e gorduras ingeridas pelo paciente.
                          </p>
                        </div>
                      </div>

                      {dailyNutritionData.length > 0 ? (
                        <div className="h-72 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyNutritionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                              <XAxis dataKey="formattedDate" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#1f2937',
                                  borderColor: '#374151',
                                  borderRadius: '12px',
                                  color: '#fff',
                                  fontSize: '12px'
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                              <Bar dataKey="carbs" name="Carboidratos (g)" fill={MACRO_COLORS.carbs} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="proteins" name="Proteínas (g)" fill={MACRO_COLORS.protein} radius={[4, 4, 0, 0]} />
                              <Bar dataKey="fats" name="Gorduras (g)" fill={MACRO_COLORS.fats} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center p-6">
                          <i className="fas fa-bowl-food text-3xl text-gray-400 mb-2"></i>
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-400">Nenhuma refeição registrada no período selecionado.</p>
                          <p className="text-[11px] text-gray-400">Oriente o paciente a fotografar e registrar suas refeições no app.</p>
                        </div>
                      )}
                    </div>

                    {/* Donut Chart: Macro Distribution % */}
                    <div className="lg:col-span-4 bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3 flex flex-col justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <i className="fas fa-chart-pie text-indigo-600"></i>
                          Distribuição Calórica de Macros
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Proporção energética das calorias totais ingeridas.
                        </p>
                      </div>

                      {filteredMeals.length > 0 ? (
                        <>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={nutritionTotals.macroPercent}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={68}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {nutritionTotals.macroPercent.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(val: any) => [`${val}%`, 'Participação']}
                                  contentStyle={{
                                    backgroundColor: '#1f2937',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    fontSize: '11px'
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-xs">
                            {nutritionTotals.macroPercent.map((m, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx] }}></span>
                                  <span className="font-bold text-gray-700 dark:text-gray-300">{m.name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-black text-gray-900 dark:text-gray-100">{m.value}%</span>
                                  <span className="text-[10px] text-gray-400 ml-1.5">({m.grams}g/dia)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="h-48 flex items-center justify-center text-xs text-gray-400 text-center">
                          Sem dados suficientes para calcular proporções.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meal Timeline List */}
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <i className="fas fa-list-check text-teal-600"></i>
                        Detalhamento das Refeições ({filteredMeals.length} registros)
                      </h4>
                      <span className="text-xs text-gray-400">Ordenado por data decrescente</span>
                    </div>

                    {filteredMeals.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                        {filteredMeals.slice().reverse().map((meal, idx) => (
                          <div
                            key={meal.id || idx}
                            className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/80 flex flex-col justify-between gap-2 hover:border-teal-500/50 transition"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-bold text-xs text-gray-900 dark:text-gray-100">
                                  {meal.name || 'Refeição Registrada'}
                                </h5>
                                <p className="text-[10px] text-gray-400">
                                  {new Date(meal.timestamp).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-extrabold text-[11px]">
                                {meal.calories || 0} kcal
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-800 text-[11px]">
                              <div className="bg-white dark:bg-gray-800 p-1.5 rounded-lg text-center">
                                <span className="text-[9px] text-gray-400 block font-semibold">Carboidratos</span>
                                <span className="font-black text-teal-600 dark:text-teal-400">{meal.carbohydrates || 0}g</span>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-1.5 rounded-lg text-center">
                                <span className="text-[9px] text-gray-400 block font-semibold">Proteínas</span>
                                <span className="font-black text-indigo-600 dark:text-indigo-400">{meal.proteins || 0}g</span>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-1.5 rounded-lg text-center">
                                <span className="text-[9px] text-gray-400 block font-semibold">Gorduras</span>
                                <span className="font-black text-amber-600 dark:text-amber-400">{meal.fats || 0}g</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic text-center p-6">
                        Nenhum registro alimentar encontrado para o período selecionado.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 2: EVOLUÇÃO DE PESO & METAS */}
              {/* ============================================================== */}
              {activeTab === 'weight' && (
                <div className="space-y-6">
                  {/* Bioimpedance & Target Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900">
                      <p className="text-[10px] font-extrabold uppercase text-teal-800 dark:text-teal-300">Peso Atual</p>
                      <h4 className="text-2xl font-black text-teal-950 dark:text-teal-100 mt-1">
                        {profile?.weightKg ? `${profile.weightKg} kg` : 'Não inf.'}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Último valor registrado</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900">
                      <p className="text-[10px] font-extrabold uppercase text-indigo-800 dark:text-indigo-300">Meta de Peso</p>
                      <h4 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {profile?.targetWeightKg ? `${profile.targetWeightKg} kg` : 'Não definida'}
                      </h4>
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold mt-0.5">
                        {profile?.weightKg && profile?.targetWeightKg
                          ? `${(profile.weightKg - profile.targetWeightKg > 0 ? '-' : '+')}${Math.abs(profile.weightKg - profile.targetWeightKg).toFixed(1)} kg até a meta`
                          : 'Alvo nutricional'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">
                      <p className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300">Gordura Corporal</p>
                      <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {profile?.bioimpedance?.bodyFatPercentage ? `${profile.bioimpedance.bodyFatPercentage}%` : 'N/A'}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Bioimpedância clínica</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900">
                      <p className="text-[10px] font-extrabold uppercase text-cyan-800 dark:text-cyan-300">Massa Magra</p>
                      <h4 className="text-2xl font-black text-cyan-600 dark:text-cyan-400 mt-1">
                        {profile?.bioimpedance?.muscleMassKg ? `${profile.bioimpedance.muscleMassKg} kg` : 'N/A'}
                      </h4>
                      <p className="text-[10px] text-gray-500 mt-0.5">Massa muscular estimada</p>
                    </div>
                  </div>

                  {/* Weight Chart (Recharts) */}
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <i className="fas fa-chart-line text-teal-600"></i>
                          Curva de Evolução de Peso Corporal (kg)
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Progresso ponderal com linha de referência de meta nutricional.
                        </p>
                      </div>
                    </div>

                    {weightChartData.length > 0 ? (
                      <div className="h-80 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={weightChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="formattedDate" tick={{ fontSize: 11 }} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1f2937',
                                borderColor: '#374151',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '12px'
                              }}
                              formatter={(val: any) => [`${val} kg`, 'Peso']}
                            />
                            {profile?.targetWeightKg && (
                              <ReferenceLine
                                y={profile.targetWeightKg}
                                label={{ value: `Meta: ${profile.targetWeightKg}kg`, fill: '#6366f1', fontSize: 10, position: 'top' }}
                                stroke="#6366f1"
                                strokeDasharray="4 4"
                              />
                            )}
                            <Area
                              type="monotone"
                              dataKey="weightKg"
                              name="Peso (kg)"
                              stroke="#0d9488"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#weightGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center p-6">
                        <i className="fas fa-weight-scale text-3xl text-gray-400 mb-2"></i>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400">Nenhum registro de peso no período.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 3: GLICEMIA & TELEMETRIA METABÓLICA */}
              {/* ============================================================== */}
              {activeTab === 'glycemia' && (
                <div className="space-y-6">
                  {/* Medical vs Nutrition Note */}
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-300 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                    <i className="fas fa-circle-info text-amber-600 text-base mt-0.5"></i>
                    <div>
                      <strong className="block font-bold">Nota de Escopo Clínico:</strong>
                      <span>
                        Para o acompanhamento nutricional, utilize as curvas glicêmicas para identificar respostas alimentares e picos pós-prandiais para ajuste de fibras e carboidratos. Ajustes de posologia medicamentosa ou prescrições de insulina são de competência médica exclusiva.
                      </span>
                    </div>
                  </div>

                  {/* Glycemia Line Chart */}
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <i className="fas fa-heart-pulse text-red-500"></i>
                          Telemetria Glicêmica (mg/dL)
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          Faixa alvo configurada: {profile?.glucoseTargetMin ?? 70} - {profile?.glucoseTargetMax ?? 140} mg/dL
                        </p>
                      </div>
                    </div>

                    {glycemiaChartData.length > 0 ? (
                      <div className="h-80 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={glycemiaChartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="formattedDate" tick={{ fontSize: 10 }} />
                            <YAxis domain={['dataMin - 10', 'dataMax + 10']} tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1f2937',
                                borderColor: '#374151',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '12px'
                              }}
                              formatter={(val: any) => [`${val} mg/dL`, 'Glicemia']}
                            />
                            <ReferenceLine
                              y={profile?.glucoseTargetMax ?? 140}
                              label={{ value: 'Limite Sup.', fill: '#ef4444', fontSize: 10 }}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                            />
                            <ReferenceLine
                              y={profile?.glucoseTargetMin ?? 70}
                              label={{ value: 'Limite Inf.', fill: '#f59e0b', fontSize: 10 }}
                              stroke="#f59e0b"
                              strokeDasharray="3 3"
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              name="Glicemia"
                              stroke="#0d9488"
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: '#0d9488' }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 text-center p-6">
                        <i className="fas fa-heart-pulse text-3xl text-gray-400 mb-2"></i>
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400">Nenhuma leitura glicêmica registrada no período.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 4: ANOTAÇÕES CLÍNICAS PRIVADAS */}
              {/* ============================================================== */}
              {activeTab === 'clinical_notes' && (
                <div className="space-y-6">
                  {feedbackMsg && (
                    <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
                      feedbackMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 text-rose-800 dark:text-rose-200'
                    }`}>
                      <span>{feedbackMsg.text}</span>
                      <button onClick={() => setFeedbackMsg(null)}><i className="fas fa-times"></i></button>
                    </div>
                  )}

                  {/* Quick Presets */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <i className="fas fa-bolt text-amber-500"></i>
                      Modelos de Conduta Rápida (Clique para preencher):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {NUTRITIONIST_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-teal-50 hover:text-teal-700 dark:bg-gray-800 dark:hover:bg-teal-950/60 dark:hover:text-teal-300 text-gray-700 dark:text-gray-300 text-xs font-bold transition border border-gray-200 dark:border-gray-700 flex items-center gap-1.5"
                        >
                          <i className="fas fa-pen-nib text-[10px] text-teal-600"></i>
                          {preset.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleSaveNote} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <i className="fas fa-feather text-teal-600"></i>
                        Nova Anotação no Prontuário Privado
                      </h4>
                      <span className="text-[11px] text-gray-400">Visível apenas para você</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Categoria Clínica
                        </label>
                        <select
                          value={noteCategory}
                          onChange={(e) => setNoteCategory(e.target.value as any)}
                          className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="dietary_plan">Conduta Alimentar & Metas de Macros</option>
                          <option value="evolution">Evolução Nutricional & Comportamento</option>
                          <option value="weight_goal">Evolução Ponderal & Metas de Peso</option>
                          <option value="glucose_alert">Ajuste de Carga Glicêmica Pós-Prandial</option>
                          <option value="general">Observações Gerais</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Tags / Marcadores (opcional)
                        </label>
                        <input
                          type="text"
                          value={noteTagsInput}
                          onChange={(e) => setNoteTagsInput(e.target.value)}
                          placeholder="Ex: #LowCarb #Hipertrofia #BoaAderencia"
                          className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                        Conteúdo da Evolução Clínica *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Descreva a conduta, orientações repassadas ao paciente, metas de fracionamento ou observações..."
                        className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingNote}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        <i className={`fas ${savingNote ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                        {savingNote ? 'Salvando...' : 'Salvar no Prontuário'}
                      </button>
                    </div>
                  </form>

                  {/* Past Notes List */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <i className="fas fa-clock-rotate-left text-teal-600"></i>
                      Histórico de Anotações do Paciente ({notes.length})
                    </h4>

                    {notes.length > 0 ? (
                      <div className="space-y-3">
                        {notes.map(n => (
                          <div
                            key={n.id}
                            className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm space-y-2 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 uppercase">
                                  {n.category === 'dietary_plan'
                                    ? 'Conduta Alimentar'
                                    : n.category === 'evolution'
                                    ? 'Evolução Nutricional'
                                    : n.category === 'weight_goal'
                                    ? 'Meta Ponderal'
                                    : n.category === 'glucose_alert'
                                    ? 'Ajuste Glicêmico'
                                    : 'Geral'}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {new Date(n.createdAt).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>

                              <button
                                onClick={() => handleDeleteNote(n.id)}
                                className="text-gray-400 hover:text-rose-600 text-xs transition p-1"
                                title="Excluir nota"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>

                            <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                              {n.note}
                            </p>

                            {n.tags && n.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {n.tags.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-[10px] font-bold text-gray-600 dark:text-gray-300"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl text-center">
                        Nenhuma anotação clínica salva para este paciente ainda.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 5: MENSAGENS / ORIENTAÇÕES DIRETAS */}
              {/* ============================================================== */}
              {activeTab === 'messages' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-96">
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                      {messages.length > 0 ? (
                        messages.map(msg => {
                          const isFromProf = msg.sender === 'professional';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isFromProf ? 'items-end' : 'items-start'}`}
                            >
                              <div
                                className={`max-w-md p-3.5 rounded-2xl text-xs ${
                                  isFromProf
                                    ? 'bg-teal-600 text-white rounded-br-none shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
                                }`}
                              >
                                <p className="font-semibold">{msg.message}</p>
                                <span className="block text-[9px] opacity-75 text-right mt-1">
                                  {new Date(msg.timestamp).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 text-xs">
                          <i className="fas fa-comments text-3xl mb-2 opacity-50"></i>
                          Nenhuma mensagem trocada ainda com {patient.patientName}.
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="pt-3 border-t dark:border-gray-700 flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Escrever orientação nutricional para o paciente..."
                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !replyText.trim()}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <i className="fas fa-paper-plane"></i>
                        Enviar
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetailView;

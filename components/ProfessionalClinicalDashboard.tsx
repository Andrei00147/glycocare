import React, { useState, useEffect, useMemo } from 'react';
import { PatientLink, ProfessionalPartner, GlucoseReading, MealLog, WeightLog, UserProfile, ClinicalNote, DiabetesType } from '../types';
import {
  fetchGlucoseReadingsFromFirestore,
  fetchMealLogsFromFirestore,
  fetchWeightLogsFromFirestore,
  fetchUserProfileFromFirestore,
  fetchPatientClinicalNotes,
  savePatientClinicalNote,
  deletePatientClinicalNote
} from '../services/firestoreService';

export const isPatientDiabetic = (profile?: UserProfile | null, patient?: PatientLink | null): boolean => {
  if (patient?.clinicalTrack) {
    return patient.clinicalTrack === 'diabetes';
  }
  if (!profile) return false;
  if (profile.clinicalTrack) {
    return profile.clinicalTrack === 'diabetes';
  }
  if (profile.diabetesType && profile.diabetesType !== DiabetesType.None) {
    return true;
  }
  if (profile.useInsulin || profile.useOralMedication) {
    return true;
  }
  return false;
};

interface PatientClinicalSummary {
  patient: PatientLink;
  profile: UserProfile | null;
  hasDiabetes: boolean;
  latestGlucose: GlucoseReading | null;
  avgGlucose7d: number | null;
  glucoseStatus: 'in_target' | 'high' | 'low' | 'no_data' | 'not_applicable';
  readingsCount: number;
  readingsCount24h: number;
  outOfRangeCount24h: number;
  hasGlucoseAlert24h: boolean;
  lastAlertReading24h: GlucoseReading | null;
  minReading24h: number | null;
  maxReading24h: number | null;
  latestWeight: WeightLog | null;
  previousWeight: WeightLog | null;
  weightDelta: number | null;
  todayCarbs: number;
  todayMealsCount: number;
  notes: ClinicalNote[];
  isLoading: boolean;
}

interface ProfessionalClinicalDashboardProps {
  patients: PatientLink[];
  currentProfessional?: ProfessionalPartner | null;
  professionalEmail: string;
  onOpenDossier: (patient: PatientLink) => void;
  onUnlinkPatient: (linkId: string) => void;
  onRefresh: () => void;
  onOpenAddPatient: () => void;
}

const CLINICAL_PRESETS_DIABETES = [
  {
    category: 'evolution' as const,
    title: 'Evolução Clínica Estável',
    text: 'Paciente mantendo glicemia em alvo terapêutico na maior parte do tempo. Boa aderência ao plano alimentar e fracionamento das refeições.'
  },
  {
    category: 'glucose_alert' as const,
    title: 'Alerta de Glicemia Pós-Prandial',
    text: 'Identificada leitura fora do alvo nas últimas 24h. Orientada readequação na densidade de carboidratos simples e combinação obrigatória com fibras e proteínas.'
  },
  {
    category: 'dietary_plan' as const,
    title: 'Ajuste de Macronutrientes & VET',
    text: 'Readequação das metas de carboidratos (contagem de gramas por refeição) e aumento do aporte proteico para suporte à saciedade e preservação de massa magra.'
  },
  {
    category: 'weight_goal' as const,
    title: 'Evolução Ponderal & Metas',
    text: 'Progresso satisfatório na curva de peso corporal. Orientado manter hidratação adequada (>35ml/kg) e registro fotográfico das refeições no app.'
  }
];

const CLINICAL_PRESETS_NUTRITION = [
  {
    category: 'evolution' as const,
    title: 'Evolução Nutricional & Aderência',
    text: 'Paciente apresentando excelente aderência ao plano alimentar diário, com boa distribuição de macronutrientes, saciedade e fracionamento adequado.'
  },
  {
    category: 'dietary_plan' as const,
    title: 'Ajuste de Aporte Proteico & VET',
    text: 'Readequação no balanço calórico diário e aporte proteico estruturado por kg de peso corporal para suporte à hipertrofia e saúde metabólica.'
  },
  {
    category: 'weight_goal' as const,
    title: 'Metas de Composição Corporal',
    text: 'Progresso consistente na curva de peso e composição corporal. Reforçada a importância da hidratação diária (>35ml/kg).'
  },
  {
    category: 'general' as const,
    title: 'Reeducação Alimentar & Hábitos',
    text: 'Paciente orientado a manter o registro fotográfico das refeições no aplicativo e variedade de fibras e micronutrientes.'
  }
];

export const ProfessionalClinicalDashboard: React.FC<ProfessionalClinicalDashboardProps> = ({
  patients,
  currentProfessional,
  professionalEmail,
  onOpenDossier,
  onUnlinkPatient,
  onRefresh,
  onOpenAddPatient
}) => {
  const [summaries, setSummaries] = useState<Record<string, PatientClinicalSummary>>({});
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert24h' | 'diabetic' | 'non_diabetic' | 'target' | 'no_data'>('all');
  
  // Note Modal State
  const [activeNotePatient, setActiveNotePatient] = useState<PatientLink | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<ClinicalNote['category']>('evolution');
  const [savingNote, setSavingNote] = useState(false);
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  // Load telemetry for all linked patients
  useEffect(() => {
    if (patients.length === 0) return;

    let isMounted = true;
    setLoadingMetrics(true);

    const loadAllSummaries = async () => {
      const results: Record<string, PatientClinicalSummary> = {};

      await Promise.all(
        patients.map(async (p) => {
          try {
            const [profile, readings, meals, weights, notes] = await Promise.all([
              fetchUserProfileFromFirestore(p.patientUid),
              fetchGlucoseReadingsFromFirestore(p.patientUid),
              fetchMealLogsFromFirestore(p.patientUid),
              fetchWeightLogsFromFirestore(p.patientUid),
              fetchPatientClinicalNotes(p.patientUid, professionalEmail)
            ]);

            const hasDiabetes = isPatientDiabetic(profile, p);

            // Compute Glucose Metrics (only active if patient has diabetes)
            let latestGlucose: GlucoseReading | null = null;
            let avgGlucose7d: number | null = null;
            let outOfRange24h: GlucoseReading[] = [];
            let hasGlucoseAlert24h = false;
            let lastAlertReading24h: GlucoseReading | null = null;
            let minReading24h: number | null = null;
            let maxReading24h: number | null = null;
            let glucoseStatus: 'in_target' | 'high' | 'low' | 'no_data' | 'not_applicable' = 'not_applicable';

            if (hasDiabetes) {
              const sortedReadings = [...readings].sort(
                (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );
              latestGlucose = sortedReadings.length > 0 ? sortedReadings[sortedReadings.length - 1] : null;

              const now = new Date();
              const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

              const recentReadings7d = sortedReadings.filter(r => new Date(r.timestamp) >= sevenDaysAgo);
              const recentReadings24h = sortedReadings.filter(r => new Date(r.timestamp) >= twentyFourHoursAgo);
              
              avgGlucose7d = recentReadings7d.length > 0
                ? Math.round(recentReadings7d.reduce((acc, r) => acc + r.value, 0) / recentReadings7d.length)
                : null;

              const targetMin = profile?.glucoseTargetMin ?? 70;
              const targetMax = profile?.glucoseTargetMax ?? 140;

              // 24h Out of range detection strictly for diabetic patients
              outOfRange24h = recentReadings24h.filter(r => r.value < targetMin || r.value > targetMax);
              hasGlucoseAlert24h = outOfRange24h.length > 0;
              lastAlertReading24h = outOfRange24h.length > 0 ? outOfRange24h[outOfRange24h.length - 1] : null;
              minReading24h = recentReadings24h.length > 0 ? Math.min(...recentReadings24h.map(r => r.value)) : null;
              maxReading24h = recentReadings24h.length > 0 ? Math.max(...recentReadings24h.map(r => r.value)) : null;

              if (latestGlucose) {
                if (latestGlucose.value < targetMin) {
                  glucoseStatus = 'low';
                } else if (latestGlucose.value > targetMax) {
                  glucoseStatus = 'high';
                } else {
                  glucoseStatus = 'in_target';
                }
              } else {
                glucoseStatus = 'no_data';
              }
            }

            // Compute Weight Metrics
            const sortedWeights = [...weights].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const latestWeight = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1] : null;
            const previousWeight = sortedWeights.length > 1 ? sortedWeights[sortedWeights.length - 2] : null;
            const weightDelta = (latestWeight && previousWeight)
              ? Number((latestWeight.weightKg - previousWeight.weightKg).toFixed(1))
              : null;

            // Compute Today's Meals
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const todayMeals = meals.filter(m => !m.isDeleted && new Date(m.timestamp) >= startOfDay);
            const todayCarbs = todayMeals.reduce((acc, m) => acc + (Number(m.carbohydrates) || 0), 0);

            results[p.patientUid] = {
              patient: p,
              profile,
              hasDiabetes,
              latestGlucose,
              avgGlucose7d,
              glucoseStatus,
              readingsCount: readings.length,
              readingsCount24h: recentReadings24h.length,
              outOfRangeCount24h: outOfRange24h.length,
              hasGlucoseAlert24h,
              lastAlertReading24h,
              minReading24h,
              maxReading24h,
              latestWeight,
              previousWeight,
              weightDelta,
              todayCarbs,
              todayMealsCount: todayMeals.length,
              notes,
              isLoading: false
            };
          } catch (err) {
            console.error(`Erro ao carregar dados do paciente ${p.patientName}:`, err);
            results[p.patientUid] = {
              patient: p,
              profile: null,
              hasDiabetes: false,
              latestGlucose: null,
              avgGlucose7d: null,
              glucoseStatus: 'no_data',
              readingsCount: 0,
              readingsCount24h: 0,
              outOfRangeCount24h: 0,
              hasGlucoseAlert24h: false,
              lastAlertReading24h: null,
              minReading24h: null,
              maxReading24h: null,
              latestWeight: null,
              previousWeight: null,
              weightDelta: null,
              todayCarbs: 0,
              todayMealsCount: 0,
              notes: [],
              isLoading: false
            };
          }
        })
      );

      if (isMounted) {
        setSummaries(results);
        setLoadingMetrics(false);
      }
    };

    loadAllSummaries();

    return () => {
      isMounted = false;
    };
  }, [patients, professionalEmail]);

  // KPIs
  const kpis = useMemo(() => {
    const total = patients.length;
    const summariesList = Object.values(summaries);
    
    const diabeticSummaries = summariesList.filter(s => s.hasDiabetes);
    const nonDiabeticSummaries = summariesList.filter(s => !s.hasDiabetes);
    
    const alerts24hCount = diabeticSummaries.filter(s => s.hasGlucoseAlert24h).length;
    const inTargetCount = diabeticSummaries.filter(s => s.glucoseStatus === 'in_target').length;
    const totalNotes = summariesList.reduce((acc, s) => acc + s.notes.length, 0);
    const withRecentReadings = diabeticSummaries.filter(s => s.latestGlucose !== null).length;

    const targetPercentage = withRecentReadings > 0
      ? Math.round((inTargetCount / withRecentReadings) * 100)
      : 0;

    return {
      total,
      alerts24hCount,
      diabeticPatientsCount: diabeticSummaries.length,
      nonDiabeticPatientsCount: nonDiabeticSummaries.length,
      inTargetCount,
      totalNotes,
      targetPercentage
    };
  }, [patients, summaries]);

  // Filtering & Prioritization Sorting
  const filteredPatients = useMemo(() => {
    const list = patients.filter(p => {
      const matchesSearch =
        p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patientEmail.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const sum = summaries[p.patientUid];
      if (!sum) return statusFilter === 'all';

      if (statusFilter === 'alert24h') {
        return sum.hasGlucoseAlert24h;
      }
      if (statusFilter === 'diabetic') {
        return sum.hasDiabetes;
      }
      if (statusFilter === 'non_diabetic') {
        return !sum.hasDiabetes;
      }
      if (statusFilter === 'target') {
        return sum.hasDiabetes && sum.glucoseStatus === 'in_target';
      }
      if (statusFilter === 'no_data') {
        return sum.hasDiabetes && sum.glucoseStatus === 'no_data';
      }

      return true;
    });

    // Sort patients so that patients with 24h glucose alert appear first for clinical prioritization
    return list.sort((a, b) => {
      const sumA = summaries[a.patientUid];
      const sumB = summaries[b.patientUid];
      const alertA = sumA?.hasGlucoseAlert24h ? 1 : 0;
      const alertB = sumB?.hasGlucoseAlert24h ? 1 : 0;
      return alertB - alertA;
    });
  }, [patients, summaries, searchTerm, statusFilter]);

  // Save Clinical Note Handler
  const handleSaveClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNotePatient || !noteContent.trim()) return;

    setSavingNote(true);
    setNoteFeedback(null);

    try {
      const newNote: ClinicalNote = {
        id: `cnote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        patientUid: activeNotePatient.patientUid,
        patientEmail: activeNotePatient.patientEmail,
        patientName: activeNotePatient.patientName,
        professionalEmail: professionalEmail,
        professionalName: currentProfessional?.name || 'Profissional de Saúde',
        note: noteContent.trim(),
        category: noteCategory,
        createdAt: new Date().toISOString()
      };

      await savePatientClinicalNote(newNote);

      // Update local state
      setSummaries(prev => {
        const currentSum = prev[activeNotePatient.patientUid];
        if (!currentSum) return prev;
        return {
          ...prev,
          [activeNotePatient.patientUid]: {
            ...currentSum,
            notes: [newNote, ...currentSum.notes]
          }
        };
      });

      setNoteContent('');
      setNoteFeedback('Nota clínica salva no prontuário com sucesso!');
      setTimeout(() => {
        setNoteFeedback(null);
        setActiveNotePatient(null);
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao salvar nota clínica:', err);
      setNoteFeedback('Erro ao salvar nota clínica no banco de dados.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (patientUid: string, noteId: string) => {
    if (!window.confirm('Deseja excluir esta nota clínica do prontuário?')) return;
    try {
      await deletePatientClinicalNote(noteId);
      setSummaries(prev => {
        const currentSum = prev[patientUid];
        if (!currentSum) return prev;
        return {
          ...prev,
          [patientUid]: {
            ...currentSum,
            notes: currentSum.notes.filter(n => n.id !== noteId)
          }
        };
      });
    } catch (err) {
      console.error('Erro ao excluir nota:', err);
    }
  };

  const handleOpenWhatsAppSummary = (p: PatientLink, sum?: PatientClinicalSummary) => {
    const isDiab = sum?.hasDiabetes;
    const clinicalFocus = isDiab
      ? `🩸 *Telemetria Glicêmica:* ${
          sum?.latestGlucose
            ? `${sum.latestGlucose.value} mg/dL (${new Date(sum.latestGlucose.timestamp).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`
            : 'Sem leituras recentes no app'
        }`
      : `🥗 *Foco Clínico:* Acompanhamento Nutricional & Prevenção (Sem Diabetes)`;

    const weightInfo = sum?.latestWeight
      ? `⚖️ *Peso atual:* ${sum.latestWeight.weightKg} kg`
      : '⚖️ *Peso:* Não atualizado recentemente';

    const text = `Olá, ${p.patientName}! Aqui é o ${currentProfessional?.name || 'seu especialista'} do NutriSaúdeVital.\n\n📊 *Resumo do seu acompanhamento clínico hoje:*\n• ${clinicalFocus}\n• ${weightInfo}\n• 🍽️ *Refeições de hoje:* ${sum?.todayMealsCount || 0} registradas (${sum?.todayCarbs || 0}g de carboidratos)\n\nComo você está se sentindo? Vamos alinhar os próximos passos das suas metas!`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6" id="professional-clinical-dashboard">
      {/* Top Clinical Header & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Patients */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Pacientes Vinculados
            </p>
            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-0.5">
              {kpis.total}
            </h3>
            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
              {kpis.diabeticPatientsCount} c/ diabetes • {kpis.nonDiabeticPatientsCount} nutrição
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xl">
            <i className="fas fa-users"></i>
          </div>
        </div>

        {/* KPI 2: 24h Glucose Alerts (Priority Attention) */}
        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition ${
          kpis.alerts24hCount > 0
            ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/20'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <i className="fas fa-bell"></i> Alertas 24h (Diabetes)
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {kpis.alerts24hCount}
              </h3>
              <span className="text-xs text-rose-800/80 dark:text-rose-300">
                {kpis.alerts24hCount === 1 ? 'paciente' : 'pacientes'}
              </span>
            </div>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
              Fora do alvo nas últimas 24h
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
            kpis.alerts24hCount > 0 ? 'bg-rose-600 text-white shadow-md animate-pulse' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
          }`}>
            <i className="fas fa-triangle-exclamation"></i>
          </div>
        </div>

        {/* KPI 3: Glycemia In Target (Diabetics) */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Glicemia no Alvo
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {kpis.targetPercentage}%
              </h3>
              <span className="text-xs text-gray-400">({kpis.inTargetCount} pac.)</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Entre diabéticos monitorados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
            <i className="fas fa-circle-check"></i>
          </div>
        </div>

        {/* KPI 4: Clinical Evolution Notes */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Notas Clínicas
            </p>
            <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {kpis.totalNotes}
            </h3>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
              Evoluções salvas no prontuário
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
            <i className="fas fa-notes-medical"></i>
          </div>
        </div>
      </div>

      {/* High-Priority Alert Banner if any diabetic patient is out of range in last 24h */}
      {kpis.alerts24hCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border-2 border-rose-500/50 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-lg shadow-md shrink-0">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <div>
              <h4 className="font-black text-sm text-rose-900 dark:text-rose-100 flex items-center gap-2">
                <span>Triagem de Risco: {kpis.alerts24hCount} {kpis.alerts24hCount === 1 ? 'paciente com diabetes apresentou' : 'pacientes com diabetes apresentaram'} glicemia fora da faixa ideal nas últimas 24h</span>
              </h4>
              <p className="text-xs text-rose-800/90 dark:text-rose-300">
                Os cartões destacados em vermelho abaixo indicam prioridade clínica para ajuste de refeições, reavaliação de carboidratos ou contato com o paciente.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('alert24h')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap flex items-center gap-1.5 ${
              statusFilter === 'alert24h'
                ? 'bg-rose-800 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            <i className="fas fa-filter"></i>
            {statusFilter === 'alert24h' ? 'Filtro Ativo' : `Filtrar Alertas (${kpis.alerts24hCount})`}
          </button>
        </div>
      )}

      {/* Action Bar & Search / Filter Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <i className="fas fa-search absolute left-3.5 top-3 text-gray-400 text-xs"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome ou e-mail do paciente..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/60 border border-gray-300 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-users text-[10px]"></i>
            Todos ({patients.length})
          </button>

          {/* 24h Alerts Filter (Prioritization - Diabetic only) */}
          <button
            onClick={() => setStatusFilter('alert24h')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'alert24h'
                ? 'bg-rose-600 text-white shadow-sm'
                : kpis.alerts24hCount > 0
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-triangle-exclamation text-[10px]"></i>
            Alertas 24h ({kpis.alerts24hCount})
          </button>

          {/* Diabetics Filter */}
          <button
            onClick={() => setStatusFilter('diabetic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'diabetic'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100'
            }`}
          >
            <i className="fas fa-droplet text-[10px]"></i>
            Com Diabetes ({kpis.diabeticPatientsCount})
          </button>

          {/* Non-Diabetics / Nutrition & Prevention Filter */}
          <button
            onClick={() => setStatusFilter('non_diabetic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'non_diabetic'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
            }`}
          >
            <i className="fas fa-leaf text-[10px]"></i>
            Sem Diabetes (Nutrição) ({kpis.nonDiabeticPatientsCount})
          </button>

          <button
            onClick={() => setStatusFilter('target')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'target'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-circle-check text-[10px]"></i>
            No Alvo ({kpis.inTargetCount})
          </button>

          <button
            onClick={() => setStatusFilter('no_data')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'no_data'
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <i className="fas fa-circle-question text-[10px]"></i>
            Sem Dados
          </button>

          <button
            onClick={onRefresh}
            title="Atualizar dados de telemetria"
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition"
          >
            <i className="fas fa-rotate text-xs"></i>
          </button>

          <button
            onClick={onOpenAddPatient}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <i className="fas fa-user-plus text-[11px]"></i>
            Vincular
          </button>
        </div>
      </div>

      {/* Patient Clinical Cards List */}
      {loadingMetrics && Object.keys(summaries).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h4 className="font-extrabold text-sm text-gray-800 dark:text-gray-200">
            Sincronizando prontuários e telemetrias clínicas...
          </h4>
          <p className="text-xs text-gray-500">
            Calculando médias glicêmicas, alertas de 24h e histórico nutricional de cada paciente.
          </p>
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-200 dark:border-gray-700 space-y-3">
          <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950 text-teal-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            <i className="fas fa-stethoscope"></i>
          </div>
          <h4 className="font-extrabold text-gray-900 dark:text-gray-100">
            Nenhum paciente encontrado com estes filtros
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            {searchTerm
              ? 'Tente buscar com outro termo ou limpe o campo de pesquisa.'
              : 'Compartilhe seu código de indicação ou vincule novos pacientes diretamente para gerenciar seus planos alimentares.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredPatients.map(patient => {
            const sum = summaries[patient.patientUid];
            const targetMin = sum?.profile?.glucoseTargetMin ?? 70;
            const targetMax = sum?.profile?.glucoseTargetMax ?? 140;
            const isDiabetic = Boolean(sum?.hasDiabetes);
            // 24-hour alert only applies to diabetic patients
            const hasAlert24h = isDiabetic && Boolean(sum?.hasGlucoseAlert24h);

            return (
              <div
                key={patient.id}
                className={`rounded-3xl transition-all p-5 space-y-4 flex flex-col justify-between ${
                  hasAlert24h
                    ? 'bg-rose-50/40 dark:bg-rose-950/30 border-2 border-rose-500 dark:border-rose-600 ring-2 ring-rose-500/20 shadow-lg shadow-rose-500/10'
                    : isDiabetic
                    ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
                    : 'bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 shadow-sm hover:shadow-md'
                }`}
              >
                {/* 24-Hour Alert Banner Bar for high priority patients (strictly diabetic) */}
                {hasAlert24h && (
                  <div className="px-3.5 py-2 rounded-2xl bg-rose-600 text-white flex items-center justify-between text-xs font-bold shadow-sm">
                    <div className="flex items-center gap-2">
                      <i className="fas fa-triangle-exclamation text-amber-300"></i>
                      <span>
                        ALERTA 24H: {sum?.outOfRangeCount24h} {sum?.outOfRangeCount24h === 1 ? 'leitura fora' : 'leituras fora'} do alvo ({targetMin}-{targetMax} mg/dL)
                      </span>
                    </div>
                    {sum?.lastAlertReading24h && (
                      <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-lg font-mono">
                        Última: {sum.lastAlertReading24h.value} mg/dL
                      </span>
                    )}
                  </div>
                )}

                {/* Patient Header */}
                <div 
                  onClick={() => onOpenDossier(patient)}
                  className="flex items-start justify-between gap-3 cursor-pointer group/header"
                  title="Clique para abrir gráficos de saúde, macronutrientes e prontuário"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl font-black text-lg flex items-center justify-center shadow-sm transition ${
                      hasAlert24h
                        ? 'bg-rose-600 text-white group-hover/header:bg-rose-700 ring-2 ring-rose-300'
                        : isDiabetic
                        ? 'bg-gradient-to-br from-rose-500 to-amber-600 group-hover/header:from-rose-600 group-hover/header:to-amber-700 text-white'
                        : 'bg-gradient-to-br from-teal-500 to-emerald-600 group-hover/header:from-teal-600 group-hover/header:to-emerald-700 text-white'
                    }`}>
                      {patient.patientName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className={`font-black text-base transition flex items-center gap-1.5 ${
                          hasAlert24h
                            ? 'text-rose-950 dark:text-rose-100 group-hover/header:text-rose-700 dark:group-hover/header:text-rose-400'
                            : 'text-gray-900 dark:text-gray-100 group-hover/header:text-teal-600 dark:group-hover/header:text-teal-400'
                        }`}>
                          {patient.patientName}
                          <i className="fas fa-chart-pie text-xs opacity-0 group-hover/header:opacity-100 text-teal-600 transition"></i>
                        </h4>

                        {/* Diabetes vs Nutrition Badges */}
                        {isDiabetic ? (
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                            <i className="fas fa-droplet text-rose-600 dark:text-rose-400 text-[9px]"></i>
                            {sum?.profile?.diabetesType || 'Diabético'}
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <i className="fas fa-leaf text-[9px] text-emerald-600 dark:text-emerald-400"></i>
                            Sem Diabetes (Nutrição)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {patient.patientEmail} • Vínculo: {new Date(patient.linkedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Status Tags */}
                  {hasAlert24h ? (
                    <span className="px-2.5 py-1 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow-sm shrink-0">
                      <i className="fas fa-triangle-exclamation text-amber-300"></i> Alerta 24h
                    </span>
                  ) : !isDiabetic ? (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1 shrink-0">
                      <i className="fas fa-apple-whole text-emerald-600"></i> Acompanhamento Nutricional
                    </span>
                  ) : sum?.glucoseStatus === 'in_target' ? (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shrink-0">
                      <i className="fas fa-circle-check"></i> No Alvo
                    </span>
                  ) : sum?.glucoseStatus === 'high' ? (
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shrink-0">
                      <i className="fas fa-arrow-trend-up"></i> Hiperglicemia
                    </span>
                  ) : sum?.glucoseStatus === 'low' ? (
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shrink-0">
                      <i className="fas fa-arrow-trend-down"></i> Hipoglicemia
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-xl text-[10px] font-bold uppercase shrink-0">
                      Sem Leituras
                    </span>
                  )}
                </div>

                {/* Telemetry Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Glucose Summary for Diabetics vs Nutrition Profile for Non-Diabetics */}
                  {isDiabetic ? (
                    <div className={`p-3 rounded-2xl border space-y-1 ${
                      hasAlert24h
                        ? 'bg-rose-100/70 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800'
                        : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700'
                    }`}>
                      <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <i className={`fas fa-droplet ${hasAlert24h ? 'text-rose-600' : 'text-rose-500'}`}></i>
                        Glicemia Recente
                      </span>
                      
                      {sum?.latestGlucose ? (
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-base font-black ${
                              hasAlert24h ? 'text-rose-700 dark:text-rose-300' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {sum.latestGlucose.value}
                            </span>
                            <span className="text-[10px] text-gray-500 font-medium">mg/dL</span>
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {new Date(sum.latestGlucose.timestamp).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic">Sem registros</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <i className="fas fa-shield-halved text-emerald-600"></i>
                        Telemetria Glicêmica
                      </span>
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                          Desativada
                        </span>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          Perfil Sem Diabetes
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Weight Summary */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <i className="fas fa-weight-scale text-teal-600"></i> Peso Atual
                    </span>
                    {sum?.latestWeight ? (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-gray-900 dark:text-gray-100">
                            {sum.latestWeight.weightKg}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">kg</span>
                          {sum.weightDelta !== null && (
                            <span
                              className={`text-[10px] font-bold ${
                                sum.weightDelta < 0
                                  ? 'text-emerald-600'
                                  : sum.weightDelta > 0
                                  ? 'text-amber-600'
                                  : 'text-gray-400'
                              }`}
                            >
                              ({sum.weightDelta > 0 ? `+${sum.weightDelta}` : sum.weightDelta}kg)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">
                          Meta: {sum.profile?.targetWeightKg ? `${sum.profile.targetWeightKg} kg` : 'N/A'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">Não registrado</p>
                    )}
                  </div>

                  {/* Today's Meals & Carbs */}
                  <div className="col-span-2 sm:col-span-1 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <i className="fas fa-utensils text-amber-500"></i> Hoje
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black text-gray-900 dark:text-gray-100">
                        {sum?.todayCarbs || 0}g
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium">carbos</span>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {sum?.todayMealsCount || 0} refeição(ões)
                    </p>
                  </div>
                </div>

                {/* Private Clinical Notes Section */}
                <div className="bg-teal-50/40 dark:bg-gray-900/40 p-3.5 rounded-2xl border border-teal-100 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                      <i className="fas fa-user-doctor text-teal-600"></i>
                      Notas Clínicas ({sum?.notes.length || 0})
                    </span>

                    <button
                      onClick={() => {
                        setActiveNotePatient(patient);
                        setNoteContent('');
                        setNoteFeedback(null);
                      }}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[10px] transition flex items-center gap-1 shadow-sm"
                    >
                      <i className="fas fa-plus"></i>
                      Adicionar Nota
                    </button>
                  </div>

                  {/* Notes Preview */}
                  {sum?.notes && sum.notes.length > 0 ? (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {sum.notes.slice(0, 3).map(n => (
                        <div
                          key={n.id}
                          className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 text-xs space-y-1 relative group"
                        >
                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span className="font-bold text-teal-700 dark:text-teal-300 uppercase">
                              {n.category === 'glucose_alert' ? 'Alerta Glicêmico' : n.category === 'dietary_plan' ? 'Plano Alimentar' : n.category === 'weight_goal' ? 'Meta Ponderal' : 'Evolução Clínica'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span>{new Date(n.createdAt).toLocaleDateString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              <button
                                onClick={() => handleDeleteNote(patient.patientUid, n.id)}
                                title="Excluir nota"
                                className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition"
                              >
                                <i className="fas fa-trash-alt text-[9px]"></i>
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-700 dark:text-gray-300 text-[11px] leading-relaxed whitespace-pre-wrap">
                            {n.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 italic text-center py-2">
                      Nenhuma anotação clínica privada para este paciente. Clique em "Adicionar Nota" para registrar condutas.
                    </p>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t dark:border-gray-700">
                  <button
                    onClick={() => onOpenDossier(patient)}
                    className={`py-2.5 px-2 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm ${
                      hasAlert24h
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
                  >
                    <i className="fas fa-chart-pie"></i>
                    <span className="hidden sm:inline">Gráficos & Prontuário</span>
                    <span className="sm:hidden">Gráficos</span>
                  </button>

                  <button
                    onClick={() => handleOpenWhatsAppSummary(patient, sum)}
                    className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <i className="fab fa-whatsapp"></i>
                    <span className="hidden sm:inline">Feedback WhatsApp</span>
                    <span className="sm:hidden">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => onUnlinkPatient(patient.id)}
                    className="py-2.5 px-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                  >
                    <i className="fas fa-user-minus text-[10px]"></i>
                    <span className="hidden sm:inline">Desvincular</span>
                    <span className="sm:hidden">Alta</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Private Clinical Note Modal */}
      {activeNotePatient && (() => {
        const activeSummary = summaries[activeNotePatient.patientUid];
        const activeIsDiabetic = Boolean(activeSummary?.hasDiabetes);
        const presets = activeIsDiabetic ? CLINICAL_PRESETS_DIABETES : CLINICAL_PRESETS_NUTRITION;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-start justify-between border-b dark:border-gray-700 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    Prontuário Confidencial do Especialista
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <i className="fas fa-notes-medical text-teal-600"></i>
                    Nova Anotação para {activeNotePatient.patientName}
                  </h3>
                  <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeIsDiabetic
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  }`}>
                    {activeIsDiabetic ? 'Paciente com Diabetes' : 'Paciente Sem Diabetes (Foco Nutricional)'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setActiveNotePatient(null);
                    setNoteFeedback(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block">
                  Modelos Rápidos de Conduta (clique para preencher):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setNoteCategory(preset.category);
                        setNoteContent(preset.text);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-teal-50 hover:text-teal-700 dark:bg-gray-700 dark:hover:bg-teal-950 dark:hover:text-teal-300 text-gray-700 dark:text-gray-300 text-[10px] font-bold transition flex items-center gap-1 border border-gray-200 dark:border-gray-600"
                    >
                      <i className="fas fa-pen-to-square text-[9px]"></i>
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveClinicalNote} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Categoria da Anotação *
                  </label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none font-bold"
                  >
                    <option value="evolution">Evolução Clínica & Aderência</option>
                    <option value="dietary_plan">Ajuste no Plano Alimentar & Macros</option>
                    {activeIsDiabetic && (
                      <option value="glucose_alert">Alerta Glicêmico Pós-Prandial</option>
                    )}
                    <option value="weight_goal">Meta Ponderal / Composição Corporal</option>
                    <option value="general">Observações Gerais</option>
                  </select>
                </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Texto da Evolução / Conduta *
                </label>
                <textarea
                  required
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Registre as orientações repassadas ao paciente, alterações na ingestão de carboidratos, metas de peso ou condutas..."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none leading-relaxed"
                />
              </div>

              {noteFeedback && (
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 text-center animate-pulse">
                  {noteFeedback}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setActiveNotePatient(null);
                    setNoteFeedback(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNote || !noteContent.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center gap-1.5"
                >
                  {savingNote ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Salvar no Prontuário
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    })()}
    </div>
  );
};

export default ProfessionalClinicalDashboard;


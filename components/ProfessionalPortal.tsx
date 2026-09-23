import React, { useState, useEffect } from 'react';
import { UserProfile, PatientLink, ProfessionalPartner, GlucoseReading, MealLog, WeightLog, View, ConsultationMessage } from '../types';
import {
  fetchPatientsForProfessional,
  archiveOrUnlinkPatient,
  createOrUpdatePatientLink,
  fetchProfessionalPartners,
  updatePartnerReferralCode
} from '../services/firestoreService';
import { auth } from '../src/firebase';
import { generateSecureReferralCode } from '../utils/referralCode';
import ProfessionalClinicalDashboard from './ProfessionalClinicalDashboard';
import { PatientDetailView } from './PatientDetailView';

interface ProfessionalPortalProps {
  onBack: () => void;
  navigateTo: (view: View) => void;
  currentProfessionalPartner?: ProfessionalPartner | null;
}

export const ProfessionalPortal: React.FC<ProfessionalPortalProps> = ({ onBack, navigateTo, currentProfessionalPartner }) => {
  const [patients, setPatients] = useState<PatientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clinical_dashboard' | 'referrals'>('clinical_dashboard');
  
  // Active Dossier State
  const [selectedPatient, setSelectedPatient] = useState<PatientLink | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierData, setDossierData] = useState<{
    profile: UserProfile | null;
    readings: GlucoseReading[];
    meals: MealLog[];
    weights: WeightLog[];
  } | null>(null);
  const [patientMessages, setPatientMessages] = useState<ConsultationMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Add Patient Modal State
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientNotes, setNewPatientNotes] = useState('');
  const [addingError, setAddingError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const professionalEmail = currentProfessionalPartner?.email || auth.currentUser?.email || '';
  const role = currentProfessionalPartner?.role || 'Nutricionista';
  const discountPercent = role === 'Médico' ? 70 : 65;
  const discountedPrice = role === 'Médico' ? 10.50 : 12.25;

  // Active referral code state with high-entropy name-based default
  const [activeReferralCode, setActiveReferralCode] = useState<string>(() => {
    if (currentProfessionalPartner?.referralCode && currentProfessionalPartner.referralCode !== 'NUTRI-PARCEIRO') {
      return currentProfessionalPartner.referralCode;
    }
    return generateSecureReferralCode(role, currentProfessionalPartner?.name || professionalEmail);
  });

  // Patient-specific custom invitation generator state
  const [customInvitePatientName, setCustomInvitePatientName] = useState('');
  const [copiedPersonalizedLink, setCopiedPersonalizedLink] = useState(false);
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [codeSuccessMsg, setCodeSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (currentProfessionalPartner?.referralCode && currentProfessionalPartner.referralCode !== 'NUTRI-PARCEIRO') {
      setActiveReferralCode(currentProfessionalPartner.referralCode);
    }
  }, [currentProfessionalPartner]);

  // Derived patient-specific code
  const derivedPatientCode = customInvitePatientName.trim()
    ? generateSecureReferralCode(role, currentProfessionalPartner?.name || professionalEmail, customInvitePatientName)
    : activeReferralCode;

  const handleRegenerateMainCode = async () => {
    const newCode = generateSecureReferralCode(role, currentProfessionalPartner?.name || professionalEmail);
    setActiveReferralCode(newCode);

    if (currentProfessionalPartner?.id) {
      setIsSavingCode(true);
      try {
        await updatePartnerReferralCode(currentProfessionalPartner.id, newCode);
        setCodeSuccessMsg('Novo código exclusivo gerado e salvo com sucesso!');
        setTimeout(() => setCodeSuccessMsg(null), 4000);
      } catch (err) {
        console.warn('Erro ao atualizar código no Firestore:', err);
      } finally {
        setIsSavingCode(false);
      }
    }
  };

  const loadPatients = async () => {
    if (!professionalEmail) return;
    setLoading(true);
    try {
      const data = await fetchPatientsForProfessional(professionalEmail);
      setPatients(data);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [professionalEmail]);

  const handleOpenDossier = async (patient: PatientLink) => {
    setSelectedPatient(patient);
    setDossierLoading(true);
    try {
      const [dossier, msgs] = await Promise.all([
        fetchPatientClinicalDossier(patient.patientUid),
        fetchConsultationMessages(patient.patientUid, professionalEmail)
      ]);
      setDossierData(dossier);
      setPatientMessages(msgs);
      markConsultationMessagesAsRead(patient.patientUid, 'professional');
    } catch (err) {
      console.error('Erro ao carregar prontuário:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedPatient) return;

    setSendingReply(true);
    try {
      const msg: ConsultationMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        patientUid: selectedPatient.patientUid,
        patientEmail: selectedPatient.patientEmail,
        patientName: selectedPatient.patientName,
        professionalEmail: professionalEmail,
        professionalName: currentProfessionalPartner?.name || 'Profissional de Saúde',
        sender: 'professional',
        message: replyText.trim(),
        category: 'general',
        timestamp: new Date().toISOString(),
        readByRecipient: false
      };

      await sendConsultationMessage(msg);
      setPatientMessages(prev => [...prev, msg]);
      setReplyText('');
    } catch (err) {
      console.error('Erro ao responder paciente:', err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleUnlinkPatient = async (linkId: string) => {
    try {
      await archiveOrUnlinkPatient(linkId);
      setUnlinkingId(null);
      if (selectedPatient?.id === linkId) {
        setSelectedPatient(null);
      }
      loadPatients();
    } catch (err) {
      console.error('Erro ao desvincular:', err);
    }
  };

  const handleAddPatientDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientEmail || !newPatientName) {
      setAddingError('Preencha o e-mail e o nome do paciente.');
      return;
    }

    try {
      const generatedLinkCode = generateSecureReferralCode(
        role,
        currentProfessionalPartner?.name || professionalEmail,
        newPatientName.trim()
      );

      const linkId = `link-${Date.now()}`;
      const newLink: PatientLink = {
        id: linkId,
        patientUid: `uid-${Date.now()}`,
        patientEmail: newPatientEmail.trim().toLowerCase(),
        patientName: newPatientName.trim(),
        professionalUid: currentProfessionalPartner?.assignedUid || auth.currentUser?.uid || '',
        professionalEmail: professionalEmail.trim().toLowerCase(),
        professionalName: currentProfessionalPartner?.name || 'Profissional de Saúde',
        professionalRole: role,
        referralCode: generatedLinkCode,
        discountPercentage: discountPercent,
        monthlyPriceBrl: discountedPrice,
        status: 'active',
        linkedAt: new Date().toISOString(),
        notes: newPatientNotes.trim()
      };

      await createOrUpdatePatientLink(newLink);
      setIsAddPatientOpen(false);
      setNewPatientEmail('');
      setNewPatientName('');
      setNewPatientNotes('');
      loadPatients();
    } catch (err: any) {
      setAddingError(err.message || 'Erro ao vincular paciente.');
    }
  };

  const copyReferralLink = (customCode?: string) => {
    const codeToUse = customCode || activeReferralCode;
    const link = `https://nutrisaudevital.vercel.app/?ref=${codeToUse}`;
    navigator.clipboard.writeText(link);
    if (customCode) {
      setCopiedPersonalizedLink(true);
      setTimeout(() => setCopiedPersonalizedLink(false), 2500);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const shareViaWhatsApp = (customCode?: string, targetPatientName?: string) => {
    const codeToUse = customCode || activeReferralCode;
    const link = `https://nutrisaudevital.vercel.app/?ref=${codeToUse}`;
    const greeting = targetPatientName ? `Olá, ${targetPatientName}!` : 'Olá!';
    const professionalTitle = role === 'Médico' ? 'Dr(a).' : 'Nutricionista';
    const profName = currentProfessionalPartner?.name || 'seu especialista';
    const text = `${greeting} Aqui é ${professionalTitle} ${profName}.\n\nPara o nosso acompanhamento nutricional e controle glicêmico de precisão, utilize seu convite exclusivo no aplicativo NutriSaúdeVital com ${discountPercent}% de desconto (apenas R$ ${discountedPrice.toFixed(2).replace('.', ',')}/mês):\n\n🔗 ${link}\n\nCódigo do Convite: *${codeToUse}*\n\nAssim que você registrar suas primeiras refeições e medições, poderei auditar seus relatórios diretamente no meu painel clínico!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="professional-portal-view">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-teal-600 to-cyan-600 text-white rounded-2xl shadow-md text-2xl">
            <i className="fas fa-stethoscope"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                Portal Clínico do {role}
              </h1>
              <span className="bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-teal-300 dark:border-teal-800">
                {currentProfessionalPartner?.registrationNumber || 'Acesso Autorizado'}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Olá, <strong>{currentProfessionalPartner?.name || professionalEmail}</strong>. Acompanhe os diários alimentares, glicemia e notas clínicas de seus pacientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddPatientOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-sm text-sm transition-colors flex items-center gap-2"
          >
            <i className="fas fa-user-plus"></i>
            Vincular Paciente
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl text-sm transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Voltar ao App
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b dark:border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('clinical_dashboard')}
          className={`pb-3 px-4 text-sm font-black transition flex items-center gap-2 border-b-2 ${
            activeTab === 'clinical_dashboard'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <i className="fas fa-chart-line"></i>
          Painel Clínico & Prontuários ({patients.length})
        </button>

        <button
          onClick={() => setActiveTab('referrals')}
          className={`pb-3 px-4 text-sm font-black transition flex items-center gap-2 border-b-2 ${
            activeTab === 'referrals'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <i className="fas fa-share-nodes"></i>
          Programa de Indicação & Convites
        </button>
      </div>

      {/* Tab 1: Clinical Dashboard */}
      {activeTab === 'clinical_dashboard' && (
        <ProfessionalClinicalDashboard
          patients={patients}
          currentProfessional={currentProfessionalPartner}
          professionalEmail={professionalEmail}
          onOpenDossier={handleOpenDossier}
          onUnlinkPatient={(linkId) => setUnlinkingId(linkId)}
          onRefresh={loadPatients}
          onOpenAddPatient={() => setIsAddPatientOpen(true)}
        />
      )}

      {/* Tab 2: Referral Hub & Secure Invite Engine */}
      {activeTab === 'referrals' && (
        <div className="space-y-6">
          {codeSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
              <span className="flex items-center gap-2">
                <i className="fas fa-circle-check text-emerald-600 text-base"></i>
                {codeSuccessMsg}
              </span>
              <button onClick={() => setCodeSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {/* Banner Principal de Indicação */}
          <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-cyan-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-teal-700/50">
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="bg-teal-500/30 text-teal-200 border border-teal-400/30 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md">
                    Programa de Indicação Exclusivo & Blindado
                  </span>
                  <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Hash Anti-Fraude
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Indique seus pacientes com {discountPercent}% de Desconto Exclusivo
                </h2>
                <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                  Ao criar a conta através do seu código ou link nominal, o paciente paga apenas <strong>R$ {discountedPrice.toFixed(2).replace('.', ',')}/mês</strong> e fica <strong>vinculado exclusivamente a você</strong>, sem a opção de navegar por outros profissionais na plataforma.
                </p>
              </div>

              {/* Card do Código Principal */}
              <div className="bg-white/10 backdrop-blur-xl p-5 rounded-2xl border border-white/20 flex flex-col gap-3 w-full lg:w-96 shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-teal-200 uppercase tracking-wider">
                    Seu Código Geral de Indicação:
                  </span>
                  <button
                    onClick={handleRegenerateMainCode}
                    disabled={isSavingCode}
                    className="text-[11px] font-bold text-teal-300 hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Gera um novo token criptográfico mantendo seu nome clínico"
                  >
                    <i className={`fas fa-arrows-rotate ${isSavingCode ? 'animate-spin' : ''}`}></i>
                    {isSavingCode ? 'Salvando...' : 'Gerar Novo Hash'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono font-black text-lg sm:text-xl bg-black/50 text-teal-200 px-3.5 py-2.5 rounded-xl tracking-wider border border-white/15 text-center truncate">
                    {activeReferralCode}
                  </div>
                  <button
                    onClick={() => copyReferralLink()}
                    className="px-3.5 py-2.5 bg-white hover:bg-teal-50 text-teal-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95 whitespace-nowrap flex items-center gap-1.5"
                  >
                    <i className={`fas ${copiedCode ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                    {copiedCode ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>

                <button
                  onClick={() => shareViaWhatsApp()}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <i className="fab fa-whatsapp text-sm"></i>
                  Enviar Convite Geral no WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* Gerador de Convite Nominal / Paciente Específico */}
          <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b dark:border-gray-700 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full">
                  Personalização Avançada
                </span>
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 mt-1 flex items-center gap-2">
                  <i className="fas fa-magic text-teal-600"></i>
                  Gerador de Convites Nominais para Pacientes
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Gere um link com o nome do seu paciente embutido no código para um atendimento humanizado e exclusivo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nome do Paciente:
                </label>
                <input
                  type="text"
                  value={customInvitePatientName}
                  onChange={(e) => setCustomInvitePatientName(e.target.value)}
                  placeholder="Ex: Carlos Albuquerque"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Código Nominal Gerado:
                </label>
                <div className="px-3.5 py-2.5 rounded-xl border border-dashed border-teal-400 dark:border-teal-600 bg-teal-50/50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 font-mono font-bold text-xs truncate">
                  {derivedPatientCode}
                </div>
              </div>

              <div className="md:col-span-3 flex flex-col sm:flex-row md:flex-col gap-2">
                <button
                  onClick={() => copyReferralLink(derivedPatientCode)}
                  className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                >
                  <i className={`fas ${copiedPersonalizedLink ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                  {copiedPersonalizedLink ? 'Link Copiado!' : 'Copiar Convite'}
                </button>
                <button
                  onClick={() => shareViaWhatsApp(derivedPatientCode, customInvitePatientName.trim())}
                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <i className="fab fa-whatsapp"></i>
                  Enviar no WhatsApp
                </button>
              </div>
            </div>

            {/* Explicação de Blindagem e Anti-Fraude */}
            <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs space-y-2">
              <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <i className="fas fa-shield-halved text-teal-600"></i>
                Como funciona a segurança e blindagem dos códigos:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 text-[11px] leading-relaxed">
                <li>
                  <strong>Identificação Profissional:</strong> O código contém seu nome clínico (ex: <code>JULIANA</code> ou <code>ROBERTO</code>), garantindo reconhecimento imediato pelo paciente.
                </li>
                <li>
                  <strong>Token Criptográfico Aleatório:</strong> Os 4 caracteres finais são gerados com alta entropia, impedindo que terceiros adivinhem ou utilizem o benefício sem o seu consentimento.
                </li>
                <li>
                  <strong>Vinculação Automática:</strong> Assim que o paciente insere o código ou acessa pelo link, ele entra instantaneamente na sua lista de acompanhamento e não tem acesso a outros especialistas na plataforma.
                </li>
              </ul>
            </div>
          </div>

          {/* Cards Informativos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center text-lg">
                <i className="fas fa-lock"></i>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Vínculo Exclusivo e Blindado</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Pacientes indicados por você não visualizam outros nutricionistas ou concorrentes dentro da plataforma. O acesso fica restrito ao seu consultório.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 flex items-center justify-center text-lg">
                <i className="fas fa-chart-pie"></i>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Telemetria em Tempo Real</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Todas as medições de glicemia capilar/sensor, fotos de pratos, contagem de carboidratos e peso registradas pelo paciente aparecem instantaneamente no seu painel.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-lg">
                <i className="fas fa-notes-medical"></i>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">Prontuário & Notas Clínicas</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Gere notas de evolução clínica privadas, envie mensagens diretas e exporte relatórios consolidados em PDF para facilitar consultas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Patient Health Tracker & Clinical Dossier Component */}
      {selectedPatient && (
        <PatientDetailView
          patient={selectedPatient}
          currentProfessional={currentProfessionalPartner}
          professionalEmail={professionalEmail}
          onClose={() => setSelectedPatient(null)}
          onRefreshParent={loadPatients}
        />
      )}

      {/* Add Patient Modal */}
      {isAddPatientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <i className="fas fa-user-plus text-teal-600"></i>
                Vincular Novo Paciente Diretamente
              </h3>
              <button
                onClick={() => setIsAddPatientOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {addingError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-bold">
                {addingError}
              </div>
            )}

            <form onSubmit={handleAddPatientDirectly} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nome Completo do Paciente *
                </label>
                <input
                  type="text"
                  required
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="Ex: Carlos Albuquerque"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  E-mail do Paciente (Google / Gmail) *
                </label>
                <input
                  type="email"
                  required
                  value={newPatientEmail}
                  onChange={(e) => setNewPatientEmail(e.target.value)}
                  placeholder="paciente@gmail.com"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Observações Clínicas Iniciais
                </label>
                <textarea
                  rows={2}
                  value={newPatientNotes}
                  onChange={(e) => setNewPatientNotes(e.target.value)}
                  placeholder="Ex: Foco em contagem de carboidratos pós-prandiais..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-800 dark:text-teal-300 text-[11px]">
                O paciente receberá acesso com <strong>{discountPercent}% de desconto</strong> e permanecerá vinculado a você de forma exclusiva.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsAddPatientOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition-colors"
                >
                  Confirmar Vínculo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlink Confirmation Dialog */}
      {unlinkingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 text-center space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-full flex items-center justify-center mx-auto text-xl">
              <i className="fas fa-user-slash"></i>
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Encerrar Acompanhamento Clínico?
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              O paciente será desvinculado do seu painel clínico e os registros passados serão arquivados com segurança.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setUnlinkingId(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUnlinkPatient(unlinkingId)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Sim, Encerrar Acompanhamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalPortal;


import React, { useState, useEffect } from 'react';
import { ProfessionalPartner, PatientLink, View } from '../types';
import {
  fetchProfessionalPartners,
  saveProfessionalPartner,
  deleteProfessionalPartner,
  fetchPatientsForProfessional,
  SUPER_ADMIN_EMAIL
} from '../services/firestoreService';
import { auth } from '../src/firebase';
import { generateSecureReferralCode } from '../utils/referralCode';

interface AdminPartnerManagementProps {
  onBack: () => void;
  navigateTo: (view: View) => void;
  onSelectPartnerForPortal?: (partner: ProfessionalPartner) => void;
}

export const AdminPartnerManagement: React.FC<AdminPartnerManagementProps> = ({ onBack, navigateTo, onSelectPartnerForPortal }) => {
  const [partners, setPartners] = useState<ProfessionalPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<ProfessionalPartner | null>(null);
  const [formData, setFormData] = useState<Partial<ProfessionalPartner>>({
    name: '',
    email: '',
    role: 'Nutricionista',
    specialty: '',
    registrationNumber: '',
    referralCode: '',
    whatsapp: '',
    bio: '',
    photoUrl: '',
    isActive: true
  });
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentUserEmail = auth.currentUser?.email || '';
  const isSuperAdmin = currentUserEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchProfessionalPartners();
      setPartners(data);
    } catch (err) {
      console.error('Erro ao carregar parceiros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewModal = () => {
    setEditingPartner(null);
    setFormData({
      name: '',
      email: '',
      role: 'Nutricionista',
      specialty: 'Nutrição Clínica & Contagem de Carboidratos',
      registrationNumber: '',
      referralCode: generateSecureReferralCode('Nutricionista', ''),
      whatsapp: '55',
      bio: '',
      photoUrl: '',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleRegenerateCode = () => {
    const newCode = generateSecureReferralCode(
      formData.role || 'Nutricionista',
      formData.name || ''
    );
    setFormData(prev => ({ ...prev, referralCode: newCode }));
  };

  const handleOpenEditModal = (partner: ProfessionalPartner) => {
    setEditingPartner(partner);
    setFormData({ ...partner });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.registrationNumber || !formData.referralCode) {
      setFeedbackMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios (Nome, E-mail, Registro e Código).' });
      return;
    }

    try {
      const id = editingPartner ? editingPartner.id : `prof-${Date.now()}`;
      const partnerToSave: ProfessionalPartner = {
        id,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role || 'Nutricionista',
        specialty: formData.specialty || 'Saúde & Nutrição',
        registrationNumber: formData.registrationNumber.trim().toUpperCase(),
        referralCode: formData.referralCode.trim().toUpperCase().replace(/\s+/g, '-'),
        whatsapp: formData.whatsapp?.trim() || '',
        bio: formData.bio?.trim() || '',
        photoUrl: formData.photoUrl?.trim() || '',
        isActive: formData.isActive !== false,
        createdAt: editingPartner?.createdAt || new Date().toISOString(),
        addedByAdmin: currentUserEmail
      };

      await saveProfessionalPartner(partnerToSave);
      setFeedbackMsg({ type: 'success', text: `Profissional ${partnerToSave.name} salvo com sucesso!` });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao salvar profissional parceiro.' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfessionalPartner(id);
      setFeedbackMsg({ type: 'success', text: 'Profissional parceiro removido com sucesso.' });
      setDeletingId(null);
      loadData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao remover parceiro.' });
    }
  };

  const filteredPartners = partners.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="admin-partner-management-view">
      {/* Top Bar / Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-3 bg-gradient-to-br from-amber-500 to-red-600 text-white rounded-xl shadow-md text-xl">
              <i className="fas fa-user-shield"></i>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                  Gestão Central de Profissionais Parceiros
                </h1>
                <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                  SuperAdmin
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Controle exclusivo para autorizar Nutricionistas e Médicos parceiros no NutriSaúdeVital.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenNewModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
          >
            <i className="fas fa-plus-circle"></i>
            Cadastrar Especialista
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl text-sm transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Voltar
          </button>
        </div>
      </div>

      {/* Security Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3 text-sm text-blue-900 dark:text-blue-200">
        <i className="fas fa-lock text-blue-600 dark:text-blue-400 mt-1 text-lg"></i>
        <div>
          <p className="font-bold">Política de Segurança & Exclusividade de Acesso:</p>
          <p className="text-xs text-blue-800 dark:text-blue-300 mt-0.5">
            Qualquer usuário que acessar via Gmail sem cadastro prévio será categorizado automaticamente como <strong>Paciente</strong>. Somente os e-mails registrados nesta tabela pelo SuperAdmin (<strong>{SUPER_ADMIN_EMAIL}</strong>) terão privilégios de <strong>Nutricionista</strong> ou <strong>Médico</strong> para acessar o Portal do Profissional e gerenciar pacientes.
          </p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700'
              : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <i className={`fas ${feedbackMsg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold underline">
            Fechar
          </button>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-xl text-xl">
            <i className="fas fa-apple-whole"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Nutricionistas Cadastrados</p>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
              {partners.filter(p => p.role === 'Nutricionista').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl text-xl">
            <i className="fas fa-stethoscope"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Médicos Cadastrados</p>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
              {partners.filter(p => p.role === 'Médico').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl text-xl">
            <i className="fas fa-tags"></i>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Descontos Aplicados</p>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
              Nutri: <span className="text-teal-600 font-black">65% OFF (R$ 12,25)</span> | Médico: <span className="text-blue-600 font-black">70% OFF (R$ 10,50)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative w-full sm:w-96">
          <i className="fas fa-search absolute left-3.5 top-3.5 text-gray-400"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail, CRN/CRM ou código..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Mostrando <strong>{filteredPartners.length}</strong> profissional(is)
        </div>
      </div>

      {/* Partners List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm text-gray-500">Carregando parceiros autorizados...</p>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 text-gray-400 rounded-full flex items-center justify-center mx-auto text-2xl">
            <i className="fas fa-user-plus"></i>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Nenhum profissional parceiro cadastrado</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Cadastre nutricionistas e médicos parceiros para que eles possam indicar pacientes e acompanhar os diários no portal.
          </p>
          <button
            onClick={handleOpenNewModal}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm transition-colors"
          >
            Cadastrar Primeiro Profissional
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map(partner => (
            <div
              key={partner.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 shadow-sm transition-all relative flex flex-col justify-between ${
                partner.isActive
                  ? 'border-gray-200 dark:border-gray-700 hover:shadow-md'
                  : 'border-red-200 dark:border-red-900/50 opacity-75'
              }`}
            >
              <div>
                {/* Header card */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={partner.photoUrl || (partner.role === 'Médico' ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150' : 'https://images.unsplash.com/photo-1594824813566-88855ce7890b?auto=format&fit=crop&q=80&w=150')}
                      alt={partner.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-teal-500 shadow-sm"
                    />
                    <div>
                      <h4 className="font-black text-base text-gray-900 dark:text-gray-100 leading-tight">
                        {partner.name}
                      </h4>
                      <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-full mt-1 ${
                        partner.role === 'Médico'
                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'
                          : 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                      }`}>
                        <i className={`fas ${partner.role === 'Médico' ? 'fa-user-doctor' : 'fa-apple-whole'}`}></i>
                        {partner.role} • {partner.registrationNumber}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    partner.isActive
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                  }`}>
                    {partner.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 border-t dark:border-gray-700 pt-3">
                  <p className="flex items-center gap-2">
                    <i className="fas fa-envelope text-gray-400 w-4"></i>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{partner.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <i className="fas fa-certificate text-teal-500 w-4"></i>
                    <span>{partner.specialty}</span>
                  </p>
                  {partner.whatsapp && (
                    <p className="flex items-center gap-2">
                      <i className="fab fa-whatsapp text-emerald-500 w-4"></i>
                      <span>{partner.whatsapp}</span>
                    </p>
                  )}

                  {/* Referral Code Box */}
                  <div className="mt-3 p-3 bg-teal-50 dark:bg-teal-950/60 rounded-xl border border-teal-200 dark:border-teal-800">
                    <p className="text-[11px] font-bold text-teal-900 dark:text-teal-200 uppercase tracking-wider">
                      Código de Indicação:
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-black text-sm text-teal-700 dark:text-teal-300 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-md border border-teal-300 dark:border-teal-700">
                        {partner.referralCode}
                      </span>
                      <button
                        onClick={() => {
                          const link = `https://nutrisaudevital.vercel.app/?ref=${partner.referralCode}`;
                          navigator.clipboard.writeText(link);
                          alert(`Link copiado: ${link}`);
                        }}
                        className="text-xs font-bold text-teal-600 hover:text-teal-800 dark:hover:text-teal-300 underline"
                      >
                        Copiar Link
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t dark:border-gray-700 pt-4 mt-4">
                {onSelectPartnerForPortal && (
                  <button
                    onClick={() => onSelectPartnerForPortal(partner)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <i className="fas fa-stethoscope"></i>
                    Ver Painel Clínico
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => handleOpenEditModal(partner)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    <i className="fas fa-edit mr-1"></i> Editar
                  </button>
                  <button
                    onClick={() => setDeletingId(partner.id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-600 dark:text-red-300 rounded-lg text-xs font-bold transition-colors"
                  >
                    <i className="fas fa-trash-alt mr-1"></i> Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <i className="fas fa-user-plus text-teal-600"></i>
                {editingPartner ? 'Editar Profissional Parceiro' : 'Novo Especialista Parceiro'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Dra. Juliana Mendes"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    E-mail Google / Gmail *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="exemplo@gmail.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">O profissional usará este e-mail para logar.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Função / Papel *
                  </label>
                  <select
                    value={formData.role || 'Nutricionista'}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="Nutricionista">Nutricionista</option>
                    <option value="Médico">Médico (Endocrino/Clínico)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Registro (CRN / CRM) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.registrationNumber || ''}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    placeholder="Ex: CRN 87412-SP"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Código de Indicação Seguro *
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 transition"
                      title="Gerar código combinando o nome do profissional com token aleatório"
                    >
                      <i className="fas fa-arrows-rotate"></i> Gerar Novo
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.referralCode || ''}
                    onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                    placeholder="Ex: NUTRI-JULIANA-8K2P"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none uppercase"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Formato: <code className="text-teal-600 dark:text-teal-400">[PAPEL]-[NOME]-[HASH]</code> (anti-adivinhação)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Especialidade Principal
                  </label>
                  <input
                    type="text"
                    value={formData.specialty || ''}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="Ex: Nutrição Esportiva & Diabetes"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    WhatsApp para Contato
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp || ''}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="5511999999999"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Mini Bio / Apresentação Profissional
                </label>
                <textarea
                  rows={3}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Descreva a formação e abordagem clínica do especialista..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActivePartner"
                  checked={formData.isActive !== false}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <label htmlFor="isActivePartner" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Parceiro Ativo (pode vincular e receber novos pacientes com desconto)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                >
                  {editingPartner ? 'Salvar Alterações' : 'Cadastrar Especialista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 text-center space-y-4 border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto text-xl">
              <i className="fas fa-trash-alt"></i>
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Confirmar Exclusão de Parceiro?
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ao remover o parceiro, ele deixará de constar na lista oficial. Os vínculos de pacientes existentes permanecerão arquivados com segurança.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPartnerManagement;

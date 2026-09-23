import React, { useState } from 'react';
import { UserProfile, PatientLink, ProfessionalPartner } from '../types';
import { findPartnerByReferralCode, createOrUpdatePatientLink } from '../services/firestoreService';
import { auth } from '../src/firebase';

interface PricingPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  activePatientLink?: PatientLink | null;
  onLinkUpdated?: () => void;
}

export const PricingPlansModal: React.FC<PricingPlansModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  updateUserProfile,
  activePatientLink,
  onLinkUpdated
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [inputCode, setInputCode] = useState('');
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const isLinked = !!activePatientLink && activePatientLink.status === 'active';

  const handleApplyReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setValidatingCode(true);
    setCodeFeedback(null);

    try {
      const partner = await findPartnerByReferralCode(inputCode.trim());
      if (!partner) {
        setCodeFeedback({
          type: 'error',
          text: 'Código de indicação não encontrado ou inativo. Verifique com seu nutricionista/médico.'
        });
        return;
      }

      const discountPercent = partner.role === 'Médico' ? 70 : 65;
      const monthlyPrice = partner.role === 'Médico' ? 10.50 : 12.25;

      const linkId = `link-${auth.currentUser?.uid || Date.now()}`;
      const newLink: PatientLink = {
        id: linkId,
        patientUid: auth.currentUser?.uid || `guest-${Date.now()}`,
        patientEmail: auth.currentUser?.email || 'usuario@nutrisaudevital.com',
        patientName: userProfile.name || 'Paciente',
        professionalUid: partner.assignedUid || '',
        professionalEmail: partner.email,
        professionalName: partner.name,
        professionalRole: partner.role,
        referralCode: partner.referralCode,
        discountPercentage: discountPercent,
        monthlyPriceBrl: monthlyPrice,
        status: 'active',
        linkedAt: new Date().toISOString()
      };

      await createOrUpdatePatientLink(newLink);

      updateUserProfile({
        referralCode: partner.referralCode,
        referredByProfessionalId: partner.id,
        referredByProfessionalName: partner.name,
        referredByProfessionalRole: partner.role,
        discountPercentage: discountPercent,
        monthlyPlanPrice: monthlyPrice
      });

      setCodeFeedback({
        type: 'success',
        text: `Parabéns! Código de ${partner.name} validado. Desconto exclusivo de ${discountPercent}% aplicado com sucesso!`
      });

      if (onLinkUpdated) onLinkUpdated();
    } catch (err: any) {
      setCodeFeedback({
        type: 'error',
        text: err.message || 'Erro ao validar código.'
      });
    } finally {
      setValidatingCode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-6 border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b dark:border-gray-700 pb-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
              Planos & Parcerias NutriSaúdeVital
            </span>
            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-2">
              Acesso Completo ao Cuidado Metabólico & Nutricional
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              Escolha seu plano ou insira o código de indicação do seu especialista para descontos de até 70%.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl p-1">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Linked Specialist Banner if active */}
        {isLinked ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md text-lg">
                <i className="fas fa-link"></i>
              </div>
              <div>
                <p className="font-extrabold text-sm text-emerald-950 dark:text-emerald-100">
                  Acompanhamento Ativo Vinculado
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Você está conectado a <strong>{activePatientLink.professionalName}</strong> ({activePatientLink.professionalRole}) com <strong>{activePatientLink.discountPercentage}% de desconto ativo</strong> (R$ {activePatientLink.monthlyPriceBrl?.toFixed(2).replace('.', ',')}/mês).
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-emerald-300 shadow-sm whitespace-nowrap">
              Desconto Ativo
            </span>
          </div>
        ) : (
          /* Referral Code Input Section */
          <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="font-extrabold text-sm text-teal-950 dark:text-teal-100 flex items-center gap-2">
                  <i className="fas fa-ticket text-teal-600"></i>
                  Possui Indicação de Nutricionista ou Médico?
                </h4>
                <p className="text-xs text-teal-800 dark:text-teal-300">
                  Insira o código fornecido pelo seu profissional parceiro para liberar até 70% de desconto imediato.
                </p>
              </div>

              <form onSubmit={handleApplyReferralCode} className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Ex: NUTRI-JULIANA"
                  className="px-3.5 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-teal-500 outline-none w-full sm:w-48"
                />
                <button
                  type="submit"
                  disabled={validatingCode}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-colors whitespace-nowrap"
                >
                  {validatingCode ? 'Validando...' : 'Aplicar'}
                </button>
              </form>
            </div>

            {codeFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold ${
                  codeFeedback.type === 'success'
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                    : 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100'
                }`}
              >
                {codeFeedback.text}
              </div>
            )}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          
          {/* Card 1: Orgânico / Standard */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Padrão Individual
              </span>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
                  Plano Padrão
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Acesso direto a todas as ferramentas do app sem indicação profissional.
                </p>
              </div>

              <div className="pt-2">
                <p className="text-3xl font-black text-gray-900 dark:text-gray-100">
                  R$ 35,00 <span className="text-xs font-normal text-gray-500">/mês</span>
                </p>
                <p className="text-xs text-teal-600 font-bold mt-1">
                  ou R$ 25,00/mês no Plano Anual
                </p>
              </div>

              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 border-t dark:border-gray-700 pt-4">
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-teal-500"></i> Diário de refeições & contagem de carboidratos
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-teal-500"></i> Registro de glicemia & curva semanal
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-teal-500"></i> IA para análise de pratos & receitas
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-teal-500"></i> Alertas e gestão de estoque de insulina
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                alert('Plano Padrão selecionado. Redirecionando para checkout seguro...');
                onClose();
              }}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs transition-colors"
            >
              Assinar Plano Padrão
            </button>
          </div>

          {/* Card 2: Nutricionista Partner (65% OFF) */}
          <div className="bg-gradient-to-b from-teal-50/50 to-white dark:from-teal-950/20 dark:to-gray-900 rounded-2xl border-2 border-teal-500 p-6 flex flex-col justify-between space-y-6 shadow-md relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-teal-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider shadow-sm">
              Mais Popular • 65% OFF
            </div>

            <div className="space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                Indicação de Nutricionista
              </span>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
                  Paciente Nutri
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Para pacientes com cupom ou link do nutricionista parceiro credenciado.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm line-through text-gray-400">R$ 35,00</span>
                  <p className="text-3xl font-black text-teal-600 dark:text-teal-400">
                    R$ 12,25 <span className="text-xs font-normal text-gray-500">/mês</span>
                  </p>
                </div>
                <p className="text-xs text-emerald-600 font-extrabold mt-1">
                  Economia de R$ 22,75 todos os meses
                </p>
              </div>

              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 border-t dark:border-gray-700 pt-4">
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-teal-500"></i> Tudo do Plano Padrão incluso
                </li>
                <li className="flex items-center gap-2 font-bold text-teal-900 dark:text-teal-200">
                  <i className="fas fa-user-doctor text-teal-600"></i> Relatórios integrados ao consultório do seu Nutri
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-teal-500"></i> Auditoria de fotos & refeições deletadas
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-teal-500"></i> Suporte prioritário via WhatsApp
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                if (isLinked) {
                  alert('Seu desconto de 65% já está ativado com seu Nutricionista!');
                  onClose();
                } else {
                  alert('Insira o código do seu Nutricionista no campo acima para ativar este valor.');
                }
              }}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              {isLinked ? 'Plano Ativo' : 'Ativar com Cupom Nutri'}
            </button>
          </div>

          {/* Card 3: Médico / Endocrino (70% OFF) */}
          <div className="bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-gray-900 rounded-2xl border border-blue-300 dark:border-blue-700 p-6 flex flex-col justify-between space-y-6 shadow-sm">
            <div className="space-y-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Indicação Médica (Diabetes)
              </span>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
                  Cuidado Médico
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Desconto máximo para pacientes com diabetes indicados por endocrinologista/médico.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm line-through text-gray-400">R$ 35,00</span>
                  <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                    R$ 10,50 <span className="text-xs font-normal text-gray-500">/mês</span>
                  </p>
                </div>
                <p className="text-xs text-blue-600 font-extrabold mt-1">
                  70% de desconto contínuo
                </p>
              </div>

              <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300 border-t dark:border-gray-700 pt-4">
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-blue-500"></i> Todas as ferramentas clínicas inclusas
                </li>
                <li className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                  <i className="fas fa-stethoscope text-blue-600"></i> Relatório médico para retorno clínico
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-blue-500"></i> Exportação automática em PDF
                </li>
                <li className="flex items-center gap-2">
                  <i className="fas fa-check text-blue-500"></i> Cálculo de dose e estoque de insulina
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                alert('Insira o CRM ou código do seu Médico no campo de código para ativar.');
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
            >
              Ativar com Código Médico
            </button>
          </div>

        </div>

        {/* Free Doctor / Nutritionist Note */}
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-center text-xs text-gray-600 dark:text-gray-400">
          👩‍⚕️ <strong>Você é Nutricionista ou Médico?</strong> O acesso ao Portal do Profissional é <strong>100% gratuito</strong> para todos os especialistas homologados pelo nosso SuperAdmin. Entre em contato para cadastrar seu consultório.
        </div>

      </div>
    </div>
  );
};

export default PricingPlansModal;

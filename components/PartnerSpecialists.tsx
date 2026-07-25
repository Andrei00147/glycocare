import React, { useState } from 'react';
import { UserProfile, PartnerSpecialist, MealLog, GlucoseReading } from '../types';

interface PartnerSpecialistsProps {
  userProfile: UserProfile;
  mealLogs?: MealLog[];
  glucoseReadings?: GlucoseReading[];
}

const DEFAULT_SPECIALISTS: PartnerSpecialist[] = [
  {
    id: 'spec-1',
    name: 'Dr. Roberto Silva',
    role: 'Médico',
    specialty: 'Endocrinologia & Medicina do Esporte',
    registrationNumber: 'CRM 128492-SP',
    photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=250',
    bio: 'Especialista em ajuste metabólico, modulação e acompanhamento médico contínuo para alta performance, recomposição corporal e prevenção metabólica.',
    whatsapp: '5511999990001',
    supportsMonthlyMonitoring: true,
    rating: 4.9
  },
  {
    id: 'spec-2',
    name: 'Dra. Juliana Mendes',
    role: 'Nutricionista',
    specialty: 'Nutrição Esportiva & Cuidado Funcional',
    registrationNumber: 'CRN 87412-SP',
    photoUrl: 'https://images.unsplash.com/photo-1594824813566-88855ce7890b?auto=format&fit=crop&q=80&w=250',
    bio: 'Elabora estratégias personalizadas de contagem de carboidratos, aporte proteico e refeições alinhadas diretamente aos registros do app GlycoCare.',
    whatsapp: '5511999990002',
    supportsMonthlyMonitoring: true,
    rating: 5.0
  },
  {
    id: 'spec-3',
    name: 'Carlos "Personal" Eduardo',
    role: 'Personal Trainer',
    specialty: 'Hipertrofia, Treinamento de Força & Recomposição',
    registrationNumber: 'CREF 094321-G/SP',
    photoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=250',
    bio: 'Utiliza os dados alimentares, ingestão de macros e metas de massa magra do aplicativo para prescrever e adequar treinos de alta eficiência.',
    whatsapp: '5511999990003',
    supportsMonthlyMonitoring: true,
    rating: 4.9
  },
  {
    id: 'spec-4',
    name: 'Dra. Camila Rocha',
    role: 'Nutricionista',
    specialty: 'Saúde Metabólica & Emagrecimento Definitivo',
    registrationNumber: 'CRN 54109-RJ',
    photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=250',
    bio: 'Acompanhamento nutricional focado em queima de gordura preservando massa muscular, com auditoria periódica dos diários alimentares.',
    whatsapp: '5511999990004',
    supportsMonthlyMonitoring: true,
    rating: 4.8
  }
];

export const PartnerSpecialists: React.FC<PartnerSpecialistsProps> = ({
  userProfile,
  mealLogs = [],
  glucoseReadings = []
}) => {
  const [selectedRole, setSelectedRole] = useState<'Todos' | 'Médico' | 'Nutricionista' | 'Personal Trainer'>('Todos');
  const [activeModalSpecialist, setActiveModalSpecialist] = useState<PartnerSpecialist | null>(null);
  const [customMsg, setCustomMsg] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(false);

  const filteredSpecialists = DEFAULT_SPECIALISTS.filter(spec => {
    if (selectedRole === 'Todos') return true;
    return spec.role === selectedRole;
  });

  const handleOpenContactModal = (spec: PartnerSpecialist) => {
    setActiveModalSpecialist(spec);
    
    // Compute quick metrics summary
    const weightStr = userProfile.weightKg ? `${userProfile.weightKg} kg` : 'não informado';
    const targetWeightStr = userProfile.targetWeightKg ? `${userProfile.targetWeightKg} kg` : 'não definida';
    const muscleTargetStr = userProfile.targetMuscleMassKg ? `${userProfile.targetMuscleMassKg} kg` : 'não definida';
    const fatTargetStr = userProfile.targetBodyFatPercentage ? `${userProfile.targetBodyFatPercentage}%` : 'não definida';
    const goalStr = userProfile.healthGoal || 'Prevenção & Saúde';

    const defaultMessage = `Olá, ${spec.name}! Gostaria de solicitar informações sobre o Acompanhamento Mensal.\n\nMinhas métricas atuais no GlycoCare:\n• Nome: ${userProfile.name}\n• Objetivo Principal: ${goalStr}\n• Peso Atual: ${weightStr} (Meta: ${targetWeightStr})\n• Meta de Massa Magra: ${muscleTargetStr}\n• Meta de % Gordura: ${fatTargetStr}\n\nAguardo seu retorno para alinharmos o acompanhamento!`;

    setCustomMsg(defaultMessage);
  };

  const handleSendWhatsApp = () => {
    if (!activeModalSpecialist) return;
    const phone = activeModalSpecialist.whatsapp || '5511999990000';
    const encodedText = encodeURIComponent(customMsg);
    window.open(`https://wa.me/${phone}?text=${encodedText}`, '_blank');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(customMsg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2500);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 border border-gray-100 dark:border-gray-700 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b dark:border-gray-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-gradient-to-r from-blue-600 via-teal-500 to-purple-600 text-white rounded-xl shadow-md text-base">
              <i className="fas fa-user-doctor"></i>
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Especialistas & Profissionais Indicados
              </h3>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-bold bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                Acompanhamento Mensal Integrado
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed max-w-2xl">
            Conecte-se com <strong>médicos, nutricionistas e personal trainers</strong> parceiros. O seu personal trainer utiliza os dados das suas refeições do app para adequar os treinos ao seu aporte calórico e proteico, acelerando o ganho de massa magra e perda de gordura.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl self-stretch sm:self-auto">
          {(['Todos', 'Médico', 'Nutricionista', 'Personal Trainer'] as const).map(role => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                selectedRole === role
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {role === 'Personal Trainer' ? 'Personal Trainers' : role === 'Todos' ? 'Todos' : `${role}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSpecialists.map(spec => (
          <div
            key={spec.id}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30 hover:border-teal-500/50 dark:hover:border-teal-500/50 transition flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start gap-3">
              <img
                src={spec.photoUrl}
                alt={spec.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-teal-500 shadow-sm flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">
                    {spec.name}
                  </h4>
                  <span className="flex items-center text-amber-500 text-xs font-bold gap-0.5">
                    <i className="fas fa-star"></i> {spec.rating.toFixed(1)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    spec.role === 'Personal Trainer'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300'
                      : spec.role === 'Nutricionista'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                  }`}>
                    {spec.role}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    {spec.registrationNumber}
                  </span>
                </div>

                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mt-1">
                  {spec.specialty}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic bg-white dark:bg-gray-800 p-2.5 rounded-lg border dark:border-gray-700/60">
              "{spec.bio}"
            </p>

            <div className="pt-2 flex items-center justify-between gap-2 border-t dark:border-gray-700/60">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                <i className="fas fa-calendar-check text-emerald-600"></i>
                Vagas de Acompanhamento Mensal
              </span>

              <button
                onClick={() => handleOpenContactModal(spec)}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5"
              >
                <i className="fab fa-whatsapp"></i>
                Solicitar Acompanhamento
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Contact & Report Modal */}
      {activeModalSpecialist && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2">
                <img
                  src={activeModalSpecialist.photoUrl}
                  alt={activeModalSpecialist.name}
                  className="w-10 h-10 rounded-full object-cover border border-teal-500"
                />
                <div>
                  <h3 className="font-bold text-base text-gray-800 dark:text-gray-100">
                    Acompanhamento com {activeModalSpecialist.name}
                  </h3>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                    {activeModalSpecialist.role} • {activeModalSpecialist.specialty}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalSpecialist(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/50 space-y-1">
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <i className="fas fa-paper-plane text-blue-600"></i>
                Relatório de Acompanhamento Integrado
              </h4>
              <p className="text-[11px] text-blue-800 dark:text-blue-300">
                Sua mensagem já foi pré-preenchida com seus objetivos de peso, massa muscular e % de gordura para facilitar a avaliação do profissional.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Mensagem a ser enviada:
              </label>
              <textarea
                rows={7}
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono leading-relaxed focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t dark:border-gray-700">
              <button
                type="button"
                onClick={handleCopyText}
                className="w-full sm:w-1/2 py-2.5 text-xs font-semibold border rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
              >
                <i className={`fas ${copiedMsg ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                {copiedMsg ? 'Copiado para Área de Transferência!' : 'Copiar Texto do Relatório'}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full sm:w-1/2 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <i className="fab fa-whatsapp text-lg"></i>
                Enviar via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerSpecialists;

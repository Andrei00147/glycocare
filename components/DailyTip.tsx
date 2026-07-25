import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, DiabetesType } from '../types';
import { generatePersonalizedDailyTip } from '../services/geminiService';

export interface DailyTipItem {
  id: number;
  category: string;
  title: string;
  content: string;
  icon: string;
  tagColor: string;
  forDiabeticOnly?: boolean;
  requiresInsulin?: boolean;
  isAiGenerated?: boolean;
}

const TIPS_DATABASE: DailyTipItem[] = [
  {
    id: 1,
    category: 'Alimentação',
    title: 'Fibras Amigas da Saúde Metabólica',
    content: 'Consumir alimentos ricos em fibras (como aveia, sementes de chia, vegetais folhosos e legumes) reduz a velocidade de absorção dos carboidratos, evitando picos glicêmicos após as refeições.',
    icon: 'fa-apple-whole',
    tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  },
  {
    id: 2,
    category: 'Alimentação',
    title: 'A Regra do Prato Colorido',
    content: 'Preencha metade do seu prato com vegetais crus ou cozidos, 1/4 com proteínas magras (frango, peixe, ovos ou tofu) e apenas 1/4 com carboidratos de baixo índice glicêmico (como batata doce ou arroz integral).',
    icon: 'fa-utensils',
    tagColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
  },
  {
    id: 3,
    category: 'Hidratação',
    title: 'Hidratação e Metabolismo',
    content: 'Beba bastante água ao longo do dia! A desidratação dificulta a circulação sanguínea e pode concentrar solutos no organismo, além de causar falsa sensação de fome.',
    icon: 'fa-droplet',
    tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
  },
  {
    id: 4,
    category: 'Atividade Física',
    title: 'Caminhada Pós-Refeição',
    content: 'Uma caminhada leve de 10 a 15 minutos logo após as principais refeições ajuda os músculos a utilizarem a glicose em circulação como combustível natural.',
    icon: 'fa-person-walking',
    tagColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
  },
  {
    id: 5,
    category: 'Alimentação',
    title: 'A Ordem dos Alimentos Importa',
    content: 'Comece suas refeições comendo primeiro as saladas e vegetais ricos em fibras, depois as proteínas, e por último os carboidratos. Essa sequência melhora a saciedade e reduz o impacto glicêmico!',
    icon: 'fa-list-ol',
    tagColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
  },
  {
    id: 6,
    category: 'Cuidado Oculto',
    title: 'Atenção aos Molhos e Temperos',
    content: 'Molhos prontos para salada, ketchup e temperos industrializados costumam conter açúcares e sódio escondidos. Prefira azeite de oliva extra virgem, limão, alho e ervas naturais.',
    icon: 'fa-pepper-hot',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  },
  {
    id: 7,
    category: 'Bem-Estar',
    title: 'Sono Reparador e Hormônios',
    content: 'Noites mal dormidas aumentam a produção de cortisol, o hormônio do estresse que induz resistência à insulina e pode elevar seus níveis de açúcar no sangue no dia seguinte.',
    icon: 'fa-moon',
    tagColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
  },
  {
    id: 8,
    category: 'Alimentação',
    title: 'Frutas Inteiras vs. Sucos',
    content: 'Sempre que possível, prefira frutas inteiras com casca e bagaço ao invés de sucos. O suco concentra os açúcares naturais e remove as fibras essenciais para a digestão lenta.',
    icon: 'fa-lemon',
    tagColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
  },
  {
    id: 9,
    category: 'Cuidados Médicos',
    title: 'Rodízio nos Locais de Aplicação',
    content: 'Se você aplica insulina, lembre-se de fazer o rodízio diário dos locais de aplicação no corpo. Isso previne lipohipertrofia (caroços na pele) e garante uma absorção previsível.',
    icon: 'fa-syringe',
    tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    forDiabeticOnly: true,
    requiresInsulin: true
  },
  {
    id: 10,
    category: 'Educação',
    title: 'Gorduras Boas para Saciabilidade',
    content: 'Abacate, azeite extra virgem, sementes e castanhas são fontes de gorduras saudáveis que desaceleram a digestão e mantêm sua energia estável por mais tempo.',
    icon: 'fa-seedling',
    tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  },
  {
    id: 11,
    category: 'Leitura de Rótulos',
    title: 'Cuidado com os Alimentos "Diet"',
    content: 'Alimentos "diet" não contêm açúcar adicionado, mas podem ter alto teor de carboidratos ou gordura. Leia sempre a tabela nutricional para checar a composição total.',
    icon: 'fa-barcode',
    tagColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
  },
  {
    id: 12,
    category: 'Segurança',
    title: 'Kit de Emergência para Hipoglicemia',
    content: 'Mantenha sempre por perto uma fonte de carboidrato de rápida ação (como 15g de açúcar ou sachê de glicose) para tratar episódios de hipoglicemia imediatamente.',
    icon: 'fa-kit-medical',
    tagColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    forDiabeticOnly: true
  },
  {
    id: 13,
    category: 'Alimentação',
    title: 'Proteínas no Café da Manhã',
    content: 'Incluir proteínas magras como ovos, queijos magros ou iogurte natural no café da manhã reduz os picos de fome ao longo do dia e ajuda a manter o metabolismo equilibrado.',
    icon: 'fa-egg',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  }
];

interface DailyTipProps {
  userProfile?: UserProfile;
}

export const DailyTip: React.FC<DailyTipProps> = ({ userProfile }) => {
  // Filter static tips based on user condition
  const filteredTips = useMemo(() => {
    const isDiabetic = userProfile?.diabetesType && userProfile.diabetesType !== DiabetesType.None;
    const usesInsulin = Boolean(userProfile?.useInsulin);

    return TIPS_DATABASE.filter(tip => {
      if (tip.forDiabeticOnly && !isDiabetic) return false;
      if (tip.requiresInsulin && !usesInsulin) return false;
      return true;
    });
  }, [userProfile?.diabetesType, userProfile?.useInsulin]);

  // Calculate today's index based on day of year
  const defaultIndex = useMemo(() => {
    if (filteredTips.length === 0) return 0;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % filteredTips.length;
  }, [filteredTips.length]);

  const [currentIndex, setCurrentIndex] = useState<number>(defaultIndex);
  const [copied, setCopied] = useState<boolean>(false);
  const [showToastModal, setShowToastModal] = useState<boolean>(false);

  // Gemini AI Personalized Tip State
  const [customAiTip, setCustomAiTip] = useState<DailyTipItem | null>(null);
  const [isGeneratingAiTip, setIsGeneratingAiTip] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Check if tip should auto popup on first daily visit
  useEffect(() => {
    try {
      const todayStr = new Date().toLocaleDateString('sv'); // YYYY-MM-DD
      const lastTipDate = localStorage.getItem('glycocare_last_daily_tip_date');
      
      if (lastTipDate !== todayStr) {
        const timer = setTimeout(() => {
          setShowToastModal(true);
          localStorage.setItem('glycocare_last_daily_tip_date', todayStr);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error('Error checking daily tip date in localStorage:', e);
    }
  }, []);

  const currentTip = customAiTip || filteredTips[currentIndex % filteredTips.length] || TIPS_DATABASE[0];

  const handleNextTip = () => {
    setCustomAiTip(null); // Clear custom AI tip when cycling
    setAiError(null);
    setCurrentIndex((prev) => (prev + 1) % filteredTips.length);
    setCopied(false);
  };

  // Automatically generate AI personalized tip in background if userProfile is available
  useEffect(() => {
    let isMounted = true;
    const fetchPersonalizedTip = async () => {
      if (!userProfile) return;
      
      // Check if we already generated an AI tip for today in sessionStorage
      const todayStr = new Date().toLocaleDateString('sv');
      const cacheKey = `glycocare_ai_tip_${userProfile.id || 'default'}_${todayStr}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (isMounted) setCustomAiTip(parsed);
          return;
        }
      } catch (e) {
        // ignore cache read error
      }

      try {
        const generated = await generatePersonalizedDailyTip(userProfile);
        if (!isMounted) return;
        const newTip: DailyTipItem = {
          id: Date.now(),
          category: generated.category || 'Dica Personalizada',
          title: generated.title,
          content: generated.content,
          icon: generated.icon || 'fa-lightbulb',
          tagColor: generated.tagColor || 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
          isAiGenerated: true
        };
        setCustomAiTip(newTip);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(newTip));
        } catch (e) {
          // ignore cache write error
        }
      } catch (err) {
        console.warn('Fallback para lista filtrada por perfil de saúde:', err);
      }
    };

    fetchPersonalizedTip();
    return () => { isMounted = false; };
  }, [userProfile?.diabetesType, userProfile?.useInsulin, userProfile?.healthGoal, userProfile?.name]);

  const handleCopyTip = async () => {
    const textToCopy = `💡 Dica GlycoCare - ${currentTip.title}\n\n${currentTip.content}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Falha ao copiar texto:', err);
    }
  };

  return (
    <>
      {/* Mobile-Optimized Clickable Daily Tip Banner */}
      <div className="w-full bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-md flex items-center justify-between gap-3 border border-teal-500/30">
        <button
          onClick={() => setShowToastModal(true)}
          className="flex items-center gap-3 overflow-hidden text-left flex-1 group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 text-amber-300 text-lg group-hover:scale-110 transition-transform">
            <i className="fas fa-lightbulb"></i>
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white/90">
                {currentTip.isAiGenerated ? '✨ Dica do Dia (IA)' : 'Dica do Dia'}
              </span>
              <span className="text-[10px] font-medium text-teal-100 hidden sm:inline">
                {currentTip.category}
              </span>
            </div>
            <p className="text-sm font-bold text-white truncate mt-0.5 group-hover:underline">
              {currentTip.title}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowToastModal(true)}
            className="text-xs font-semibold bg-white text-teal-800 hover:bg-teal-50 px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <span>Ver Dica</span>
            <i className="fas fa-chevron-right text-[10px]"></i>
          </button>
        </div>
      </div>

      {/* Smooth Toast / Modal Notification of the Day */}
      {showToastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 border border-teal-200 dark:border-gray-700 rounded-2xl shadow-2xl max-w-md w-full p-6 relative transform transition-all duration-300 scale-100">
            
            {/* Header Badge */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-md text-lg">
                  <i className={`fas ${currentTip.icon}`}></i>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-teal-600 dark:text-teal-400">
                      Sua Dica de Saúde do Dia
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentTip.tagColor}`}>
                      {currentTip.category}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowToastModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="Fechar Notificação"
              >
                &times;
              </button>
            </div>

            {/* Title & Body */}
            <div className="my-3 space-y-2">
              <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-snug">
                {currentTip.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {currentTip.content}
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 pt-4 border-t dark:border-gray-700 flex items-center justify-between gap-2">
              <button
                onClick={handleCopyTip}
                className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-1.5"
              >
                <i className={`fas ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
                {copied ? 'Copiado!' : 'Copiar'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNextTip}
                  className="px-3 py-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-1"
                  title="Ver próxima dica da lista"
                >
                  <i className="fas fa-rotate"></i>
                  Outra
                </button>

                <button
                  onClick={() => setShowToastModal(false)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Entendi!
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default DailyTip;


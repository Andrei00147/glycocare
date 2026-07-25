import React, { useState, useEffect, useMemo } from 'react';

export interface DailyTipItem {
  id: number;
  category: string;
  title: string;
  content: string;
  icon: string;
  tagColor: string;
}

const TIPS_DATABASE: DailyTipItem[] = [
  {
    id: 1,
    category: 'Alimentação',
    title: 'Fibras Amigas da Glicemia',
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
    title: 'Hidratação e Glicemia',
    content: 'Beba bastante água ao longo do dia! A desidratação pode concentrar a glicose na corrente sanguínea, elevando temporariamente os níveis medidos de glicemia.',
    icon: 'fa-droplet',
    tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
  },
  {
    id: 4,
    category: 'Atividade Física',
    title: 'Caminhada Pós-Refeição',
    content: 'Uma caminhada leve de 10 a 15 minutos logo após as principais refeições ajuda os músculos a usarem a glicose em circulação, reduzindo significativamente a glicemia pós-prandial.',
    icon: 'fa-person-walking',
    tagColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
  },
  {
    id: 5,
    category: 'Alimentação',
    title: 'A Ordem dos Alimentos Importa',
    content: 'Comece suas refeições comendo primeiro as saladas e vegetais ricos em fibras, depois as proteínas, e por último os carboidratos. Essa sequência suaviza a resposta glicêmica do organismo!',
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
    content: 'Sempre que possível, prefira frutas inteiras com casca e bagaço ao invés de sucos. O suco concentra os açúcares naturais e remove as fibras essenciais para o controle da glicose.',
    icon: 'fa-lemon',
    tagColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
  },
  {
    id: 9,
    category: 'Cuidados Médicos',
    title: 'Rodízio nos Locais de Aplicação',
    content: 'Se você aplica insulina, lembre-se de fazer o rodízio diário dos locais de aplicação no corpo. Isso previne lipohipertrofia (caroços na pele) e garante uma absorção previsível.',
    icon: 'fa-syringe',
    tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
  },
  {
    id: 10,
    category: 'Educação',
    title: 'Gorduras Boas para Saciabilidade',
    content: 'Abacate, azeite extra virgem, sementes e castanhas são fontes de gorduras saudáveis que desaceleram a digestão e mantêm sua glicemia estável por mais tempo.',
    icon: 'fa-seedling',
    tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
  },
  {
    id: 11,
    category: 'Leitura de Rótulos',
    title: 'Cuidado com os Alimentos "Diet"',
    content: 'Alimentos "diet" não contêm açúcar adicionado, mas podem ter alto teor de carboidratos ou gordura. Leia sempre a tabela nutricional para checar a quantidade total de carboidratos.',
    icon: 'fa-barcode',
    tagColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
  },
  {
    id: 12,
    category: 'Segurança',
    title: 'Kit de Emergência para Hipoglicemia',
    content: 'Mantenha sempre por perto uma fonte de carboidrato de rápida ação (como 15g de açúcar ou sachê de glicose) para tratar episódios de hipoglicemia imediatamente.',
    icon: 'fa-kit-medical',
    tagColor: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
  },
  {
    id: 13,
    category: 'Alimentação',
    title: 'Proteínas no Café da Manhã',
    content: 'Incluir proteínas magras como ovos, queijos magros ou iogurte natural no café da manhã reduz os picos de fome ao longo do dia e ajuda a manter a glicemia estável.',
    icon: 'fa-egg',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
  }
];

export const DailyTip: React.FC = () => {
  // Calculate today's index based on day of year
  const defaultIndex = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return dayOfYear % TIPS_DATABASE.length;
  }, []);

  const [currentIndex, setCurrentIndex] = useState<number>(defaultIndex);
  const [copied, setCopied] = useState<boolean>(false);
  const [showToastModal, setShowToastModal] = useState<boolean>(false);

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

  const currentTip = TIPS_DATABASE[currentIndex];

  const handleNextTip = () => {
    setCurrentIndex((prev) => (prev + 1) % TIPS_DATABASE.length);
    setCopied(false);
  };

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
      {/* Inline Daily Tip Card */}
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-800 dark:to-gray-800/90 border border-teal-200/80 dark:border-gray-700 p-5 rounded-xl shadow-sm relative overflow-hidden transition-all duration-300">
        {/* Background Decorative Element */}
        <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-teal-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-lg bg-teal-500 text-white shadow-sm flex items-center justify-center">
              <i className={`fas ${currentTip.icon} text-sm`}></i>
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs uppercase font-extrabold tracking-wider text-teal-700 dark:text-teal-400">
                  Dica do Dia
                </h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${currentTip.tagColor}`}>
                  {currentTip.category}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowToastModal(true)}
              title="Abrir como notificação destacada"
              className="p-1.5 text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 rounded-md hover:bg-white/60 dark:hover:bg-gray-700 transition text-xs flex items-center gap-1 font-medium"
            >
              <i className="fas fa-expand text-xs"></i>
              <span className="hidden sm:inline text-xs">Expandir</span>
            </button>

            <button
              onClick={handleCopyTip}
              title="Compartilhar ou copiar dica"
              className="p-1.5 text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-300 rounded-md hover:bg-white/60 dark:hover:bg-gray-700 transition text-xs flex items-center gap-1"
            >
              <i className={`fas ${copied ? 'fa-check text-emerald-500' : 'fa-copy'}`}></i>
              <span className="hidden sm:inline text-xs">{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={handleNextTip}
              title="Ver outra dica"
              className="p-1.5 text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-200 rounded-md hover:bg-white/60 dark:hover:bg-gray-700 transition text-xs flex items-center gap-1 font-medium"
            >
              <i className="fas fa-rotate text-xs"></i>
              <span className="text-xs">Outra Dica</span>
            </button>
          </div>
        </div>

        <div className="mt-2">
          <h4 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">
            {currentTip.title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {currentTip.content}
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-teal-100 dark:border-gray-700/60 flex justify-between items-center text-[11px] text-gray-400 dark:text-gray-500">
          <span>Atualizado diariamente • GlycoCare</span>
          <span>{currentIndex + 1} de {TIPS_DATABASE.length}</span>
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
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-teal-600 dark:text-teal-400">
                    Sua Dica de Saúde do Dia
                  </span>
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

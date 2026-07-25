import React, { useState, useEffect } from 'react';
import { UserProfile, GlucoseReading, MealLog, SmartMealPairing, SmartMealSuggestionResult } from '../types';
import { getSmartMealPairingSuggestions } from '../services/geminiService';

interface SmartMealSuggestionModalProps {
  userProfile: UserProfile;
  glucoseReadings?: GlucoseReading[];
  mealLogs?: MealLog[];
  onClose: () => void;
  onSelectSuggestion: (suggestion: SmartMealPairing) => void;
}

export const SmartMealSuggestionModal: React.FC<SmartMealSuggestionModalProps> = ({
  userProfile,
  glucoseReadings = [],
  mealLogs = [],
  onClose,
  onSelectSuggestion,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestionData, setSuggestionData] = useState<SmartMealSuggestionResult | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSmartMealPairingSuggestions(userProfile, glucoseReadings, mealLogs);
      setSuggestionData(result);
    } catch (err: any) {
      console.error('Error fetching smart meal pairings:', err);
      setError(err.message || 'Não foi possível gerar as sugestões no momento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  // Calculate recent glucose avg for display
  const recentReadings = glucoseReadings.slice(-7);
  const avgGlucose = recentReadings.length > 0
    ? Math.round(recentReadings.reduce((sum, r) => sum + r.value, 0) / recentReadings.length)
    : null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto border border-teal-100 dark:border-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 mb-4 border-b dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500 text-white rounded-xl shadow-md text-xl">
              <i className="fas fa-brain"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                  Sugestão Inteligente de Combinação Alimentar
                </h2>
                <span className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Combinações saudáveis personalizadas para suas metas e histórico glicêmico.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            &times;
          </button>
        </div>

        {/* User Context Banner */}
        <div className="bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border dark:border-gray-600 mb-5 text-xs flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <i className="fas fa-bullseye text-teal-600 dark:text-teal-400"></i>
            <span>Meta Principal: <strong>{userProfile.healthGoal || 'Prevenção & Controle Glicêmico'}</strong></span>
          </div>

          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
            <i className="fas fa-chart-line text-emerald-600 dark:text-emerald-400"></i>
            <span>Média de Glicemia: <strong>{avgGlucose ? `${avgGlucose} mg/dL` : 'Sem leituras recentes'}</strong></span>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block p-4 bg-teal-50 dark:bg-gray-700 rounded-full text-teal-600 dark:text-teal-400 animate-bounce">
              <i className="fas fa-wand-magic-sparkles text-3xl"></i>
            </div>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
              Gerando sugestões inteligentes com Gemini AI...
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Analisando seu perfil de diabetes, suas medições recentes e combinando nutrientes para evitar picos de glicemia.
            </p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-xl text-xs space-y-3 border border-red-200 dark:border-red-900">
            <p className="font-bold flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              Falha ao carregar sugestões inteligentes
            </p>
            <p>{error}</p>
            <button
              onClick={fetchSuggestions}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition"
            >
              Tentar Novamente
            </button>
          </div>
        ) : suggestionData ? (
          <div className="space-y-4">
            
            {/* Context Summary from Gemini */}
            {suggestionData.glucoseContextSummary && (
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-xl text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5">
                <i className="fas fa-lightbulb text-teal-600 dark:text-teal-400 text-sm mt-0.5"></i>
                <div>
                  <span className="font-bold block mb-0.5">Estratégia Nutricional Personalizada:</span>
                  <p className="leading-relaxed">{suggestionData.glucoseContextSummary}</p>
                </div>
              </div>
            )}

            {/* List of 3 Suggestions */}
            <div className="space-y-3">
              {suggestionData.suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-teal-500 dark:hover:border-teal-500 transition shadow-sm hover:shadow-md group"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
                        {suggestion.title}
                      </h3>
                    </div>

                    {/* Macros Badges */}
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 rounded-md">
                        {suggestion.carbohydrates}g Carbs
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-md">
                        {suggestion.proteins}g Prot
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md">
                        {suggestion.fats}g Gord
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 rounded-md">
                        {suggestion.calories} kcal
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                    {suggestion.description}
                  </p>

                  {/* Scientific Pairing Reason */}
                  <div className="p-2.5 bg-gray-50 dark:bg-gray-700/60 rounded-lg text-xs text-gray-700 dark:text-gray-300 mb-3 border dark:border-gray-600 flex items-start gap-2">
                    <i className="fas fa-shield-halved text-emerald-600 dark:text-emerald-400 text-xs mt-0.5"></i>
                    <div>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">Por que essa combinação funciona:</strong>{' '}
                      {suggestion.pairingReason}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => onSelectSuggestion(suggestion)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5"
                    >
                      <i className="fas fa-check"></i>
                      Usar e Registrar esta Refeição
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Refresh Suggestions Button */}
            <div className="pt-2 flex justify-center">
              <button
                onClick={fetchSuggestions}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1.5 py-1"
              >
                <i className="fas fa-rotate"></i>
                Gerar Novas Combinacões de Alimentos
              </button>
            </div>

          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

export default SmartMealSuggestionModal;

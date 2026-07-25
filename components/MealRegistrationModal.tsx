import React, { useState, useRef } from 'react';
import { UserProfile, GlucoseReading, MealLog, SmartMealPairing } from '../types';
import { estimateMealNutrientsFromDescriptionOrImage } from '../services/geminiService';
import { SmartMealSuggestionModal } from './SmartMealSuggestionModal';

interface MealRegistrationModalProps {
  userProfile?: UserProfile;
  glucoseReadings?: GlucoseReading[];
  mealLogs?: MealLog[];
  onClose: () => void;
  onRegister: (carbs: number, sugars: number, name?: string, proteins?: number, fats?: number, calories?: number) => void;
}

export const MealRegistrationModal: React.FC<MealRegistrationModalProps> = ({
  userProfile,
  glucoseReadings = [],
  mealLogs = [],
  onClose,
  onRegister
}) => {
  const [carbs, setCarbs] = useState<string>('');
  const [sugars, setSugars] = useState<string>('');
  const [proteins, setProteins] = useState<string>('');
  const [fats, setFats] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [name, setName] = useState<string>('');

  // AI Estimation state
  const [description, setDescription] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Smart Suggestion Modal State
  const [showSmartSuggestionModal, setShowSmartSuggestionModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setAiError('A imagem deve ter no máximo 10MB.');
        return;
      }
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const resultStr = reader.result as string;
        setImagePreview(resultStr);
        // Extract raw base64 string
        const base64Data = resultStr.split(',')[1];
        setBase64Image(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setBase64Image(null);
    setMimeType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEstimateWithAi = async () => {
    if (!description.trim() && !base64Image) {
      setAiError('Adicione uma foto do prato ou descreva os ingredientes/modo de preparo para a IA calcular.');
      return;
    }

    setIsEstimating(true);
    setAiError(null);
    setAiExplanation(null);

    try {
      const result = await estimateMealNutrientsFromDescriptionOrImage(
        userProfile,
        description.trim() || undefined,
        base64Image || undefined,
        mimeType || undefined
      );

      if (result.suggestedName) setName(result.suggestedName);
      setCarbs(String(result.carbohydrates || 0));
      setSugars(String(result.sugars || 0));
      setProteins(String(result.proteins || 0));
      setFats(String(result.fats || 0));
      setCalories(String(result.calories || 0));

      setAiExplanation(result.explanation || 'Nutrientes calculados com sucesso pela IA com base nos dados fornecidos!');
    } catch (err: any) {
      console.error('AI Estimation Error:', err);
      setAiError(err.message || 'Ocorreu um erro ao tentar calcular os nutrientes. Verifique os dados e tente novamente.');
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSelectSmartSuggestion = (suggestion: SmartMealPairing) => {
    setName(suggestion.title);
    setCarbs(String(suggestion.carbohydrates));
    setSugars(String(suggestion.sugars || 0));
    setProteins(String(suggestion.proteins || 0));
    setFats(String(suggestion.fats || 0));
    setCalories(String(suggestion.calories || 0));
    setAiExplanation(`Sugestão Inteligente Gemini: ${suggestion.pairingReason}`);
    setShowSmartSuggestionModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const carbsNum = parseFloat(carbs) || 0;
    const sugarsNum = parseFloat(sugars) || 0;
    const proteinsNum = parseFloat(proteins) || 0;
    const fatsNum = parseFloat(fats) || 0;
    const caloriesNum = parseFloat(calories) || 0;
    onRegister(carbsNum, sugarsNum, name.trim() || undefined, proteinsNum, fatsNum, caloriesNum);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
            <i className="fas fa-utensils text-orange-500 mr-2.5"></i>
            Registrar Refeição Completa
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Smart Suggestion Banner Button */}
        {userProfile && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowSmartSuggestionModal(true)}
              className="w-full p-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-white/20 rounded-lg text-lg">
                  <i className="fas fa-brain"></i>
                </span>
                <div className="text-left">
                  <span className="block font-extrabold">
                    Sugestão Inteligente de Combinação
                  </span>
                  <span className="text-[11px] font-normal text-teal-100 block">
                    Baseada em suas metas e tendências de glicemia
                  </span>
                </div>
              </div>
              <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-bold group-hover:bg-white/30 transition flex items-center gap-1">
                Ver Opções <i className="fas fa-chevron-right text-xs"></i>
              </span>
            </button>
          </div>
        )}

        {/* Bloco de Assistente de Estimativa por Foto & Descrição */}
        <div className="mb-5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-gray-700/60 dark:to-gray-700/40 p-4 rounded-xl border border-orange-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-orange-500 text-white rounded-lg text-xs">
              <i className="fas fa-wand-magic-sparkles"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                Não sabe os valores numéricos? Deixe a IA calcular!
              </h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Tire uma foto do prato e/ou descreva como foi preparado (ingredientes, óleo usado, porção).
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-3">
            {/* Foto do prato */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Foto do Prato (Opcional)
              </label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Foto do Prato"
                    className="w-full h-32 object-cover rounded-lg border border-orange-200 dark:border-gray-600 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 bg-red-600 text-white text-xs p-1 rounded-full hover:bg-red-700 transition"
                    title="Remover Foto"
                  >
                    <i className="fas fa-times px-1"></i>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 bg-white dark:bg-gray-800 border border-orange-300 dark:border-gray-600 rounded-lg text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100/50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-camera text-base"></i>
                    Anexar ou Tirar Foto do Prato
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Descrição e Modo de Preparo */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Detalhes dos Ingredientes e Preparo (Opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Arroz integral (3 colheres), peito de frango de 150g feito na frigideira com 1 colher de azeite, mandioca cozida e salada de alface."
                rows={2}
                className="w-full px-3 py-2 text-xs border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {aiError && (
              <div className="p-2.5 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 text-xs rounded-lg font-medium">
                ⚠️ {aiError}
              </div>
            )}

            {aiExplanation && (
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 text-xs rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="font-bold flex items-center gap-1 mb-0.5">
                  <i className="fas fa-check-circle text-emerald-600 dark:text-emerald-400"></i>
                  Valores preenchidos automaticamente!
                </p>
                <p>{aiExplanation}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleEstimateWithAi}
              disabled={isEstimating}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isEstimating ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Analisando Foto e Preparo com IA...
                </>
              ) : (
                <>
                  <i className="fas fa-calculator text-amber-300"></i>
                  Calcular Nutrientes com IA
                </>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome da Refeição
            </label>
            <input
              type="text"
              placeholder="Ex: Almoço Saudável, Omelete, Smoothie..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Carboidratos (g) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="0"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold text-orange-600 dark:text-orange-400 focus:ring-2 focus:ring-orange-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">g</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Açúcares / Glicose (g)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={sugars}
                  onChange={(e) => setSugars(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold text-rose-600 dark:text-rose-400 focus:ring-2 focus:ring-rose-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">g</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Proteínas (g)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={proteins}
                  onChange={(e) => setProteins(e.target.value)}
                  className="w-full pl-3 pr-7 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-2 top-2.5 text-xs text-gray-400 font-medium">g</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Gorduras (g)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                  className="w-full pl-3 pr-7 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold text-amber-600 dark:text-amber-400 focus:ring-2 focus:ring-amber-500"
                />
                <span className="absolute right-2 top-2.5 text-xs text-gray-400 font-medium">g</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Calorias (kcal)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full pl-3 pr-7 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-semibold text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500"
                />
                <span className="absolute right-2 top-2.5 text-xs text-gray-400 font-medium">kcal</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-lg border dark:border-gray-600">
            💡 <strong>Painel Nutricional:</strong> Você pode ajustar livremente qualquer número acima antes de salvar no seu histórico diário.
          </p>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition shadow-md"
            >
              Salvar Refeição
            </button>
          </div>
        </form>
      </div>

      {showSmartSuggestionModal && userProfile && (
        <SmartMealSuggestionModal
          userProfile={userProfile}
          glucoseReadings={glucoseReadings}
          mealLogs={mealLogs}
          onClose={() => setShowSmartSuggestionModal(false)}
          onSelectSuggestion={handleSelectSmartSuggestion}
        />
      )}
    </div>
  );
};

export default MealRegistrationModal;

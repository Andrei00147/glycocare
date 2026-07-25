import React, { useState } from 'react';

interface MealRegistrationModalProps {
  onClose: () => void;
  onRegister: (carbs: number, sugars: number, name?: string, proteins?: number, fats?: number, calories?: number) => void;
}

export const MealRegistrationModal: React.FC<MealRegistrationModalProps> = ({ onClose, onRegister }) => {
  const [carbs, setCarbs] = useState<string>('');
  const [sugars, setSugars] = useState<string>('');
  const [proteins, setProteins] = useState<string>('');
  const [fats, setFats] = useState<string>('');
  const [calories, setCalories] = useState<string>('');
  const [name, setName] = useState<string>('');

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
            💡 <strong>Painel Nutricional:</strong> Acompanhar proteínas, gorduras e calorias junto aos carboidratos permite uma visão completa da sua nutrição diária.
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
    </div>
  );
};

export default MealRegistrationModal;

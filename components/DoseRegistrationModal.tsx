import React, { useState } from 'react';

interface DoseRegistrationModalProps {
  onClose: () => void;
  onRegister: (units: number) => void;
}

const DoseRegistrationModal: React.FC<DoseRegistrationModalProps> = ({ onClose, onRegister }) => {
  const [units, setUnits] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedUnits = parseInt(units, 10);
    if (isNaN(parsedUnits) || parsedUnits <= 0) {
      setError('Por favor, insira um número válido de unidades.');
      return;
    }
    onRegister(parsedUnits);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Registrar Dose de Insulina</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <label htmlFor="units" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quantas unidades você aplicou?
            </label>
            <input
              type="number"
              id="units"
              name="units"
              value={units}
              onChange={(e) => {
                setUnits(e.target.value);
                setError('');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Ex: 8"
              autoFocus
              required
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 rounded-b-lg">
            <button
              type="submit"
              className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition disabled:bg-gray-400"
              disabled={!units}
            >
              Confirmar e Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DoseRegistrationModal;
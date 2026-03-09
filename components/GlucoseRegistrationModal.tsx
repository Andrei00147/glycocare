import React, { useState } from 'react';

interface GlucoseRegistrationModalProps {
  onClose: () => void;
  onRegister: (value: number, timestamp: Date) => void;
}

const GlucoseRegistrationModal: React.FC<GlucoseRegistrationModalProps> = ({ onClose, onRegister }) => {
  const [value, setValue] = useState('');
  const [timestamp, setTimestamp] = useState(new Date().toISOString().slice(0, 16));
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      setError('Por favor, insira um valor de glicemia válido.');
      return;
    }
    onRegister(parsedValue, new Date(timestamp));
  };

  const inputStyle = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Registrar Glicemia</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="glucoseValue" className={labelStyle}>
                Valor da Glicemia (mg/dL)
              </label>
              <input
                type="number"
                id="glucoseValue"
                name="glucoseValue"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError('');
                }}
                className={inputStyle}
                placeholder="Ex: 120"
                autoFocus
                required
              />
            </div>
             <div>
              <label htmlFor="timestamp" className={labelStyle}>
                Data e Hora
              </label>
              <input
                type="datetime-local"
                id="timestamp"
                name="timestamp"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className={inputStyle}
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 rounded-b-lg">
            <button
              type="submit"
              className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition disabled:bg-gray-400"
              disabled={!value}
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GlucoseRegistrationModal;
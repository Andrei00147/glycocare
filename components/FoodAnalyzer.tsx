import React, { useState, useRef, useCallback } from 'react';
import { UserProfile, FoodAnalysisResult } from '../types';
import { analyzeFoodImage } from '../services/geminiService';

interface FoodAnalyzerProps {
  userProfile: UserProfile;
  onClose: () => void;
  onAnalysisComplete: (result: FoodAnalysisResult) => void;
}

// Custom hook to handle file selection and preview
const useFilePreview = (): [string | null, (file: File | null) => void] => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const handleFileChange = useCallback((file: File | null) => {
    if (!file) {
      setImgSrc(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);
  return [imgSrc, handleFileChange];
};

// Helper to convert data URL to base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});


const FoodAnalyzer: React.FC<FoodAnalyzerProps> = ({ userProfile, onClose, onAnalysisComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useFilePreview();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(file);
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyzeClick = async () => {
    if (!selectedFile) {
      setError("Por favor, selecione uma imagem.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const base64Image = await toBase64(selectedFile);
      const analysisResult = await analyzeFoodImage(base64Image, selectedFile.type, userProfile);
      setResult(analysisResult);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro desconhecido.");
    } finally {
      setIsLoading(false);
    }
  };

  const MetricDisplay: React.FC<{label: string; value: string | number; color: string;}> = ({label, value, color}) => (
      <div>
          <p className={`font-bold text-xl ${color}`}>{value}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
      </div>
  );

  const AnalysisResult: React.FC<{ data: FoodAnalysisResult }> = ({ data }) => (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
      <div>
          <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-200">Alimentos Identificados</h3>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
            {data.foodItems.map(item => <li key={item}>{item}</li>)}
          </ul>
      </div>
      
      <div>
        <h3 className="font-bold text-lg mb-3 text-gray-800 dark:text-gray-200">Análise Nutricional Estimada</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
            <MetricDisplay label="Carbs" value={`${data.carbohydrates}g`} color="text-teal-500" />
            <MetricDisplay label="Calorias" value={data.calories} color="text-orange-500" />
            <MetricDisplay label="Açúcares" value={`${data.sugars}g`} color="text-red-500" />
            <MetricDisplay label="Gorduras" value={`${data.fats}g`} color="text-yellow-500" />
            <MetricDisplay label="Proteínas" value={`${data.proteins}g`} color="text-blue-500" />
        </div>
      </div>

       <div className="bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200 p-3 rounded-md">
        <p className="font-bold flex items-center"><i className="fas fa-lightbulb mr-2"></i>Alerta Inteligente</p>
        <p className="text-sm">{data.smartAlert}</p>
      </div>
      
      <div className="bg-purple-100 dark:bg-purple-900/50 border-l-4 border-purple-500 text-purple-800 dark:text-purple-200 p-3 rounded-md">
        <p className="font-bold flex items-center"><i className="fas fa-clock mr-2"></i>Conselho de Horário</p>
        <p className="text-sm">{data.mealTimingAdvice}</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold">Analisar Alimento</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
        </div>

        <div className="p-4">
          <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          
          <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="mx-auto max-h-48 rounded-md object-cover" />
            ) : (
              <div className="text-gray-500 dark:text-gray-400">
                <i className="fas fa-camera text-4xl mb-2"></i>
                <p>Tire uma foto ou escolha da galeria</p>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
          
          {result && <AnalysisResult data={result} />}

          {isLoading && (
            <div className="mt-4 flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
              <p className="mt-3 text-gray-600 dark:text-gray-300">Analisando... A IA está identificando sua refeição!</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 z-10">
            {result ? (
                 <button onClick={() => onAnalysisComplete(result)} className="w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition">
                    Adicionar {result.carbohydrates}g de Carboidratos
                </button>
            ) : (
                <button onClick={handleAnalyzeClick} disabled={!selectedFile || isLoading} className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                    {isLoading ? 'Analisando...' : 'Analisar com IA'}
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default FoodAnalyzer;
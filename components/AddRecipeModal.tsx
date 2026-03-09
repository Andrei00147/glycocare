import React, { useState } from 'react';
import { Recipe } from '../types';
import { calculateRecipeNutrition } from '../services/geminiService';

interface AddRecipeModalProps {
    onClose: () => void;
    onSave: (newRecipeData: Omit<Recipe, 'id' | 'author'>) => void;
}

type FormData = Omit<Recipe, 'id' | 'author'>;

const AddRecipeModal: React.FC<AddRecipeModalProps> = ({ onClose, onSave }) => {
    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        ingredients: '',
        instructions: '',
        carbohydrates: 0,
        calories: 0,
        externalLink: '',
    });
    const [isCalculating, setIsCalculating] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
        }));
    };

    const handleCalculateWithAI = async () => {
        if (!formData.ingredients.trim()) {
            setError('Por favor, adicione os ingredientes primeiro.');
            return;
        }
        setError('');
        setIsCalculating(true);
        try {
            const result = await calculateRecipeNutrition(formData.ingredients);
            setFormData(prev => ({
                ...prev,
                carbohydrates: Math.round(result.carbohydrates),
                calories: Math.round(result.calories),
            }));
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao calcular.');
        } finally {
            setIsCalculating(false);
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple validation
        if (!formData.title || !formData.ingredients || !formData.instructions) {
            alert('Por favor, preencha os campos obrigatórios (Título, Ingredientes, Modo de Preparo).');
            return;
        }
        onSave(formData);
    };

    const inputStyle = "mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
    const labelStyle = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-xl font-bold">Adicionar Nova Receita</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div>
                            <label htmlFor="title" className={labelStyle}>Título da Receita</label>
                            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className={inputStyle} required />
                        </div>
                        <div>
                            <label htmlFor="description" className={labelStyle}>Descrição Curta</label>
                            <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="ingredients" className={labelStyle}>Ingredientes</label>
                            <textarea name="ingredients" id="ingredients" value={formData.ingredients} onChange={handleChange} rows={5} className={inputStyle} placeholder="Um ingrediente por linha (ex: 1 xícara de farinha de amêndoas)" required></textarea>
                        </div>
                         <div>
                            <label htmlFor="instructions" className={labelStyle}>Modo de Preparo</label>
                            <textarea name="instructions" id="instructions" value={formData.instructions} onChange={handleChange} rows={6} className={inputStyle} required></textarea>
                        </div>
                         <div>
                            <label htmlFor="externalLink" className={labelStyle}>Link do Vídeo/Post (Opcional)</label>
                            <input type="url" name="externalLink" id="externalLink" value={formData.externalLink} onChange={handleChange} className={inputStyle} placeholder="https://youtube.com/..." />
                        </div>
                        
                        <div className="pt-2">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="text-md font-semibold">Informações Nutricionais</h3>
                                <button type="button" onClick={handleCalculateWithAI} disabled={isCalculating} className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-200 text-xs font-bold py-2 px-3 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-800 transition disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isCalculating ? (
                                        <i className="fas fa-spinner fa-spin"></i>
                                    ) : (
                                        <><i className="fa-solid fa-wand-magic-sparkles mr-2"></i>Calcular com IA</>
                                    )}
                                </button>
                             </div>
                             {error && <p className="text-red-500 text-xs mb-2 text-center">{error}</p>}
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="carbohydrates" className={labelStyle}>Carboidratos (g)</label>
                                    <input type="number" name="carbohydrates" id="carbohydrates" value={formData.carbohydrates} onChange={handleChange} className={inputStyle} required />
                                </div>
                                <div>
                                    <label htmlFor="calories" className={labelStyle}>Calorias (kcal)</label>
                                    <input type="number" name="calories" id="calories" value={formData.calories} onChange={handleChange} className={inputStyle} required />
                                </div>
                            </div>
                        </div>

                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 sticky bottom-0 z-10">
                        <button type="submit" className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition">
                            Compartilhar Receita
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddRecipeModal;
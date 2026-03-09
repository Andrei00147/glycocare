import React, { useState } from 'react';
import { UserProfile, Recipe } from '../types';
import AddRecipeModal from './AddRecipeModal';

interface CommunityRecipesProps {
    userProfile: UserProfile;
    recipes: Recipe[];
    onAddRecipe: (newRecipeData: Omit<Recipe, 'id' | 'author'>) => void;
    onBack: () => void;
}

const RecipeCard: React.FC<{ recipe: Recipe, onClick: () => void }> = ({ recipe, onClick }) => (
    <div onClick={onClick} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-4 break-inside-avoid cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-transform duration-200">
        <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400">{recipe.title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">por {recipe.author}</p>
        <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{recipe.description}</p>
        <div className="flex justify-start gap-4 text-center border-t dark:border-gray-700 pt-2 mt-2">
             <div><p className="font-bold text-orange-500">{recipe.carbohydrates}g</p><p className="text-xs text-gray-500 dark:text-gray-400">Carbs</p></div>
             <div><p className="font-bold text-red-500">{recipe.calories}</p><p className="text-xs text-gray-500 dark:text-gray-400">Calorias</p></div>
        </div>
    </div>
);

const RecipeDetailModal: React.FC<{ recipe: Recipe, onClose: () => void }> = ({ recipe, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                 <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400">{recipe.title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Enviado por: {recipe.author}</p>
                    <p className="text-gray-700 dark:text-gray-300 mb-6">{recipe.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-2 border-b-2 border-teal-500 pb-1">Ingredientes</h3>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                                {recipe.ingredients.split('\n').map((item, index) => <li key={index}>{item}</li>)}
                            </ul>
                        </div>
                         <div className="flex flex-col gap-4 text-center">
                            <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-orange-500">{recipe.carbohydrates}g</p>
                                <p className="text-sm text-orange-700 dark:text-orange-300">Carboidratos</p>
                            </div>
                             <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">
                                <p className="text-2xl font-bold text-red-500">{recipe.calories}</p>
                                <p className="text-sm text-red-700 dark:text-red-300">Calorias (kcal)</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2 border-b-2 border-teal-500 pb-1">Modo de Preparo</h3>
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
                    </div>

                    {recipe.externalLink && (
                        <div className="mt-8 text-center">
                            <a href={recipe.externalLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition">
                                <i className="fa-brands fa-youtube"></i> Ver Vídeo da Receita
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const CommunityRecipes: React.FC<CommunityRecipesProps> = ({ userProfile, recipes, onAddRecipe, onBack }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    const handleSaveRecipe = (newRecipeData: Omit<Recipe, 'id' | 'author'>) => {
        onAddRecipe(newRecipeData);
        setIsModalOpen(false);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
            <header className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-teal-500 hover:text-teal-700 flex items-center">
                    <i className="fas fa-arrow-left mr-2"></i> Voltar
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Receitas da Comunidade</h1>
            </header>

            {recipes.length === 0 ? (
                <div className="text-center py-16">
                    <i className="fas fa-utensils text-5xl text-gray-300 dark:text-gray-600 mb-4"></i>
                    <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-300">Nenhuma receita ainda</h2>
                    <p className="text-gray-500 dark:text-gray-400">Seja o primeiro a compartilhar uma receita!</p>
                </div>
            ) : (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                    {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} onClick={() => setSelectedRecipe(recipe)} />)}
                </div>
            )}
            
            <button 
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-6 right-6 bg-teal-500 text-white w-16 h-16 rounded-full shadow-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform hover:scale-110 transition-transform duration-200 flex items-center justify-center"
                aria-label="Adicionar nova receita"
            >
                <i className="fas fa-plus text-2xl"></i>
            </button>

            {isModalOpen && (
                <AddRecipeModal 
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveRecipe}
                />
            )}
            {selectedRecipe && (
                <RecipeDetailModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
            )}
        </div>
    );
};

export default CommunityRecipes;
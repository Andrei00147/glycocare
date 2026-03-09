
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, FoodAnalysisResult } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function fileToGenerativePart(base64: string, mimeType: string) {
  return {
    inlineData: {
      data: base64,
      mimeType
    },
  };
}

export const analyzeFoodImage = async (
  base64Image: string,
  mimeType: string,
  userProfile: UserProfile
): Promise<FoodAnalysisResult> => {
  try {
    const imagePart = fileToGenerativePart(base64Image, mimeType);
    const prompt = `
      Analise a imagem deste alimento. Com base no perfil do usuário diabético fornecido, retorne um objeto JSON.

      Perfil do Usuário:
      - Tipo de Diabetes: ${userProfile.diabetesType}
      - Faixa Glicêmica Alvo: ${userProfile.glucoseTargetMin}-${userProfile.glucoseTargetMax} mg/dL

      Sua tarefa é:
      1. Identificar os principais itens alimentares na imagem.
      2. Estimar a quantidade total de carboidratos (g), calorias (kcal), açúcares (g), gorduras (fats, g) e proteínas (proteins, g).
      3. Criar um "Alerta Inteligente" (smartAlert) empático e útil. O alerta deve ser personalizado com base nos alimentos identificados e no perfil do usuário. Por exemplo, se o alimento tiver alto índice glicêmico, dê um aviso amigável. Se for um doce, sugira moderação e monitoramento da glicose.
      4. Fornecer um "Conselho de Horário da Refeição" (mealTimingAdvice). Este conselho deve sugerir o melhor momento para consumir este alimento (ex: "Ideal após exercícios", "Melhor consumir no almoço para ter tempo de gastar a energia", "Evitar perto da hora de dormir devido ao alto teor de gordura") com base em seu impacto glicêmico e nutricional e nas metas do usuário.

      Responda APENAS com o objeto JSON, sem nenhum texto ou formatação adicional.
    `;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ parts: [imagePart, { text: prompt }] }],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    foodItems: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: 'Lista dos alimentos identificados.'
                    },
                    carbohydrates: { type: Type.NUMBER, description: 'Estimativa de carboidratos em gramas.' },
                    calories: { type: Type.NUMBER, description: 'Estimativa de calorias.' },
                    sugars: { type: Type.NUMBER, description: 'Estimativa de açúcares em gramas.' },
                    fats: { type: Type.NUMBER, description: 'Estimativa de gorduras em gramas.' },
                    proteins: { type: Type.NUMBER, description: 'Estimativa de proteínas em gramas.' },
                    smartAlert: { type: Type.STRING, description: 'Alerta personalizado para o usuário.' },
                    mealTimingAdvice: { type: Type.STRING, description: 'Conselho sobre o melhor horário para a refeição.' }
                },
                required: ["foodItems", "carbohydrates", "calories", "sugars", "fats", "proteins", "smartAlert", "mealTimingAdvice"]
            }
        }
    });

    const jsonText = response.text;
    const result = JSON.parse(jsonText);
    return result as FoodAnalysisResult;
  } catch (error) {
    console.error("Error analyzing food image with Gemini:", error);
    throw new Error("Não foi possível analisar a imagem. Tente novamente.");
  }
};

export const calculateRecipeNutrition = async (
    ingredients: string
): Promise<{carbohydrates: number, calories: number}> => {
    try {
        const prompt = `
            Analise esta lista de ingredientes de uma receita e estime o valor nutricional total.
            
            Ingredientes:
            ${ingredients}

            Sua tarefa é:
            1. Calcular a quantidade total de carboidratos (em gramas).
            2. Calcular a quantidade total de calorias (kcal).
            3. Retorne um objeto JSON com as chaves "carbohydrates" e "calories".

            Responda APENAS com o objeto JSON, sem nenhum texto ou formatação adicional.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        carbohydrates: { type: Type.NUMBER, description: 'Total de carboidratos em gramas.' },
                        calories: { type: Type.NUMBER, description: 'Total de calorias (kcal).' }
                    },
                    required: ["carbohydrates", "calories"]
                }
            }
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        
        if(typeof result.carbohydrates !== 'number' || typeof result.calories !== 'number') {
            throw new Error("A resposta da IA não continha os dados esperados.");
        }
        
        return result;

    } catch (error) {
        console.error("Error calculating recipe nutrition with Gemini:", error);
        throw new Error("Não foi possível calcular os dados nutricionais. Verifique os ingredientes e tente novamente.");
    }
}
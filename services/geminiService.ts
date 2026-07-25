
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, FoodAnalysisResult } from '../types';

let genAI: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!genAI) {
    const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!API_KEY) {
      console.error("GEMINI_API_KEY is not set. AI features will be unavailable.");
      return null;
    }
    genAI = new GoogleGenAI({ apiKey: API_KEY });
  }
  return genAI;
}

const MODEL_NAME = "gemini-3.6-flash";

/**
 * Handles and standardizes Gemini API errors into human-readable messages in Portuguese,
 * identifying specific HTTP status codes (e.g., 401 Unauthorized, 429 Rate Limited).
 */
function handleGeminiError(error: any): Error {
  console.error("Gemini API Error details:", error);

  let status: number | null = null;
  let rawMessage = error?.message || String(error || "");

  // Extract embedded JSON error payload if present in message string
  try {
    if (typeof rawMessage === "string" && rawMessage.includes("{")) {
      const startIdx = rawMessage.indexOf("{");
      const endIdx = rawMessage.lastIndexOf("}");
      if (startIdx !== -1 && endIdx > startIdx) {
        const jsonPayload = JSON.parse(rawMessage.slice(startIdx, endIdx + 1));
        if (jsonPayload?.error) {
          if (jsonPayload.error.code) status = Number(jsonPayload.error.code);
          if (jsonPayload.error.message) rawMessage = jsonPayload.error.message;
        }
      }
    }
  } catch (e) {
    // Ignore JSON parsing failure and fallback to inspecting error object directly
  }

  if (!status) {
    const extractedCode = error?.status || error?.statusCode || error?.code || error?.response?.status;
    if (typeof extractedCode === "number") {
      status = extractedCode;
    } else if (typeof extractedCode === "string") {
      const parsedInt = parseInt(extractedCode, 10);
      if (!isNaN(parsedInt)) status = parsedInt;
    }
  }

  const msgLower = rawMessage.toLowerCase();

  // 401 Unauthorized / Unauthenticated
  if (status === 401 || msgLower.includes("unauthenticated") || msgLower.includes("api key not valid") || msgLower.includes("invalid api key")) {
    return new Error("Chave de API inválida ou não autorizada (Erro 401). Verifique se a variável GEMINI_API_KEY foi inserida corretamente.");
  }

  // 403 Forbidden / Permission Denied
  if (status === 403 || msgLower.includes("permission_denied") || msgLower.includes("permission denied")) {
    return new Error("Acesso negado à API do Gemini (Erro 403). Verifique as permissões da sua chave de API.");
  }

  // 429 Rate Limit / Quota Exceeded
  if (status === 429 || msgLower.includes("quota") || msgLower.includes("resource_exhausted") || msgLower.includes("rate limit")) {
    return new Error("Limite de requisições ou cota excedida (Erro 429). Por favor, aguarde alguns segundos e tente novamente.");
  }

  // 404 Model Not Found
  if (status === 404 || msgLower.includes("not_found") || msgLower.includes("is no longer available")) {
    return new Error("Modelo de IA indisponível ou não encontrado (Erro 404). O serviço está sendo atualizado.");
  }

  // 500 / 503 Internal Server Error
  if ((status && status >= 500) || msgLower.includes("internal") || msgLower.includes("unavailable") || msgLower.includes("service unavailable")) {
    return new Error("Serviço do Gemini temporariamente instável ou indisponível (Erro no servidor da IA). Tente novamente em instantes.");
  }

  // Network / Offline errors
  if (msgLower.includes("failed to fetch") || msgLower.includes("networkerror") || msgLower.includes("network error")) {
    return new Error("Erro de conexão com o servidor de IA. Verifique sua conexão com a internet e tente novamente.");
  }

  return new Error(rawMessage || "Ocorreu um erro inesperado ao analisar com IA. Tente novamente.");
}

export const analyzeFoodImage = async (
  base64Image: string,
  mimeType: string,
  userProfile: UserProfile
): Promise<FoodAnalysisResult> => {
  const ai = getAI();
  if (!ai) {
    throw new Error("Serviço de IA não configurado. Verifique se a chave de API (GEMINI_API_KEY) está definida.");
  }

  try {
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

      Responda APENAS com o objeto JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        prompt
      ],
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

    const jsonText = response.text || "";
    return JSON.parse(jsonText) as FoodAnalysisResult;
  } catch (error: any) {
    throw handleGeminiError(error);
  }
};

export const calculateRecipeNutrition = async (
  ingredients: string
): Promise<{ carbohydrates: number; calories: number }> => {
  const ai = getAI();
  if (!ai) {
    throw new Error("Serviço de IA não configurado. Verifique se a chave de API (GEMINI_API_KEY) está definida.");
  }

  try {
    const prompt = `
      Analise esta lista de ingredientes de uma receita e estime o valor nutricional total.

      Ingredientes:
      ${ingredients}

      Sua tarefa é:
      1. Calcular a quantidade total de carboidratos (em gramas).
      2. Calcular a quantidade total de calorias (kcal).
      3. Retorne um objeto JSON com as chaves "carbohydrates" e "calories".

      Responda APENAS com o objeto JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
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

    const jsonText = response.text || "";
    const data = JSON.parse(jsonText);

    if (typeof data.carbohydrates !== 'number' || typeof data.calories !== 'number') {
      throw new Error("A resposta da IA não continha os dados esperados.");
    }

    return data;
  } catch (error: any) {
    throw handleGeminiError(error);
  }
};

export const evaluateMealsAgainstGoal = async (
  userProfile: UserProfile,
  meals: { name?: string; carbohydrates: number; sugars: number; proteins?: number; fats?: number; calories?: number }[]
): Promise<{ status: 'positive' | 'warning' | 'neutral'; scoreTitle: string; detailedFeedback: string; suggestedNextStep: string }> => {
  const ai = getAI();
  if (!ai) {
    throw new Error("Serviço de IA não configurado. Verifique se a chave de API (GEMINI_API_KEY) está definida.");
  }

  try {
    const totalCarbs = meals.reduce((acc, m) => acc + (m.carbohydrates || 0), 0);
    const totalSugars = meals.reduce((acc, m) => acc + (m.sugars || 0), 0);
    const totalProteins = meals.reduce((acc, m) => acc + (m.proteins || 0), 0);
    const totalFats = meals.reduce((acc, m) => acc + (m.fats || 0), 0);
    const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);

    const mealSummary = meals.map((m, i) => `${i + 1}. ${m.name || 'Refeição'}: ${m.carbohydrates}g carbs, ${m.sugars}g açúcares, ${m.proteins || 0}g proteína, ${m.fats || 0}g gordura, ${m.calories || 0} kcal`).join('\n');

    const bio = userProfile.bioimpedance;
    const bioText = bio ? `
      Avaliação de Bioimpedância (Acompanhada por Profissional):
      - Gordura Corporal: ${bio.bodyFatPercentage ? `${bio.bodyFatPercentage}%` : 'Não informado'}
      - Massa Magra/Muscular: ${bio.muscleMassKg ? `${bio.muscleMassKg} kg` : 'Não informado'}
      - Nível de Gordura Visceral: ${bio.visceralFatLevel || 'Não informado'}
      - Taxa Metabólica Basal (TMB): ${bio.basalMetabolicRateKcal ? `${bio.basalMetabolicRateKcal} kcal/dia` : 'Não informada'}
      - Água Corporal: ${bio.waterPercentage ? `${bio.waterPercentage}%` : 'Não informada'}
      - Profissional Responsável: ${bio.professionalName || 'Não especificado'}
      - Orientação/Notas do Profissional: ${bio.professionalNotes || 'Nenhuma nota informada.'}
    ` : 'Nenhum exame de bioimpedância cadastrado ainda.';

    const prompt = `
      Você é um nutricionista especialista em saúde metabólica, prevenção, composição corporal e controle glicêmico.
      Sua missão é avaliar a alimentação do dia do usuário com base nos seus dados físicos, exame de bioimpedância e objetivo pessoal.

      Perfil do Usuário:
      - Nome: ${userProfile.name}
      - Condição: ${userProfile.diabetesType}
      - Peso: ${userProfile.weightKg ? `${userProfile.weightKg} kg` : 'Não informado'}
      - Altura: ${userProfile.heightCm ? `${userProfile.heightCm} cm` : 'Não informada'}
      - Objetivo de Saúde Principal: ${userProfile.healthGoal || 'Prevenção e Alimentação Saudável'}
      ${bioText}

      Totais Consumidos Hoje:
      - Carboidratos: ${totalCarbs}g
      - Açúcares / Glicose: ${totalSugars}g
      - Proteínas: ${totalProteins}g
      - Gorduras: ${totalFats}g
      - Calorias: ${totalCalories} kcal

      Refeições registradas hoje:
      ${mealSummary || 'Nenhuma refeição detalhada ainda.'}

      Sua tarefa:
      1. Avaliar se o consumo atual aproxima ou afasta o usuário do seu objetivo (${userProfile.healthGoal || 'Prevenção'}) levando em conta também a Taxa Metabólica Basal (TMB), percentual de gordura e recomendações do profissional do usuário se presentes na bioimpedância.
      2. Determinar um 'status':
         - 'positive': Alimentação bem alinhada com o objetivo, TMB e controle glicêmico.
         - 'warning': Atenção requerida (ex: excesso de açúcares, pouca proteína em relação à massa magra, ou calorias incompatíveis com a TMB e objetivo).
         - 'neutral': Consumo moderado ou início do dia.
      3. Fornecer um 'scoreTitle' curto e impactante.
      4. Fornecer 'detailedFeedback' empático de 2 a 3 frases explicando de forma prática o impacto na glicose/composição corporal/objetivo e citando a bioimpedância ou dica do nutricionista se relevante.
      5. Fornecer 'suggestedNextStep' com uma dica prática para a próxima refeição ou resto do dia.

      Responda APENAS com o objeto JSON.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: ["positive", "warning", "neutral"] },
            scoreTitle: { type: Type.STRING },
            detailedFeedback: { type: Type.STRING },
            suggestedNextStep: { type: Type.STRING },
          },
          required: ["status", "scoreTitle", "detailedFeedback", "suggestedNextStep"]
        }
      }
    });

    const jsonText = response.text || "";
    return JSON.parse(jsonText);
  } catch (error: any) {
    throw handleGeminiError(error);
  }
};



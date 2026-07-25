
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, FoodAnalysisResult, GlucoseReading, MealLog, SmartMealSuggestionResult } from '../types';

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

export const estimateMealNutrientsFromDescriptionOrImage = async (
  userProfile?: UserProfile,
  description?: string,
  base64Image?: string,
  mimeType?: string
): Promise<{
  suggestedName: string;
  carbohydrates: number;
  sugars: number;
  proteins: number;
  fats: number;
  calories: number;
  explanation: string;
}> => {
  const ai = getAI();
  if (!ai) {
    throw new Error("Serviço de IA não configurado. Verifique se a chave de API (GEMINI_API_KEY) está definida.");
  }

  try {
    const contents: any[] = [];

    if (base64Image && mimeType) {
      contents.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      });
    }

    const promptText = `
      Você é um nutricionista especialista em cálculo de macronutrientes.
      Analise o prato/refeição fornecido ${base64Image ? 'pela foto do prato' : ''} ${description ? `e pela seguinte descrição detalhada de ingredientes, quantidades e modo de preparo: "${description}"` : ''}.

      Perfil do usuário: ${userProfile ? `${userProfile.diabetesType}, Objetivo: ${userProfile.healthGoal || 'Saúde'}` : 'Geral'}.

      Sua tarefa é calcular com a maior precisão possível:
      1. 'suggestedName': Um nome sucinto para a refeição (ex: "Frango Grelhado com Mandioca e Salada").
      2. 'carbohydrates': Estimativa total de carboidratos (em gramas).
      3. 'sugars': Estimativa de açúcares/glicose adicionada ou simples (em gramas).
      4. 'proteins': Estimativa de proteínas (em gramas).
      5. 'fats': Estimativa de gorduras totais, considerando óleos de preparo informados (em gramas).
      6. 'calories': Estimativa de calorias totais (kcal).
      7. 'explanation': Breve explicação (1 frase) sobre como o modo de preparo e os ingredientes influenciaram este cálculo.

      Responda APENAS com o objeto JSON.
    `;

    contents.push(promptText);

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedName: { type: Type.STRING },
            carbohydrates: { type: Type.NUMBER },
            sugars: { type: Type.NUMBER },
            proteins: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            calories: { type: Type.NUMBER },
            explanation: { type: Type.STRING },
          },
          required: ["suggestedName", "carbohydrates", "sugars", "proteins", "fats", "calories", "explanation"]
        }
      }
    });

    const jsonText = response.text || "";
    return JSON.parse(jsonText);
  } catch (error: any) {
    throw handleGeminiError(error);
  }
};

export const getSmartMealPairingSuggestions = async (
  userProfile: UserProfile,
  glucoseReadings: GlucoseReading[] = [],
  mealLogs: MealLog[] = []
): Promise<SmartMealSuggestionResult> => {
  const ai = getAI();
  if (!ai) {
    throw new Error("Serviço de IA não configurado. Verifique se a chave de API (GEMINI_API_KEY) está definida.");
  }

  try {
    const recentGlucose = glucoseReadings.slice(-10);
    const avgGlucose = recentGlucose.length > 0
      ? Math.round(recentGlucose.reduce((sum, r) => sum + r.value, 0) / recentGlucose.length)
      : null;

    const glucoseSummary = recentGlucose.length > 0
      ? `Últimas ${recentGlucose.length} medições de glicemia: Média ${avgGlucose} mg/dL (Faixa alvo: ${userProfile.glucoseTargetMin}-${userProfile.glucoseTargetMax} mg/dL). Leitura mais recente: ${recentGlucose[recentGlucose.length - 1].value} mg/dL.`
      : `Nenhuma medição recente de glicemia registrada. Meta do usuário: ${userProfile.glucoseTargetMin}-${userProfile.glucoseTargetMax} mg/dL.`;

    const recentMealsSummary = mealLogs.slice(-5).map((m, i) =>
      `${i + 1}. ${m.name || 'Refeição'}: ${m.carbohydrates}g carbs, ${m.sugars || 0}g açúcar, ${m.proteins || 0}g proteína`
    ).join('\n') || 'Nenhuma refeição registrada recentemente.';

    const prompt = `
      Você é um nutricionista especialista em diabetes, saúde metabólica e controle glicêmico.
      Sua tarefa é sugerir 3 combinações inteligentes de alimentos (healthy food pairings) personalizadas para o usuário.

      Perfil do Usuário:
      - Nome: ${userProfile.name}
      - Tipo de Diabetes: ${userProfile.diabetesType}
      - Objetivo de Saúde Principal: ${userProfile.healthGoal || 'Controle de Açúcar no Sangue e Prevenção'}
      - Histórico de Glicemia Recente: ${glucoseSummary}
      - Refeições Recentes:
      ${recentMealsSummary}

      Regras das Sugestões de Combinação Inteligente (Healthy Food Pairings):
      1. Combine alimentos de baixo índice glicêmico com fontes de proteínas magras, gorduras boas e fibras que lentificam a absorção dos carboidratos.
      2. Leve em consideração a tendência glicêmica recente (se a glicemia média está alta, favoreça mais fibras/proteínas e pouquíssimos carboidratos simples; se está na meta, sugira combinações equilibradas e saborosas).
      3. Forneça estimativas nutricionais realistas por porção sugerida (carbohydrates, sugars, proteins, fats, calories).
      4. Forneça uma justificativa clara 'pairingReason' explicando o porquê científico/prático desta combinação com base nas metas do usuário e tendências de glicemia.

      Responda APENAS com o objeto JSON contendo:
      - 'glucoseContextSummary': Resumo de 1 frase contextualizando a situação glicêmica do usuário e a estratégia adotada.
      - 'suggestions': Lista de 3 objetos com:
        - 'title': Nome atraente da combinação/refeição
        - 'description': Ingredientes detalhados e forma simples de montagem
        - 'carbohydrates': number (g)
        - 'sugars': number (g)
        - 'proteins': number (g)
        - 'fats': number (g)
        - 'calories': number (kcal)
        - 'pairingReason': string (Explicação empática e técnica de por que essa combinação é ideal)
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            glucoseContextSummary: { type: Type.STRING },
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  carbohydrates: { type: Type.NUMBER },
                  sugars: { type: Type.NUMBER },
                  proteins: { type: Type.NUMBER },
                  fats: { type: Type.NUMBER },
                  calories: { type: Type.NUMBER },
                  pairingReason: { type: Type.STRING },
                },
                required: ["title", "description", "carbohydrates", "sugars", "proteins", "fats", "calories", "pairingReason"]
              }
            }
          },
          required: ["glucoseContextSummary", "suggestions"]
        }
      }
    });

    const jsonText = response.text || "";
    return JSON.parse(jsonText) as SmartMealSuggestionResult;
  } catch (error: any) {
    throw handleGeminiError(error);
  }
};



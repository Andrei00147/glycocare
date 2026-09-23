import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import FirebaseAuthBar from './components/FirebaseAuthBar';
import SEOHead from './components/SEOHead';
import CookieConsentBanner from './components/CookieConsentBanner';
import Footer from './components/Footer';
import PricingPlansModal from './components/PricingPlansModal';
import {
  UserProfile,
  View,
  Recipe,
  Reminder,
  GlucoseReading,
  MealLog,
  WeightLog,
  PatientLink,
  ProfessionalPartner
} from './types';
import { User, auth } from './src/firebase';

// Lazy loaded views for code splitting & LCP bundle optimization
const Onboarding = lazy(() => import('./components/Onboarding'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Reports = lazy(() => import('./components/Reports'));
const StockManagement = lazy(() => import('./components/StockManagement'));
const CommunityRecipes = lazy(() => import('./components/CommunityRecipes'));
const Settings = lazy(() => import('./components/Settings'));
const Feedback = lazy(() => import('./components/Feedback'));
const PrivacyPolicyPage = lazy(() => import('./components/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./components/TermsOfServicePage'));
const CookiePolicyPage = lazy(() => import('./components/CookiePolicyPage'));
const AdminPartnerManagement = lazy(() => import('./components/AdminPartnerManagement'));
const ProfessionalPortal = lazy(() => import('./components/ProfessionalPortal'));

import {
  syncUserProfileToFirestore,
  fetchUserProfileFromFirestore,
  addGlucoseReadingToFirestore,
  fetchGlucoseReadingsFromFirestore,
  addMealLogToFirestore,
  deleteMealLogFromFirestore,
  fetchMealLogsFromFirestore,
  addWeightLogToFirestore,
  fetchWeightLogsFromFirestore,
  addRecipeToFirestore,
  fetchRecipesFromFirestore,
  clearUserDataFromFirestore,
  isUserSuperAdmin,
  fetchProfessionalPartners,
  fetchPatientLinkForUser,
  findPartnerByReferralCode,
  createOrUpdatePatientLink
} from './services/firestoreService';
import {
  loadUserProfile,
  saveUserProfile,
  loadGlucoseReadings,
  saveGlucoseReadings,
  loadRecipes,
  saveRecipes,
  loadMealLogs,
  saveMealLogs,
  loadWeightLogs,
  saveWeightLogs,
  clearAllData
} from './services/storageService';

const initialRecipes: Recipe[] = [
    {
        id: '1',
        title: 'Salada de Quinoa com Legumes Grelhados',
        author: 'Chef Ana',
        description: 'Uma salada leve, nutritiva e com baixo índice glicêmico, perfeita para um almoço saudável.',
        ingredients: '1 xícara de quinoa\n2 xícaras de água\n1 abobrinha em rodelas\n1 pimentão vermelho em tiras\n1/2 xícara de tomate cereja\nSuco de 1 limão\nAzeite, sal e pimenta a gosto',
        instructions: 'Cozinhe a quinoa na água e reserve. Grelhe os legumes com um fio de azeite. Misture tudo, tempere com limão, azeite, sal e pimenta.',
        carbohydrates: 35,
        calories: 280,
    },
    {
        id: '2',
        title: 'Omelete de Claras com Espinafre e Cogumelos',
        author: 'Nutri Carlos',
        description: 'Rica em proteínas e fibras, esta omelete é uma ótima opção para começar o dia com energia.',
        ingredients: '4 claras de ovo\n1 xícara de espinafre fresco\n1/2 xícara de cogumelos fatiados\n1 dente de alho picado\nSal e orégano a gosto',
        instructions: 'Refogue o alho, adicione os cogumelos e o espinafre. Em uma frigideira antiaderente, despeje as claras batidas e adicione o recheio. Cozinhe dos dois lados.',
        carbohydrates: 5,
        calories: 150,
    },
    {
        id: 'd1',
        title: 'Mousse de Abacate com Cacau',
        author: 'Nutri Saudável',
        description: 'Uma sobremesa cremosa, deliciosa e sem açúcar refinado. Rica em gorduras boas e antioxidantes.',
        ingredients: '1 abacate maduro\n2 colheres de sopa de cacau em pó 100%\n2 colheres de sopa de xilitol (ou outro adoçante)\n1/4 xícara de leite de amêndoas\nExtrato de baunilha a gosto',
        instructions: 'Bata todos os ingredientes no liquidificador ou processador até obter uma mistura homogênea e cremosa. Leve à geladeira por pelo menos 1 hora antes de servir.',
        carbohydrates: 15,
        calories: 250,
        externalLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    },
    {
        id: 'd2',
        title: 'Cheesecake de Limão Low-Carb',
        author: 'Doce Vida',
        description: 'A combinação perfeita de azedinho e doce, numa base crocante de amêndoas. Ideal para uma ocasião especial.',
        ingredients: 'Base: 1 xícara de farinha de amêndoas, 3 colheres de sopa de manteiga derretida, 1 colher de sopa de adoçante.\nRecheio: 300g de cream cheese, 1/2 xícara de adoçante, suco e raspas de 2 limões, 2 ovos.',
        instructions: 'Misture os ingredientes da base e forre uma forma. Asse por 10 min a 180°C. Bata o cream cheese com o adoçante, adicione os limões e os ovos. Despeje sobre a base e asse por mais 30 min. Refrigere antes de servir.',
        carbohydrates: 8,
        calories: 320,
    },
    {
        id: 'd3',
        title: 'Sorvete de Morango Caseiro (Sem Açúcar)',
        author: 'Chef Ana',
        description: 'Refrescante, natural e muito fácil de fazer. Apenas 3 ingredientes para um sorvete cremoso.',
        ingredients: '2 xícaras de morangos congelados\n1/2 lata de creme de leite light\nAdoçante a gosto (xilitol ou stevia)',
        instructions: 'Bata os morangos congelados no processador até virar um creme. Adicione o creme de leite e o adoçante e bata mais um pouco. Sirva imediatamente ou congele para mais firmeza.',
        carbohydrates: 12,
        calories: 180,
    },
    {
        id: 'd4',
        title: 'Brownie de Batata Doce',
        author: 'Nutri Carlos',
        description: 'Um brownie funcional, úmido e chocolatudo, que ninguém vai acreditar que o ingrediente secreto é batata doce.',
        ingredients: '1 xícara de purê de batata doce\n1/2 xícara de pasta de amendoim\n1/4 xícara de cacau em pó\n2 colheres de sopa de mel (ou agave)\n1 colher de chá de fermento',
        instructions: 'Misture todos os ingredientes até formar uma massa homogênea. Despeje em uma forma untada e asse em forno pré-aquecido a 180°C por cerca de 20 minutos.',
        carbohydrates: 25,
        calories: 220,
    },
    {
        id: 'd5',
        title: 'Beijinho de Colher Fit',
        author: 'Doce Vida',
        description: 'Aquele docinho clássico em uma versão saudável, com leite em pó e coco.',
        ingredients: '1 xícara de leite em pó desnatado\n1/2 xícara de água quente\n1/2 xícara de coco ralado sem açúcar\n2 colheres de sopa de adoçante culinário',
        instructions: 'Misture o leite em pó com a água quente até dissolver. Leve ao fogo baixo com o coco e o adoçante, mexendo sempre até engrossar e desgrudar do fundo da panela.',
        carbohydrates: 10,
        calories: 150,
    },
    {
        id: 'd6',
        title: 'Torta de Maçã com Canela (Base de Aveia)',
        author: 'Chef Ana',
        description: 'Uma torta rústica e cheia de sabor, com uma base nutritiva que substitui a farinha tradicional.',
        ingredients: 'Base: 1 xícara de aveia em flocos, 2 colheres de sopa de óleo de coco, 1 colher de sopa de mel.\nRecheio: 3 maçãs fatiadas, suco de 1/2 limão, canela em pó e adoçante a gosto.',
        instructions: 'Misture os ingredientes da base e forre uma forma. Disponha as maçãs fatiadas por cima, regue com o limão e polvilhe canela e adoçante. Asse por 25 minutos a 180°C.',
        carbohydrates: 30,
        calories: 190,
    },
    {
        id: 'd7',
        title: 'Pudim de Chia com Frutas Vermelhas',
        author: 'Nutri Saudável',
        description: 'Sobremesa ou café da manhã, este pudim é versátil, rico em fibras e ômega 3.',
        ingredients: '3 colheres de sopa de chia\n1 xícara de leite de coco\nAdoçante a gosto\nFrutas vermelhas para decorar',
        instructions: 'Misture a chia, o leite de coco e o adoçante. Deixe na geladeira por pelo menos 4 horas ou durante a noite para firmar. Sirva com frutas vermelhas por cima.',
        carbohydrates: 18,
        calories: 230,
    },
    {
        id: 'd8',
        title: 'Gelatina Colorida com Iogurte Natural',
        author: 'Doce Vida',
        description: 'Divertida, colorida e cheia de colágeno, usando gelatinas sem açúcar.',
        ingredients: '3 pacotes de gelatina zero açúcar (sabores diferentes)\n1 pote de iogurte natural desnatado\n1 envelope de gelatina incolor sem sabor',
        instructions: 'Prepare as gelatinas de sabores conforme embalagem e deixe firmar. Corte em cubos. Dissolva a gelatina incolor e bata com o iogurte. Misture tudo em uma forma e leve para gelar até firmar.',
        carbohydrates: 2,
        calories: 60,
    },
    {
        id: 'd9',
        title: 'Cookies de Banana com Aveia e Cacau',
        author: 'Nutri Carlos',
        description: 'Apenas 3 ingredientes para um cookie macio, nutritivo e sem adição de açúcares.',
        ingredients: '2 bananas maduras amassadas\n1 xícara de aveia em flocos finos\n2 colheres de sopa de cacau em pó 100%',
        instructions: 'Misture todos os ingredientes em uma tigela. Molde os cookies em uma assadeira untada ou com papel manteiga. Asse em forno pré-aquecido a 180°C por 15 a 20 minutos.',
        carbohydrates: 18,
        calories: 95,
    },
    {
        id: 'd10',
        title: 'Trufa Funcional de Cacau e Amêndoas',
        author: 'Chef Ana',
        description: 'O docinho perfeito para matar a vontade de chocolate com gorduras de alta qualidade.',
        ingredients: '1 xícara de tâmaras sem caroço hidratadas\n1/2 xícara de farinha de amêndoas\n2 colheres de sopa de cacau em pó\nCacau em pó para enrolar',
        instructions: 'Processe as tâmaras com a farinha de amêndoas e o cacau até formar uma massa modelável. Faça bolinhas e passe no cacau em pó. Mantenha na geladeira.',
        carbohydrates: 14,
        calories: 110,
    }
];

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [currentProfessionalPartner, setCurrentProfessionalPartner] = useState<ProfessionalPartner | null>(null);
  const [activePatientLink, setActivePatientLink] = useState<PatientLink | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    return loadUserProfile();
  });
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>(() => {
    return loadGlucoseReadings();
  });
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const loaded = loadRecipes();
    return loaded.length > 0 ? loaded : initialRecipes;
  });
  const [mealLogs, setMealLogs] = useState<MealLog[]>(() => {
    return loadMealLogs();
  });
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>(() => {
    const loaded = loadWeightLogs();
    if (loaded.length === 0 && userProfile?.weightKg) {
      return [{
        id: 'init-weight',
        weightKg: userProfile.weightKg,
        timestamp: new Date(),
        notes: 'Peso inicial'
      }];
    }
    return loaded;
  });

  const userProfileRef = React.useRef(userProfile);
  const glucoseReadingsRef = React.useRef(glucoseReadings);
  const mealLogsRef = React.useRef(mealLogs);
  const weightLogsRef = React.useRef(weightLogs);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    glucoseReadingsRef.current = glucoseReadings;
  }, [glucoseReadings]);

  useEffect(() => {
    mealLogsRef.current = mealLogs;
  }, [mealLogs]);

  useEffect(() => {
    weightLogsRef.current = weightLogs;
  }, [weightLogs]);

  const [currentView, setCurrentView] = useState<View>(() => {
    return loadUserProfile() ? View.Dashboard : View.Onboarding;
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Check URL query param for automatic referral code support (e.g. ?ref=NUTRI-JULIANA or ?ref_code=CRM-128492)
  useEffect(() => {
    const handleUrlReferral = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref') || urlParams.get('ref_code');
        if (refCode) {
          const partner = await findPartnerByReferralCode(refCode);
          if (partner) {
            const discountPercent = partner.role === 'Médico' ? 70 : 65;
            const monthlyPrice = partner.role === 'Médico' ? 10.50 : 12.25;

            handleUpdateProfile({
              referralCode: partner.referralCode,
              referredByProfessionalId: partner.id,
              referredByProfessionalName: partner.name,
              referredByProfessionalRole: partner.role,
              discountPercentage: discountPercent,
              monthlyPlanPrice: monthlyPrice
            });

            if (auth.currentUser) {
              const link: PatientLink = {
                id: `link-${auth.currentUser.uid}`,
                patientUid: auth.currentUser.uid,
                patientEmail: auth.currentUser.email || 'usuario@nutrisaudevital.com',
                patientName: userProfile?.name || 'Paciente',
                professionalUid: partner.assignedUid || '',
                professionalEmail: partner.email,
                professionalName: partner.name,
                professionalRole: partner.role,
                referralCode: partner.referralCode,
                discountPercentage: discountPercent,
                monthlyPriceBrl: monthlyPrice,
                status: 'active',
                linkedAt: new Date().toISOString()
              };
              await createOrUpdatePatientLink(link);
              setActivePatientLink(link);
            }
          }
        }
      } catch (err) {
        console.warn('Erro ao processar indicação via URL:', err);
      }
    };
    handleUrlReferral();
  }, []);

  // Sync with Firestore when user logs in & evaluate RBAC roles
  const handleUserChanged = useCallback(async (user: User | null) => {
    setCurrentUser(user);
    if (!user) {
      setIsSuperAdminUser(false);
      setCurrentProfessionalPartner(null);
      setActivePatientLink(null);
      return;
    }

    try {
      // 0. RBAC Evaluation: SuperAdmin & Professional detection
      const isSuper = isUserSuperAdmin(user.email);
      setIsSuperAdminUser(isSuper);

      // Check if user is an approved professional partner
      const allPartners = await fetchProfessionalPartners();
      const matchedPartner = allPartners.find(
        p => p.email.trim().toLowerCase() === (user.email || '').trim().toLowerCase() && p.active
      );
      setCurrentProfessionalPartner(matchedPartner || null);

      // Check if user has an active patient link
      const patientLink = await fetchPatientLinkForUser(user.uid);
      setActivePatientLink(patientLink);

      // 1. User Profile Sync
      const remoteProfile = await fetchUserProfileFromFirestore(user.uid);
      if (remoteProfile) {
        setUserProfile(remoteProfile);
        saveUserProfile(remoteProfile);
      } else if (userProfileRef.current) {
        await syncUserProfileToFirestore(user.uid, userProfileRef.current);
      }

      // 2. Glucose Readings Sync
      const remoteGlucose = await fetchGlucoseReadingsFromFirestore(user.uid);
      if (remoteGlucose && remoteGlucose.length > 0) {
        setGlucoseReadings(remoteGlucose);
        saveGlucoseReadings(remoteGlucose);
      } else if (glucoseReadingsRef.current.length > 0) {
        for (const reading of glucoseReadingsRef.current) {
          await addGlucoseReadingToFirestore(user.uid, reading);
        }
      }

      // 3. Meal Logs Sync
      const remoteMeals = await fetchMealLogsFromFirestore(user.uid);
      if (remoteMeals && remoteMeals.length > 0) {
        setMealLogs(remoteMeals);
        saveMealLogs(remoteMeals);
      } else if (mealLogsRef.current.length > 0) {
        for (const meal of mealLogsRef.current) {
          await addMealLogToFirestore(user.uid, meal);
        }
      }

      // 4. Weight Logs Sync
      const remoteWeights = await fetchWeightLogsFromFirestore(user.uid);
      if (remoteWeights && remoteWeights.length > 0) {
        setWeightLogs(remoteWeights);
        saveWeightLogs(remoteWeights);
      } else if (weightLogsRef.current.length > 0) {
        for (const weight of weightLogsRef.current) {
          await addWeightLogToFirestore(user.uid, weight);
        }
      }

      // 5. Recipes Sync
      const remoteRecipes = await fetchRecipesFromFirestore();
      if (remoteRecipes && remoteRecipes.length > 0) {
        setRecipes(remoteRecipes);
      }
    } catch (err) {
      console.error("Firestore sync error:", err);
    }
  }, []);

  // Sync state to local storage database
  useEffect(() => {
    saveUserProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    saveGlucoseReadings(glucoseReadings);
  }, [glucoseReadings]);

  useEffect(() => {
    saveRecipes(recipes);
  }, [recipes]);

  useEffect(() => {
    saveMealLogs(mealLogs);
  }, [mealLogs]);

  useEffect(() => {
    saveWeightLogs(weightLogs);
  }, [weightLogs]);

  const toggleTheme = () => {
      setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleOnboardingComplete = useCallback((profile: UserProfile, initialGlucose?: GlucoseReading) => {
    setUserProfile(profile);
    saveUserProfile(profile);
    if (initialGlucose) {
      setGlucoseReadings([initialGlucose]);
      if (currentUser) {
        addGlucoseReadingToFirestore(currentUser.uid, initialGlucose);
      }
    }
    if (currentUser) {
      syncUserProfileToFirestore(currentUser.uid, profile);
    }
    setCurrentView(View.Dashboard);
  }, [currentUser]);
  
  const handleUpdateProfile = useCallback((updatedProfile: Partial<UserProfile>) => {
    setUserProfile(prev => {
      const next = prev ? { ...prev, ...updatedProfile } : null;
      if (next) {
        saveUserProfile(next);
      }
      if (auth.currentUser && next) {
        syncUserProfileToFirestore(auth.currentUser.uid, next);
      }
      return next;
    });
  }, []);
  
  const handleAddGlucoseReading = (value: number, timestamp: Date) => {
    const newReading: GlucoseReading = { value, timestamp };
    setGlucoseReadings(prev => [...prev, newReading].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
    if (currentUser) {
      addGlucoseReadingToFirestore(currentUser.uid, newReading);
    }
  };

  const handleAddWeightLog = (weightKg: number, notes?: string) => {
    const newLog: WeightLog = {
      id: String(Date.now()),
      weightKg,
      timestamp: new Date(),
      notes
    };
    setWeightLogs(prev => [...prev, newLog].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
    if (userProfile) {
      handleUpdateProfile({ weightKg });
    }
    if (currentUser) {
      addWeightLogToFirestore(currentUser.uid, newLog);
    }
  };

  const handleAddMealLog = (carbohydrates: number, sugars: number, name?: string, proteins?: number, fats?: number, calories?: number) => {
    const newLog: MealLog = {
      id: String(Date.now()),
      name: name || 'Refeição Registrada',
      carbohydrates,
      sugars,
      proteins: proteins || 0,
      fats: fats || 0,
      calories: calories || 0,
      timestamp: new Date()
    };
    setMealLogs(prev => [...prev, newLog]);
    if (currentUser) {
      addMealLogToFirestore(currentUser.uid, newLog);
    }
  };

  const handleRemoveMealLog = (id: string, reason?: string) => {
    const finalReason = reason && reason.trim() ? reason.trim() : 'Excluído pelo usuário sem justificativa especificada';
    setMealLogs(prev => prev.map(m => {
      if (m.id === id) {
        return {
          ...m,
          isDeleted: true,
          deletionReason: finalReason,
          deletedAt: new Date()
        };
      }
      return m;
    }));

    if (currentUser) {
      const target = mealLogs.find(m => m.id === id);
      if (target) {
        addMealLogToFirestore(currentUser.uid, {
          ...target,
          isDeleted: true,
          deletionReason: finalReason,
          deletedAt: new Date()
        });
      }
    }
  };

  const handleAddRecipe = (newRecipeData: Omit<Recipe, 'id' | 'author'>) => {
    if (!userProfile) return;
    const newRecipe: Recipe = {
      ...newRecipeData,
      id: new Date().toISOString(),
      author: userProfile.name,
    };
    setRecipes(prev => [newRecipe, ...prev]);
    if (currentUser) {
      addRecipeToFirestore(currentUser.uid, newRecipe);
    }
  };

  const handleRestoreData = (data: { userProfile: UserProfile | null; glucoseReadings: GlucoseReading[]; recipes: Recipe[]; mealLogs?: MealLog[]; weightLogs?: WeightLog[] }) => {
    if (data.userProfile) {
      setUserProfile(data.userProfile);
      if (currentUser) syncUserProfileToFirestore(currentUser.uid, data.userProfile);
    }
    if (data.glucoseReadings) setGlucoseReadings(data.glucoseReadings);
    if (data.recipes) setRecipes(data.recipes);
    if (data.mealLogs) setMealLogs(data.mealLogs);
    if (data.weightLogs) setWeightLogs(data.weightLogs);
  };

  const handleResetData = async () => {
    if (currentUser) {
      await clearUserDataFromFirestore(currentUser.uid);
    }
    clearAllData();
    setUserProfile(null);
    setGlucoseReadings([]);
    setRecipes(initialRecipes);
    setMealLogs([]);
    setWeightLogs([]);
    setCurrentView(View.Onboarding);
  };

  const [forceOpenCookieModal, setForceOpenCookieModal] = useState(false);

  const navigateTo = (view: View) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderView = () => {
    switch (currentView) {
      case View.Onboarding:
        return (
          <Onboarding
            initialProfile={userProfile}
            onComplete={handleOnboardingComplete}
            onCancel={userProfile ? () => navigateTo(View.Dashboard) : undefined}
          />
        );
      case View.Dashboard:
        return userProfile ? (
          <Dashboard
            userProfile={userProfile}
            updateUserProfile={handleUpdateProfile}
            navigateTo={navigateTo}
            glucoseReadings={glucoseReadings}
            onAddGlucoseReading={handleAddGlucoseReading}
            mealLogs={mealLogs}
            onAddMealLog={handleAddMealLog}
            onRemoveMealLog={handleRemoveMealLog}
            weightLogs={weightLogs}
            onAddWeightLog={handleAddWeightLog}
            theme={theme}
            toggleTheme={toggleTheme}
            activePatientLink={activePatientLink}
            onOpenPricingModal={() => setIsPricingModalOpen(true)}
          />
        ) : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.Reports:
         return userProfile ? (
           <Reports
             userProfile={userProfile}
             glucoseReadings={glucoseReadings}
             mealLogs={mealLogs}
             weightLogs={weightLogs}
             onAddWeightLog={handleAddWeightLog}
             onBack={() => navigateTo(View.Dashboard)}
           />
         ) : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.StockManagement:
        return userProfile ? <StockManagement userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onBack={() => navigateTo(View.Dashboard)} /> : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.CommunityRecipes:
        return userProfile ? <CommunityRecipes userProfile={userProfile} recipes={recipes} onAddRecipe={handleAddRecipe} onBack={() => navigateTo(View.Dashboard)} /> : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.Settings:
        return userProfile ? (
          <Settings
            userProfile={userProfile}
            glucoseReadings={glucoseReadings}
            recipes={recipes}
            onUpdateProfile={handleUpdateProfile}
            onBack={() => navigateTo(View.Dashboard)}
            navigateTo={navigateTo}
            onRestoreData={handleRestoreData}
            onResetData={handleResetData}
          />
        ) : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.AdminPartners:
        return (
          <AdminPartnerManagement
            onBack={() => navigateTo(View.Dashboard)}
            navigateTo={navigateTo}
            onSelectPartnerForPortal={(partner) => {
              setCurrentProfessionalPartner(partner);
              navigateTo(View.ProfessionalPortal);
            }}
          />
        );
      case View.ProfessionalPortal:
        return (
          <ProfessionalPortal
            onBack={() => navigateTo(View.Dashboard)}
            navigateTo={navigateTo}
            currentProfessionalPartner={currentProfessionalPartner}
          />
        );
      case View.Feedback:
        return <Feedback onBack={() => navigateTo(View.Dashboard)} />;
      case View.PrivacyPolicy:
        return <PrivacyPolicyPage onBack={() => navigateTo(userProfile ? View.Dashboard : View.Onboarding)} />;
      case View.TermsOfService:
        return <TermsOfServicePage onBack={() => navigateTo(userProfile ? View.Dashboard : View.Onboarding)} />;
      case View.CookiePolicy:
        return (
          <CookiePolicyPage
            onBack={() => navigateTo(userProfile ? View.Dashboard : View.Onboarding)}
            onOpenPreferences={() => setForceOpenCookieModal(true)}
          />
        );
      default:
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }
  };

const ViewLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center" id="view-loading-fallback">
    <div className="relative w-16 h-16 mb-4">
      <div className="absolute inset-0 rounded-full border-4 border-teal-200 dark:border-teal-900 animate-ping opacity-25"></div>
      <div className="w-16 h-16 rounded-full border-4 border-teal-600 dark:border-teal-400 border-t-transparent animate-spin"></div>
    </div>
    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 animate-pulse">
      Carregando experiência em saúde...
    </p>
  </div>
);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200 flex flex-col">
      <SEOHead />
      <FirebaseAuthBar onUserChanged={handleUserChanged} />

      {/* Role Navigation Bar for SuperAdmin / Healthcare Specialist / Active Referral */}
      {(isSuperAdminUser || currentProfessionalPartner || activePatientLink) && (
        <div className="bg-gradient-to-r from-gray-900 via-teal-950 to-gray-900 text-white px-4 py-2 text-xs border-b border-teal-800/40 shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {isSuperAdminUser ? (
                <span className="bg-amber-400 text-amber-950 font-black px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
                  SuperAdmin Ativo
                </span>
              ) : currentProfessionalPartner ? (
                <span className="bg-teal-400 text-teal-950 font-black px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
                  {currentProfessionalPartner.role} Credenciado
                </span>
              ) : (
                <span className="bg-emerald-400 text-emerald-950 font-black px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">
                  Paciente Vinculado
                </span>
              )}

              <span className="text-gray-300">
                {isSuperAdminUser
                  ? 'Você possui autoridade total para homologar nutricionistas e médicos parceiros.'
                  : currentProfessionalPartner
                  ? `Painel de consultório: ${currentProfessionalPartner.name} (${currentProfessionalPartner.referralCode})`
                  : `Acompanhamento exclusivo ativo com ${activePatientLink?.professionalName} (${activePatientLink?.discountPercentage}% OFF)`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isSuperAdminUser && (
                <>
                  <button
                    onClick={() => navigateTo(View.AdminPartners)}
                    className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold px-3 py-1 rounded-lg text-xs transition shadow-sm flex items-center gap-1.5"
                  >
                    <i className="fas fa-user-shield"></i>
                    Gestão de Parceiros
                  </button>
                  <button
                    onClick={() => navigateTo(View.ProfessionalPortal)}
                    className="bg-teal-500 hover:bg-teal-600 text-teal-950 font-bold px-3 py-1 rounded-lg text-xs transition shadow-sm flex items-center gap-1.5"
                  >
                    <i className="fas fa-stethoscope"></i>
                    Painel Clínico (Nutricionista)
                  </button>
                </>
              )}

              {currentProfessionalPartner && (
                <button
                  onClick={() => navigateTo(View.ProfessionalPortal)}
                  className="bg-teal-500 hover:bg-teal-600 text-teal-950 font-bold px-3 py-1 rounded-lg text-xs transition shadow-sm flex items-center gap-1.5"
                >
                  <i className="fas fa-user-doctor"></i>
                  Portal do Profissional (Pacientes)
                </button>
              )}

              {activePatientLink && (
                <button
                  onClick={() => setIsPricingModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-xs transition shadow-sm flex items-center gap-1"
                >
                  <i className="fas fa-tags"></i>
                  Ver Plano (65%-70% OFF)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1">
        <Suspense fallback={<ViewLoadingFallback />}>
          {renderView()}
        </Suspense>
      </div>

      <Footer
        onNavigate={navigateTo}
        onOpenCookiePreferences={() => setForceOpenCookieModal(true)}
      />

      <CookieConsentBanner
        forceOpenModal={forceOpenCookieModal}
        onModalClose={() => setForceOpenCookieModal(false)}
      />

      {/* Pricing & Referral Code Modal */}
      {userProfile && (
        <PricingPlansModal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          userProfile={userProfile}
          updateUserProfile={handleUpdateProfile}
          activePatientLink={activePatientLink}
          onLinkUpdated={async () => {
            if (currentUser) {
              const link = await fetchPatientLinkForUser(currentUser.uid);
              setActivePatientLink(link);
            }
          }}
        />
      )}
    </div>
  );
};

export default App;

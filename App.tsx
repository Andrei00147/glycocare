import React, { useState, useCallback, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Reports from './components/Reports';
import StockManagement from './components/StockManagement';
import CommunityRecipes from './components/CommunityRecipes';
import Settings from './components/Settings';
import Feedback from './components/Feedback';
import { UserProfile, View, Recipe, Reminder, GlucoseReading } from './types';

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
        title: 'Cookies de Amendoim',
        author: 'Nutri Carlos',
        description: 'Cookies macios com apenas 3 ingredientes. Perfeitos para um lanche rápido e sem culpa.',
        ingredients: '1 xícara de pasta de amendoim integral\n1 ovo\n1/2 xícara de adoçante (xilitol)',
        instructions: 'Misture todos os ingredientes até formar uma massa. Faça bolinhas, achate com um garfo e coloque em uma forma untada. Asse a 180°C por 12-15 minutos.',
        carbohydrates: 7,
        calories: 160,
    },
     {
        id: 'd9',
        title: 'Bolo de Cenoura de Caneca',
        author: 'Doce Vida',
        description: 'Mate a vontade de bolo de cenoura em 2 minutos com esta receita prática de micro-ondas.',
        ingredients: '1 ovo\n4 colheres de sopa de leite\n3 colheres de sopa de óleo\n2 colheres de sopa de adoçante\n4 colheres de sopa de farinha de aveia\n1 cenoura pequena ralada\n1/2 colher de chá de fermento',
        instructions: 'Misture todos os ingredientes em uma caneca grande. Leve ao micro-ondas em potência máxima por cerca de 2 a 3 minutos, ou até firmar. Sirva com calda de chocolate amargo se desejar.',
        carbohydrates: 22,
        calories: 280,
    },
     {
        id: 'd10',
        title: 'Bombom de Morango na Travessa',
        author: 'Chef Ana',
        description: 'Uma sobremesa incrível que combina o azedinho do morango com um creme branco suave e cobertura de chocolate.',
        ingredients: 'Creme: 1 lata de leite condensado fake (receita na internet), 1 colher de sopa de amido de milho, 1/2 xícara de leite.\n1 caixa de morangos picados.\nGanache: 100g de chocolate 70% cacau, 1/2 caixa de creme de leite.',
        instructions: 'Leve os ingredientes do creme ao fogo baixo, mexendo até engrossar. Despeje em uma travessa e cubra com os morangos. Derreta o chocolate com o creme de leite e espalhe por cima. Leve à geladeira.',
        carbohydrates: 28,
        calories: 310,
    }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Onboarding);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
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

  const toggleTheme = () => {
      setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const handleOnboardingComplete = useCallback((profile: UserProfile, initialGlucose?: GlucoseReading) => {
    setUserProfile(profile);
    if (initialGlucose) {
      setGlucoseReadings([initialGlucose]);
    }
    setCurrentView(View.Dashboard);
  }, []);
  
  const handleUpdateProfile = (updatedProfile: Partial<UserProfile>) => {
    setUserProfile(prev => prev ? { ...prev, ...updatedProfile } : null);
  };
  
  const handleAddGlucoseReading = (value: number, timestamp: Date) => {
    const newReading: GlucoseReading = { value, timestamp };
    setGlucoseReadings(prev => [...prev, newReading].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
  };

  const handleAddRecipe = (newRecipeData: Omit<Recipe, 'id' | 'author'>) => {
    if (!userProfile) return;
    const newRecipe: Recipe = {
      ...newRecipeData,
      id: new Date().toISOString(),
      author: userProfile.name,
    };
    setRecipes(prev => [newRecipe, ...prev]);
  };

  const navigateTo = (view: View) => {
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case View.Onboarding:
        return <Onboarding onComplete={handleOnboardingComplete} />;
      case View.Dashboard:
        return userProfile ? <Dashboard userProfile={userProfile} updateUserProfile={handleUpdateProfile} navigateTo={navigateTo} glucoseReadings={glucoseReadings} onAddGlucoseReading={handleAddGlucoseReading} theme={theme} toggleTheme={toggleTheme} /> : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.Reports:
         return userProfile ? <Reports userProfile={userProfile} glucoseReadings={glucoseReadings} onBack={() => navigateTo(View.Dashboard)} /> : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.StockManagement:
        return userProfile ? <StockManagement userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onBack={() => navigateTo(View.Dashboard)} /> : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.CommunityRecipes:
        return userProfile ? <CommunityRecipes userProfile={userProfile} recipes={recipes} onAddRecipe={handleAddRecipe} onBack={() => navigateTo(View.Dashboard)} /> : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.Settings:
        return userProfile ? <Settings userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onBack={() => navigateTo(View.Dashboard)} navigateTo={navigateTo} /> : <Onboarding onComplete={handleOnboardingComplete} />;
      case View.Feedback:
        return <Feedback onBack={() => navigateTo(View.Dashboard)} />;
      default:
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
      {renderView()}
    </div>
  );
};

export default App;
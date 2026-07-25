import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, GlucoseReading, MealLog, WeightLog } from '../types';

interface ReportsProps {
  userProfile: UserProfile;
  glucoseReadings: GlucoseReading[];
  mealLogs?: MealLog[];
  weightLogs?: WeightLog[];
  onAddWeightLog?: (weightKg: number, notes?: string) => void;
  onBack: () => void;
}

export const Reports: React.FC<ReportsProps> = ({
  userProfile,
  glucoseReadings,
  mealLogs = [],
  weightLogs = [],
  onAddWeightLog,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<number>(7); // 7 (semanal), 15, or 30 days
  const [showAddWeightModal, setShowAddWeightModal] = useState(false);
  const [newWeight, setNewWeight] = useState<string>('');
  const [newWeightNotes, setNewWeightNotes] = useState<string>('');

  const glucoseChartRef = useRef<HTMLCanvasElement>(null);
  const weightChartRef = useRef<HTMLCanvasElement>(null);
  const nutritionChartRef = useRef<HTMLCanvasElement>(null);
  const weeklyComparisonChartRef = useRef<HTMLCanvasElement>(null);

  const glucoseChartInstance = useRef<any>(null);
  const weightChartInstance = useRef<any>(null);
  const nutritionChartInstance = useRef<any>(null);
  const weeklyComparisonChartInstance = useRef<any>(null);

  // Filter glucose readings by selected period
  const filteredGlucose = useMemo(() => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - filterPeriod);
    startDate.setHours(0, 0, 0, 0);

    return glucoseReadings.filter(r => new Date(r.timestamp) >= startDate);
  }, [filterPeriod, glucoseReadings]);

  // Filter meal logs by selected period
  const filteredMeals = useMemo(() => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - filterPeriod);
    startDate.setHours(0, 0, 0, 0);

    return mealLogs.filter(m => new Date(m.timestamp) >= startDate);
  }, [filterPeriod, mealLogs]);

  // Filter weight logs by selected period
  const filteredWeight = useMemo(() => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - filterPeriod);
    startDate.setHours(0, 0, 0, 0);

    const sorted = [...weightLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return sorted.filter(w => new Date(w.timestamp) >= startDate);
  }, [filterPeriod, weightLogs]);

  // Glucose Statistics
  const averageGlucose = useMemo(() => {
    if (filteredGlucose.length === 0) return 0;
    const sum = filteredGlucose.reduce((acc, curr) => acc + curr.value, 0);
    return Math.round(sum / filteredGlucose.length);
  }, [filteredGlucose]);

  const glucoseDistribution = useMemo(() => {
    const dist = { low: 0, normal: 0, high: 0 };
    filteredGlucose.forEach(r => {
      if (r.value < userProfile.glucoseTargetMin) dist.low++;
      else if (r.value > userProfile.glucoseTargetMax) dist.high++;
      else dist.normal++;
    });
    return dist;
  }, [filteredGlucose, userProfile.glucoseTargetMin, userProfile.glucoseTargetMax]);

  // Nutrition Statistics
  const nutritionTotals = useMemo(() => {
    let carbs = 0;
    let sugars = 0;
    let proteins = 0;
    let fats = 0;
    let calories = 0;

    filteredMeals.forEach(m => {
      carbs += m.carbohydrates || 0;
      sugars += m.sugars || 0;
      proteins += m.proteins || 0;
      fats += m.fats || 0;
      calories += m.calories || 0;
    });

    const daysCount = Math.max(1, filterPeriod);
    return {
      totalMeals: filteredMeals.length,
      totalCarbs: Math.round(carbs),
      totalSugars: Math.round(sugars),
      totalProteins: Math.round(proteins),
      totalFats: Math.round(fats),
      totalCalories: Math.round(calories),
      avgDailyCarbs: Math.round(carbs / daysCount),
      avgDailySugars: Math.round(sugars / daysCount),
      avgDailyCalories: Math.round(calories / daysCount),
    };
  }, [filteredMeals, filterPeriod]);

  // Weight Statistics
  const weightStats = useMemo(() => {
    const currentWeight = filteredWeight.length > 0 
      ? filteredWeight[filteredWeight.length - 1].weightKg 
      : (userProfile.weightKg || 0);

    const initialWeightInPeriod = filteredWeight.length > 0 
      ? filteredWeight[0].weightKg 
      : currentWeight;

    const delta = currentWeight - initialWeightInPeriod;

    return {
      currentWeight,
      initialWeightInPeriod,
      delta: Number(delta.toFixed(1)),
      readingsCount: filteredWeight.length
    };
  }, [filteredWeight, userProfile.weightKg]);

  // Weekly Health Report Comparison (Current Week vs Previous Week)
  const weeklyComparisonStats = useMemo(() => {
    const now = new Date();

    const startCurr = new Date(now);
    startCurr.setDate(startCurr.getDate() - 7);
    startCurr.setHours(0, 0, 0, 0);

    const startPrev = new Date(startCurr);
    startPrev.setDate(startPrev.getDate() - 7);
    startPrev.setHours(0, 0, 0, 0);

    // Glucose Comparisons
    const currGlucose = glucoseReadings.filter(r => {
      const d = new Date(r.timestamp);
      return d >= startCurr;
    });
    const prevGlucose = glucoseReadings.filter(r => {
      const d = new Date(r.timestamp);
      return d >= startPrev && d < startCurr;
    });

    const currGlucoseAvg = currGlucose.length > 0
      ? Math.round(currGlucose.reduce((acc, r) => acc + r.value, 0) / currGlucose.length)
      : 0;
    const prevGlucoseAvg = prevGlucose.length > 0
      ? Math.round(prevGlucose.reduce((acc, r) => acc + r.value, 0) / prevGlucose.length)
      : 0;

    // Caloric Intake Comparisons (Daily Avg in Kcal)
    const currMeals = mealLogs.filter(m => {
      const d = new Date(m.timestamp);
      return d >= startCurr;
    });
    const prevMeals = mealLogs.filter(m => {
      const d = new Date(m.timestamp);
      return d >= startPrev && d < startCurr;
    });

    const currCalTotal = currMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const prevCalTotal = prevMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

    const currCalAvg = Math.round(currCalTotal / 7);
    const prevCalAvg = Math.round(prevCalTotal / 7);

    // Weight Comparisons
    const currWeightList = weightLogs.filter(w => {
      const d = new Date(w.timestamp);
      return d >= startCurr;
    });
    const prevWeightList = weightLogs.filter(w => {
      const d = new Date(w.timestamp);
      return d >= startPrev && d < startCurr;
    });

    const defaultWeight = userProfile.weightKg || 70;

    const currWeightAvg = currWeightList.length > 0
      ? Number((currWeightList.reduce((acc, w) => acc + w.weightKg, 0) / currWeightList.length).toFixed(1))
      : defaultWeight;

    const prevWeightAvg = prevWeightList.length > 0
      ? Number((prevWeightList.reduce((acc, w) => acc + w.weightKg, 0) / prevWeightList.length).toFixed(1))
      : (currWeightList.length > 0 ? currWeightList[0].weightKg : defaultWeight);

    const glucoseDelta = currGlucoseAvg - prevGlucoseAvg;
    const caloriesDelta = currCalAvg - prevCalAvg;
    const weightDelta = Number((currWeightAvg - prevWeightAvg).toFixed(1));

    return {
      currGlucoseAvg,
      prevGlucoseAvg,
      glucoseDelta,
      currCalAvg,
      prevCalAvg,
      caloriesDelta,
      currWeightAvg,
      prevWeightAvg,
      weightDelta
    };
  }, [glucoseReadings, mealLogs, weightLogs, userProfile.weightKg]);

  // Render Charts with Chart.js
  useEffect(() => {
    if (!(window as any).Chart) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const textColor = isDarkMode ? '#E5E7EB' : '#374151';

    // 1. Glucose Trend Chart
    if (glucoseChartRef.current) {
      if (glucoseChartInstance.current) glucoseChartInstance.current.destroy();
      const ctx = glucoseChartRef.current.getContext('2d');
      if (ctx && filteredGlucose.length > 0) {
        const labels = filteredGlucose.map(r => new Date(r.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
        const data = filteredGlucose.map(r => r.value);
        const pointColors = data.map(val => {
          if (val > userProfile.glucoseTargetMax) return '#EF4444'; // Red
          if (val < userProfile.glucoseTargetMin) return '#3B82F6'; // Blue
          return '#10B981'; // Green
        });

        glucoseChartInstance.current = new (window as any).Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Glicemia (mg/dL)',
              data,
              borderColor: '#0D9488',
              backgroundColor: 'rgba(13, 148, 136, 0.1)',
              pointBackgroundColor: pointColors,
              pointBorderColor: pointColors,
              pointRadius: 5,
              tension: 0.2,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                title: { display: true, text: 'Glicemia (mg/dL)', color: textColor },
                grid: { color: gridColor },
                ticks: { color: textColor }
              },
              x: {
                grid: { color: gridColor },
                ticks: { color: textColor }
              }
            }
          }
        });
      }
    }

    // 2. Weight Trend Chart
    if (weightChartRef.current) {
      if (weightChartInstance.current) weightChartInstance.current.destroy();
      const ctx = weightChartRef.current.getContext('2d');
      if (ctx && filteredWeight.length > 0) {
        const labels = filteredWeight.map(w => new Date(w.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
        const data = filteredWeight.map(w => w.weightKg);

        weightChartInstance.current = new (window as any).Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Peso (kg)',
              data,
              borderColor: '#8B5CF6',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              pointBackgroundColor: '#7C3AED',
              pointRadius: 6,
              tension: 0.2,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                title: { display: true, text: 'Peso (kg)', color: textColor },
                grid: { color: gridColor },
                ticks: { color: textColor }
              },
              x: {
                grid: { color: gridColor },
                ticks: { color: textColor }
              }
            }
          }
        });
      }
    }

    // 3. Nutrition & Macro Chart
    if (nutritionChartRef.current) {
      if (nutritionChartInstance.current) nutritionChartInstance.current.destroy();
      const ctx = nutritionChartRef.current.getContext('2d');
      if (ctx && filteredMeals.length > 0) {
        // Group carbs and calories by meal or top 10 recent meals
        const recentMeals = [...filteredMeals].slice(-8);
        const labels = recentMeals.map(m => m.name ? (m.name.length > 15 ? m.name.substring(0, 15) + '...' : m.name) : 'Refeição');
        const carbsData = recentMeals.map(m => m.carbohydrates || 0);
        const caloriesData = recentMeals.map(m => m.calories || 0);

        nutritionChartInstance.current = new (window as any).Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Carboidratos (g)',
                data: carbsData,
                backgroundColor: '#F97316',
                borderRadius: 6,
              },
              {
                label: 'Calorias (kcal)',
                data: caloriesData,
                backgroundColor: '#3B82F6',
                borderRadius: 6,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: true, labels: { color: textColor } }
            },
            scales: {
              y: {
                grid: { color: gridColor },
                ticks: { color: textColor }
              },
              x: {
                grid: { color: gridColor },
                ticks: { color: textColor }
              }
            }
          }
        });
      }
    }

    // 4. Weekly Health Report Comparative Bar Chart
    if (weeklyComparisonChartRef.current) {
      if (weeklyComparisonChartInstance.current) weeklyComparisonChartInstance.current.destroy();
      const ctx = weeklyComparisonChartRef.current.getContext('2d');
      if (ctx) {
        weeklyComparisonChartInstance.current = new (window as any).Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Glicemia Média (mg/dL)', 'Calorias Diárias (kcal)', 'Peso Médio (kg)'],
            datasets: [
              {
                label: 'Esta Semana (Últimos 7 dias)',
                data: [
                  weeklyComparisonStats.currGlucoseAvg,
                  weeklyComparisonStats.currCalAvg,
                  weeklyComparisonStats.currWeightAvg
                ],
                backgroundColor: '#0D9488', // Teal
                borderColor: '#0F766E',
                borderWidth: 1,
                borderRadius: 8,
              },
              {
                label: 'Semana Anterior (Dias 8-14)',
                data: [
                  weeklyComparisonStats.prevGlucoseAvg,
                  weeklyComparisonStats.prevCalAvg,
                  weeklyComparisonStats.prevWeightAvg
                ],
                backgroundColor: '#94A3B8', // Slate Gray
                borderColor: '#64748B',
                borderWidth: 1,
                borderRadius: 8,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
                labels: { color: textColor, font: { weight: 'bold', size: 12 } }
              },
              tooltip: {
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                titleColor: isDarkMode ? '#F3F4F6' : '#111827',
                bodyColor: isDarkMode ? '#E5E7EB' : '#374151',
                borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                borderWidth: 1,
                padding: 10,
                callbacks: {
                  label: function (context: any) {
                    const label = context.dataset.label || '';
                    const val = context.parsed.y;
                    const idx = context.dataIndex;
                    const units = ['mg/dL', 'kcal/dia', 'kg'];
                    return ` ${label}: ${val} ${units[idx] || ''}`;
                  }
                }
              }
            },
            scales: {
              y: {
                grid: { color: gridColor },
                ticks: { color: textColor }
              },
              x: {
                grid: { color: gridColor },
                ticks: { color: textColor, font: { weight: 'bold', size: 11 } }
              }
            }
          }
        });
      }
    }

    return () => {
      if (glucoseChartInstance.current) glucoseChartInstance.current.destroy();
      if (weightChartInstance.current) weightChartInstance.current.destroy();
      if (nutritionChartInstance.current) nutritionChartInstance.current.destroy();
      if (weeklyComparisonChartInstance.current) weeklyComparisonChartInstance.current.destroy();
    };
  }, [filteredGlucose, filteredWeight, filteredMeals, weeklyComparisonStats, userProfile]);

  // PDF Export Function
  const handleExportPDF = async () => {
    if (!(window as any).jspdf || !(window as any).html2canvas) {
      alert("As bibliotecas necessárias para PDF estão carregando. Por favor, tente novamente em alguns instantes.");
      return;
    }

    const { jsPDF } = (window as any).jspdf;
    const html2canvas = (window as any).html2canvas;
    const reportElement = document.getElementById('report-summary-view');

    if (!reportElement) return;

    setIsLoading(true);

    try {
      const isDark = document.documentElement.classList.contains('dark');
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDark ? '#111827' : '#FFFFFF'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfPageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfPageHeight;
      }

      const formattedName = userProfile.name ? userProfile.name.replace(/\s+/g, '_') : 'Paciente';
      pdf.save(`Relatorio_Semanal_GlycoCare_${formattedName}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar relatório PDF:", error);
      alert("Houve um erro ao tentar gerar o arquivo PDF. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newWeight);
    if (!isNaN(val) && val > 0 && onAddWeightLog) {
      onAddWeightLog(val, newWeightNotes.trim() || undefined);
      setNewWeight('');
      setNewWeightNotes('');
      setShowAddWeightModal(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-teal-600 dark:text-teal-400 transition"
            title="Voltar ao Painel"
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <i className="fas fa-file-medical text-teal-500"></i>
              Relatório Semanal e Resumo de Saúde
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Acompanhamento consolidado de refeições, tendências glicêmicas e evolução de peso.
            </p>
          </div>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl gap-1 self-stretch sm:self-auto">
          {[
            { days: 7, label: '7 Dias (Semanal)' },
            { days: 15, label: '15 Dias' },
            { days: 30, label: '30 Dias' },
          ].map(tab => (
            <button
              key={tab.days}
              onClick={() => setFilterPeriod(tab.days)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterPeriod === tab.days
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Printable Content Area */}
      <div id="report-summary-view" className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 space-y-8">
        
        {/* Document Header Banner */}
        <div className="border-b dark:border-gray-700 pb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-teal-500 text-white rounded-lg text-sm font-bold">
                <i className="fas fa-heart-pulse"></i>
              </span>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                GlycoCare — Relatório Consolidado de Saúde
              </h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Período de Análise: <strong>Últimos {filterPeriod} dias</strong> ({new Date(Date.now() - filterPeriod * 86400000).toLocaleDateString()} a {new Date().toLocaleDateString()})
            </p>
          </div>

          <div className="text-left md:text-right bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border dark:border-gray-600 text-xs">
            <p className="font-bold text-gray-800 dark:text-gray-200">{userProfile.name}</p>
            <p className="text-gray-600 dark:text-gray-400">Diabetes: <strong>{userProfile.diabetesType}</strong></p>
            <p className="text-gray-600 dark:text-gray-400">Meta Glicêmica: {userProfile.glucoseTargetMin} - {userProfile.glucoseTargetMax} mg/dL</p>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Glucose Summary */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-gray-700/80 dark:to-gray-700/40 border border-teal-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fas fa-chart-line text-teal-600"></i> Tendência Glicêmica
              </span>
              <span className="text-[11px] bg-teal-200 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 px-2 py-0.5 rounded-full font-bold">
                {filteredGlucose.length} leituras
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-extrabold ${
                averageGlucose > userProfile.glucoseTargetMax ? 'text-red-600 dark:text-red-400' :
                averageGlucose < userProfile.glucoseTargetMin ? 'text-blue-600 dark:text-blue-400' :
                'text-teal-600 dark:text-teal-400'
              }`}>
                {averageGlucose > 0 ? averageGlucose : '--'}
              </span>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">mg/dL (média)</span>
            </div>
            <div className="mt-3 text-xs space-y-1 border-t border-teal-200/60 dark:border-gray-600 pt-2 text-gray-700 dark:text-gray-300">
              <p className="flex justify-between">
                <span>Na Meta ({userProfile.glucoseTargetMin}-{userProfile.glucoseTargetMax}):</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{glucoseDistribution.normal}</strong>
              </p>
              <p className="flex justify-between">
                <span>Acima da Meta:</span>
                <strong className="text-red-500">{glucoseDistribution.high}</strong>
              </p>
              <p className="flex justify-between">
                <span>Abaixo da Meta:</span>
                <strong className="text-blue-500">{glucoseDistribution.low}</strong>
              </p>
            </div>
          </div>

          {/* Card 2: Meals & Nutrition Summary */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-700/80 dark:to-gray-700/40 border border-orange-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fas fa-utensils text-orange-600"></i> Registro de Refeições
              </span>
              <span className="text-[11px] bg-orange-200 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200 px-2 py-0.5 rounded-full font-bold">
                {nutritionTotals.totalMeals} refeições
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">
                {nutritionTotals.avgDailyCarbs}
              </span>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">g carboidratos / dia</span>
            </div>
            <div className="mt-3 text-xs space-y-1 border-t border-orange-200/60 dark:border-gray-600 pt-2 text-gray-700 dark:text-gray-300">
              <p className="flex justify-between">
                <span>Açúcar Médio/dia:</span>
                <strong className="text-rose-500">{nutritionTotals.avgDailySugars}g</strong>
              </p>
              <p className="flex justify-between">
                <span>Calorias Médias/dia:</span>
                <strong className="text-purple-600 dark:text-purple-400">{nutritionTotals.avgDailyCalories} kcal</strong>
              </p>
              <p className="flex justify-between">
                <span>Total de Carboidratos:</span>
                <strong>{nutritionTotals.totalCarbs}g</strong>
              </p>
            </div>
          </div>

          {/* Card 3: Weight & Fluctuation Summary */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-700/80 dark:to-gray-700/40 border border-purple-200 dark:border-gray-600">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <i className="fas fa-weight-scale text-purple-600"></i> Evolução de Peso
              </span>
              <button
                type="button"
                onClick={() => setShowAddWeightModal(true)}
                className="text-[11px] bg-purple-600 hover:bg-purple-700 text-white px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1"
              >
                <i className="fas fa-plus"></i> Novo Peso
              </button>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                {weightStats.currentWeight > 0 ? weightStats.currentWeight : '--'}
              </span>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">kg (atual)</span>
            </div>
            <div className="mt-3 text-xs space-y-1 border-t border-purple-200/60 dark:border-gray-600 pt-2 text-gray-700 dark:text-gray-300">
              <p className="flex justify-between">
                <span>Variação no período:</span>
                <strong className={weightStats.delta > 0 ? 'text-rose-500' : weightStats.delta < 0 ? 'text-emerald-600' : 'text-gray-600'}>
                  {weightStats.delta > 0 ? `+${weightStats.delta}` : weightStats.delta} kg
                </strong>
              </p>
              <p className="flex justify-between">
                <span>Peso Inicial no Período:</span>
                <strong>{weightStats.initialWeightInPeriod} kg</strong>
              </p>
              <p className="flex justify-between">
                <span>Registros de Peso:</span>
                <strong>{weightStats.readingsCount} medições</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Section 0: Weekly Health Report Comparative View */}
        <div className="bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/60 dark:from-gray-800 dark:via-gray-800 dark:to-teal-950/30 p-5 rounded-2xl border-2 border-teal-500/30 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b dark:border-gray-700 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-sm">
                  <i className="fas fa-chart-column text-sm"></i>
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Relatório de Saúde Semanal: Comparativo com a Semana Anterior
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Análise comparativa das médias de glicemia, ingestão calórica diária e progressão de peso corporal (Chart.js).
              </p>
            </div>
            <span className="text-[11px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 px-3 py-1 rounded-full border border-teal-300 dark:border-teal-700">
              Esta Semana vs. Semana Anterior
            </span>
          </div>

          {/* Comparative Summary Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1: Glucose Avg */}
            <div className="bg-white dark:bg-gray-700/60 p-3.5 rounded-xl border dark:border-gray-600 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block mb-1">
                <i className="fas fa-droplet text-teal-500 mr-1"></i> Glicemia Média
              </span>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-gray-800 dark:text-gray-100">
                    {weeklyComparisonStats.currGlucoseAvg > 0 ? weeklyComparisonStats.currGlucoseAvg : '--'}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 ml-1">mg/dL</span>
                </div>
                <div className={`text-xs font-extrabold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                  weeklyComparisonStats.glucoseDelta < 0 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                  weeklyComparisonStats.glucoseDelta > 0 ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  <i className={`fas ${
                    weeklyComparisonStats.glucoseDelta < 0 ? 'fa-arrow-down' :
                    weeklyComparisonStats.glucoseDelta > 0 ? 'fa-arrow-up' : 'fa-equals'
                  } text-[10px]`}></i>
                  <span>{Math.abs(weeklyComparisonStats.glucoseDelta)} mg/dL</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                Semana anterior: <strong>{weeklyComparisonStats.prevGlucoseAvg > 0 ? `${weeklyComparisonStats.prevGlucoseAvg} mg/dL` : 'Sem dados'}</strong>
              </p>
            </div>

            {/* Metric 2: Caloric Intake */}
            <div className="bg-white dark:bg-gray-700/60 p-3.5 rounded-xl border dark:border-gray-600 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block mb-1">
                <i className="fas fa-fire text-amber-500 mr-1"></i> Calorias Médias / Dia
              </span>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-gray-800 dark:text-gray-100">
                    {weeklyComparisonStats.currCalAvg}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 ml-1">kcal/dia</span>
                </div>
                <div className={`text-xs font-extrabold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                  weeklyComparisonStats.caloriesDelta < 0 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                  weeklyComparisonStats.caloriesDelta > 0 ? 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  <i className={`fas ${
                    weeklyComparisonStats.caloriesDelta < 0 ? 'fa-arrow-down' :
                    weeklyComparisonStats.caloriesDelta > 0 ? 'fa-arrow-up' : 'fa-equals'
                  } text-[10px]`}></i>
                  <span>{Math.abs(weeklyComparisonStats.caloriesDelta)} kcal</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                Semana anterior: <strong>{weeklyComparisonStats.prevCalAvg} kcal/dia</strong>
              </p>
            </div>

            {/* Metric 3: Weight Progression */}
            <div className="bg-white dark:bg-gray-700/60 p-3.5 rounded-xl border dark:border-gray-600 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block mb-1">
                <i className="fas fa-weight-scale text-purple-500 mr-1"></i> Progressão de Peso
              </span>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-black text-gray-800 dark:text-gray-100">
                    {weeklyComparisonStats.currWeightAvg}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 ml-1">kg</span>
                </div>
                <div className={`text-xs font-extrabold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                  weeklyComparisonStats.weightDelta < 0 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                  weeklyComparisonStats.weightDelta > 0 ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300' :
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  <i className={`fas ${
                    weeklyComparisonStats.weightDelta < 0 ? 'fa-arrow-down' :
                    weeklyComparisonStats.weightDelta > 0 ? 'fa-arrow-up' : 'fa-equals'
                  } text-[10px]`}></i>
                  <span>{weeklyComparisonStats.weightDelta > 0 ? `+${weeklyComparisonStats.weightDelta}` : weeklyComparisonStats.weightDelta} kg</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">
                Semana anterior: <strong>{weeklyComparisonStats.prevWeightAvg} kg</strong>
              </p>
            </div>
          </div>

          {/* Comparative Bar Chart Canvas */}
          <div className="bg-white dark:bg-gray-700/40 p-4 rounded-xl border dark:border-gray-700 h-64 md:h-72">
            <canvas ref={weeklyComparisonChartRef}></canvas>
          </div>
        </div>

        {/* Section 1: Glucose Trend Chart */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <i className="fas fa-wave-square text-teal-500"></i>
              Gráfico de Tendência Glicêmica ({filterPeriod} Dias)
            </h3>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border dark:border-gray-700 h-64 md:h-72">
            {filteredGlucose.length > 0 ? (
              <canvas ref={glucoseChartRef}></canvas>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Nenhuma leitura glicêmica registrada nos últimos {filterPeriod} dias.
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Weight Fluctuation Chart */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <i className="fas fa-chart-line text-purple-500"></i>
              Flutuação de Peso Corporal (kg)
            </h3>
            {onAddWeightLog && (
              <button
                onClick={() => setShowAddWeightModal(true)}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <i className="fas fa-plus-circle"></i> Adicionar Medição de Peso
              </button>
            )}
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border dark:border-gray-700 h-64 md:h-72">
            {filteredWeight.length > 0 ? (
              <canvas ref={weightChartRef}></canvas>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Nenhum histórico de peso registrado. Clique em "Novo Peso" para começar o monitoramento!
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Meal & Nutrition Consumption Chart */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i className="fas fa-chart-bar text-orange-500"></i>
            Ingestão de Carboidratos e Calorias por Refeição
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border dark:border-gray-700 h-64 md:h-72">
            {filteredMeals.length > 0 ? (
              <canvas ref={nutritionChartRef}></canvas>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Nenhuma refeição registrada no período.
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Detailed Meal Log Table */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <i className="fas fa-list-check text-orange-500"></i>
            Histórico Detalhado de Refeições
          </h3>
          <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Refeição / Prato</th>
                  <th className="p-3">Carboidratos</th>
                  <th className="p-3">Açúcar</th>
                  <th className="p-3">Proteínas</th>
                  <th className="p-3">Gorduras</th>
                  <th className="p-3">Calorias</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {filteredMeals.length > 0 ? (
                  [...filteredMeals].reverse().map(meal => (
                    <tr key={meal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                      <td className="p-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(meal.timestamp).toLocaleDateString()} {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-semibold text-gray-800 dark:text-gray-100">
                        {meal.name || 'Refeição sem nome'}
                      </td>
                      <td className="p-3 font-bold text-orange-600 dark:text-orange-400">
                        {meal.carbohydrates}g
                      </td>
                      <td className="p-3 text-rose-600 dark:text-rose-400">
                        {meal.sugars || 0}g
                      </td>
                      <td className="p-3 text-blue-600 dark:text-blue-400">
                        {meal.proteins || 0}g
                      </td>
                      <td className="p-3 text-amber-600 dark:text-amber-400">
                        {meal.fats || 0}g
                      </td>
                      <td className="p-3 font-bold text-purple-600 dark:text-purple-400">
                        {meal.calories || 0} kcal
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-400">
                      Nenhuma refeição registrada para este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 5: Bioimpedance & Medical Notes (If available) */}
        {userProfile.bioimpedance && (
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-gray-700/50 border border-blue-200 dark:border-gray-600 space-y-2 text-xs">
            <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 text-sm">
              <i className="fas fa-stethoscope"></i> Dados de Bioimpedância & Orientação Médica
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-gray-700 dark:text-gray-300">
              {userProfile.bioimpedance.bodyFatPercentage !== undefined && (
                <div>% Gordura: <strong>{userProfile.bioimpedance.bodyFatPercentage}%</strong></div>
              )}
              {userProfile.bioimpedance.muscleMassKg !== undefined && (
                <div>Massa Muscular: <strong>{userProfile.bioimpedance.muscleMassKg} kg</strong></div>
              )}
              {userProfile.bioimpedance.visceralFatLevel !== undefined && (
                <div>Gordura Visceral: <strong>Nível {userProfile.bioimpedance.visceralFatLevel}</strong></div>
              )}
              {userProfile.bioimpedance.basalMetabolicRateKcal !== undefined && (
                <div>TMB: <strong>{userProfile.bioimpedance.basalMetabolicRateKcal} kcal</strong></div>
              )}
            </div>
            {userProfile.bioimpedance.professionalNotes && (
              <p className="pt-2 text-gray-600 dark:text-gray-400 border-t border-blue-200 dark:border-gray-600 italic">
                "{userProfile.bioimpedance.professionalNotes}" — {userProfile.bioimpedance.professionalName || 'Nutricionista'}
              </p>
            )}
          </div>
        )}

        {/* Footer Disclaimer */}
        <footer className="text-center text-[11px] text-gray-400 dark:text-gray-500 pt-4 border-t dark:border-gray-700">
          <p>GlycoCare — Sistema Inteligente de Acompanhamento Diabetológico e Nutricional.</p>
          <p>Este relatório é apenas para fins de apoio ao automonitoramento e não substitui o aconselhamento do seu médico ou nutricionista.</p>
        </footer>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <button
          type="button"
          onClick={handleExportPDF}
          disabled={isLoading}
          className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              Gerando Relatório PDF...
            </>
          ) : (
            <>
              <i className="fas fa-file-pdf text-lg"></i>
              Exportar Relatório Semanal em PDF
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold text-sm rounded-xl transition"
        >
          Voltar ao Painel
        </button>
      </div>

      {/* Modal para Registrar Novo Peso */}
      {showAddWeightModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6 relative">
            <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <i className="fas fa-weight-scale text-purple-600"></i> Registrar Novo Peso
              </h3>
              <button
                onClick={() => setShowAddWeightModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveWeight} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Peso em quilogramas (kg) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="20"
                    max="300"
                    required
                    placeholder="Ex: 72.5"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-bold text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">kg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pesagem em jejum, pós-treino..."
                  value={newWeightNotes}
                  onChange={(e) => setNewWeightNotes(e.target.value)}
                  className="w-full px-3 py-2 border text-xs rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWeightModal(false)}
                  className="w-1/2 py-2 text-xs font-semibold border rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow transition"
                >
                  Salvar Medição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { UserProfile, GlucoseReading, WeightLog } from '../types';

interface WeeklyTrendChartProps {
  userProfile: UserProfile;
  glucoseReadings: GlucoseReading[];
  weightLogs: WeightLog[];
  onAddWeightLog?: (weightKg: number, notes?: string) => void;
  theme?: 'light' | 'dark';
}

export const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({
  userProfile,
  glucoseReadings = [],
  weightLogs = [],
  onAddWeightLog,
  theme = 'light'
}) => {
  const [periodDays, setPeriodDays] = useState<number>(7);
  const [showAddWeightModal, setShowAddWeightModal] = useState<boolean>(false);
  const [newWeightInput, setNewWeightInput] = useState<string>('');
  const [newWeightNotes, setNewWeightNotes] = useState<string>('');

  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // Filtered readings based on period
  const filteredData = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    cutoffDate.setHours(0, 0, 0, 0);

    const filteredGlucose = glucoseReadings
      .filter(r => new Date(r.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const filteredWeight = weightLogs
      .filter(w => new Date(w.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return { filteredGlucose, filteredWeight };
  }, [glucoseReadings, weightLogs, periodDays]);

  // Calculated Stats
  const stats = useMemo(() => {
    const { filteredGlucose, filteredWeight } = filteredData;

    const avgGlucose = filteredGlucose.length > 0
      ? Math.round(filteredGlucose.reduce((sum, g) => sum + g.value, 0) / filteredGlucose.length)
      : null;

    const currentWeight = filteredWeight.length > 0
      ? filteredWeight[filteredWeight.length - 1].weightKg
      : userProfile.weightKg || null;

    const firstWeightInPeriod = filteredWeight.length > 0
      ? filteredWeight[0].weightKg
      : currentWeight;

    const weightChange = (currentWeight !== null && firstWeightInPeriod !== null)
      ? Number((currentWeight - firstWeightInPeriod).toFixed(1))
      : 0;

    return {
      avgGlucose,
      currentWeight,
      weightChange,
      glucoseCount: filteredGlucose.length,
      weightCount: filteredWeight.length,
    };
  }, [filteredData, userProfile.weightKg]);

  // Render Chart with Chart.js
  useEffect(() => {
    if (!(window as any).Chart || !chartCanvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const isDark = document.documentElement.classList.contains('dark') || theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const textColor = isDark ? '#E5E7EB' : '#374151';

    // Combine unique dates for x-axis
    const dateSet = new Set<string>();
    const dateMap: { [dateStr: string]: { glucoseValues: number[]; weightValues: number[] } } = {};

    // Helper to format date key YYYY-MM-DD or DD/MM
    const formatDayKey = (dStr: string | Date) => {
      const d = new Date(dStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    filteredData.filteredGlucose.forEach(g => {
      const val = Number(g.value);
      // Ignore extreme/unrealistic outliers (> 600 mg/dL)
      if (!isNaN(val) && val > 0 && val < 600) {
        const key = formatDayKey(g.timestamp);
        dateSet.add(key);
        if (!dateMap[key]) dateMap[key] = { glucoseValues: [], weightValues: [] };
        dateMap[key].glucoseValues.push(val);
      }
    });

    filteredData.filteredWeight.forEach(w => {
      const val = Number(w.weightKg);
      if (!isNaN(val) && val > 0 && val < 300) {
        const key = formatDayKey(w.timestamp);
        dateSet.add(key);
        if (!dateMap[key]) dateMap[key] = { glucoseValues: [], weightValues: [] };
        dateMap[key].weightValues.push(val);
      }
    });

    // Sort labels chronologically
    const sortedLabels = Array.from(dateSet).sort((a, b) => {
      const [dA, mA] = a.split('/').map(Number);
      const [dB, mB] = b.split('/').map(Number);
      if (mA !== mB) return mA - mB;
      return dA - dB;
    });

    const glucoseDataPoints = sortedLabels.map(label => {
      const vals = dateMap[label]?.glucoseValues;
      if (!vals || vals.length === 0) return null;
      return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length);
    });

    const weightDataPoints = sortedLabels.map(label => {
      const vals = dateMap[label]?.weightValues;
      if (!vals || vals.length === 0) return null;
      return Number(vals[vals.length - 1]); // Use last logged weight of the day
    });

    const validGlucoseVals = glucoseDataPoints.filter((v): v is number => v !== null);
    const maxLoggedGlucose = validGlucoseVals.length > 0 ? Math.max(...validGlucoseVals) : 180;

    const ctx = chartCanvasRef.current.getContext('2d');
    if (!ctx) return;

    // Create chart
    chartInstanceRef.current = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedLabels.length > 0 ? sortedLabels : ['Sem dados'],
        datasets: [
          {
            label: 'Glicemia Média (mg/dL)',
            data: sortedLabels.length > 0 ? glucoseDataPoints : [null],
            borderColor: '#0D9488', // Teal
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            pointBackgroundColor: '#0D9488',
            pointBorderColor: '#ffffff',
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.3,
            yAxisID: 'yGlucose',
            spanGaps: true,
          },
          {
            label: 'Peso Corporal (kg)',
            data: sortedLabels.length > 0 ? weightDataPoints : [null],
            borderColor: '#8B5CF6', // Purple
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            pointBackgroundColor: '#8B5CF6',
            pointBorderColor: '#ffffff',
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.2,
            yAxisID: 'yWeight',
            spanGaps: true,
          }
        ]
      },
      options: {
        animation: false, // Prevents points from jumping/bouncing on component re-renders
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              font: { weight: 'bold', size: 12 },
              usePointStyle: true,
              padding: 15,
            }
          },
          tooltip: {
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            titleColor: isDark ? '#F3F4F6' : '#111827',
            bodyColor: isDark ? '#E5E7EB' : '#374151',
            borderColor: isDark ? '#374151' : '#E5E7EB',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            callbacks: {
              label: function (context: any) {
                const label = context.dataset.label || '';
                const val = context.parsed.y;
                if (val === null || val === undefined) return '';
                if (context.dataset.yAxisID === 'yGlucose') {
                  return ` ${label}: ${val} mg/dL`;
                }
                return ` ${label}: ${val} kg`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11 } }
          },
          yGlucose: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Glicemia (mg/dL)',
              color: '#0D9488',
              font: { weight: 'bold', size: 11 }
            },
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 11 } },
            suggestedMin: 40,
            suggestedMax: Math.min(500, Math.max(180, maxLoggedGlucose + 20)),
          },
          yWeight: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Peso (kg)',
              color: '#8B5CF6',
              font: { weight: 'bold', size: 11 }
            },
            grid: { drawOnChartArea: false }, // Avoid duplicate gridlines
            ticks: { color: textColor, font: { size: 11 } },
            suggestedMin: stats.currentWeight ? Math.max(30, Math.floor(stats.currentWeight - 10)) : 40,
            suggestedMax: stats.currentWeight ? Math.ceil(stats.currentWeight + 10) : 120,
          }
        }
      }
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [filteredData, userProfile, theme, stats.currentWeight]);

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newWeightInput);
    if (!isNaN(val) && val > 0 && onAddWeightLog) {
      onAddWeightLog(val, newWeightNotes.trim() || undefined);
      setNewWeightInput('');
      setNewWeightNotes('');
      setShowAddWeightModal(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b dark:border-gray-700 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-purple-600 text-white rounded-lg shadow-sm text-sm">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Evolução Semanal de Glicose & Peso
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Compare tendências do açúcar no sangue e variação do peso corporal.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Period Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg gap-1">
            {[
              { days: 7, label: '7 D' },
              { days: 15, label: '15 D' },
              { days: 30, label: '30 D' },
            ].map(tab => (
              <button
                key={tab.days}
                onClick={() => setPeriodDays(tab.days)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  periodDays === tab.days
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Add Weight Quick Button */}
          {onAddWeightLog && (
            <button
              onClick={() => setShowAddWeightModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <i className="fas fa-plus"></i>
              <span className="hidden sm:inline">Registrar</span> Peso
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Glucose Avg */}
        <div className="p-3 rounded-lg bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block mb-0.5">
            Média de Glicemia
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400">
              {stats.avgGlucose ? stats.avgGlucose : '--'}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">mg/dL</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
            {stats.glucoseCount} medições no período
          </span>
        </div>

        {/* Current Weight */}
        <div className="p-3 rounded-lg bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300 block mb-0.5">
            Peso Mais Recente
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
              {stats.currentWeight ? stats.currentWeight : '--'}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">kg</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
            {stats.weightCount} pesagens registradas
          </span>
        </div>

        {/* Weight Fluctuation */}
        <div className="p-3 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 block mb-0.5">
            Variação no Período
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-extrabold ${
              stats.weightChange > 0 ? 'text-rose-500' :
              stats.weightChange < 0 ? 'text-emerald-600 dark:text-emerald-400' :
              'text-gray-600 dark:text-gray-300'
            }`}>
              {stats.weightChange > 0 ? `+${stats.weightChange}` : stats.weightChange}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">kg</span>
          </div>
          <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">
            Comparado ao início do período
          </span>
        </div>

        {/* Target Range Indicator */}
        <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block mb-0.5">
            Meta Glicêmica Alvo
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {userProfile.glucoseTargetMin} - {userProfile.glucoseTargetMax}
            </span>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">mg/dL</span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium block mt-0.5">
            Faixa configurada no perfil
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative h-64 sm:h-72 w-full bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border dark:border-gray-700">
        <canvas ref={chartCanvasRef}></canvas>
      </div>

      {/* Modal Quick Weight Log */}
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
                    value={newWeightInput}
                    onChange={(e) => setNewWeightInput(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-bold text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500 text-sm"
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
                  placeholder="Ex: Pesagem matinal em jejum..."
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
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyTrendChart;

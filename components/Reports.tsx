import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserProfile, GlucoseReading } from '../types';

interface ReportsProps {
  userProfile: UserProfile;
  glucoseReadings: GlucoseReading[];
  onBack: () => void;
}

const Reports: React.FC<ReportsProps> = ({ userProfile, glucoseReadings, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<number>(7); // 7, 15, or 30 days
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartInstance = useRef<any>(null); 
  const barChartInstance = useRef<any>(null);

  const filteredReadings = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - filterPeriod);
    startDate.setHours(0, 0, 0, 0);

    return glucoseReadings.filter(reading => reading.timestamp >= startDate);
  }, [filterPeriod, glucoseReadings]);

  const readingDistribution = useMemo(() => {
    const distribution = { low: 0, normal: 0, high: 0 };
    filteredReadings.forEach(reading => {
      if (reading.value < userProfile.glucoseTargetMin) {
        distribution.low++;
      } else if (reading.value > userProfile.glucoseTargetMax) {
        distribution.high++;
      } else {
        distribution.normal++;
      }
    });
    return distribution;
  }, [filteredReadings, userProfile.glucoseTargetMin, userProfile.glucoseTargetMax]);


  // Effect for Charts
  useEffect(() => {
    if (!(window as any).Chart) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#E5E7EB' : '#374151';

    const commonChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false, labels: { color: textColor } } },
        scales: {
            y: {
                beginAtZero: false,
                title: { display: true, text: 'mg/dL', color: textColor },
                grid: { color: gridColor },
                ticks: { color: textColor },
            },
            x: {
                grid: { color: gridColor },
                ticks: { color: textColor },
            }
        }
    };

    // Line Chart
    if (lineChartRef.current) {
        if (lineChartInstance.current) lineChartInstance.current.destroy();
        const ctx = lineChartRef.current.getContext('2d');
        if (ctx && filteredReadings.length > 0) {
            const labels = filteredReadings.map(r => r.timestamp.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
            const data = filteredReadings.map(r => r.value);
            const pointBackgroundColors = data.map(value => {
                if (value > userProfile.glucoseTargetMax) return '#EF4444'; // red-500
                if (value < userProfile.glucoseTargetMin) return '#3B82F6'; // blue-500
                return '#10B981'; // green-500
            });
            lineChartInstance.current = new (window as any).Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Glicemia (mg/dL)',
                        data: data,
                        borderColor: '#14B8A6',
                        backgroundColor: pointBackgroundColors,
                        tension: 0.1, fill: false, pointRadius: 5, pointHoverRadius: 7,
                    }]
                },
                options: commonChartOptions
            });
        }
    }
    
    // Bar Chart
    if (barChartRef.current) {
      if (barChartInstance.current) barChartInstance.current.destroy();
      const ctx = barChartRef.current.getContext('2d');
      if (ctx) {
        barChartInstance.current = new (window as any).Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Baixa', 'Normal', 'Alta'],
                datasets: [{
                    label: 'Nº de Leituras',
                    data: [readingDistribution.low, readingDistribution.normal, readingDistribution.high],
                    backgroundColor: ['#3B82F6', '#10B981', '#EF4444'],
                }]
            },
            options: {
                ...commonChartOptions,
                 scales: {
                    ...commonChartOptions.scales,
                    y: { ...commonChartOptions.scales.y, beginAtZero: true, title: { ...commonChartOptions.scales.y.title, text: 'Contagem de Leituras'}, ticks: { ...commonChartOptions.scales.y.ticks, stepSize: 1 } }
                 }
            }
        });
      }
    }
    return () => { 
      if (lineChartInstance.current) lineChartInstance.current.destroy();
      if (barChartInstance.current) barChartInstance.current.destroy();
    };
  }, [userProfile, filteredReadings, readingDistribution]);


  const handleExportPDF = async () => {
    const { jsPDF } = (window as any).jspdf;
    const html2canvas = (window as any).html2canvas;
    const reportElement = document.getElementById('report-content');
    if (!reportElement) return;
    
    setIsLoading(true);

    try {
        const canvas = await html2canvas(reportElement, { scale: 2, backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#FFFFFF' });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Relatorio_GlycoCare_${userProfile.name.replace(' ', '_')}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };
  
  const averageGlucose = filteredReadings.length > 0
    ? filteredReadings.reduce((acc, curr) => acc + curr.value, 0) / filteredReadings.length
    : 0;
    
  const FilterButton: React.FC<{days: number; label: string}> = ({ days, label }) => (
    <button
      onClick={() => setFilterPeriod(days)}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filterPeriod === days ? 'bg-teal-500 text-white shadow' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
      <header className="flex justify-between items-center mb-4">
          <button onClick={onBack} className="text-teal-500 hover:text-teal-700 flex items-center">
            <i className="fas fa-arrow-left mr-2"></i> Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Relatórios e Insights</h1>
      </header>

      <div className="flex justify-center space-x-2 mb-6">
          <FilterButton days={7} label="7 dias" />
          <FilterButton days={15} label="15 dias" />
          <FilterButton days={30} label="30 dias" />
      </div>

      <div id="report-content" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold border-b dark:border-gray-700 pb-2 mb-4 text-gray-800 dark:text-gray-100">Relatório Glicêmico Consolidado</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Paciente</p>
                <p className="font-semibold text-lg">{userProfile.name}</p>
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tipo de Diabetes</p>
                <p className="font-semibold text-lg">{userProfile.diabetesType}</p>
            </div>
             <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Período</p>
                <p className="font-semibold text-lg">Últimos {filterPeriod} dias</p>
            </div>
             <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Média Glicêmica</p>
                <p className={`font-semibold text-lg ${
                    averageGlucose > userProfile.glucoseTargetMax ? 'text-red-500' 
                    : averageGlucose < userProfile.glucoseTargetMin ? 'text-blue-500' 
                    : 'text-green-500'
                }`}>
                    {averageGlucose.toFixed(0)} mg/dL
                </p>
            </div>
        </div>

        <div className="mb-6">
            <h3 className="font-semibold mb-2 text-lg">Variação da Glicemia</h3>
             {filteredReadings.length > 0 ? (
                <div className="relative h-64 md:h-80">
                    <canvas ref={lineChartRef}></canvas>
                </div>
            ) : (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Nenhum dado encontrado para este período.</p>
                </div>
            )}
        </div>

        <div className="mb-6">
            <h3 className="font-semibold mb-2 text-lg">Distribuição das Leituras</h3>
            {filteredReadings.length > 0 ? (
                <div className="relative h-64">
                    <canvas ref={barChartRef}></canvas>
                </div>
            ) : (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Sem dados para exibir o gráfico de distribuição.</p>
                </div>
            )}
        </div>
        
        <h3 className="font-semibold mb-2 text-lg">Registros Recentes</h3>
         <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left table-auto">
                <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                    <tr>
                        <th className="px-4 py-2">Data</th>
                        <th className="px-4 py-2">Hora</th>
                        <th className="px-4 py-2">Glicemia (mg/dL)</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredReadings.length > 0 ? [...filteredReadings].reverse().map((reading, index) => (
                        <tr key={index} className="border-b dark:border-gray-700">
                            <td className="px-4 py-2">{reading.timestamp.toLocaleDateString()}</td>
                            <td className="px-4 py-2">{reading.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className={`px-4 py-2 font-bold ${reading.value > userProfile.glucoseTargetMax ? 'text-red-500' : reading.value < userProfile.glucoseTargetMin ? 'text-blue-500' : 'text-green-500'}`}>
                                {reading.value}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={3} className="text-center py-6 text-gray-500 dark:text-gray-400">Sem registros neste período.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">Este relatório foi gerado por GlycoCare e não substitui o acompanhamento médico.</p>
      </div>

      <div className="mt-8 text-center">
        <button 
            onClick={handleExportPDF} 
            disabled={isLoading} 
            className="w-full max-w-xs bg-teal-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-teal-600 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando...
            </>
          ) : (
            <>
              <i className="fas fa-file-pdf mr-2"></i>
              Exportar para PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Reports;
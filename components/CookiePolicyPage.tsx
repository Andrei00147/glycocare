import React from 'react';

export const CookiePolicyPage: React.FC<{
  onBack: () => void;
  onOpenPreferences: () => void;
}> = ({ onBack, onOpenPreferences }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 my-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 animate-fade-in">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline"
      >
        <i className="fas fa-arrow-left"></i> Voltar ao Início
      </button>

      <div className="border-b dark:border-gray-700 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Política de Cookies</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Última atualização: 26 de Julho de 2026 | Google Consent Mode v2 & LGPD.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 space-y-6 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. O que são Cookies?</h2>
          <p>
            Cookies são pequenos arquivos de texto salvos no seu computador ou dispositivo móvel quando você visita um site. Eles servem para fazer a plataforma funcionar com eficiência, memorizar suas preferências e fornecer informações analíticas aos proprietários do site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. Como Utilizamos os Cookies</h2>
          <p>O <strong>NutriSaúdeVital</strong> utiliza três categorias de cookies:</p>
          <div className="space-y-3 mt-3">
            <div className="p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border dark:border-gray-700">
              <h3 className="font-bold text-teal-600 dark:text-teal-400">1. Cookies Estritamente Necessários</h3>
              <p className="text-xs mt-1">Essenciais para o funcionamento básico do site, manutenção do seu tema (claro/escuro), estado de login e prevenção de ataques CSRF. Não podem ser desativados.</p>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border dark:border-gray-700">
              <h3 className="font-bold text-blue-600 dark:text-blue-400">2. Cookies Analíticos (Google Analytics 4)</h3>
              <p className="text-xs mt-1">Ajudam-nos a entender quais seções do aplicativo são mais acessadas, o tempo de permanência e potenciais falhas de usabilidade para constantes melhorias.</p>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border dark:border-gray-700">
              <h3 className="font-bold text-purple-600 dark:text-purple-400">3. Cookies de Anúncios e Personalização (Google AdSense)</h3>
              <p className="text-xs mt-1">Utilizados pelo Google AdSense para exibir anúncios personalizados relevantes aos seus interesses e limitar o número de vezes que um anúncio é exibido.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Google Consent Mode v2</h2>
          <p>
            A nossa plataforma está 100% integrada ao <strong>Google Consent Mode v2</strong>. Isso garante que todos os dados enviados ao Google Analytics e Google AdSense respeitem rigidamente os sinais de consentimento definidos por você.
          </p>
        </section>

        <section className="bg-teal-50 dark:bg-teal-950/40 p-4 rounded-xl border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-teal-900 dark:text-teal-200 text-sm">Deseja alterar suas permissões de cookies agora?</h3>
            <p className="text-xs text-teal-800 dark:text-teal-300 mt-1">
              Você pode revisar ou revogar seu consentimento a qualquer momento.
            </p>
          </div>
          <button
            onClick={onOpenPreferences}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow transition flex-shrink-0"
          >
            <i className="fas fa-sliders mr-1.5"></i> Abrir Central de Preferências
          </button>
        </section>
      </div>

      <div className="mt-8 pt-4 border-t dark:border-gray-700 flex justify-end">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          Voltar
        </button>
      </div>
    </div>
  );
};

export default CookiePolicyPage;

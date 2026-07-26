import React from 'react';

export const TermsOfServicePage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 my-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 animate-fade-in">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline"
      >
        <i className="fas fa-arrow-left"></i> Voltar ao Início
      </button>

      <div className="border-b dark:border-gray-700 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Termos de Uso</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Última atualização: 26 de Julho de 2026.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 space-y-6 leading-relaxed">
        <section className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-r-xl">
          <h2 className="text-base font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-2">
            <i className="fas fa-triangle-exclamation text-amber-600"></i> Isenção de Responsabilidade Médica (Medical Disclaimer)
          </h2>
          <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
            O <strong>NutriSaúdeVital</strong> é uma ferramenta tecnológica de auxílio para organização pessoal, registro nutricional e acompanhamento metabólico. O conteúdo, estimativas nutricionais de IA e calculadoras presentes no site <strong>não constituem aconselhamento médico, diagnóstico ou prescrição médica/nutricional</strong>. Consulte sempre um profissional de saúde qualificado (médico, nutricionista ou personal trainer) antes de tomar decisões sobre tratamento, medicação ou alterações de dieta.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Aceitação dos Termos</h2>
          <p>
            Ao acessar ou utilizar a plataforma <strong>NutriSaúdeVital</strong>, você declara ter lido, compreendido e concordado com estes Termos de Uso e com nossa Política de Privacidade. Caso não concorde com qualquer disposição, solicitamos que não utilize nossos serviços.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. Uso do Serviço e Responsabilidades</h2>
          <p>Ao utilizar o NutriSaúdeVital, você se compromete a:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Fornecer informações precisas ao preencher seu perfil ou ao registrar medições.</li>
            <li>Não utilizar o serviço para qualquer finalidade ilícita, fraudulenta ou não autorizada.</li>
            <li>Manter o sigilo de suas credenciais de acesso (caso opte por realizar login).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Propriedade Intelectual</h2>
          <p>
            Todo o conteúdo presente no NutriSaúdeVital, incluindo textos, logotipos, elementos gráficos, códigos-fonte, algoritmos e design de interface, são de propriedade exclusiva da plataforma e protegidos pelas leis brasileiras de propriedade intelectual e direitos autorais.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Alterações nos Termos</h2>
          <p>
            Reservamo-nos o direito de atualizar estes Termos de Uso periodicamente para refletir melhorias na plataforma ou alterações regulatórias. A data de modificação no topo desta página indicará as revisões mais recentes.
          </p>
        </section>
      </div>

      <div className="mt-8 pt-4 border-t dark:border-gray-700 flex justify-end">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          Compreendi os Termos
        </button>
      </div>
    </div>
  );
};

export default TermsOfServicePage;

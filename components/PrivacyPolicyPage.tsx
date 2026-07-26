import React from 'react';

export const PrivacyPolicyPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 my-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 animate-fade-in">
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:underline"
      >
        <i className="fas fa-arrow-left"></i> Voltar ao Início
      </button>

      <div className="border-b dark:border-gray-700 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Política de Privacidade</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Última atualização: 26 de Julho de 2026 | Em conformidade com a LGPD (Lei nº 13.709/2018) e GDPR.
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 space-y-6 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">1. Introdução</h2>
          <p>
            O <strong>NutriSaúdeVital</strong> (disponível em <code>https://nutrisaudevital.com.br</code>) compromete-se com a segurança, transparência e privacidade dos dados pessoais de todos os nossos usuários. Esta Política de Privacidade descreve como coletamos, armazenamos, usamos e protegemos seus dados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">2. Dados Pessoais Coletados</h2>
          <p>Podemos coletar e processar as seguintes categorias de informações:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Informações do Perfil e Saúde:</strong> Nome, e-mail (via autenticação voluntária), tipo de acompanhamento (como controle glicêmico, perda de peso ou ganho de massa), registros opcionais de glicemia, peso e refeições.</li>
            <li><strong>Análise de Imagens com IA:</strong> Fotos de refeições enviadas voluntariamente para estimativa nutricional por inteligência artificial.</li>
            <li><strong>Dados de Navegação e Dispositivo:</strong> Endereço IP, tipo de navegador, modelo do dispositivo e dados analíticos de acesso.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">3. Finalidade do Tratamento de Dados</h2>
          <p>Seus dados são tratados estritamente para as seguintes finalidades:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Fornecer as funcionalidades do aplicativo (diário de alimentação, diário glicêmico, geração de relatórios PDF e recomendações de receitas).</li>
            <li>Melhorar continuamente a usabilidade e desempenho da nossa plataforma.</li>
            <li>Exibição de anúncios relevantes via Google AdSense e medição de tráfego via Google Analytics (mediante seu consentimento prévio).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">4. Publicidade e Google AdSense</h2>
          <p>
            Utilizamos o <strong>Google AdSense</strong> para a exibição de anúncios no site. O Google utiliza cookies para veicular anúncios com base nas suas visitas anteriores a este ou a outros sites.
          </p>
          <p className="mt-2">
            Respeitamos o <strong>Google Consent Mode v2</strong>. Nenhum cookie de publicidade ou rastreamento é ativado antes que você forneça seu consentimento explícito no nosso banner de cookies. Você pode alterar suas preferências a qualquer momento no rodapé do site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">5. Direitos do Titular (Art. 18 da LGPD)</h2>
          <p>De acordo com a Lei Geral de Proteção de Dados, você tem o direito de:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Confirmar a existência de tratamento e acessar seus dados.</li>
            <li>Solicitar a correção de dados incompletos ou desatualizados.</li>
            <li>Solicitar a exclusão ou anonimização de seus dados armazenados.</li>
            <li>Revogar o consentimento para o uso de cookies analíticos e de publicidade a qualquer momento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">6. Contato com Encarregado de Proteção de Dados (DPO)</h2>
          <p>
            Caso deseje exercer seus direitos ou tenha dúvidas sobre esta política, entre em contato através do e-mail: <code>privacidade@nutrisaudevital.com.br</code>.
          </p>
        </section>
      </div>

      <div className="mt-8 pt-4 border-t dark:border-gray-700 flex justify-end">
        <button
          onClick={onBack}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition"
        >
          Entendi e Concordo
        </button>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

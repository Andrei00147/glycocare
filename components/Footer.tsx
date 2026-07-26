import React from 'react';
import { View } from '../types';

interface FooterProps {
  onNavigate: (view: View) => void;
  onOpenCookiePreferences: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenCookiePreferences }) => {
  return (
    <footer className="bg-gray-900 text-gray-300 border-t border-gray-800 pt-12 pb-8 px-4 sm:px-6 lg:px-8 mt-auto text-xs">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        
        {/* Coluna 1: Sobre & Missão */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <i className="fas fa-heart-pulse text-teal-400"></i>
            <span>NutriSaúdeVital</span>
          </div>
          <p className="text-gray-400 leading-relaxed text-xs">
            Plataforma integrada de saúde, nutrição, composição corporal, planos de treinos e acompanhamento metabólico contínuo.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <span className="bg-teal-900/60 text-teal-300 border border-teal-700/50 text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <i className="fas fa-shield-check text-teal-400"></i> LGPD & AdSense Ready
            </span>
            <span className="bg-blue-900/60 text-blue-300 border border-blue-700/50 text-[10px] font-semibold px-2.5 py-1 rounded-full">
              Consent Mode v2
            </span>
          </div>
        </div>

        {/* Coluna 2: Navegação do App */}
        <div>
          <h3 className="text-white font-bold text-sm mb-3 border-b border-gray-800 pb-1">
            Plataforma & Recursos
          </h3>
          <ul className="space-y-2 text-gray-400">
            <li>
              <button onClick={() => onNavigate(View.Dashboard)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-chevron-right text-[9px] text-teal-500"></i> Painel Geral & Saúde
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate(View.Onboarding)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-chevron-right text-[9px] text-teal-500"></i> Plano para Diabetes
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate(View.CommunityRecipes)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-chevron-right text-[9px] text-teal-500"></i> Receitas Saudáveis
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate(View.Reports)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-chevron-right text-[9px] text-teal-500"></i> Relatórios em PDF
              </button>
            </li>
          </ul>
        </div>

        {/* Coluna 3: Políticas e Conformidade Legal */}
        <div>
          <h3 className="text-white font-bold text-sm mb-3 border-b border-gray-800 pb-1">
            Conformidade & Privacidade
          </h3>
          <ul className="space-y-2 text-gray-400">
            <li>
              <button onClick={() => onNavigate(View.PrivacyPolicy)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-lock text-[10px] text-teal-500"></i> Política de Privacidade
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate(View.TermsOfService)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-file-contract text-[10px] text-teal-500"></i> Termos de Uso
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate(View.CookiePolicy)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-cookie text-[10px] text-teal-500"></i> Política de Cookies
              </button>
            </li>
            <li>
              <button onClick={onOpenCookiePreferences} className="text-amber-400 hover:text-amber-300 transition flex items-center gap-1.5 font-semibold">
                <i className="fas fa-sliders text-[10px]"></i> Preferências de Cookies (LGPD)
              </button>
            </li>
          </ul>
        </div>

        {/* Coluna 4: Soluções em Saúde & Bem-Estar (SEO Key Topics) */}
        <div>
          <h3 className="text-white font-bold text-sm mb-3 border-b border-gray-800 pb-1">
            Soluções & Especialidades
          </h3>
          <ul className="space-y-2 text-gray-400">
            <li>
              <button onClick={() => onNavigate(View.Dashboard)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-apple-whole text-[10px] text-teal-500"></i> Scanner de Refeições com IA
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate(View.Onboarding)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-droplet text-[10px] text-teal-500"></i> Diário de Glicemia & Medicamentos
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate(View.PartnerSpecialists)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-user-doctor text-[10px] text-teal-500"></i> Especialistas Parceiros & Treinos
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate(View.Settings)} className="hover:text-teal-400 transition flex items-center gap-1.5">
                <i className="fas fa-scale-balanced text-[10px] text-teal-500"></i> Composição Corporal & Metas
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Rodapé Inferior & Copyright */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-gray-800 text-center text-[11px] text-gray-500 space-y-2">
        <p>
          &copy; {new Date().getFullYear()} NutriSaúdeVital (<code>nutrisaudevital.com.br</code>). Todos os direitos reservados.
        </p>
        <p className="max-w-4xl mx-auto text-gray-600 leading-normal">
          Isenção de Responsabilidade: O NutriSaúdeVital é um sistema de apoio ao monitoramento de saúde e estilo de vida. As estimativas nutricionais e recomendações não substituem a consulta, diagnóstico ou acompanhamento de médicos, nutricionistas ou profissionais de educação física.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

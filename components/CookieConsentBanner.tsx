import React, { useState, useEffect } from 'react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  hasConsented: boolean;
}

const COOKIE_STORAGE_KEY = 'nutri_cookie_consent_v2';

export const CookieConsentBanner: React.FC<{
  forceOpenModal?: boolean;
  onModalClose?: () => void;
}> = ({ forceOpenModal = false, onModalClose }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
    hasConsented: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPrefs(parsed);
        applyConsentMode(parsed);
        if (!parsed.hasConsented) {
          setShowBanner(true);
        }
      } catch (e) {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  useEffect(() => {
    if (forceOpenModal) {
      setShowModal(true);
    }
  }, [forceOpenModal]);

  const applyConsentMode = (preferences: CookiePreferences) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        'analytics_storage': preferences.analytics ? 'granted' : 'denied',
        'ad_storage': preferences.marketing ? 'granted' : 'denied',
        'ad_user_data': preferences.marketing ? 'granted' : 'denied',
        'ad_personalization': preferences.marketing ? 'granted' : 'denied',
      });
    }
  };

  const savePreferences = (newPrefs: CookiePreferences) => {
    const updated = { ...newPrefs, hasConsented: true };
    setPrefs(updated);
    localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(updated));
    applyConsentMode(updated);
    setShowBanner(false);
    setShowModal(false);
    if (onModalClose) onModalClose();
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      hasConsented: true,
    });
  };

  const handleRejectNonEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      hasConsented: true,
    });
  };

  if (!showBanner && !showModal) {
    return null;
  }

  return (
    <>
      {/* CAMADA 1: BANNER INICIAL */}
      {showBanner && !showModal && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900/95 text-white backdrop-blur-md border-t border-teal-500/30 shadow-2xl animate-fade-in">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-lg text-2xl flex-shrink-0 mt-0.5">
                <i className="fas fa-cookie-bite"></i>
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Privacidade & Cookies no NutriSaúdeVital
                  <span className="text-[10px] bg-teal-500/30 text-teal-300 font-semibold px-2 py-0.5 rounded border border-teal-400/30">
                    LGPD / AdSense Compliant
                  </span>
                </h3>
                <p className="text-xs text-gray-300 mt-1 max-w-3xl leading-relaxed">
                  Utilizamos cookies essenciais para o funcionamento do app, além de cookies de análise (Google Analytics) e anúncios (Google AdSense) para personalizar sua experiência e manter nosso serviço gratuito. Você pode aceitar todos, recusar não essenciais ou personalizar por categoria.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
              <button
                onClick={() => setShowModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition border border-gray-700"
              >
                <i className="fas fa-sliders mr-1.5"></i>
                Personalizar
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="px-3.5 py-2 text-xs font-semibold text-gray-200 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Apenas Essenciais
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-xs font-bold text-gray-950 bg-teal-400 hover:bg-teal-300 rounded-lg shadow-md transition"
              >
                Aceitar Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAMADA 2: MODAL DETALHADO DE PREFERÊNCIAS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b dark:border-gray-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <i className="fas fa-shield-halved text-2xl text-teal-500"></i>
                <div>
                  <h2 className="text-xl font-bold">Central de Preferências de Privacidade</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Conformidade LGPD & Google Consent Mode v2</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  if (onModalClose) onModalClose();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Quando você visita o NutriSaúdeVital, podemos armazenar ou recuperar informações no seu navegador através de cookies. Ajuste os seletores abaixo conforme suas preferências de privacidade:
            </p>

            <div className="space-y-4 mb-6">
              {/* Opção 1: Essenciais */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm">Cookies Estritamente Necessários</h4>
                    <span className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 px-2 py-0.5 rounded font-semibold">
                      Sempre Ativo
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Essenciais para autenticação, segurança (CSRF) e navegação básica na plataforma. Não podem ser desativados.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  className="mt-1 h-5 w-5 accent-teal-600 rounded cursor-not-allowed opacity-80"
                />
              </div>

              {/* Opção 2: Analíticos */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Cookies Analíticos (Google Analytics)</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ajudam a entender como os usuários interagem com as ferramentas (sem identificar diretamente o indivíduo), permitindo a melhoria contínua da performance.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                  className="mt-1 h-5 w-5 accent-teal-600 rounded cursor-pointer"
                />
              </div>

              {/* Opção 3: Anúncios / AdSense */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-gray-900 dark:text-white">Anúncios & Personalização (Google AdSense)</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Permite a exibição de anúncios relevantes e personalizados. Esses anúncios ajudam a financiar o desenvolvimento gratuito da plataforma.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                  className="mt-1 h-5 w-5 accent-teal-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t dark:border-gray-800">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Consulte nossa <a href="#privacy" className="underline hover:text-teal-500">Política de Privacidade</a> para mais detalhes.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleRejectNonEssential}
                  className="w-1/2 sm:w-auto px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition"
                >
                  Recusar Opcionais
                </button>
                <button
                  onClick={() => savePreferences(prefs)}
                  className="w-1/2 sm:w-auto px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-md transition"
                >
                  Salvar Minhas Escolhas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsentBanner;

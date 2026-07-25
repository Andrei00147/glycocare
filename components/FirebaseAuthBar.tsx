import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, User } from '../src/firebase';

interface FirebaseAuthBarProps {
  onUserChanged?: (user: User | null) => void;
}

export const FirebaseAuthBar: React.FC<FirebaseAuthBarProps> = ({ onUserChanged }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      if (onUserChanged) {
        onUserChanged(user);
      }
    });
    return () => unsubscribe();
  }, [onUserChanged]);

  const handleLogin = async () => {
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg('Falha ao autenticar com o Google. Tente novamente.');
    }
  };

  const handleLogout = async () => {
    setErrorMsg(null);
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error('Logout error:', err);
      setErrorMsg('Erro ao sair da conta.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 text-xs shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
        
        {/* Left Side: Cloud Sync Status */}
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-1.5 font-bold text-gray-700 dark:text-gray-200">
            <i className="fas fa-cloud text-teal-500"></i>
            <span>Sincronização Cloud:</span>
            <span className="text-teal-600 dark:text-teal-400 font-extrabold bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-md border border-teal-200/60 dark:border-teal-800/60">
              Ativa & Segura
            </span>
          </div>
        </div>

        {/* Right Side: User Auth */}
        <div className="flex items-center gap-3">
          {errorMsg && (
            <span className="text-red-500 text-[11px] font-semibold">{errorMsg}</span>
          )}

          {loading ? (
            <div className="flex items-center gap-1.5 text-gray-400 font-medium">
              <i className="fas fa-circle-notch fa-spin"></i>
              <span>Verificando conta...</span>
            </div>
          ) : currentUser ? (
            <div className="flex items-center gap-3 bg-teal-50 dark:bg-gray-700/60 pl-2 pr-3 py-1 rounded-xl border border-teal-200/70 dark:border-gray-600">
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Usuário'}
                    className="w-6 h-6 rounded-full border border-teal-400"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                <div className="text-left leading-tight">
                  <span className="block font-bold text-gray-800 dark:text-gray-100 text-[11px]">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">
                    <i className="fas fa-cloud-check mr-0.5"></i> Sincronizado
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sair da conta Google"
                className="ml-1 text-gray-400 hover:text-red-500 transition px-1.5 py-0.5 rounded hover:bg-white dark:hover:bg-gray-600"
              >
                <i className="fas fa-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center gap-2 group"
            >
              <i className="fab fa-google text-amber-300"></i>
              <span>Entrar com Google</span>
              <span className="text-[10px] font-normal opacity-90 hidden sm:inline">(Sincronizar Dados)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default FirebaseAuthBar;

import React, { useState } from 'react';
import { PartnerCoupon, PARTNER_COUPONS } from '../data/partnerCoupons';
import { OralMedication } from '../types';

interface PartnerCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetItem?: OralMedication | null;
  recommendedCoupon?: PartnerCoupon | null;
}

export const PartnerCouponModal: React.FC<PartnerCouponModalProps> = ({
  isOpen,
  onClose,
  targetItem,
  recommendedCoupon
}) => {
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<PartnerCoupon>(() => recommendedCoupon || PARTNER_COUPONS[0]);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => {
      setCopiedCoupon(null);
    }, 2500);
  };

  const handleOpenStore = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 dark:border-gray-700 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-gray-900 via-teal-950 to-gray-900 text-white flex justify-between items-center relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-teal-500/30 text-teal-300 px-2 py-0.5 rounded-full border border-teal-400/30">
                Parcerias Oficiais & Vantagens
              </span>
            </div>
            <h3 className="text-lg font-black text-white flex items-center gap-2 mt-1">
              <i className="fas fa-ticket-simple text-teal-400"></i>
              {targetItem ? `Reposição de ${targetItem.name}` : 'Cupons Exclusivos de Suplementos'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Target Item Alert Banner if triggered by low stock */}
          {targetItem && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3.5 rounded-2xl flex items-start gap-3">
              <span className="p-2 bg-amber-500 text-white rounded-xl text-sm flex-shrink-0 mt-0.5">
                <i className="fas fa-bell"></i>
              </span>
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-amber-950 dark:text-amber-100">
                  Estoque de {targetItem.name} atingiu nível baixo!
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Restam apenas <strong>{targetItem.stock} {targetItem.unit || 'doses'}</strong>. Utilize o cupom da nossa marca parceira abaixo para garantir seu desconto na reposição.
                </p>
              </div>
            </div>
          )}

          {/* Featured Active Coupon Card */}
          <div className={`p-5 rounded-2xl bg-gradient-to-br ${selectedBrand.bannerGradient} text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  {selectedBrand.brandCategory}
                </span>
                <h4 className="text-xl font-black mt-1 flex items-center gap-2">
                  <i className={`fas ${selectedBrand.logoIcon}`}></i>
                  {selectedBrand.brandName}
                </h4>
              </div>
              <span className="bg-yellow-400 text-yellow-950 text-xs font-black px-2.5 py-1 rounded-full shadow">
                {selectedBrand.discountBadge}
              </span>
            </div>

            <p className="text-xs text-white/90 mb-4 leading-relaxed">
              {selectedBrand.description}
            </p>

            {/* Coupon Code Block */}
            <div className="bg-black/30 backdrop-blur-md p-3 rounded-xl border border-white/20 flex items-center justify-between gap-2">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-white/70 block">
                  Código do Cupom de Desconto:
                </span>
                <span className="text-lg font-black tracking-widest font-mono text-yellow-300">
                  {selectedBrand.couponCode}
                </span>
              </div>

              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyCode(selectedBrand.couponCode)}
                  className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs rounded-lg transition shadow flex items-center gap-1.5 active:scale-95"
                >
                  <i className={`fas ${copiedCoupon === selectedBrand.couponCode ? 'fa-check text-emerald-600' : 'fa-copy'}`}></i>
                  {copiedCoupon === selectedBrand.couponCode ? 'Copiado!' : 'Copiar'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenStore(selectedBrand.affiliateUrl)}
                  className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 font-black text-xs rounded-lg transition shadow flex items-center gap-1.5 active:scale-95"
                >
                  <i className="fas fa-external-link-alt text-[10px]"></i>
                  Ir à Loja
                </button>
              </div>
            </div>
          </div>

          {/* Quick Switch to Other Partner Brands */}
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Outras Lojas & Marcas Parceiras:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PARTNER_COUPONS.map(brand => {
                const isSelected = selectedBrand.id === brand.id;
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 hover:bg-gray-100 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white bg-gradient-to-br ${brand.bannerGradient}`}>
                        <i className={`fas ${brand.logoIcon}`}></i>
                      </span>
                      <div className="truncate">
                        <p className="text-xs font-bold truncate">{brand.brandName}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{brand.discountBadge}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <i className="fas fa-check-circle text-teal-600 text-xs ml-1 flex-shrink-0"></i>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex justify-between items-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            <i className="fas fa-shield-check text-teal-600 mr-1"></i>
            Cupons verificados e válidos para a comunidade NutriSaúde.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

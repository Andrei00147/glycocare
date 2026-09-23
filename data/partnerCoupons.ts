import { OralMedication } from '../types';

/**
 * Feature flag to control whether partner brand coupons and sponsor hub
 * are visible to users in the UI. Keep false until actual sponsorship contracts are active.
 */
export const ENABLE_PARTNER_COUPONS_UI = false;

export interface PartnerCoupon {
  id: string;
  brandName: string;
  brandCategory: 'Whey & Proteínas' | 'Creatina & Aminoácidos' | 'Vitaminas & Minerais' | 'Ômega 3 & Longevidade' | 'Farmácia & Saúde';
  discountPercentage: number;
  discountBadge: string;
  couponCode: string;
  affiliateUrl: string;
  description: string;
  applicableKeywords: string[];
  bannerGradient: string;
  logoIcon: string;
}

export const PARTNER_COUPONS: PartnerCoupon[] = [
  {
    id: 'growth-supplements',
    brandName: 'Growth Supplements',
    brandCategory: 'Whey & Proteínas',
    discountPercentage: 10,
    discountBadge: '10% OFF',
    couponCode: 'NUTRI10',
    affiliateUrl: 'https://www.gsuplementos.com.br',
    description: 'Válido para Whey Protein Concentrado/Isolado, Creatina Creapure e Multivitamínicos.',
    applicableKeywords: ['whey', 'proteina', 'creatina', 'creapure', 'bcaa', 'glutamina', 'growth'],
    bannerGradient: 'from-orange-600 to-red-600',
    logoIcon: 'fa-bolt'
  },
  {
    id: 'dux-nutrition',
    brandName: 'Dux Nutrition Lab',
    brandCategory: 'Whey & Proteínas',
    discountPercentage: 15,
    discountBadge: '15% OFF',
    couponCode: 'VITAL15',
    affiliateUrl: 'https://www.duxnutrition.com',
    description: 'Linha premium de Whey Isolado, Creatina Monohidratada e Pré-treinos.',
    applicableKeywords: ['dux', 'whey isolado', 'whey hidrolisado', 'pre-treino', 'pre treino'],
    bannerGradient: 'from-amber-600 to-yellow-600',
    logoIcon: 'fa-crown'
  },
  {
    id: 'max-titanium',
    brandName: 'Max Titanium',
    brandCategory: 'Creatina & Aminoácidos',
    discountPercentage: 12,
    discountBadge: '12% OFF',
    couponCode: 'MAXSAUDE12',
    affiliateUrl: 'https://www.maxtitanium.com.br',
    description: 'Desconto exclusivo em Creatina 100%, 100% Whey e barras proteicas.',
    applicableKeywords: ['max', 'max titanium', 'creatina', 'horus', 'dr peanut'],
    bannerGradient: 'from-red-600 to-rose-700',
    logoIcon: 'fa-fire'
  },
  {
    id: 'essential-nutrition',
    brandName: 'Essential Nutrition',
    brandCategory: 'Ômega 3 & Longevidade',
    discountPercentage: 10,
    discountBadge: '10% OFF',
    couponCode: 'ESSENTIAL10',
    affiliateUrl: 'https://www.essentialnutrition.com.br',
    description: 'Super Ômega 3 TG, Immuno Whey, Colágeno e suplementos com pureza garantida.',
    applicableKeywords: ['essential', 'omega 3', 'omega', 'colageno', 'imunidade', 'vitamina d'],
    bannerGradient: 'from-teal-600 to-emerald-700',
    logoIcon: 'fa-shield-heart'
  },
  {
    id: 'vitafor-nutrientes',
    brandName: 'Vitafor Nutrientes',
    brandCategory: 'Vitaminas & Minerais',
    discountPercentage: 15,
    discountBadge: '15% OFF',
    couponCode: 'VITAFOR15',
    affiliateUrl: 'https://www.vitafor.com.br',
    description: 'Complexo B, Vitamina D3+K2, Magnésio Quelato, Probióticos e Coenzima Q10.',
    applicableKeywords: ['vitafor', 'vitamina', 'magnesio', 'probiotico', 'coenzima', 'zinco', 'complexo b'],
    bannerGradient: 'from-blue-600 to-indigo-700',
    logoIcon: 'fa-capsules'
  },
  {
    id: 'oficial-farma',
    brandName: 'OficialFarma (Manipulação)',
    brandCategory: 'Farmácia & Saúde',
    discountPercentage: 15,
    discountBadge: '15% OFF',
    couponCode: 'MANIPULA15',
    affiliateUrl: 'https://www.oficialfarma.com.br',
    description: 'Fórmulas manipuladas personalizadas, fitoterápicos, melatonina e polivitamínicos.',
    applicableKeywords: ['oficial', 'farma', 'manipulado', 'melatonina', 'curcumina', 'ashwagandha'],
    bannerGradient: 'from-purple-600 to-indigo-800',
    logoIcon: 'fa-flask'
  },
  {
    id: 'drogasil-parceira',
    brandName: 'Rede Drogasil & Raia',
    brandCategory: 'Farmácia & Saúde',
    discountPercentage: 10,
    discountBadge: '10% OFF',
    couponCode: 'SAUDE10',
    affiliateUrl: 'https://www.drogasil.com.br',
    description: 'Desconto em medicamentos contínuos, fitas glicêmicas e suplementação geral.',
    applicableKeywords: ['metformina', 'gliclazida', 'losartana', 'medicamento', 'insulina', 'agulhas'],
    bannerGradient: 'from-cyan-600 to-blue-700',
    logoIcon: 'fa-hospital'
  }
];

export function findBestPartnerCoupon(item?: OralMedication | null): PartnerCoupon {
  if (!item || !item.name) {
    return PARTNER_COUPONS[0];
  }

  const query = `${item.name} ${item.brand || ''}`.toLowerCase();

  // Try direct keyword matching
  const matched = PARTNER_COUPONS.find(coupon => 
    coupon.applicableKeywords.some(keyword => query.includes(keyword))
  );

  if (matched) return matched;

  // If item is a supplement, default to Growth or Dux
  if (item.category === 'supplement') {
    return PARTNER_COUPONS[0]; // Growth
  }

  // If medication, default to Drogasil / Farmácia
  return PARTNER_COUPONS[PARTNER_COUPONS.length - 1];
}

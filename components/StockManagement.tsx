import React, { useState, useMemo } from 'react';
import { UserProfile, OralMedication, DiabetesType } from '../types';
import { PARTNER_COUPONS, findBestPartnerCoupon, PartnerCoupon, ENABLE_PARTNER_COUPONS_UI } from '../data/partnerCoupons';
import { PartnerCouponModal } from './PartnerCouponModal';

interface OralMedicationModalProps {
    onSave: (med: OralMedication) => void;
    onClose: () => void;
    initialData?: OralMedication | null;
    isDiabetic: boolean;
}

const POPULAR_SUPPLEMENT_PRESETS = [
    { name: 'Whey Protein', brand: 'Growth / Dux / Max', unit: 'scoops' as const, stock: 30, threshold: 5, dailyDoses: 1, category: 'supplement' as const },
    { name: 'Creatina Monohidratada', brand: 'Creapure', unit: 'doses' as const, stock: 60, threshold: 7, dailyDoses: 1, category: 'supplement' as const },
    { name: 'Ômega 3 (EPA/DHA)', brand: 'Essential / Vitafor', unit: 'cápsulas' as const, stock: 60, threshold: 10, dailyDoses: 2, category: 'supplement' as const },
    { name: 'Vitamina D3 + K2', brand: 'Equaliv / Now', unit: 'gotas' as const, stock: 60, threshold: 10, dailyDoses: 1, category: 'supplement' as const },
    { name: 'Multivitamínico & Minerais', brand: 'Centrum / Growth', unit: 'comprimidos' as const, stock: 60, threshold: 10, dailyDoses: 1, category: 'supplement' as const },
    { name: 'Magnésio Dimalato/Quelato', brand: 'OficialFarma', unit: 'cápsulas' as const, stock: 60, threshold: 10, dailyDoses: 2, category: 'supplement' as const },
    { name: 'Pré-Treino / Termogênico', brand: 'Max / Darkness', unit: 'doses' as const, stock: 30, threshold: 5, dailyDoses: 1, category: 'supplement' as const },
];

const OralMedicationModal: React.FC<OralMedicationModalProps> = ({ onSave, onClose, initialData, isDiabetic }) => {
    const [errorMsg, setErrorMsg] = useState('');
    const [med, setMed] = useState<Omit<OralMedication, 'id'>>(() => initialData ? { ...initialData } : {
        name: '',
        category: isDiabetic ? 'medication' : 'supplement',
        brand: '',
        unit: isDiabetic ? 'comprimidos' : 'cápsulas',
        stock: 30,
        threshold: 7,
        dailyDoses: 1,
        source: '',
        cost: 0,
        expiryDate: ''
    });

    const isEditing = !!initialData;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (errorMsg) setErrorMsg('');
        setMed(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleApplyPreset = (preset: typeof POPULAR_SUPPLEMENT_PRESETS[0]) => {
        if (errorMsg) setErrorMsg('');
        setMed(prev => ({
            ...prev,
            name: preset.name,
            brand: preset.brand,
            unit: preset.unit,
            stock: preset.stock,
            threshold: preset.threshold,
            dailyDoses: preset.dailyDoses,
            category: 'supplement'
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!med.name.trim()) {
            setErrorMsg('Por favor, informe o nome do medicamento ou suplemento.');
            return;
        }
        onSave({ ...med, id: initialData?.id || `med-${Date.now()}` });
    };
    
    const inputStyle = "mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium";
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                            {med.category === 'supplement' ? 'Suplementação Nutricional' : 'Medicamento Oral'}
                        </span>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            {isEditing ? `Editar ${med.name}` : (med.category === 'supplement' ? 'Adicionar Suplemento / Vitamina' : 'Adicionar Medicamento')}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Category Selector */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Tipo de Item *
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setMed(p => ({ ...p, category: 'supplement', unit: p.unit === 'comprimidos' ? 'cápsulas' : p.unit }))}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                                    med.category === 'supplement'
                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'
                                }`}
                            >
                                <i className="fas fa-dumbbell text-teal-600"></i>
                                Suplemento / Vitamina
                            </button>
                            <button
                                type="button"
                                onClick={() => setMed(p => ({ ...p, category: 'medication', unit: 'comprimidos' }))}
                                className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                                    med.category === 'medication'
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750'
                                }`}
                            >
                                <i className="fas fa-pills text-blue-600"></i>
                                Medicamento Geral
                            </button>
                        </div>
                    </div>

                    {/* Presets for quick addition */}
                    {med.category === 'supplement' && !isEditing && (
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">
                                Sugestões Rápidas de Suplementos (clique para preencher):
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {POPULAR_SUPPLEMENT_PRESETS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleApplyPreset(preset)}
                                        className="text-[10px] font-semibold bg-gray-100 hover:bg-teal-50 hover:text-teal-700 dark:bg-gray-700 dark:hover:bg-teal-950 dark:hover:text-teal-300 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 transition"
                                    >
                                        + {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                            <label htmlFor="name" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Nome do Item *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={med.name}
                                onChange={handleChange}
                                placeholder={med.category === 'supplement' ? "Ex: 100% Whey Concentrado, Creatina" : "Ex: Metformina 500mg, Losartana"}
                                className={`${inputStyle} ${errorMsg ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                                required
                            />
                            {errorMsg && (
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1 flex items-center gap-1">
                                    <i className="fas fa-exclamation-circle"></i>
                                    {errorMsg}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="brand" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Marca / Fabricante (Opcional)
                            </label>
                            <input
                                type="text"
                                name="brand"
                                value={med.brand || ''}
                                onChange={handleChange}
                                placeholder="Ex: Growth, Dux, Max, Essential"
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label htmlFor="unit" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Unidade de Medida
                            </label>
                            <select
                                name="unit"
                                value={med.unit || 'comprimidos'}
                                onChange={handleChange}
                                className={inputStyle}
                            >
                                <option value="cápsulas">Cápsulas</option>
                                <option value="comprimidos">Comprimidos</option>
                                <option value="scoops">Scoops / Doses</option>
                                <option value="doses">Doses</option>
                                <option value="gramas">Gramas (g)</option>
                                <option value="sachês">Sachês</option>
                                <option value="gotas">Gotas</option>
                                <option value="unidades">Unidades</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="stock" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Estoque Atual ({med.unit || 'unidades'})
                            </label>
                            <input
                                type="number"
                                name="stock"
                                min="0"
                                value={med.stock}
                                onChange={handleChange}
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label htmlFor="threshold" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Alerta de Estoque Baixo (quando restar menos de)
                            </label>
                            <input
                                type="number"
                                name="threshold"
                                min="1"
                                value={med.threshold}
                                onChange={handleChange}
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label htmlFor="dailyDoses" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Consumo Diário ({med.unit || 'doses'} / dia)
                            </label>
                            <input
                                type="number"
                                name="dailyDoses"
                                min="0.1"
                                step="0.5"
                                value={med.dailyDoses}
                                onChange={handleChange}
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label htmlFor="expiryDate" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Data de Validade
                            </label>
                            <input
                                type="date"
                                name="expiryDate"
                                value={med.expiryDate || ''}
                                onChange={handleChange}
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label htmlFor="source" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Onde Comprou / Loja
                            </label>
                            <input
                                type="text"
                                name="source"
                                value={med.source || ''}
                                onChange={handleChange}
                                placeholder="Ex: Loja Oficial, Farmácia, Site"
                                className={inputStyle}
                            />
                        </div>

                        <div>
                            <label htmlFor="cost" className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Custo (R$)
                            </label>
                            <input
                                type="number"
                                name="cost"
                                step="0.01"
                                min="0"
                                value={med.cost || 0}
                                onChange={handleChange}
                                className={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 sticky bottom-0 z-10 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-1/3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="w-2/3 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl shadow text-xs transition flex items-center justify-center gap-1.5"
                    >
                        <i className="fas fa-check"></i>
                        {isEditing ? 'Salvar Alterações' : 'Cadastrar no Estoque'}
                    </button>
                </div>
            </form>
        </div>
    );
};

interface AddStockModalProps {
    onClose: () => void;
    onSave: (quantity: number) => void;
    itemName: string;
    unit?: string;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ onClose, onSave, itemName, unit = 'unidades' }) => {
    const [quantity, setQuantity] = useState('30');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(quantity);
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor, insira uma quantidade válida maior que zero.");
            return;
        }
        onSave(amount);
    };

    const quickAmounts = [15, 30, 60, 100];
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full border dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <i className="fas fa-plus-circle text-teal-600"></i>
                        Adicionar ao Estoque
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
                </div>

                <div className="p-5 space-y-4">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                        Adicionar reposição para <span className="font-bold text-gray-900 dark:text-white">{itemName}</span>:
                    </p>

                    <div>
                        <label htmlFor="quantity" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            Quantidade a adicionar ({unit})
                        </label>
                        <input
                            type="number"
                            id="quantity"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold text-lg"
                            placeholder="Ex: 30"
                            autoFocus
                            required
                        />
                    </div>

                    <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                            Atalhos Rápidos:
                        </span>
                        <div className="flex gap-2">
                            {quickAmounts.map(amt => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setQuantity(String(amt))}
                                    className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-950 text-xs font-bold rounded-lg border dark:border-gray-600 transition"
                                >
                                    +{amt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-1/3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300"
                    >
                        Voltar
                    </button>
                    <button
                        type="submit"
                        className="w-2/3 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition"
                    >
                        Confirmar Entrada
                    </button>
                </div>
            </form>
        </div>
    );
};

interface StockManagementProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: Partial<UserProfile>) => void;
  onBack: () => void;
}

const StockManagement: React.FC<StockManagementProps> = ({ userProfile, onUpdateProfile, onBack }) => {
    const [newPens, setNewPens] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState('');
    
    const [isMedModalOpen, setMedModalOpen] = useState(false);
    const [editingMed, setEditingMed] = useState<OralMedication | null>(null);
    const [addingStockToMed, setAddingStockToMed] = useState<OralMedication | null>(null);
    const [itemToDelete, setItemToDelete] = useState<OralMedication | null>(null);
    
    // Partner Coupon State
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [couponTargetItem, setCouponTargetItem] = useState<OralMedication | null>(null);
    const [couponTargetBrand, setCouponTargetBrand] = useState<PartnerCoupon | null>(null);
    const [copiedCouponId, setCopiedCouponId] = useState<string | null>(null);

    const isDiabetic = useMemo(() => {
        if (userProfile.clinicalTrack) {
            return userProfile.clinicalTrack === 'diabetes';
        }
        if (userProfile.diabetesType) {
            return userProfile.diabetesType !== DiabetesType.None;
        }
        return Boolean(userProfile.useInsulin || userProfile.useOralMedication);
    }, [userProfile]);

    const trackSupplements = userProfile.trackSupplements !== false;

    // Normalizing item IDs so that deletion and editing are always 100% stable
    const allItems: OralMedication[] = useMemo(() => {
        return (userProfile.oralMedications || []).map((item, idx) => ({
            ...item,
            id: item.id || `med-item-${idx}-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
        }));
    }, [userProfile.oralMedications]);

    const supplements = allItems.filter(item => item.category === 'supplement' || (!isDiabetic && !item.category));
    const medications = allItems.filter(item => item.category === 'medication' || (isDiabetic && !item.category));

    // Identify low stock items for automated alert
    const lowStockSupplements = supplements.filter(s => s.stock <= s.threshold);

    const handleOpenCouponForItem = (item: OralMedication) => {
        const bestCoupon = findBestPartnerCoupon(item);
        setCouponTargetItem(item);
        setCouponTargetBrand(bestCoupon);
        setIsCouponModalOpen(true);
    };

    const handleOpenPartnerHub = (brand?: PartnerCoupon) => {
        setCouponTargetItem(null);
        setCouponTargetBrand(brand || PARTNER_COUPONS[0]);
        setIsCouponModalOpen(true);
    };

    const handleCopyInlineCoupon = (coupon: PartnerCoupon) => {
        navigator.clipboard.writeText(coupon.couponCode);
        setCopiedCouponId(coupon.id);
        setShowConfirmation(`Cupom ${coupon.couponCode} copiado com sucesso!`);
        setTimeout(() => {
            setCopiedCouponId(null);
            setShowConfirmation('');
        }, 2500);
    };

    const handleToggleTrackSupplements = () => {
        const nextVal = !trackSupplements;
        onUpdateProfile({ trackSupplements: nextVal });
        setShowConfirmation(nextVal ? 'Controle de suplementos ativado!' : 'Controle de suplementos desativado.');
        setTimeout(() => setShowConfirmation(''), 2000);
    };

    const handleAddInsulin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const pensToAdd = parseInt(newPens, 10);
        if (isNaN(pensToAdd) || pensToAdd <= 0) {
            setShowConfirmation("Por favor, insira um número válido.");
            setIsSaving(false);
            setTimeout(() => setShowConfirmation(''), 2000);
            return;
        }

        const unitsPerPen = userProfile.insulinUnitsPerPen || 300;
        const unitsToAdd = pensToAdd * unitsPerPen;
        const currentStock = userProfile.currentInsulinStockUnits || 0;
        const newTotalStock = currentStock + unitsToAdd;
        onUpdateProfile({ currentInsulinStockUnits: newTotalStock });
        
        setTimeout(() => {
            setIsSaving(false);
            setNewPens('');
            setShowConfirmation('Estoque de insulina atualizado!');
            setTimeout(() => setShowConfirmation(''), 2000);
        }, 400);
    };

    const handleSaveItem = (item: OralMedication) => {
        const itemToSave: OralMedication = {
            ...item,
            id: item.id || `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        };
        const isEditing = allItems.some(m => m.id === itemToSave.id);
        const updatedItems = isEditing 
            ? allItems.map(m => m.id === itemToSave.id ? itemToSave : m)
            : [...allItems, itemToSave];
            
        onUpdateProfile({
            oralMedications: updatedItems,
            useOralMedication: updatedItems.some(i => i.category === 'medication') || userProfile.useOralMedication,
            trackSupplements: true
        });
        setMedModalOpen(false);
        setEditingMed(null);
        setShowConfirmation(`${itemToSave.name} ${isEditing ? 'atualizado' : 'adicionado'} com sucesso!`);
        setTimeout(() => setShowConfirmation(''), 2000);
    };

    const handleAddToStock = (quantity: number) => {
        if (!addingStockToMed) return;
        const updatedItems = allItems.map(m => 
            m.id === addingStockToMed.id ? { ...m, stock: m.stock + quantity } : m
        );
        onUpdateProfile({ oralMedications: updatedItems });
        setShowConfirmation(`Estoque de ${addingStockToMed.name} atualizado (+${quantity})!`);
        setAddingStockToMed(null);
        setTimeout(() => setShowConfirmation(''), 2000);
    };
    
    const handleConfirmDelete = () => {
        if (!itemToDelete) return;
        const targetId = itemToDelete.id;
        const targetName = (itemToDelete.name || '').trim().toLowerCase();
        const targetCategory = itemToDelete.category || 'medication';

        const updatedItems = allItems.filter(m => {
            if (targetId && m.id === targetId) return false;
            if (m.name && m.name.trim().toLowerCase() === targetName && (m.category || 'medication') === targetCategory) return false;
            return true;
        });

        onUpdateProfile({
            oralMedications: updatedItems,
            useOralMedication: updatedItems.some(i => i.category === 'medication')
        });
        setShowConfirmation(`"${itemToDelete.name}" foi removido do estoque.`);
        setItemToDelete(null);
        setTimeout(() => setShowConfirmation(''), 2500);
    };
    
    const openEditModal = (item: OralMedication) => {
        setEditingMed(item);
        setMedModalOpen(true);
    };

    const openAddModal = (defaultCategory: 'supplement' | 'medication') => {
        setEditingMed({
            id: '',
            name: '',
            category: defaultCategory,
            unit: defaultCategory === 'supplement' ? 'scoops' : 'comprimidos',
            stock: 30,
            threshold: 7,
            dailyDoses: 1,
            source: '',
            cost: 0,
            expiryDate: ''
        });
        setMedModalOpen(true);
    };

    const inputStyle = "flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm";
    const buttonPrimary = "bg-teal-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-teal-700 transition shadow flex items-center justify-center text-sm disabled:bg-gray-400";

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
            <header className="flex items-center justify-between border-b dark:border-gray-700 pb-4">
                <button onClick={onBack} className="text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1.5 text-sm font-bold">
                    <i className="fas fa-arrow-left"></i> Voltar ao Painel
                </button>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        {isDiabetic ? 'Controle Terapêutico & Nutricional' : 'Suplementos & Vitaminas'}
                    </span>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                        {isDiabetic ? 'Gerenciamento de Estoque' : 'Estoque de Suplementação'}
                    </h1>
                </div>
                <div className="w-16"></div>
            </header>

            {/* Automated Low-Stock Alert */}
            {lowStockSupplements.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 sm:p-5 text-amber-950 dark:text-amber-200 shadow-sm animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-amber-200 dark:bg-amber-900 rounded-lg text-xs text-amber-900 dark:text-amber-200">
                                    <i className="fas fa-exclamation-triangle"></i>
                                </span>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
                                    Alerta de Estoque Baixo
                                </span>
                            </div>
                            <h3 className="text-base font-black text-amber-950 dark:text-amber-100">
                                {lowStockSupplements.length} {lowStockSupplements.length === 1 ? 'suplemento atingiu' : 'suplementos atingiram'} o nível mínimo
                            </h3>
                            <p className="text-xs text-amber-900/90 dark:text-amber-200/90 max-w-xl leading-relaxed">
                                {lowStockSupplements.map(item => `${item.name} (${item.stock} ${item.unit || 'doses'} restantes)`).join(', ')}.
                                Reabasteça suas unidades para manter seu plano nutricional sem interrupções.
                            </p>
                        </div>

                        {ENABLE_PARTNER_COUPONS_UI && (
                            <div className="flex flex-wrap gap-2 self-stretch sm:self-center">
                                <button
                                    type="button"
                                    onClick={() => handleOpenCouponForItem(lowStockSupplements[0])}
                                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-yellow-300 hover:bg-yellow-400 text-yellow-950 text-xs font-black rounded-xl transition shadow flex items-center justify-center gap-1.5 active:scale-95"
                                >
                                    <i className="fas fa-gift"></i>
                                    Resgatar Cupom de Reposição
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Non-diabetic toggle card */}
            {!isDiabetic && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/60 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs">
                                <i className="fas fa-dumbbell"></i>
                            </span>
                            <h3 className="font-bold text-emerald-950 dark:text-emerald-100 text-sm">
                                Controle de Suplementos e Vitaminas
                            </h3>
                        </div>
                        <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-xl">
                            Acompanhe quando seu Whey Protein, Creatina, Ômega 3, Vitaminas e Fórmulas manipuladas estão acabando para repor com antecedência e nunca quebrar sua constância.
                        </p>
                    </div>

                    <button
                        onClick={handleToggleTrackSupplements}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm ${
                            trackSupplements
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300'
                        }`}
                    >
                        <i className={`fas ${trackSupplements ? 'fa-toggle-on text-base' : 'fa-toggle-off text-base'}`}></i>
                        {trackSupplements ? 'Controle Ativo' : 'Ativar Controle'}
                    </button>
                </div>
            )}

            {/* Insulin Management (Only for diabetic users who use insulin) */}
            {isDiabetic && userProfile.useInsulin && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <i className="fas fa-syringe text-indigo-500"></i>
                            Estoque de Insulina
                        </h2>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-full">
                            {userProfile.insulinType || 'Insulina'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-4">
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-4 rounded-xl text-center border border-indigo-100 dark:border-indigo-900/50">
                            <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Estoque Atual Restante</p>
                            <p className="text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 my-1">
                                {userProfile.currentInsulinStockUnits || 0} <span className="text-lg font-normal">UI</span>
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                ~{Math.floor((userProfile.currentInsulinStockUnits || 0) / (userProfile.averageDailyUnits || 30))} dias de autonomia
                            </p>
                        </div>

                        <form onSubmit={handleAddInsulin} className="space-y-2">
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                                Adicionar Canetas / Frascos ({userProfile.insulinUnitsPerPen || 300} UI cada):
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={newPens}
                                    onChange={(e) => setNewPens(e.target.value)}
                                    className={inputStyle}
                                    placeholder="Nº de canetas"
                                    min="1"
                                    required
                                />
                                <button type="submit" disabled={isSaving || !newPens} className={buttonPrimary}>
                                    {isSaving ? 'Salvando...' : 'Adicionar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Oral Medications (For diabetic or medication-tracking users) */}
            {isDiabetic && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <i className="fas fa-pills text-blue-500"></i>
                                Medicamentos Orais & Antidiabéticos
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Controle de Metformina, Gliclazida, Anti-hipertensivos, etc.</p>
                        </div>
                        <button
                            onClick={() => openAddModal('medication')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                        >
                            <i className="fas fa-plus"></i>
                            Adicionar Remédio
                        </button>
                    </div>

                    <div className="space-y-3">
                        {medications.length > 0 ? medications.map(med => {
                            const daysRemaining = med.dailyDoses > 0 ? Math.floor(med.stock / med.dailyDoses) : null;
                            const isLow = med.stock <= med.threshold;

                            return (
                                <div key={med.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition ${
                                    isLow
                                        ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                }`}>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{med.name}</h3>
                                            {med.brand && (
                                                <span className="text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md font-semibold">
                                                    {med.brand}
                                                </span>
                                            )}
                                            {isLow && (
                                                <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                                                    Estoque Baixo
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                                            <span>
                                                Estoque: <strong className="text-blue-600 dark:text-blue-400 font-bold">{med.stock}</strong> {med.unit || 'comprimidos'}
                                            </span>
                                            <span>Dose: <strong>{med.dailyDoses}</strong>/dia</span>
                                            {daysRemaining !== null && (
                                                <span>Autonomia: <strong>~{daysRemaining} dias</strong></span>
                                            )}
                                            {med.expiryDate && (
                                                <span className="text-gray-400">Validade: {new Date(med.expiryDate).toLocaleDateString('pt-BR')}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 self-end sm:self-center">
                                        <button
                                            onClick={() => setAddingStockToMed(med)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                                        >
                                            + Repor
                                        </button>
                                        <button
                                            onClick={() => openEditModal(med)}
                                            className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-800 dark:text-gray-200 font-bold py-1.5 px-2.5 rounded-lg text-xs transition"
                                            title="Editar"
                                        >
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setItemToDelete(med)}
                                            className="bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 font-bold py-1.5 px-2.5 rounded-lg text-xs transition"
                                            title="Excluir"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-4 italic">
                                Nenhum medicamento oral cadastrado. Clique no botão acima para adicionar.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Supplements & Vitamins Section (For BOTH Diabetics and Non-Diabetics) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border dark:border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b dark:border-gray-700 pb-3 gap-2">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <i className="fas fa-dumbbell text-teal-600"></i>
                            Suplementação & Vitaminas Nutricionais
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Whey Protein, Creatina, Ômega 3, Minerais, Vitaminas e Compostos Manipulados
                        </p>
                    </div>

                    <button
                        onClick={() => openAddModal('supplement')}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition flex items-center gap-1.5 shadow"
                    >
                        <i className="fas fa-plus"></i>
                        Adicionar Suplemento
                    </button>
                </div>

                {/* Quick Add Presets Row */}
                <div className="mb-5 bg-teal-50/50 dark:bg-teal-950/30 p-3.5 rounded-xl border border-teal-100 dark:border-teal-900/40">
                    <span className="text-[11px] font-bold text-teal-900 dark:text-teal-200 block mb-2 flex items-center gap-1.5">
                        <i className="fas fa-bolt text-teal-600"></i>
                        Cadastrar rapidamente os suplementos mais consumidos:
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_SUPPLEMENT_PRESETS.slice(0, 5).map((preset, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    handleSaveItem({
                                        id: `supp-${Date.now()}-${idx}`,
                                        name: preset.name,
                                        brand: preset.brand,
                                        category: 'supplement',
                                        unit: preset.unit,
                                        stock: preset.stock,
                                        threshold: preset.threshold,
                                        dailyDoses: preset.dailyDoses
                                    });
                                }}
                                className="text-xs bg-white dark:bg-gray-800 hover:bg-teal-100 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-700 transition shadow-sm flex items-center gap-1"
                            >
                                <i className="fas fa-plus text-[10px] text-teal-600"></i>
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    {supplements.length > 0 ? supplements.map(supp => {
                        const daysRemaining = supp.dailyDoses > 0 ? Math.floor(supp.stock / supp.dailyDoses) : null;
                        const isLow = supp.stock <= supp.threshold;

                        return (
                            <div key={supp.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition ${
                                isLow
                                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                            }`}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="p-1 bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded text-xs">
                                            <i className="fas fa-dumbbell"></i>
                                        </span>
                                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">{supp.name}</h3>
                                        {supp.brand && (
                                            <span className="text-[10px] bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md font-semibold">
                                                {supp.brand}
                                            </span>
                                        )}
                                        {isLow && (
                                            <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">
                                                Acabando em breve!
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                                        <span>
                                            Estoque: <strong className="text-teal-600 dark:text-teal-400 font-bold">{supp.stock}</strong> {supp.unit || 'doses'}
                                        </span>
                                        <span>Dose: <strong>{supp.dailyDoses}</strong> {supp.unit || 'dose'}/dia</span>
                                        {daysRemaining !== null && (
                                            <span>Restam: <strong>~{daysRemaining} dias</strong></span>
                                        )}
                                        {supp.cost ? (
                                            <span className="text-gray-500">R$ {supp.cost.toFixed(2)}</span>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                                    {ENABLE_PARTNER_COUPONS_UI && isLow && (
                                        <button
                                            type="button"
                                            onClick={() => handleOpenCouponForItem(supp)}
                                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black py-1.5 px-3 rounded-lg text-xs transition shadow flex items-center gap-1.5 animate-pulse"
                                        >
                                            <i className="fas fa-gift text-yellow-200"></i>
                                            Cupom Reposição
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setAddingStockToMed(supp)}
                                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                                    >
                                        + Repor
                                    </button>
                                    <button
                                        onClick={() => openEditModal(supp)}
                                        className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-800 dark:text-gray-200 font-bold py-1.5 px-2.5 rounded-lg text-xs transition"
                                        title="Editar"
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setItemToDelete(supp)}
                                        className="bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 text-rose-700 dark:text-rose-300 font-bold py-1.5 px-2.5 rounded-lg text-xs transition"
                                        title="Excluir"
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-center py-6 border border-dashed rounded-xl dark:border-gray-700">
                            <i className="fas fa-box-open text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                Nenhum suplemento cadastrado ainda.
                            </p>
                            <p className="text-[11px] text-gray-400 max-w-sm mx-auto mb-3">
                                Adicione seu Whey Protein, Creatina ou Vitaminas para saber exatamente quando precisa comprar novamente.
                            </p>
                            <button
                                onClick={() => openAddModal('supplement')}
                                className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs transition"
                            >
                                Cadastrar Primeiro Suplemento
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Espaço para Marcas Parceiras & Cupons Oficiais (Ativado via feature flag quando parcerias forem firmadas) */}
            {ENABLE_PARTNER_COUPONS_UI && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md border dark:border-gray-700 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b dark:border-gray-700 pb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full">
                                    Parcerias Oficiais NutriSaúde
                                </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mt-1">
                                <i className="fas fa-tags text-teal-600"></i>
                                Cupons de Desconto para Reposição de Suplementos
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Ao atingir o estoque mínimo, use os cupons exclusivos das marcas parceiras oficiais com até 15% OFF.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleOpenPartnerHub()}
                            className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-3 py-1.5 rounded-xl font-bold hover:bg-teal-100 transition flex items-center gap-1.5"
                        >
                            <i className="fas fa-ticket-simple"></i>
                            Ver Todos os Cupons
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                        {PARTNER_COUPONS.slice(0, 6).map(coupon => {
                            const isCopied = copiedCouponId === coupon.id;
                            return (
                                <div
                                    key={coupon.id}
                                    className="bg-gray-50 dark:bg-gray-750/70 border border-gray-200 dark:border-gray-700 p-4 rounded-xl flex flex-col justify-between space-y-3 transition hover:shadow-md"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-start gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs text-white bg-gradient-to-br ${coupon.bannerGradient}`}>
                                                    <i className={`fas ${coupon.logoIcon}`}></i>
                                                </span>
                                                <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100">{coupon.brandName}</h4>
                                            </div>
                                            <span className="text-[10px] font-black bg-yellow-400 text-yellow-950 px-2 py-0.5 rounded-full shadow-xs">
                                                {coupon.discountBadge}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
                                            {coupon.description}
                                        </p>
                                    </div>

                                    <div className="pt-2 border-t dark:border-gray-700 flex items-center justify-between gap-2">
                                        <div className="bg-white dark:bg-gray-700 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 font-mono text-xs font-black text-teal-700 dark:text-teal-300 tracking-wider">
                                            {coupon.couponCode}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleCopyInlineCoupon(coupon)}
                                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] rounded-lg transition shadow-xs flex items-center gap-1 active:scale-95"
                                                title="Copiar cupom"
                                            >
                                                <i className={`fas ${isCopied ? 'fa-check text-yellow-300' : 'fa-copy'}`}></i>
                                                {isCopied ? 'Copiado!' : 'Copiar'}
                                            </button>
                                            <a
                                                href={coupon.affiliateUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-700 dark:text-gray-200 text-xs rounded-lg transition"
                                                title="Abrir site oficial"
                                            >
                                                <i className="fas fa-external-link-alt"></i>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {itemToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mx-auto">
                            <i className="fas fa-trash-alt"></i>
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                                Remover do Estoque?
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Tem certeza que deseja remover <strong>{itemToDelete.name}</strong>? Este item e seus alertas deixarão de ser contabilizados.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setItemToDelete(null)}
                                className="py-2.5 px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow flex items-center justify-center gap-1.5"
                            >
                                <i className="fas fa-trash-alt text-[10px]"></i>
                                Sim, Remover
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modais */}
            {isMedModalOpen && (
                <OralMedicationModal
                    onClose={() => { setMedModalOpen(false); setEditingMed(null); }}
                    onSave={handleSaveItem}
                    initialData={editingMed}
                    isDiabetic={isDiabetic}
                />
            )}

            {addingStockToMed && (
                <AddStockModal
                    onClose={() => setAddingStockToMed(null)}
                    onSave={handleAddToStock}
                    itemName={addingStockToMed.name}
                    unit={addingStockToMed.unit}
                />
            )}

            {/* Partner Coupon Modal */}
            {ENABLE_PARTNER_COUPONS_UI && (
                <PartnerCouponModal
                    isOpen={isCouponModalOpen}
                    onClose={() => { setIsCouponModalOpen(false); setCouponTargetItem(null); }}
                    targetItem={couponTargetItem}
                    recommendedCoupon={couponTargetBrand}
                />
            )}
            
            {showConfirmation && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white py-2.5 px-5 rounded-xl shadow-2xl z-50 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-200">
                    <i className="fas fa-check-circle"></i>
                    {showConfirmation}
                </div>
            )}
        </div>
    );
};

export default StockManagement;

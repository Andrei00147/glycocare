import React, { useState, useEffect } from 'react';
import { UserProfile, OralMedication } from '../types';

interface OralMedicationModalProps {
    onSave: (med: OralMedication) => void;
    onClose: () => void;
    initialData?: OralMedication | null;
}

const OralMedicationModal: React.FC<OralMedicationModalProps> = ({ onSave, onClose, initialData }) => {
    const [med, setMed] = useState<Omit<OralMedication, 'id'>>(() => initialData ? { ...initialData } : {
        name: '', stock: 0, threshold: 10, dailyDoses: 1, source: '', cost: 0, expiryDate: ''
    });

    const isEditing = !!initialData;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setMed(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!med.name.trim()) { alert('O nome do medicamento é obrigatório.'); return; }
        onSave({ ...med, id: initialData?.id || `med-${new Date().toISOString()}`});
    };
    
    const inputStyle = "mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
    
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                 <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-xl font-bold">{isEditing ? 'Editar Medicamento' : 'Adicionar Medicamento Oral'}</h2>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Medicamento</label>
                        <input type="text" name="name" value={med.name} onChange={handleChange} className={inputStyle} required />
                    </div>
                     <div>
                        <label htmlFor="stock" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estoque Atual (comprimidos)</label>
                        <input type="number" name="stock" value={med.stock} onChange={handleChange} className={inputStyle} />
                    </div>
                     <div>
                        <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Alerta de Estoque Baixo</label>
                        <input type="number" name="threshold" value={med.threshold} onChange={handleChange} className={inputStyle} />
                    </div>
                     <div>
                        <label htmlFor="dailyDoses" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Doses por Dia</label>
                        <input type="number" name="dailyDoses" value={med.dailyDoses} onChange={handleChange} className={inputStyle} />
                    </div>
                     <div>
                        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Validade</label>
                        <input type="date" name="expiryDate" value={med.expiryDate || ''} onChange={handleChange} className={inputStyle} />
                    </div>
                     <div>
                        <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Onde Comprou/Ganhou</label>
                        <input type="text" name="source" value={med.source || ''} onChange={handleChange} placeholder="Ex: Farmácia do Bairro" className={inputStyle} />
                    </div>
                     <div>
                        <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custo (R$)</label>
                        <input type="number" name="cost" step="0.01" value={med.cost || 0} onChange={handleChange} className={inputStyle} />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 sticky bottom-0 z-10">
                    <button type="submit" className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition">Salvar Medicamento</button>
                </div>
            </form>
        </div>
    );
};

interface AddStockModalProps {
    onClose: () => void;
    onSave: (quantity: number) => void;
    medicationName: string;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ onClose, onSave, medicationName }) => {
    const [quantity, setQuantity] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseInt(quantity, 10);
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor, insira um número válido.");
            return;
        }
        onSave(amount);
    }
    
    return (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-sm w-full">
                 <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Adicionar ao Estoque</h2>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <div className="p-6">
                    <p className="mb-2">Adicionar ao estoque de <span className="font-bold">{medicationName}</span>:</p>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantidade (comprimidos)</label>
                    <input
                        type="number"
                        id="quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Ex: 30"
                        autoFocus
                        required
                    />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 sticky bottom-0 z-10">
                    <button type="submit" className="w-full bg-teal-500 text-white font-bold py-3 rounded-lg hover:bg-teal-600 transition">Confirmar</button>
                </div>
            </form>
        </div>
    );
}

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

    const handleAddInsulin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const pensToAdd = parseInt(newPens, 10);
        if (isNaN(pensToAdd) || pensToAdd <= 0) { alert("Por favor, insira um número válido."); setIsSaving(false); return; }

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
        }, 500);
    };

    const handleSaveOralMed = (med: OralMedication) => {
        const isEditing = (userProfile.oralMedications || []).some(m => m.id === med.id);
        const updatedMeds = isEditing 
            ? (userProfile.oralMedications || []).map(m => m.id === med.id ? med : m)
            : [...(userProfile.oralMedications || []), med];
            
        onUpdateProfile({ oralMedications: updatedMeds });
        setMedModalOpen(false);
        setEditingMed(null);
        setShowConfirmation(`${med.name} ${isEditing ? 'atualizado' : 'adicionado'} com sucesso!`);
        setTimeout(() => setShowConfirmation(''), 2000);
    };

    const handleAddToStock = (quantity: number) => {
        if (!addingStockToMed) return;
        const updatedMeds = (userProfile.oralMedications || []).map(m => 
            m.id === addingStockToMed.id ? { ...m, stock: m.stock + quantity } : m
        );
        onUpdateProfile({ oralMedications: updatedMeds });
        setShowConfirmation(`Estoque de ${addingStockToMed.name} atualizado!`);
        setAddingStockToMed(null);
        setTimeout(() => setShowConfirmation(''), 2000);
    }
    
    const handleDeleteOralMed = (medId: string) => {
        if(window.confirm("Tem certeza que deseja remover este medicamento?")) {
            const updatedMeds = (userProfile.oralMedications || []).filter(m => m.id !== medId);
            onUpdateProfile({ oralMedications: updatedMeds });
        }
    }
    
    const openEditModal = (med: OralMedication) => {
        setEditingMed(med);
        setMedModalOpen(true);
    };

    const openAddModal = () => {
        setEditingMed(null);
        setMedModalOpen(true);
    };

    const inputStyle = "flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100";
    const buttonPrimary = "bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center";
    const buttonSecondary = "bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-600 transition duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center";

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
            <header className="flex items-center mb-6">
                <button onClick={onBack} className="text-teal-500 hover:text-teal-700 flex items-center">
                    <i className="fas fa-arrow-left mr-2"></i> Voltar
                </button>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mx-auto">Gerenciar Estoque</h1>
            </header>

            {/* Insulin Management */}
            {userProfile.useInsulin && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-semibold mb-4 border-b dark:border-gray-700 pb-2 flex items-center"><i className="fas fa-syringe text-indigo-400 mr-3"></i>Estoque de Insulina</h2>
                    <div className="text-center mb-4">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ESTOQUE ATUAL</p>
                        <p className="text-6xl font-bold text-indigo-500 dark:text-indigo-400 my-2">{userProfile.currentInsulinStockUnits || 0} <span className="text-2xl font-normal">UI</span></p>
                    </div>
                    <form onSubmit={handleAddInsulin} className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="number"
                            value={newPens}
                            onChange={(e) => setNewPens(e.target.value)}
                            className={inputStyle}
                            placeholder="Nº de canetas/frascos a adicionar"
                            min="1"
                            required
                        />
                         <button type="submit" disabled={isSaving || !newPens} className={buttonPrimary}>
                            {isSaving ? 'Salvando...' : 'Adicionar ao Estoque'}
                         </button>
                    </form>
                </div>
            )}
            
             {/* Oral Medication Management */}
             <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                 <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-2">
                    <h2 className="text-xl font-semibold flex items-center"><i className="fas fa-pills text-teal-400 mr-3"></i>Medicamentos Orais</h2>
                    <button onClick={openAddModal} className={`${buttonSecondary} text-sm`}>
                        <i className="fas fa-plus mr-2"></i>Novo
                    </button>
                 </div>
                 <div className="space-y-4">
                     {(userProfile.oralMedications || []).length > 0 ? userProfile.oralMedications?.map(med => (
                         <div key={med.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                             <div>
                                 <h3 className="font-bold text-lg">{med.name}</h3>
                                 <p className="text-3xl font-bold text-teal-500 dark:text-teal-400">{med.stock} <span className="text-base font-normal">unidades</span></p>
                             </div>
                             <div className="flex gap-2 self-end sm:self-center">
                                 <button onClick={() => setAddingStockToMed(med)} className="bg-green-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-green-600 transition text-sm">Adicionar</button>
                                 <button onClick={() => openEditModal(med)} className="bg-blue-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-blue-600 transition text-sm">Editar</button>
                                 <button onClick={() => handleDeleteOralMed(med.id)} className="bg-red-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-600 transition text-sm"><i className="fas fa-trash-alt"></i></button>
                             </div>
                         </div>
                     )) : (
                         <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum medicamento oral cadastrado.</p>
                     )}
                 </div>
             </div>

            {isMedModalOpen && <OralMedicationModal onClose={() => { setMedModalOpen(false); setEditingMed(null); }} onSave={handleSaveOralMed} initialData={editingMed} />}
            {addingStockToMed && <AddStockModal onClose={() => setAddingStockToMed(null)} onSave={handleAddToStock} medicationName={addingStockToMed.name} />}
            
            {showConfirmation && (
                <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-up">
                    <i className="fas fa-check-circle mr-2"></i>
                    {showConfirmation}
                </div>
            )}
        </div>
    );
};

export default StockManagement;
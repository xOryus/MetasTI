import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Target, Users, Calendar } from 'lucide-react';

interface Sector {
  id: number;
  name: string;
}

interface Goal {
  id: number;
  sectorId: number;
  sectorName: string;
  title: string;
  description: string;
  targetValue: number;
  unit: string;
  period: string;
  category: string;
  isActive: boolean;
}

interface FormData {
  sectorId: string;
  title: string;
  description: string;
  targetValue: string;
  unit: string;
  period: string;
  category: string;
  isActive: boolean;
}

const SectorGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    sectorId: '',
    title: '',
    description: '',
    targetValue: '',
    unit: '',
    period: 'monthly',
    category: 'productivity',
    isActive: true
  });

  // Simular dados dos setores
  useEffect(() => {
    setSectors([
      { id: 1, name: 'Vendas' },
      { id: 2, name: 'Marketing' },
      { id: 3, name: 'RH' },
      { id: 4, name: 'TI' },
      { id: 5, name: 'Financeiro' }
    ]);

    // Simular metas existentes
    setGoals([
      {
        id: 1,
        sectorId: 1,
        sectorName: 'Vendas',
        title: 'Faturamento Mensal',
        description: 'Atingir meta de faturamento mensal',
        targetValue: 50000,
        unit: 'R$',
        period: 'monthly',
        category: 'sales',
        isActive: true
      },
      {
        id: 2,
        sectorId: 2,
        sectorName: 'Marketing',
        title: 'Leads Qualificados',
        description: 'Gerar leads qualificados mensalmente',
        targetValue: 100,
        unit: 'leads',
        period: 'monthly',
        category: 'marketing',
        isActive: true
      }
    ]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const sectorName = sectors.find(s => s.id === parseInt(formData.sectorId))?.name || '';
    
    if (editingGoal) {
      setGoals(goals.map(goal => 
        goal.id === editingGoal.id 
          ? { 
              ...goal,
              sectorId: parseInt(formData.sectorId),
              sectorName,
              title: formData.title,
              description: formData.description,
              targetValue: parseFloat(formData.targetValue),
              unit: formData.unit,
              period: formData.period,
              category: formData.category,
              isActive: formData.isActive
            }
          : goal
      ));
    } else {
      const newGoal: Goal = {
        id: Date.now(),
        sectorId: parseInt(formData.sectorId),
        sectorName,
        title: formData.title,
        description: formData.description,
        targetValue: parseFloat(formData.targetValue),
        unit: formData.unit,
        period: formData.period,
        category: formData.category,
        isActive: formData.isActive
      };
      setGoals([...goals, newGoal]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      sectorId: '',
      title: '',
      description: '',
      targetValue: '',
      unit: '',
      period: 'monthly',
      category: 'productivity',
      isActive: true
    });
    setEditingGoal(null);
    setShowModal(false);
  };

  const handleEdit = (goal: Goal) => {
    setFormData({
      sectorId: goal.sectorId.toString(),
      title: goal.title,
      description: goal.description,
      targetValue: goal.targetValue.toString(),
      unit: goal.unit,
      period: goal.period,
      category: goal.category,
      isActive: goal.isActive
    });
    setEditingGoal(goal);
    setShowModal(true);
  };

  const handleDelete = (goalId: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      setGoals(goals.filter(goal => goal.id !== goalId));
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      sales: 'bg-green-100 text-green-800',
      marketing: 'bg-blue-100 text-blue-800',
      productivity: 'bg-purple-100 text-purple-800',
      quality: 'bg-yellow-100 text-yellow-800',
      finance: 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getPeriodText = (period: string) => {
    const periods: { [key: string]: string } = {
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    return periods[period] || period;
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Metas por Setor</h2>
          <p className="text-gray-600">Gerencie as metas padronizadas para cada setor</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} />
          Nova Meta
        </button>
      </div>

      {/* Lista de Metas */}
      <div className="grid gap-4">
        {goals.map((goal) => (
          <div key={goal.id} className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="text-blue-600" size={20} />
                  <h3 className="text-lg font-semibold">{goal.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                    {goal.category}
                  </span>
                  {!goal.isActive && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Inativa
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 mb-3">{goal.description}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="text-gray-400" size={16} />
                    <span className="font-medium">Setor:</span>
                    <span>{goal.sectorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="text-gray-400" size={16} />
                    <span className="font-medium">Meta:</span>
                    <span>{goal.targetValue} {goal.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="text-gray-400" size={16} />
                    <span className="font-medium">Período:</span>
                    <span>{getPeriodText(goal.period)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(goal)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Criação/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingGoal ? 'Editar Meta' : 'Nova Meta do Setor'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setor
                </label>
                <select
                  value={formData.sectorId}
                  onChange={(e) => setFormData({...formData, sectorId: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione um setor</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título da Meta
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Meta
                  </label>
                  <input
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) => setFormData({...formData, targetValue: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: R$, %, unidades"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Período
                  </label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData({...formData, period: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="quarterly">Trimestral</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sales">Vendas</option>
                    <option value="marketing">Marketing</option>
                    <option value="productivity">Produtividade</option>
                    <option value="quality">Qualidade</option>
                    <option value="finance">Financeiro</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Meta ativa
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingGoal ? 'Atualizar' : 'Criar Meta'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {goals.length === 0 && (
        <div className="text-center py-12">
          <Target className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma meta cadastrada</h3>
          <p className="text-gray-600 mb-4">Comece criando metas padronizadas para os setores</p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Criar primeira meta
          </button>
        </div>
      )}
    </div>
  );
};

export default SectorGoals;

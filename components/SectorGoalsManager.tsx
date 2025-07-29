import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Target, Clock, TrendingUp, MapPin, Award, CheckSquare, DollarSign, UserCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { useSectorGoals, type CreateSectorGoalData, type UpdateSectorGoalData } from '@/hooks/useSectorGoals';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { Sector, GoalType, GoalPeriod, GoalScope, type SectorGoal } from '@/lib/appwrite';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/lib/roles';
import { Query } from 'appwrite';
import { GoalForm, GoalFormData, goalPeriodDisplayNames, sectorDisplayNames, goalScopeDisplayNames } from './GoalForm';
import { centavosToReais, formatCurrency, reaisToCentavos, parseCurrencyInput } from '@/lib/currency';

const initialFormData: GoalFormData = {
  title: '',
  description: '',
  sectorId: '',
  type: '',
  targetValue: '',
  unit: '',
  category: '',
  period: '',
  isActive: true,
  checklistItems: [],
  scope: GoalScope.SECTOR, // Por padrão, é uma meta setorial
  assignedUserId: '',
  // Campos monetários
  hasMonetaryReward: false,
  monetaryValue: '',
  currency: 'BRL'
};

export function SectorGoalsManager() {
  const { user, profile } = useAuth();
  const { goals, loading, error, createGoal, updateGoal, deleteGoal, toggleGoalStatus, refetch, fetchGoals } = useSectorGoals();
  const { profiles } = useAllProfiles();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SectorGoal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>(initialFormData);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<Sector | 'all'>('all');
  const [selectedScopeFilter, setSelectedScopeFilter] = useState<GoalScope | 'all'>('all');
  const [currentStep, setCurrentStep] = useState<"type" | "details">("type");
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  
  // Função para obter o nome do usuário pelo ID
  const getUserNameById = (userId: string): string => {
    const profile = profiles.find(p => p.userId === userId);
    return profile ? profile.name : 'Usuário não encontrado';
  };

  // Função para obter o ícone baseado no tipo de meta
  const getGoalTypeIcon = (type: GoalType) => {
    switch (type) {
      case GoalType.NUMERIC:
      case GoalType.PERCENTAGE:
        return <TrendingUp className="h-4 w-4" />;
      case GoalType.BOOLEAN_CHECKLIST:
        return <CheckSquare className="h-4 w-4" />;
      case GoalType.TASK_COMPLETION:
        return <Target className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  // Função para obter a cor do badge baseada no tipo
  const getGoalTypeColor = (type: GoalType) => {
    switch (type) {
      case GoalType.NUMERIC:
      case GoalType.PERCENTAGE:
        return "bg-blue-100 text-blue-700";
      case GoalType.BOOLEAN_CHECKLIST:
        return "bg-purple-100 text-purple-700";
      case GoalType.TASK_COMPLETION:
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Função para formatar o valor da meta
  const formatGoalValue = (goal: SectorGoal) => {
    if (goal.type === GoalType.NUMERIC || goal.type === GoalType.PERCENTAGE) {
      return `${goal.targetValue}${goal.type === GoalType.PERCENTAGE ? '%' : goal.unit ? ` ${goal.unit}` : ''}`;
    }
    return goal.type === GoalType.TASK_COMPLETION ? 'Tarefa' : 'Checklist';
  };

  // Função para alternar expansão do card
  const toggleGoalExpansion = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };
  
  // Carregar metas relevantes com base no perfil do usuário
  useEffect(() => {
    if (profile) {
      // Se for administrador ou gerente, carrega todas as metas
      if (profile.role === Role.ADMIN || profile.role === Role.MANAGER) {
        fetchGoals();
      } else {
        // Se for colaborador, carrega apenas metas do seu setor e suas metas individuais
        const queries = [
          Query.or([
            Query.equal('scope', GoalScope.SECTOR),
            Query.and([
              Query.equal('scope', GoalScope.INDIVIDUAL),
              Query.equal('assignedUserId', profile.userId)
            ])
          ])
        ];
        
        if (profile.sector) {
          queries.push(Query.equal('sectorId', profile.sector));
        }
        
        fetchGoals(queries);
      }
    }
  }, [profile?.role, profile?.sector, profile?.userId]); // Removemos fetchGoals da dependência

  // Aplicar filtros por setor e escopo
  const filteredGoals = goals
    .filter(goal => selectedSectorFilter === 'all' ? true : goal.sectorId === selectedSectorFilter)
    .filter(goal => selectedScopeFilter === 'all' ? true : goal.scope === selectedScopeFilter);

  const handleInputChange = (field: keyof GoalFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Se mudou o setor, sincronizar o category automaticamente
      if (field === 'sectorId') {
        newData.category = value;
      }
      
      return newData;
    });
  };

  const handleCreateGoal = async () => {
    if (!user?.$id) {
      toast.error('Usuário não autenticado');
      return;
    }

    if (!formData.title || !formData.sectorId || !formData.type || !formData.period || !formData.scope) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validação para metas individuais (precisamos de um usuário atribuído)
    if (formData.scope === GoalScope.INDIVIDUAL && !formData.assignedUserId) {
      toast.error('Selecione o usuário para a meta individual');
      return;
    }

    // Validação para campos monetários
    if (formData.hasMonetaryReward) {
      if (!formData.monetaryValue || formData.monetaryValue.trim() === '' || formData.monetaryValue === '0' || formData.monetaryValue === '0,00') {
        toast.error('O valor da recompensa monetária deve ser maior que zero');
        return;
      }
      
      // Validar se o valor é um número válido
      const parsedValue = parseCurrencyInput(formData.monetaryValue);
      if (parsedValue <= 0) {
        toast.error('Por favor, insira um valor monetário válido');
        return;
      }
    }

    // Validações específicas por tipo
    if ((formData.type === GoalType.NUMERIC || formData.type === GoalType.PERCENTAGE) && !formData.targetValue) {
      toast.error('Preencha o valor alvo para este tipo de meta');
      return;
    }

    if (formData.type === GoalType.BOOLEAN_CHECKLIST && !formData.description) {
      toast.error('Preencha a descrição do checklist');
      return;
    }

    if (formData.type === GoalType.TASK_COMPLETION && !formData.description) {
      toast.error('Preencha a descrição da tarefa');
      return;
    }

    if (formData.type === GoalType.NUMERIC && !formData.description) {
      toast.error('Preencha a descrição da meta');
      return;
    }

    try {
      const goalData: CreateSectorGoalData = {
        title: formData.title,
        description: formData.description,
        sectorId: formData.sectorId,
        type: formData.type as GoalType,
        targetValue: (formData.type === GoalType.NUMERIC || formData.type === GoalType.PERCENTAGE) 
          ? parseFloat(formData.targetValue) || 0 
          : 1, // Para boolean/task completion, valor 1 representa "completo"
        unit: formData.unit || '',
        category: formData.sectorId, // Usar o sectorId como category
        period: formData.period as GoalPeriod,
        isActive: formData.isActive,
        checklistItems: formData.checklistItems || [],
        // Enviar scope e assignedUserId corretamente
        scope: formData.scope as GoalScope,
        assignedUserId: formData.scope === GoalScope.INDIVIDUAL ? formData.assignedUserId : undefined,
        // Campos monetários
        hasMonetaryReward: formData.hasMonetaryReward,
        currency: formData.currency,
        monetaryValue: formData.hasMonetaryReward && formData.monetaryValue 
          ? reaisToCentavos(parseCurrencyInput(formData.monetaryValue))
          : undefined
      };
      
      await createGoal(goalData);
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      toast.success('Meta criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      toast.error(`Erro ao criar meta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleEditGoal = async () => {
    if (!editingGoal?.$id) return;

    try {
      const updateData: UpdateSectorGoalData = {
        title: formData.title,
        description: formData.description,
        sectorId: formData.sectorId,
        type: formData.type as GoalType,
        targetValue: (formData.type === GoalType.NUMERIC || formData.type === GoalType.PERCENTAGE) 
          ? parseFloat(formData.targetValue) || 0 
          : 1,
        unit: formData.unit || '',
        category: formData.sectorId,
        period: formData.period as GoalPeriod,
        isActive: formData.isActive,
        checklistItems: formData.checklistItems || [],
        // Enviar scope e assignedUserId corretamente
        scope: formData.scope as GoalScope,
        assignedUserId: formData.scope === GoalScope.INDIVIDUAL ? formData.assignedUserId : undefined,
        // Campos monetários
        hasMonetaryReward: formData.hasMonetaryReward,
        currency: formData.currency,
        monetaryValue: formData.hasMonetaryReward && formData.monetaryValue 
          ? reaisToCentavos(parseCurrencyInput(formData.monetaryValue))
          : undefined
      };

      await updateGoal(editingGoal.$id, updateData);
      setIsEditDialogOpen(false);
      setEditingGoal(null);
      toast.success('Meta atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar meta');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      toast.success('Meta removida com sucesso!');
    } catch (error) {
      toast.error('Erro ao deletar meta');
    }
  };

  const handleToggleStatus = async (goalId: string, currentStatus: boolean) => {
    try {
      await toggleGoalStatus(goalId, !currentStatus);
      toast.success(`Meta ${!currentStatus ? 'ativada' : 'desativada'} com sucesso!`);
    } catch (error) {
      toast.error('Erro ao alterar status da meta');
    }
  };

  const handleEditClick = (goal: SectorGoal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || '',
      sectorId: goal.sectorId,
      type: goal.type,
      targetValue: String(goal.targetValue || ''),
      unit: goal.unit || '',
      category: goal.category || '',
      period: goal.period,
      isActive: goal.isActive,
      checklistItems: goal.checklistItems || [],
      scope: goal.scope || GoalScope.SECTOR,
      assignedUserId: goal.assignedUserId || '',
      // Campos monetários
      hasMonetaryReward: goal.hasMonetaryReward || false,
      monetaryValue: goal.monetaryValue ? String(centavosToReais(goal.monetaryValue)) : '',
      currency: goal.currency || 'BRL'
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setCurrentStep("type");
  };

  return (
    <div className="space-y-6">
      {/* Header melhorado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Gerenciamento de Metas</h2>
          <p className="text-gray-600 mt-1">
            Configure e gerencie metas para setores e colaboradores
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Meta</DialogTitle>
              <DialogDescription>
                Configure uma nova meta para um setor específico
              </DialogDescription>
            </DialogHeader>
            <GoalForm 
              formData={formData} 
              handleInputChange={handleInputChange}
              onStepChange={setCurrentStep}
            />
            {currentStep === "details" && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGoal}>Criar Meta</Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros melhorados */}
      <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border">
        <Select value={selectedSectorFilter} onValueChange={(value) => setSelectedSectorFilter(value as Sector | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {Object.entries(sectorDisplayNames).map(([key, name]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedScopeFilter} onValueChange={(value) => setSelectedScopeFilter(value as GoalScope | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de meta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as metas</SelectItem>
            <SelectItem value={GoalScope.SECTOR}>Metas Setoriais</SelectItem>
            <SelectItem value={GoalScope.INDIVIDUAL}>Metas Individuais</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
          {filteredGoals.length} meta(s) encontrada(s)
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-800">Erro: {error}</div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 font-medium">Nenhuma meta encontrada</p>
          <p className="text-gray-500 text-sm mt-1">Crie sua primeira meta para começar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGoals.map(goal => (
            <Collapsible
              key={goal.$id}
              open={expandedGoals.has(goal.$id!)}
              onOpenChange={() => toggleGoalExpansion(goal.$id!)}
            >
              <Card className="overflow-hidden transition-all duration-200 hover:shadow-md border border-gray-200 bg-white">
                {/* Header compacto do card */}
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                          {goal.title}
                        </h3>
                        <p className="text-sm text-gray-600 truncate mb-2">
                          {goal.description}
                        </p>
                        
                        {/* Badges compactos */}
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getGoalTypeColor(goal.type)}>
                            {getGoalTypeIcon(goal.type)}
                            <span className="ml-1 text-xs">
                              {goal.type === GoalType.NUMERIC ? 'Numérico' : 
                               goal.type === GoalType.PERCENTAGE ? 'Porcentagem' : 
                               goal.type === GoalType.TASK_COMPLETION ? 'Tarefa' : 'Checklist'}
                            </span>
                          </Badge>
                          
                          {goal.scope === GoalScope.INDIVIDUAL && (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Individual
                            </Badge>
                          )}
                          
                          {!goal.isActive && (
                            <Badge variant="outline" className="text-gray-500 text-xs">
                              Inativa
                            </Badge>
                          )}
                        </div>

                        {/* Informações básicas em grid compacto */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-blue-600" />
                            <span className="text-xs text-gray-600">
                              {sectorDisplayNames[goal.sectorId as Sector] || goal.sectorId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-gray-600">
                              {formatGoalValue(goal)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-orange-600" />
                            <span className="text-xs text-gray-600">
                              {goalPeriodDisplayNames[goal.period]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckSquare className="h-3 w-3 text-purple-600" />
                            <span className="text-xs text-gray-600">
                              {goal.checklistItems?.length || 0} itens
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações e ícone de expansão */}
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(goal);
                          }}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                                                 <Switch 
                           checked={goal.isActive} 
                           onCheckedChange={(checked) => {
                             handleToggleStatus(goal.$id!, goal.isActive);
                           }}
                           className="ml-1"
                         />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A meta será excluída permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteGoal(goal.$id!)}
                                className="bg-red-600 text-white hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <div className="ml-2">
                          {expandedGoals.has(goal.$id!) ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* Conteúdo expandido */}
                <CollapsibleContent>
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {/* Informações do usuário atribuído */}
                    {goal.scope === GoalScope.INDIVIDUAL && goal.assignedUserId && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Usuário Atribuído:</span>
                        <span>{getUserNameById(goal.assignedUserId)}</span>
                      </div>
                    )}

                    {/* Recompensa monetária */}
                    {goal.hasMonetaryReward && goal.monetaryValue && (
                      <div className="flex items-center gap-2 text-sm bg-green-50 px-3 py-2 rounded-lg">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Recompensa:</span>
                        <span className="text-green-700 font-semibold">
                          {formatCurrency(centavosToReais(goal.monetaryValue))} - {goalPeriodDisplayNames[goal.period]}
                        </span>
                      </div>
                    )}

                    {/* Descrição completa */}
                    {goal.description && (
                      <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="font-medium">Descrição:</span>
                        <p className="mt-1">{goal.description}</p>
                      </div>
                    )}

                    {/* Itens do checklist se houver */}
                    {goal.checklistItems && goal.checklistItems.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Itens do Checklist:</span>
                        <ul className="mt-2 space-y-1">
                          {goal.checklistItems.map((item, index) => (
                            <li key={index} className="flex items-center gap-2 text-gray-600">
                              <CheckSquare className="h-3 w-3 text-purple-600" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Meta</DialogTitle>
            <DialogDescription>
              Atualize as informações da meta selecionada
            </DialogDescription>
          </DialogHeader>
          <GoalForm formData={formData} handleInputChange={handleInputChange} isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditGoal}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


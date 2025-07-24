import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Target, Clock, TrendingUp } from 'lucide-react';
import { useSectorGoals, type CreateSectorGoalData, type UpdateSectorGoalData } from '@/hooks/useSectorGoals';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { Sector, GoalType, GoalPeriod, type SectorGoal } from '@/lib/appwrite';
import { useAuth } from '@/hooks/useAuth';
import { GoalForm, GoalFormData, goalPeriodDisplayNames, sectorDisplayNames } from './GoalForm';

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
  checklistItems: []
};

export function SectorGoalsManager() {
  const { user } = useAuth();
  const { goals, loading, error, createGoal, updateGoal, deleteGoal, toggleGoalStatus, refetch } = useSectorGoals();
  const { profiles } = useAllProfiles();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SectorGoal | null>(null);
  const [formData, setFormData] = useState<GoalFormData>(initialFormData);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<Sector | 'all'>('all');

  const filteredGoals = selectedSectorFilter === 'all' 
    ? goals 
    : goals.filter(goal => goal.sectorId === selectedSectorFilter);

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

    if (!formData.title || !formData.sectorId || !formData.type || !formData.period) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
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

    if (formData.type === GoalType.TASK_COMPLETION && !formData.unit) {
      toast.error('Preencha a descrição da tarefa');
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
        checklistItems: formData.checklistItems || []
      };

      await createGoal(goalData);
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      toast.success('Meta criada com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar meta');
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
        checklistItems: formData.checklistItems || []
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
      checklistItems: goal.checklistItems || []
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Metas</h2>
          <p className="text-muted-foreground">
            Crie e gerencie metas para os diferentes setores
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
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
            <GoalForm formData={formData} handleInputChange={handleInputChange} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateGoal}>Criar Meta</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <Select value={selectedSectorFilter} onValueChange={(value) => setSelectedSectorFilter(value as Sector | 'all')}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {Object.entries(sectorDisplayNames).map(([key, name]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredGoals.length} meta(s) encontrada(s)
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-destructive">Erro: {error}</div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="bg-muted/50 p-8 rounded-lg text-center">
          <p className="text-muted-foreground">Nenhuma meta encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map(goal => (
            <Card key={goal.$id} className="overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {goal.title}
                      {!goal.isActive && (
                        <Badge variant="outline" className="text-muted-foreground">Inativa</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(goal)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Switch 
                      checked={goal.isActive} 
                      onCheckedChange={() => handleToggleStatus(goal.$id!, goal.isActive)}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{goal.sectorId}</div>
                      <div className="text-xs text-muted-foreground">Setor</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {goal.targetValue} {goal.type}
                      </div>
                      <div className="text-xs text-muted-foreground">Meta</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{goalPeriodDisplayNames[goal.period]}</div>
                      <div className="text-xs text-muted-foreground">Período</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">
                        {goal.checklistItems?.length || 0} itens
                      </div>
                      <div className="text-xs text-muted-foreground">Checklist</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
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

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Target, Clock, TrendingUp } from 'lucide-react';
import { useSectorGoals, type CreateSectorGoalData, type UpdateSectorGoalData } from '@/hooks/useSectorGoals';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import { Sector, GoalType, GoalPeriod, type SectorGoal } from '@/lib/appwrite';
import { useAuth } from '@/hooks/useAuth';

const sectorDisplayNames: Record<Sector, string> = {
  [Sector.TI]: 'Tecnologia da Informação',
  [Sector.RH]: 'Recursos Humanos',
  [Sector.LOGISTICA]: 'Logística',
  [Sector.FROTAS]: 'Frotas',
  [Sector.ABATE]: 'Abate',
  [Sector.DESOSSA]: 'Desossa',
  [Sector.MIUDOS]: 'Miúdos',
  [Sector.EXPEDICAO]: 'Expedição',
  [Sector.GERAL_GESTORES]: 'Geral Gestores',
  [Sector.FINANCEIRO]: 'Financeiro',
  [Sector.FISCAL_CONTABIL]: 'Fiscal/Contábil',
  [Sector.COMERCIAL]: 'Comercial',
  [Sector.COMPRA_GADO]: 'Compra de Gado',
  [Sector.ALMOXARIFADO]: 'Almoxarifado',
  [Sector.MANUTENCAO]: 'Manutenção',
  [Sector.LAVANDERIA]: 'Lavanderia',
  [Sector.COZINHA]: 'Cozinha'
};

const goalTypeDisplayNames: Record<GoalType, string> = {
  [GoalType.NUMERIC]: 'Numérico (Quantidade)',
  [GoalType.BOOLEAN_CHECKLIST]: 'Lista de Verificação (Múltiplos Itens)',
  [GoalType.TASK_COMPLETION]: 'Conclusão de Tarefa (Sim/Não)',
  [GoalType.PERCENTAGE]: 'Porcentagem (%)'
};

const goalPeriodDisplayNames: Record<GoalPeriod, string> = {
  [GoalPeriod.DAILY]: 'Diário',
  [GoalPeriod.WEEKLY]: 'Semanal',
  [GoalPeriod.MONTHLY]: 'Mensal',
  [GoalPeriod.QUARTERLY]: 'Trimestral',
  [GoalPeriod.YEARLY]: 'Anual'
};

interface GoalFormData {
  title: string;
  description: string;
  sectorId: string; // Mudou de 'sector' para 'sectorId'
  type: GoalType | ''; // Mudou de 'goalType' para 'type'
  targetValue: string;
  unit: string; // Novo campo
  category: string; // Novo campo
  period: GoalPeriod | '';
  isActive: boolean;
  checklistItems: string[]; // Novo campo
}

const initialFormData: GoalFormData = {
  title: '',
  description: '',
  sectorId: '', // Mudou de 'sector' para 'sectorId'
  type: '', // Mudou de 'goalType' para 'type'
  targetValue: '',
  unit: '',
  category: '', // Será sincronizado automaticamente com sectorId
  period: '',
  isActive: true,
  checklistItems: []
};

// Componente GoalForm movido para fora para evitar re-criação
const GoalForm = ({ 
  formData, 
  handleInputChange,
  isEdit = false 
}: { 
  formData: GoalFormData;
  handleInputChange: (field: keyof GoalFormData, value: any) => void;
  isEdit?: boolean;
}) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Ex: Aumentar produtividade"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sectorId">Setor *</Label>
        <Select value={formData.sectorId} onValueChange={(value) => handleInputChange('sectorId', value)}>
          <SelectTrigger id="sectorId">
            <SelectValue placeholder="Selecione o setor" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(sectorDisplayNames).map(([key, name]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="space-y-2">
      <Label htmlFor="description">Descrição</Label>
      <Textarea
        id="description"
        value={formData.description}
        onChange={(e) => handleInputChange('description', e.target.value)}
        placeholder="Descrição detalhada da meta..."
        className="min-h-20"
      />
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Meta *</Label>
        <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
          <SelectTrigger id="type">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(goalTypeDisplayNames).map(([key, name]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Mostrar Valor Alvo apenas para tipos que precisam */}
      {(formData.type === GoalType.NUMERIC || formData.type === GoalType.PERCENTAGE) && (
        <div className="space-y-2">
          <Label htmlFor="targetValue">
            {formData.type === GoalType.PERCENTAGE ? 'Porcentagem Alvo (%) *' : 'Valor Alvo *'}
          </Label>
          <Input
            id="targetValue"
            type="number"
            value={formData.targetValue}
            onChange={(e) => handleInputChange('targetValue', e.target.value)}
            placeholder={formData.type === GoalType.PERCENTAGE ? '85' : '100'}
            min="0"
            max={formData.type === GoalType.PERCENTAGE ? '100' : undefined}
          />
        </div>
      )}
    </div>

    {/* Campos específicos para Lista de Verificação */}
    {formData.type === GoalType.BOOLEAN_CHECKLIST && (
      <div className="space-y-2">
        <Label htmlFor="unitChecklist">Descrição dos Itens a Verificar *</Label>
        <Input
          id="unitChecklist"
          value={formData.unit}
          onChange={(e) => handleInputChange('unit', e.target.value)}
          placeholder="Ex: Itens do checklist de segurança, procedimentos de qualidade"
        />
        <p className="text-sm text-gray-500">
          Para metas com múltiplos itens a serem verificados (checklist)
        </p>
      </div>
    )}

    {/* Campo para Conclusão de Tarefa */}
    {formData.type === GoalType.TASK_COMPLETION && (
      <div className="space-y-2">
        <Label htmlFor="unitTask">Descrição da Tarefa *</Label>
        <Input
          id="unitTask"
          value={formData.unit}
          onChange={(e) => handleInputChange('unit', e.target.value)}
          placeholder="Ex: Relatório mensal enviado, treinamento concluído"
        />
        <p className="text-sm text-gray-500">
          Para metas simples de conclusão (feito ou não feito)
        </p>
      </div>
    )}

    {/* Campo de unidade para tipos numéricos */}
    {formData.type === GoalType.NUMERIC && (
      <div className="space-y-2">
        <Label htmlFor="unitNumeric">Unidade de Medida</Label>
        <Input
          id="unitNumeric"
          value={formData.unit}
          onChange={(e) => handleInputChange('unit', e.target.value)}
          placeholder="Ex: vendas, chamados, peças, horas"
        />
        <p className="text-sm text-gray-500">
          Opcional: unidade de medida para o valor numérico
        </p>
      </div>
    )}

    <div className="grid grid-cols-1 gap-4">
      <div className="space-y-2">
        <Label htmlFor="period">Período *</Label>
        <Select value={formData.period} onValueChange={(value) => handleInputChange('period', value)}>
          <SelectTrigger id="period">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(goalPeriodDisplayNames).map(([key, name]) => (
              <SelectItem key={key} value={key}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <Switch
        id="isActive"
        checked={formData.isActive}
        onCheckedChange={(checked) => handleInputChange('isActive', checked)}
      />
      <Label htmlFor="isActive">Meta ativa</Label>
    </div>
  </div>
);

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

    if ((formData.type === GoalType.BOOLEAN_CHECKLIST || formData.type === GoalType.TASK_COMPLETION) && !formData.unit) {
      toast.error('Preencha a descrição/unidade para este tipo de meta');
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
        category: formData.sectorId, // Usar o sectorId como category
        period: formData.period as GoalPeriod,
        isActive: formData.isActive,
        checklistItems: formData.checklistItems || []
      };

      await updateGoal(editingGoal.$id, updateData);
      setIsEditDialogOpen(false);
      setEditingGoal(null);
      setFormData(initialFormData);
      toast.success('Meta atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar meta');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      toast.success('Meta deletada com sucesso!');
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

  const openEditDialog = (goal: SectorGoal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description,
      sectorId: goal.sectorId,
      type: goal.type,
      targetValue: goal.targetValue.toString(),
      unit: goal.unit,
      category: goal.category,
      period: goal.period,
      isActive: goal.isActive,
      checklistItems: goal.checklistItems || []
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingGoal(null);
  };

  useEffect(() => {
    refetch();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando metas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Metas por Setor</h2>
          <p className="text-muted-foreground">
            Configure e gerencie metas específicas para cada setor da empresa
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

      <div className="grid gap-4">
        {filteredGoals.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-muted-foreground">
                Nenhuma meta encontrada para o filtro selecionado
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredGoals.map((goal) => (
            <Card key={goal.$id} className={`${!goal.isActive ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {goal.title}
                      {!goal.isActive && <Badge variant="secondary">Inativa</Badge>}
                    </CardTitle>
                    <CardDescription>{goal.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(goal)}
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
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a meta "{goal.title}"? Esta ação não pode ser desfeita.
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
        )}
      </div>

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

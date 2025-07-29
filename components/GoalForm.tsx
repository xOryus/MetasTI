import { useState, useEffect } from "react";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GoalType, GoalPeriod, Sector, GoalScope } from '@/lib/appwrite';
import { useAllProfiles } from '@/hooks/useAllProfiles';
import ChecklistManager from "./ChecklistManager";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Objetos para renderização dos nomes legíveis
export const sectorDisplayNames: Record<Sector, string> = {
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

export const goalTypeDisplayNames: Record<GoalType, string> = {
  [GoalType.NUMERIC]: 'Numérico (Quantidade)',
  [GoalType.BOOLEAN_CHECKLIST]: 'Lista de Verificação',
  [GoalType.TASK_COMPLETION]: 'Conclusão de Tarefa (Sim/Não)',
  [GoalType.PERCENTAGE]: 'Porcentagem (%)'
};

export const goalPeriodDisplayNames: Record<GoalPeriod, string> = {
  [GoalPeriod.DAILY]: 'Diário',
  [GoalPeriod.WEEKLY]: 'Semanal',
  [GoalPeriod.MONTHLY]: 'Mensal',
  [GoalPeriod.QUARTERLY]: 'Trimestral',
  [GoalPeriod.YEARLY]: 'Anual'
};

export const goalScopeDisplayNames: Record<GoalScope, string> = {
  [GoalScope.SECTOR]: 'Setorial',
  [GoalScope.INDIVIDUAL]: 'Individual'
};

export interface GoalFormData {
  title: string;
  description: string;
  sectorId: string;
  type: GoalType | '';
  targetValue: string;
  unit: string;
  category: string;
  period: GoalPeriod | '';
  isActive: boolean;
  checklistItems: string[];
  scope: GoalScope | '';
  assignedUserId?: string; // ID do usuário atribuído (para metas individuais)
}

interface GoalFormProps {
  formData: GoalFormData;
  handleInputChange: (field: keyof GoalFormData, value: any) => void;
  isEdit?: boolean;
  onStepChange?: (step: "type" | "details") => void;
}

/**
 * Componente de formulário para criação e edição de metas
 * Implementa um fluxo em etapas para melhorar a experiência do usuário
 */
// Componente de seleção de usuários baseado no setor
interface UserSelectProps {
  sectorId: string;
  value: string;
  onValueChange: (value: string) => void;
}

function UserSelect({ sectorId, value, onValueChange }: UserSelectProps) {
  const { profiles, loading } = useAllProfiles(sectorId);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando usuários..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione o usuário" />
      </SelectTrigger>
      <SelectContent>
        {profiles.map((profile) => (
          <SelectItem key={profile.$id} value={profile.userId}>
            {profile.name} ({sectorDisplayNames[profile.sector as Sector]})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function GoalForm({ formData, handleInputChange, isEdit = false, onStepChange }: GoalFormProps) {
  // Estado para controlar a etapa atual do formulário (tipo ou detalhes)
  const [step, setStep] = useState<"type" | "details">(
    formData.type ? "details" : "type"
  );

  // Notificar o componente pai sobre mudanças de etapa
  useEffect(() => {
    onStepChange?.(step);
  }, [step, onStepChange]);

  // Função para avançar para a etapa de detalhes
  const handleTypeNext = () => {
    if (formData.type) {
      setStep("details");
    }
  };

  // Função para voltar para a etapa de seleção de tipo
  const handleBackToType = () => {
    setStep("type");
  };

  // Interface para itens de checklist
  interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
  }

  // Converter checklistItems para o formato esperado pelo ChecklistManager
  const convertedChecklistItems: ChecklistItem[] = formData.checklistItems.map((text, index) => ({
    id: `item-${index}`,
    text,
    completed: false,
  }));

  // Função para atualizar os itens de checklist
  const handleChecklistItemsChange = (items: ChecklistItem[]) => {
    const textItems = items.map(item => item.text);
    handleInputChange('checklistItems', textItems);
  };

  return (
    <div className="space-y-6">
      {/* Indicador de Progresso */}
      <div className="flex items-center justify-center space-x-4">
        <div className={`flex items-center space-x-2 ${step === "type" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === "type" ? "bg-primary text-primary-foreground" : 
            formData.type ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
          }`}>
            {formData.type && step === "details" ? "✓" : "1"}
          </div>
          <span className="text-sm font-medium">Tipo</span>
        </div>
        <div className={`w-12 h-px ${formData.type ? "bg-primary" : "bg-muted"}`}></div>
        <div className={`flex items-center space-x-2 ${step === "details" ? "text-primary" : "text-muted-foreground"}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step === "details" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            2
          </div>
          <span className="text-sm font-medium">Detalhes</span>
        </div>
      </div>

      {/* Etapa 1: Seleção do tipo de meta */}
      {step === "type" && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Escolha o tipo de meta</h3>
            <p className="text-sm text-muted-foreground">Selecione como você deseja medir o progresso</p>
          </div>
          
          <RadioGroup
            value={formData.type}
            onValueChange={(value) => handleInputChange('type', value)}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {Object.entries(goalTypeDisplayNames).map(([key, name]) => (
              <div key={key} className="flex items-center">
                <RadioGroupItem value={key} id={`type-${key}`} className="sr-only" />
                <Label
                  htmlFor={`type-${key}`}
                  className="w-full cursor-pointer"
                >
                  <Card 
                    className={`border-2 h-full min-h-[120px] transition-all duration-200 hover:shadow-md ${
                      formData.type === key 
                        ? "border-primary shadow-lg ring-2 ring-primary/20" 
                        : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 h-full">
                      <div className="text-center">
                        <div className="space-y-1">
                          <p className="text-base font-medium leading-tight">{name}</p>
                          <p className="text-sm text-muted-foreground leading-tight">
                            {key === GoalType.NUMERIC && "Meta baseada em valores numéricos"}
                            {key === GoalType.PERCENTAGE && "Meta baseada em porcentagem"}
                            {key === GoalType.BOOLEAN_CHECKLIST && "Meta com multiplos itens para verificação"}
                            {key === GoalType.TASK_COMPLETION && "Meta de conclusão simples (sim/não)"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            ))}
          </RadioGroup>
          
          {/* Botão Próximo */}
          <div className="flex justify-end pt-4">
            <Button 
              type="button" 
              onClick={handleTypeNext}
              disabled={!formData.type}
              className="min-w-[100px]"
            >
              Próximo →
            </Button>
          </div>
        </div>
      )}

      {/* Etapa 2: Detalhes da meta */}
      {step === "details" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {isEdit ? "Editar Meta" : "Configurar Meta"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Tipo: {goalTypeDisplayNames[formData.type as GoalType]}
              </p>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={handleBackToType}
              className="flex items-center gap-2"
            >
              ← Alterar tipo
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="scope">Escopo da Meta *</Label>
              <Select 
                value={formData.scope || ''} 
                onValueChange={(value) => handleInputChange('scope', value)}
              >
                <SelectTrigger id="scope">
                  <SelectValue placeholder="Selecione o escopo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(goalScopeDisplayNames).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Campos específicos para metas numéricas */}
          {formData.type === GoalType.NUMERIC && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetValue">Valor Alvo *</Label>
                <Input
                  id="targetValue"
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => handleInputChange('targetValue', e.target.value)}
                  placeholder="100"
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="numericDescription">Descrição da Meta * (máx. 100 caracteres)</Label>
                <Input
                  id="numericDescription"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value.slice(0, 100))}
                  placeholder="Ex: vendas realizadas por mês, peças produzidas por dia"
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  {formData.description.length}/100 caracteres - Descreva o que será medido
                </p>
              </div>
            </div>
          )}

          {/* Campos específicos para metas de porcentagem */}
          {formData.type === GoalType.PERCENTAGE && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetValuePercentage">Porcentagem Alvo (%) *</Label>
                <Input
                  id="targetValuePercentage"
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => handleInputChange('targetValue', e.target.value)}
                  placeholder="85"
                  min="0"
                  max="100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="percentageDescription">Descrição (máx. 100 caracteres)</Label>
                <Input
                  id="percentageDescription"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value.slice(0, 100))}
                  placeholder="Ex: % de satisfação do cliente, % de conclusão de tarefas"
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  {formData.description.length}/100 caracteres - Opcional: o que a porcentagem representa
                </p>
              </div>
            </div>
          )}

          {/* Campo para Lista de Verificação com adição dinâmica de itens */}
          {formData.type === GoalType.BOOLEAN_CHECKLIST && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="descriptionChecklist">Descrição do Checklist * (máx. 100 caracteres)</Label>
                <Input
                  id="descriptionChecklist"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value.slice(0, 100))}
                  placeholder="Ex: Checklist de segurança da planta"
                  className="text-sm"
                  maxLength={100}
                />
                <p className="text-sm text-muted-foreground">
                  {formData.description.length}/100 caracteres - Descreva o propósito deste checklist
                </p>
              </div>
              
              <div className="border rounded-md p-4">
                <ChecklistManager
                  items={convertedChecklistItems}
                  onChange={handleChecklistItemsChange}
                />
              </div>
            </div>
          )}

          {/* Campo para Conclusão de Tarefa */}
          {formData.type === GoalType.TASK_COMPLETION && (
            <div className="space-y-2">
              <Label htmlFor="taskDescription">Descrição da Tarefa * (máx. 100 caracteres)</Label>
              <Input
                id="taskDescription"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value.slice(0, 100))}
                placeholder="Ex: Relatório mensal de vendas"
                className="text-sm"
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                {formData.description.length}/100 caracteres - Descreva brevemente esta tarefa
              </p>
            </div>
          )}

          {/* Período e Status */}
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

            {formData.scope === GoalScope.INDIVIDUAL && (
              <div className="space-y-2">
                <Label htmlFor="assignedUserId">Usuário Atribuído *</Label>
                <UserSelect 
                  sectorId={formData.sectorId} 
                  value={formData.assignedUserId || ''}
                  onValueChange={(value) => handleInputChange('assignedUserId', value)} 
                />
              </div>
            )}
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
      )}
    </div>
  );
}

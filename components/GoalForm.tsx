import { useState } from "react";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { GoalType, GoalPeriod, Sector } from '@/lib/appwrite';
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
  [GoalType.BOOLEAN_CHECKLIST]: 'Lista de Verificação (Múltiplos Itens)',
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
}

interface GoalFormProps {
  formData: GoalFormData;
  handleInputChange: (field: keyof GoalFormData, value: any) => void;
  isEdit?: boolean;
}

/**
 * Componente de formulário para criação e edição de metas
 * Implementa um fluxo em etapas para melhorar a experiência do usuário
 */
export function GoalForm({ formData, handleInputChange, isEdit = false }: GoalFormProps) {
  // Estado para controlar a etapa atual do formulário (tipo ou detalhes)
  const [step, setStep] = useState<"type" | "details">(
    formData.type ? "details" : "type"
  );

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
    <div className="space-y-4">
      {/* Etapa 1: Seleção do tipo de meta */}
      {step === "type" && (
        <>
          <div className="space-y-4">
            <Label className="text-base font-medium">Escolha o tipo de meta</Label>
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
                    onClick={() => handleInputChange('type', key)}
                  >
                    <Card 
                      className={`border-2 ${
                        formData.type === key ? "border-primary" : "border-muted"
                      }`}
                    >
                      <CardContent className="flex flex-col items-center justify-between p-6">
                        <div className="text-center">
                          <div className="space-y-1">
                            <p className="text-base font-medium">{name}</p>
                            <p className="text-sm text-muted-foreground">
                              {key === GoalType.NUMERIC && "Meta baseada em valores numéricos"}
                              {key === GoalType.PERCENTAGE && "Meta baseada em porcentagem"}
                              {key === GoalType.BOOLEAN_CHECKLIST && "Meta com itens para verificação"}
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
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              type="button" 
              onClick={handleTypeNext}
              disabled={!formData.type}
            >
              Próximo
            </Button>
          </div>
        </>
      )}

      {/* Etapa 2: Detalhes da meta */}
      {step === "details" && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              {isEdit ? "Editar Meta" : "Nova Meta"}: {goalTypeDisplayNames[formData.type as GoalType]}
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={handleBackToType}>
              Alterar tipo
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

          {/* Descrição geral (não mostrada para metas de lista de verificação) */}
          {formData.type !== GoalType.BOOLEAN_CHECKLIST && (
            <div className="space-y-2">
              <Label htmlFor="description">
                {formData.type === GoalType.TASK_COMPLETION ? 'Descrição Detalhada da Tarefa' : 'Descrição'}
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={formData.type === GoalType.TASK_COMPLETION ? 
                  "Descreva detalhadamente a tarefa que precisa ser concluída..." : 
                  "Descrição detalhada da meta..."}
                className="min-h-20"
              />
            </div>
          )}

          {/* Campos específicos para cada tipo de meta */}
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
              <Label htmlFor="unitTask">Descrição da Tarefa * (máx. 100 caracteres)</Label>
              <Input
                id="unitTask"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value.slice(0, 100))}
                placeholder="Ex: Relatório mensal de vendas"
                className="text-sm"
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                {formData.unit.length}/100 caracteres - Descreva brevemente esta tarefa
              </p>
              <div className="p-3 bg-blue-50 rounded-lg mt-2">
                <p className="text-xs text-blue-700">
                  Nota: Use o campo "Descrição Detalhada da Tarefa" acima para adicionar mais informações.
                </p>
              </div>
            </div>
          )}

          {/* Campo de unidade para tipos numéricos */}
          {formData.type === GoalType.NUMERIC && (
            <div className="space-y-2">
              <Label htmlFor="unitNumeric">Descrição da Unidade (máx. 100 caracteres)</Label>
              <Input
                id="unitNumeric"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value.slice(0, 100))}
                placeholder="Ex: vendas realizadas, chamados atendidos, peças produzidas"
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                {formData.unit.length}/100 caracteres - Opcional: descreva como será medido
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
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Meta ativa</Label>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Componente de formulário de checklist
 * Permite submissão diária com checkbox, observação e upload de print
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload } from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  goalId?: string;
  goalTitle?: string;
  goalDescription?: string;
  required?: boolean;
}

interface ChecklistFormProps {
  items: ChecklistItem[];
  onSubmitAction: (answers: Record<string, boolean>, observation: string, printFile: File) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export function ChecklistForm({ items, onSubmitAction, loading, error, disabled }: ChecklistFormProps) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [observation, setObservation] = useState('');
  const [printFile, setPrintFile] = useState<File | null>(null);

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPrintFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!printFile) {
      return;
    }
    
    await onSubmitAction(answers, observation, printFile);
    
    // Reset form
    setAnswers({});
    setObservation('');
    setPrintFile(null);
  };

  const completedCount = Object.values(answers).filter(Boolean).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Obter título e descrição da primeira meta (assumindo que todas são da mesma meta para checklists)
  const firstItem = items[0];
  const metaTitle = firstItem?.goalTitle || 'Checklist Diário';
  const metaDescription = firstItem?.goalDescription;

  if (disabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{metaTitle}</CardTitle>
          {metaDescription && (
            <p className="text-sm text-muted-foreground mt-1">{metaDescription}</p>
          )}
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Você já submeteu o checklist de hoje. Retorne amanhã para uma nova submissão.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="space-y-3">
          <div>
            <CardTitle className="text-xl">{metaTitle}</CardTitle>
            {metaDescription && (
              <p className="text-sm text-muted-foreground mt-1">{metaDescription}</p>
            )}
          </div>
          
          {/* Indicador de progresso minimalista */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{completedCount}/{totalCount}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            {completionPercentage === 100 && (
              <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Checklist completo!
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-6">
            {(() => {
              // Agrupar itens por goalTitle quando disponível
              const groupedItems = items.reduce((groups, item) => {
                const groupKey = item.goalTitle || 'default';
                if (!groups[groupKey]) {
                  groups[groupKey] = [];
                }
                groups[groupKey].push(item);
                return groups;
              }, {} as Record<string, ChecklistItem[]>);

              return Object.entries(groupedItems).map(([goalTitle, groupItems]) => (
                <div key={goalTitle} className="space-y-4">
                  {/* Para múltiplos itens de uma meta - sem mostrar título/descrição novamente */}
                  {goalTitle !== 'default' && groupItems.length > 1 && (
                    <div className="space-y-3">
                      {groupItems.map((item) => (
                        <div key={item.id} className="group hover:bg-gray-50 p-3 rounded-lg border transition-colors">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={item.id}
                              checked={answers[item.id] || false}
                              onCheckedChange={(checked) => handleCheckboxChange(item.id, checked === true)}
                              className="h-5 w-5"
                            />
                            <Label 
                              htmlFor={item.id} 
                              className="text-sm font-medium cursor-pointer flex-1 group-hover:text-blue-600 transition-colors"
                            >
                              {item.label}
                            </Label>
                            {answers[item.id] && (
                              <div className="text-green-600">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Para itens únicos - sem mostrar título/descrição novamente */}
                  {(goalTitle === 'default' || groupItems.length === 1) && 
                    groupItems.map((item) => (
                      <div key={item.id} className="group hover:bg-gray-50 p-3 rounded-lg border transition-colors">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={item.id}
                            checked={answers[item.id] || false}
                            onCheckedChange={(checked) => handleCheckboxChange(item.id, checked === true)}
                            className="h-5 w-5"
                          />
                          <Label 
                            htmlFor={item.id} 
                            className="text-sm font-medium cursor-pointer flex-1 group-hover:text-blue-600 transition-colors"
                          >
                            {item.label}
                          </Label>
                          {answers[item.id] && (
                            <div className="text-green-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              ));
            })()}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="observation">Observações</Label>
            <Textarea
              id="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva qualquer observação relevante..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="print">Print de Comprovação</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="print"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                required
                className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <Upload className="h-4 w-4 text-gray-400" />
            </div>
            {printFile && (
              <div className="text-sm text-green-600">
                Arquivo selecionado: {printFile.name}
              </div>
            )}
          </div>
          
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-bovia-primary hover:bg-bovia-dark text-white font-semibold py-3 text-lg transition-all duration-200 transform hover:scale-105"
            disabled={loading || !printFile}
          >
            {loading ? 'Enviando...' : 'Enviar Checklist'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
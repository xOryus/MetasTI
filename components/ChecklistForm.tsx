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
}

interface ChecklistFormProps {
  items: ChecklistItem[];
  onSubmit: (answers: Record<string, boolean>, observation: string, printFile: File) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export function ChecklistForm({ items, onSubmit, loading, error, disabled }: ChecklistFormProps) {
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
    
    await onSubmit(answers, observation, printFile);
    
    // Reset form
    setAnswers({});
    setObservation('');
    setPrintFile(null);
  };

  const completedCount = Object.values(answers).filter(Boolean).length;
  const totalCount = items.length;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (disabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist Diário</CardTitle>
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
      <CardHeader>
        <CardTitle>Checklist Diário</CardTitle>
        <div className="text-sm text-gray-600">
          Progresso: {completedCount}/{totalCount} ({completionPercentage.toFixed(1)}%)
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={item.id}
                  checked={answers[item.id] || false}
                  onCheckedChange={(checked) => handleCheckboxChange(item.id, checked === true)}
                />
                <Label 
                  htmlFor={item.id} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {item.label}
                </Label>
              </div>
            ))}
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
            className="w-full"
            disabled={loading || !printFile}
          >
            {loading ? 'Enviando...' : 'Enviar Checklist'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
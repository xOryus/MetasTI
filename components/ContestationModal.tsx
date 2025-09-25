/**
 * Modal para criar e gerenciar contestações de metas
 * Interface para gestores contestarem submissões específicas
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, X } from 'lucide-react';
import { useFeedback } from '@/components/FeedbackProvider';

interface ContestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  goalTitle: string;
  collaboratorName: string;
  submissionDate: string;
  loading?: boolean;
}

const PREDEFINED_REASONS = [
  { value: 'not_done', label: 'Não foi feito' },
  { value: 'incorrect_way', label: 'Forma incorreta' },
  { value: 'incomplete', label: 'Incompleto' },
  { value: 'poor_quality', label: 'Qualidade insuficiente' },
  { value: 'missing_proof', label: 'Falta comprovação' },
  { value: 'other', label: 'Outro motivo' }
];

export const ContestationModal: React.FC<ContestationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  goalTitle,
  collaboratorName,
  submissionDate,
  loading = false
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const { toastError } = useFeedback();

  const handleSubmit = async () => {
    if (!selectedReason) {
      toastError('Selecione um motivo para a contestação');
      return;
    }

    if (selectedReason === 'other' && !customReason.trim()) {
      toastError('Descreva o motivo da contestação');
      return;
    }

    const reason = selectedReason === 'other' ? customReason : 
      PREDEFINED_REASONS.find(r => r.value === selectedReason)?.label || '';

    try {
      await onSubmit(reason);
      handleClose();
    } catch (error) {
      console.error('Erro ao criar contestação:', error);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const getReasonLabel = (value: string) => {
    return PREDEFINED_REASONS.find(r => r.value === value)?.label || value;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Contestar Meta
          </DialogTitle>
          <DialogDescription>
            Você está prestes a contestar uma meta específica de um colaborador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações da meta contestada */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-2">Meta Contestada:</h4>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Colaborador:</strong> {collaboratorName}
            </p>
            <p className="text-sm text-gray-700 mb-1">
              <strong>Meta:</strong> {goalTitle}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Data:</strong> {submissionDate}
            </p>
          </div>

          {/* Seleção do motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Contestação *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campo personalizado para "Outro motivo" */}
          {selectedReason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Descreva o motivo *</Label>
              <Textarea
                id="customReason"
                placeholder="Explique o motivo da contestação..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Aviso importante */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Atenção:</p>
                <p>Esta contestação bloqueará a recompensa monetária desta meta até ser resolvida.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedReason || (selectedReason === 'other' && !customReason.trim())}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Contestando...' : 'Contestar Meta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Componente para exibir notificações de contestação para colaboradores
 * Mostra contestações pendentes e permite responder
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { Contestation } from '@/lib/appwrite';
import { format } from 'date-fns';
// import { ptBR } from 'date-fns/locale';
import { useFeedback } from '@/components/FeedbackProvider';

interface ContestationNotificationProps {
  contestations: Contestation[];
  onRespond: (contestationId: string, response: string) => Promise<void>;
  loading?: boolean;
}

export const ContestationNotification: React.FC<ContestationNotificationProps> = ({
  contestations,
  onRespond,
  loading = false
}) => {
  const [selectedContestation, setSelectedContestation] = useState<Contestation | null>(null);
  const [response, setResponse] = useState<string>('');
  const [isResponding, setIsResponding] = useState(false);
  const { toastSuccess, toastError } = useFeedback();

  const pendingContestations = contestations.filter(c => c.status === 'pending');

  const handleRespond = async () => {
    if (!selectedContestation || !response.trim()) {
      toastError('Digite uma resposta para a contestação');
      return;
    }

    try {
      setIsResponding(true);
      await onRespond(selectedContestation.$id, response.trim());
      toastSuccess('Resposta enviada com sucesso!');
      setSelectedContestation(null);
      setResponse('');
    } catch (error) {
      console.error('Erro ao responder contestação:', error);
      toastError('Erro ao enviar resposta');
    } finally {
      setIsResponding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Pendente</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Resolvida</Badge>;
      case 'dismissed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Dispensada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (pendingContestations.length === 0) {
    return null;
  }

  return (
    <>
      {/* Card de notificação principal */}
      <Card className="border-red-200 bg-red-50 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700 text-lg">
            <AlertTriangle className="w-5 h-5" />
            Contestações Pendentes
            <Badge variant="destructive" className="ml-2">
              {pendingContestations.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600 text-sm mb-3">
            Você tem {pendingContestations.length} meta(s) contestada(s) que precisam de sua atenção.
          </p>
          <div className="space-y-2">
            {pendingContestations.slice(0, 3).map((contestation) => (
              <div
                key={contestation.$id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200 hover:border-red-300 cursor-pointer transition-colors"
                onClick={() => setSelectedContestation(contestation)}
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    Meta contestada em {format(new Date(contestation.createdAt), 'dd/MM/yyyy')}
                  </p>
                  <p className="text-xs text-gray-600 truncate">
                    Motivo: {contestation.reason}
                  </p>
                </div>
                <MessageSquare className="w-4 h-4 text-red-500" />
              </div>
            ))}
            {pendingContestations.length > 3 && (
              <p className="text-xs text-gray-500 text-center">
                +{pendingContestations.length - 3} outras contestações
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de resposta */}
      <Dialog open={!!selectedContestation} onOpenChange={() => setSelectedContestation(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Responder Contestação
            </DialogTitle>
            <DialogDescription>
              Responda à contestação da sua meta para que possa ser avaliada.
            </DialogDescription>
          </DialogHeader>

          {selectedContestation && (
            <div className="space-y-4 py-4">
              {/* Informações da contestação */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Data da Contestação:</span>
                    <span className="text-sm text-gray-900">
                      {format(new Date(selectedContestation.createdAt), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    {getStatusBadge(selectedContestation.status)}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Motivo:</span>
                    <p className="text-sm text-gray-900 mt-1 p-2 bg-white rounded border">
                      {selectedContestation.reason}
                    </p>
                  </div>
                </div>
              </div>

              {/* Campo de resposta */}
              <div className="space-y-2">
                <label htmlFor="response" className="text-sm font-medium text-gray-700">
                  Sua Resposta *
                </label>
                <Textarea
                  id="response"
                  placeholder="Explique sua situação, forneça mais detalhes ou justifique sua ação..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  Seja específico e forneça informações que possam ajudar na avaliação.
                </p>
              </div>

              {/* Aviso sobre recompensa */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Importante:</p>
                    <p>A recompensa desta meta está bloqueada até a contestação ser resolvida.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setSelectedContestation(null)}
              disabled={isResponding}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleRespond}
              disabled={isResponding || !response.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isResponding ? (
                'Enviando...'
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Enviar Resposta
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

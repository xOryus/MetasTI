/**
 * Componente para visualizar imagens de prova das submissions
 */

'use client';

import { useState } from 'react';
import { getFilePreview } from '@/lib/appwrite';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Download, ExternalLink } from 'lucide-react';

interface ProofImageViewerProps {
  fileId: string;
  submissionDate: string;
  userName: string;
}

export default function ProofImageViewer({ fileId, submissionDate, userName }: ProofImageViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = getFilePreview(fileId);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `prova_${userName}_${submissionDate}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
        >
          <ImageIcon className="h-4 w-4" />
          Ver Prova
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Prova de Conclusão - {userName}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          <div className="text-sm text-gray-600">
            Data: {new Date(submissionDate).toLocaleString('pt-BR')}
          </div>
          {!imageError ? (
            <div className="relative max-w-full">
              {!imageLoaded && (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Carregando imagem...</span>
                </div>
              )}
              <img
                src={imageUrl}
                alt={`Prova de ${userName}`}
                className={`max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg ${
                  imageLoaded ? 'block' : 'hidden'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-100 rounded-lg p-8">
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center">
                Não foi possível carregar a imagem.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="mt-4"
              >
                Tentar abrir em nova aba
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

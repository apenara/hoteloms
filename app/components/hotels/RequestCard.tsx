// src/components/hotels/RequestCard.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  Paintbrush, 
  MessageSquare, 
  Waves, 
  Moon, 
  Wrench,
  Clock
} from 'lucide-react';

// Definición de tipos de solicitudes y sus propiedades visuales
const REQUEST_TYPES = {
  'need_cleaning': {
    label: 'Solicitud de Limpieza',
    icon: <Paintbrush className="h-5 w-5" />,
    color: 'bg-blue-50 border-blue-200'
  },
  'need_towels': {
    label: 'Solicitud de Toallas',
    icon: <Waves className="h-5 w-5" />,
    color: 'bg-green-50 border-green-200'
  },
  'do_not_disturb': {
    label: 'No Molestar',
    icon: <Moon className="h-5 w-5" />,
    color: 'bg-purple-50 border-purple-200'
  },
  'maintenance': {
    label: 'Mantenimiento',
    icon: <Wrench className="h-5 w-5" />,
    color: 'bg-orange-50 border-orange-200'
  },
  'guest_request': {
    label: 'Mensaje del Huésped',
    icon: <MessageSquare className="h-5 w-5" />,
    color: 'bg-yellow-50 border-yellow-200'
  }
};

interface RequestCardProps {
  request: {
    id: string;
    type: keyof typeof REQUEST_TYPES;
    message?: string;
    description?: string;
    createdAt: { seconds: number };
  };
  onComplete: (requestId: string, notes: string) => Promise<void>;
}

export function RequestCard({ request, onComplete }: RequestCardProps) {
  const [notes, setNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  
  const requestType = REQUEST_TYPES[request.type] || REQUEST_TYPES.guest_request;

  const handleComplete = async () => {
    try {
      setIsCompleting(true);
      await onComplete(request.id, notes);
      setNotes('');
    } catch (error) {
      console.error('Error al completar la solicitud:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const getTimeElapsed = (timestamp: number) => {
    const now = new Date();
    const requestTime = new Date(timestamp * 1000);
    const diff = now.getTime() - requestTime.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) {
      return `${minutes} minutos`;
    } else if (minutes < 1440) {
      return `${Math.floor(minutes / 60)} horas`;
    } else {
      return `${Math.floor(minutes / 1440)} días`;
    }
  };

  return (
    <Card className={`${requestType.color} border-2`}>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-2">
          {requestType.icon}
          <div>
            <div className="font-medium">{requestType.label}</div>
            <div className="text-sm text-gray-600 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Hace {getTimeElapsed(request.createdAt.seconds)}
            </div>
            <div className="font-medium">{request.description}</div>
          </div>
        </div>

        {request.message && (
          <div className="text-sm bg-white bg-opacity-50 p-2 rounded">
            {request.message}
          </div>
        )}

        <div className="space-y-2">
          <Textarea
            placeholder="Notas de completado (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-sm bg-white"
          />
          <Button
            className="w-full"
            onClick={handleComplete}
            disabled={isCompleting}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isCompleting ? 'Completando...' : 'Marcar como Completado'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
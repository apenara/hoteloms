// app/components/reception/RequestCard.tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock } from 'lucide-react';
import { MAINTENANCE_REQUEST_TYPES } from '@/app/lib/constants/room-states';

interface RequestCardProps {
  request: any;
  onComplete: (request: any) => void;
}

export function RequestCard({ request, onComplete }: RequestCardProps) {
  // Determinar el tipo de badge según el tipo de mantenimiento
  const getBadgeVariant = () => {
    if (request.type === 'maintenance') {
      switch (request.maintenanceType) {
        case 'emergency': return 'destructive';
        case 'corrective': return 'secondary';
        case 'preventive': return 'outline';
        case 'blocked': return 'default';
        default: return 'secondary';
      }
    }
    return request.status === 'pending' ? 'secondary' : 'outline';
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="font-medium">
              Habitación {request.roomNumber}
            </span>
            <Badge variant={getBadgeVariant()}>
              {request.type === 'maintenance' ?
                MAINTENANCE_REQUEST_TYPES[request.maintenanceType]?.label :
                request.type}
            </Badge>
            <Badge variant={request.status === 'pending' ? 'secondary' : 'outline'}>
              {request.status === 'pending' ? 'Pendiente' : 'Completada'}
            </Badge>
            {request.priority && (
              <Badge variant={
                request.priority === 'high' ? 'destructive' :
                  request.priority === 'medium' ? 'secondary' :
                    'outline'
              }>
                {request.priority}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600">{request.description || request.message}</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>
              {request.createdAt?.toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </span>
          </div>
          {request.type === 'maintenance' && (
            <div className="text-sm text-gray-500">
              {request.requiresBlocking ?
                'Requiere bloqueo de habitación' :
                'No requiere bloqueo'}
            </div>
          )}
        </div>
        {request.status === 'pending' && (
          <Button
            size="sm"
            onClick={() => onComplete(request)}
          >
            Completar
          </Button>
        )}
      </div>
    </Card>
  );
}
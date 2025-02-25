// app/components/reception/RequestsSection.tsx
import { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/app/hooks/use-toast';
import { RequestCard } from './RequestCard';

interface RequestsSectionProps {
  requests: any[];
  hotelId: string;
  staff: any;
}

export function RequestsSection({ requests, hotelId, staff }: RequestsSectionProps) {
  const [selectedRequestFilter, setSelectedRequestFilter] = useState('pending');

  const filteredRequests = requests.filter(request => {
    const matchesFilter = selectedRequestFilter === 'all' ||
      request.status === selectedRequestFilter;
    return matchesFilter;
  });

  const handleCompleteRequest = async (request) => {
    try {
      const requestRef = doc(db, 'hotels', hotelId, 'requests', request.id);
      const timestamp = Timestamp.now();

      await updateDoc(requestRef, {
        status: 'completed',
        completedAt: timestamp,
        completedBy: {
          id: staff.id,
          name: staff.name,
          role: staff.role
        }
      });

      toast({
        title: "Solicitud completada",
        description: "La solicitud ha sido marcada como completada exitosamente."
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo completar la solicitud. Intente nuevamente."
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select value={selectedRequestFilter} onValueChange={setSelectedRequestFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar solicitudes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay solicitudes {selectedRequestFilter === 'pending' ? 'pendientes' : 'completadas'}
          </div>
        ) : (
          filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onComplete={handleCompleteRequest}
            />
          ))
        )}
      </div>
    </div>
  );
}
// app/components/staff/PendingRequestsList.tsx
import { RequestCard } from '@/components/hotels/RequestCard';
import { MessageSquare } from 'lucide-react';

interface PendingRequestsListProps {
  pendingRequests: any[];
  onCompleteRequest?: (request: any) => void;
}

export function PendingRequestsList({ pendingRequests, onCompleteRequest }: PendingRequestsListProps) {
  if (pendingRequests.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4 mb-6">
      <h3 className="font-medium flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Solicitudes Pendientes ({pendingRequests.length})
      </h3>
      <div className="space-y-4">
        {pendingRequests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onComplete={onCompleteRequest || (() => {})}
          />
        ))}
      </div>
    </div>
  );
}
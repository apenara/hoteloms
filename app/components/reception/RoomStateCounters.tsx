// app/components/reception/RoomStateCounters.tsx
import { Card, CardContent } from '@/components/ui/card';
import { ROOM_STATES, ROLE_PERMISSIONS } from '@/app/lib/constants/room-states';

interface RoomStateCountersProps {
  roomCounts: Record<string, number>;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
}

export function RoomStateCounters({ 
  roomCounts, 
  selectedStatus, 
  setSelectedStatus 
}: RoomStateCountersProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {Object.entries(ROOM_STATES)
        .filter(([key]) => ROLE_PERMISSIONS.reception.canView.includes(key))
        .map(([status, config]) => (
          <Card
            key={status}
            className={`p-2 cursor-pointer ${config.color} ${
              selectedStatus === status ? 'ring-2 ring-offset-2' : ''
            }`}
            onClick={() => setSelectedStatus(
              status === selectedStatus ? 'all' : status
            )}
          >
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <config.icon className="h-4 w-4" />
                  <span>{config.label}</span>
                </div>
                <span className="font-bold">{roomCounts[status] || 0}</span>
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
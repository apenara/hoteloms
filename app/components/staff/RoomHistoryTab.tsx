// app/components/staff/RoomHistoryTab.tsx
import { ROOM_STATES } from '@/app/lib/constants/room-states';

interface RoomHistoryTabProps {
  historyEntries: any[];
}

export function RoomHistoryTab({ historyEntries }: RoomHistoryTabProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Fecha</th>
            <th className="text-left py-2">Estado Anterior</th>
            <th className="text-left py-2">Nuevo Estado</th>
            <th className="text-left py-2">Usuario</th>
            <th className="text-left py-2">Notas</th>
          </tr>
        </thead>
        <tbody>
          {historyEntries.map((entry) => (
            <tr key={entry.id} className="border-b">
              <td className="py-2">
                {new Date(entry.timestamp.seconds * 1000).toLocaleString()}
              </td>
              <td className="py-2">{ROOM_STATES[entry.previousStatus]?.label || entry.previousStatus}</td>
              <td className="py-2">{ROOM_STATES[entry.newStatus]?.label || entry.newStatus}</td>
              <td className="py-2">
                {entry.staffMember?.name}
                <br />
                <span className="text-xs text-gray-500">
                  {entry.staffMember?.role}
                  {entry.staffMember?.accessType && ` (${entry.staffMember.accessType})`}
                </span>
              </td>
              <td className="py-2">{entry.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
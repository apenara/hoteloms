// app/components/staff/StatusButtons.tsx
import { Button } from '@/components/ui/button';
import { ROOM_STATES } from '@/app/lib/constants/room-states';
import { CheckCircle } from 'lucide-react';

interface StatusButtonsProps {
  availableStates: string[];
  procesando: boolean;
  onStateChange: (state: string) => void;
  onShowMaintenanceDialog: () => void;
}

export function StatusButtons({ 
  availableStates, 
  procesando, 
  onStateChange, 
  onShowMaintenanceDialog 
}: StatusButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {availableStates.map(state => {
        const stateInfo = ROOM_STATES[state];
        const StateIcon = stateInfo?.icon || CheckCircle;
        return state === 'maintenance' ? (
          <Button
            key={state}
            variant="outline"
            className={`flex flex-col items-center p-4 h-auto ${stateInfo?.color || ''}`}
            onClick={onShowMaintenanceDialog}
            disabled={procesando}
          >
            <StateIcon className="h-5 w-5" />
            <span className="mt-2 text-sm font-medium">{stateInfo?.label}</span>
          </Button>
        ) : (
          <Button
            key={state}
            variant="outline"
            className={`flex flex-col items-center p-4 h-auto ${stateInfo?.color || ''}`}
            onClick={() => onStateChange(state)}
            disabled={procesando}
          >
            <StateIcon className="h-5 w-5" />
            <span className="mt-2 text-sm font-medium">{stateInfo?.label}</span>
            {stateInfo?.requiresInspection && (
              <span className="mt-1 text-xs text-gray-600">
                Requiere inspección
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
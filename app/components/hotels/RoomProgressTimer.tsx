// src/components/hotels/RoomProgressTimer.tsx
"use client"

import { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Timer, AlertCircle } from 'lucide-react';

interface RoomProgressTimerProps {
  startTime: Date;
  expectedDuration?: number; // duración esperada en minutos
  status: string;
}

export function RoomProgressTimer({ startTime, expectedDuration = 30, status }: RoomProgressTimerProps) {
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isOvertime, setIsOvertime] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const expectedEnd = start + (expectedDuration * 60 * 1000);
      const totalDuration = expectedEnd - start;
      const elapsed = now - start;
      
      // Calcular el progreso como porcentaje
      const currentProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(currentProgress);

      // Calcular tiempo restante en minutos
      const remaining = Math.max((expectedEnd - now) / (60 * 1000), 0);
      setTimeRemaining(Math.ceil(remaining));

      // Verificar si estamos en tiempo extra
      setIsOvertime(now > expectedEnd);
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 1000);

    return () => clearInterval(interval);
  }, [startTime, expectedDuration]);

  if (!startTime) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          {isOvertime ? (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          ) : (
            <Timer className="h-4 w-4" />
          )}
          <span className={isOvertime ? "text-yellow-500" : ""}>
            {isOvertime
              ? `${Math.ceil((progress - 100) / (100 / expectedDuration))} min extra`
              : `${timeRemaining} min restantes`}
          </span>
        </div>
        <span className="text-sm text-gray-500">
          {Math.min(Math.round(progress), 100)}%
        </span>
      </div>
      <Progress 
        value={progress} 
        className={`h-2 ${isOvertime ? 'bg-yellow-100' : 'bg-gray-100'}`}
        indicatorClassName={isOvertime ? 'bg-yellow-500' : 'bg-blue-500'}
      />
    </div>
  );
}
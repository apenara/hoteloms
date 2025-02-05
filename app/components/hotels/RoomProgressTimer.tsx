// src/components/hotels/RoomProgressTimer.tsx
import { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Timer, AlertCircle } from 'lucide-react';

interface RoomProgressTimerProps {
    startTime: Date | { seconds: number; nanoseconds: number };
    expectedDuration?: number;
    status: string;
  }

export function RoomProgressTimer({ startTime, expectedDuration = 30, status }: RoomProgressTimerProps) {
    const [progress, setProgress] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState<number>(expectedDuration);
  
    useEffect(() => {
      const calculateProgress = () => {
        const now = new Date().getTime();
        // Convertir Timestamp de Firestore a fecha JavaScript
        const start = startTime instanceof Date ? 
          startTime.getTime() : 
          new Date(startTime.seconds * 1000).getTime();
        const expectedEnd = start + (expectedDuration * 60 * 1000);
        const totalDuration = expectedEnd - start;
        const elapsed = now - start;
        
        const currentProgress = (elapsed / totalDuration) * 100;
        setProgress(currentProgress);
  
        const remaining = Math.max((expectedEnd - now) / (60 * 1000), 0);
        setTimeRemaining(Math.ceil(remaining));
      };
  
      calculateProgress();
      const interval = setInterval(calculateProgress, 1000);
  
      return () => clearInterval(interval);
    }, [startTime, expectedDuration]);

  const isOvertime = progress > 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          {isOvertime ? (
            <AlertCircle className="h-3 w-3 text-yellow-500" />
          ) : (
            <Timer className="h-3 w-3 text-gray-500" />
          )}
          <span className={isOvertime ? "text-yellow-500" : "text-gray-500"}>
            {isOvertime 
              ? `+${Math.ceil((progress - 100) / (100 / expectedDuration))} min`
              : `${timeRemaining} min`
            }
          </span>
        </div>
        <span className="text-gray-500">
          {Math.round(progress)}%
        </span>
      </div>
      <Progress 
        value={progress} 
        className="h-1.5"
      />
    </div>
  );
}
import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from 'lucide-react';

export const MaintenancePreview = ({ maintenance }) => {
  if (!maintenance) return null;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800'
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Mantenimiento Activo</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{maintenance.description}</p>
          <div className="flex gap-2 mt-2">
            <Badge className={statusColors[maintenance.status]}>
              {maintenance.status}
            </Badge>
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(maintenance.createdAt.seconds * 1000).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MaintenancePreview;
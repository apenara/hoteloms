import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BarChart
} from 'lucide-react';

interface MaintenanceStatsSummaryProps {
  maintenanceList: any[];
}

const MaintenanceStatsSummary = ({ maintenanceList }: MaintenanceStatsSummaryProps) => {
  const stats = {
    pending: maintenanceList.filter(m => m.status === 'pending').length,
    inProgress: maintenanceList.filter(m => m.status === 'in_progress').length,
    completed: maintenanceList.filter(m => m.status === 'completed').length,
    total: maintenanceList.length
  };

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total</p>
            <h3 className="text-2xl font-bold">{stats.total}</h3>
          </div>
          <BarChart className="h-8 w-8 text-gray-400" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-600">Pendientes</p>
            <h3 className="text-2xl font-bold text-yellow-700">{stats.pending}</h3>
          </div>
          <AlertTriangle className="h-8 w-8 text-yellow-400" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">En Progreso</p>
            <h3 className="text-2xl font-bold text-blue-700">{stats.inProgress}</h3>
          </div>
          <Clock className="h-8 w-8 text-blue-400" />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600">Completados</p>
            <h3 className="text-2xl font-bold text-green-700">{stats.completed}</h3>
          </div>
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
      </Card>
    </div>
  );
};

export default MaintenanceStatsSummary;
// src/components/maintenance/MaintenanceStats.tsx
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Maintenance } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface MaintenanceStatsProps {
  maintenanceList: Maintenance[];
  loading?: boolean;
}

const MaintenanceStats = ({ maintenanceList = [], loading = false }: MaintenanceStatsProps) => {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    overdue: 0,
    avgCompletionTime: 0,
    byPriority: {
      high: 0,
      medium: 0,
      low: 0
    },
  });

  useEffect(() => {
    if (!maintenanceList || maintenanceList.length === 0) return;

    const now = new Date();
    const completed = maintenanceList.filter(m => m.status === 'completed');
    const inProgress = maintenanceList.filter(m => m.status === 'in_progress');
    const pending = maintenanceList.filter(m => m.status === 'pending');
    const overdue = maintenanceList.filter(m => {
      if (m.status === 'completed') return false;
      const scheduledDate = new Date(m.scheduledFor.seconds * 1000);
      return scheduledDate < now;
    });

    // Calcular tiempo promedio de finalización
    const completionTimes = completed.map(m => {
      if (!m.completedAt || !m.createdAt) return 0;
      return (m.completedAt.seconds - m.createdAt.seconds) / 3600; // en horas
    });
    
    const avgTime = completionTimes.length 
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length 
      : 0;

    // Estadísticas por prioridad
    const byPriority = {
      high: maintenanceList.filter(m => m.priority === 'high').length,
      medium: maintenanceList.filter(m => m.priority === 'medium').length,
      low: maintenanceList.filter(m => m.priority === 'low').length
    };

    setStats({
      total: maintenanceList.length,
      completed: completed.length,
      pending: pending.length,
      inProgress: inProgress.length,
      overdue: overdue.length,
      avgCompletionTime: avgTime,
      byPriority,
    });

  }, [maintenanceList]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const priorityData = [
    { name: 'Alta', value: stats.byPriority.high },
    { name: 'Media', value: stats.byPriority.medium },
    { name: 'Baja', value: stats.byPriority.low }
  ];

  const statusData = [
    { name: 'Completados', value: stats.completed },
    { name: 'En Progreso', value: stats.inProgress },
    { name: 'Pendientes', value: stats.pending },
    { name: 'Vencidos', value: stats.overdue }
  ];

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Mantenimientos</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Completados</div>
          <div className="text-2xl font-bold text-green-600">
            {stats.completed} ({stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%)
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">En Progreso</div>
          <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Vencidos</div>
          <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Por Estado</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Por Prioridad</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#818cf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MaintenanceStats;
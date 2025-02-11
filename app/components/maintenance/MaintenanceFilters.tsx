import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface MaintenanceFiltersProps {
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortOrder: string;
  setSortOrder: (order: string) => void;
  totalCount: number;
}

const MaintenanceFilters = ({
  statusFilter,
  setStatusFilter,
  sortOrder,
  setSortOrder,
  totalCount
}: MaintenanceFiltersProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="in_progress">En Progreso</SelectItem>
            <SelectItem value="completed">Completados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Más recientes primero</SelectItem>
            <SelectItem value="oldest">Más antiguos primero</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Badge variant="secondary" className="text-sm">
        {totalCount} mantenimiento{totalCount !== 1 ? 's' : ''}
      </Badge>
    </div>
  );
};

export default MaintenanceFilters;
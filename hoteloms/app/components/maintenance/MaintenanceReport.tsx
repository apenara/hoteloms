// src/components/maintenance/MaintenanceReport.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Loader2 } from 'lucide-react';
import { Maintenance } from '@/lib/types';

interface MaintenanceReportProps {
  isOpen: boolean;
  onClose: () => void;
  maintenanceList: Maintenance[];
}

const MaintenanceReport = ({ isOpen, onClose, maintenanceList }: MaintenanceReportProps) => {
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('all');
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Filtrar mantenimientos por fecha y tipo
      const filteredMaintenance = maintenanceList.filter(maintenance => {
        const maintenanceDate = new Date(maintenance.createdAt.seconds * 1000);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59);

        const dateInRange = maintenanceDate >= startDate && maintenanceDate <= endDate;
        const typeMatch = reportType === 'all' || maintenance.status === reportType;

        return dateInRange && typeMatch;
      });

      // Preparar datos para CSV
      const csvData = filteredMaintenance.map(maintenance => ({
        'ID': maintenance.id,
        'Ubicación': maintenance.location,
        'Descripción': maintenance.description,
        'Estado': maintenance.status === 'completed' ? 'Completado' :
                 maintenance.status === 'in_progress' ? 'En Progreso' : 'Pendiente',
        'Prioridad': maintenance.priority === 'high' ? 'Alta' :
                    maintenance.priority === 'medium' ? 'Media' : 'Baja',
        'Fecha Creación': new Date(maintenance.createdAt.seconds * 1000).toLocaleDateString(),
        'Fecha Programada': new Date(maintenance.scheduledFor.seconds * 1000).toLocaleDateString(),
        'Fecha Completado': maintenance.completedAt ? 
          new Date(maintenance.completedAt.seconds * 1000).toLocaleDateString() : 'N/A',
        'Notas': maintenance.notes || 'N/A',
        'Evidencias': maintenance.evidence ? 
          maintenance.evidence.map(e => e.url).join(', ') : 'N/A'
      }));

      // Convertir a CSV
      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      );
      const csv = [headers, ...rows].join('\n');

      // Descargar archivo
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `mantenimientos_${dateRange.start}_${dateRange.end}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Error al generar reporte:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar Reporte de Mantenimientos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Reporte</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={generateReport} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Generar Reporte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceReport;
"use client";

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle } from 'lucide-react';

const MaintenanceRequestCard = ({ request, staff, onAssign }) => {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedStaff || !scheduledDate) return;
    
    setLoading(true);
    try {
      await onAssign(request, selectedStaff, scheduledDate);
      setShowAssignDialog(false);
    } catch (error) {
      console.error("Error al asignar:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">
                  {request.location || `Habitación ${request.roomNumber}`}
                </span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  Nueva Solicitud
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600">
                {request.description}
              </p>
              
              <div className="text-xs text-gray-500">
                Solicitado: {new Date(request.createdAt.seconds * 1000).toLocaleString()}
              </div>
            </div>
            
            <Button
              size="sm"
              onClick={() => setShowAssignDialog(true)}
            >
              Asignar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Mantenimiento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Personal de Mantenimiento</Label>
              <Select 
                value={selectedStaff}
                onValueChange={setSelectedStaff}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar personal" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Programada</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssign}
              disabled={loading || !selectedStaff || !scheduledDate}
            >
              {loading ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MaintenanceRequestCard;
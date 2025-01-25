
'use client';

import { useState, useEffect } from 'react';
import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, where, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from "@/components/ui/label";
import { Search, Plus, Filter, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceFormDialog from '@/components/maintenance/MaintenanceFormDialog';
import { Maintenance } from '@/lib/types';
import StaffEfficiencyView from '@/app/components/maintenance/StaffEfficiencyView';

const MaintenancePage = () => {
  const { user } = useAuth();
  const [maintenanceList, setMaintenanceList] = useState([]);
  const [maintenanceStaff, setMaintenanceStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [showDueDateDialog, setShowDueDateDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const fetchMaintenanceList = async () => {
    try {
      const maintenanceRef = collection(db, 'hotels', user.hotelId, 'maintenance');
      const maintenanceSnap = await getDocs(query(maintenanceRef, orderBy('createdAt', 'desc')));
      const maintenanceData = maintenanceSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const requestsRef = collection(db, 'hotels', user.hotelId, 'requests');
      const requestsQuery = query(
        requestsRef,
        where('type', '==', 'maintenance'),
        where('status', '==', 'pending')
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requestsData = requestsSnap.docs.map(doc => ({
        id: doc.id,
        roomId: doc.data().roomId,
        roomNumber: doc.data().roomNumber,
        type: 'corrective',
        status: 'pending',
        priority: 'medium',
        location: `Habitación ${doc.data().roomNumber}`,
        description: doc.data().description || 'Solicitud de mantenimiento',
        createdAt: doc.data().createdAt,
      }));

      setMaintenanceList([...maintenanceData, ...requestsData]);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchMaintenanceStaff = async () => {
    try {
      const staffRef = collection(db, 'hotels', user.hotelId, 'staff');
      const staffQuery = query(staffRef, where('role', '==', 'maintenance'));
      const staffSnap = await getDocs(staffQuery);
      setMaintenanceStaff(staffSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  useEffect(() => {
    if (user?.hotelId) {
      fetchMaintenanceList();
      fetchMaintenanceStaff();
    }
  }, [user]);

  const handleCompleteMaintenance = async (maintenance, notes) => {
    try {
      const maintenanceRef = doc(db, 'hotels', user.hotelId, 'maintenance', maintenance.id);
      await updateDoc(maintenanceRef, {
        status: 'completed',
        completedAt: Timestamp.now(),
        notes,
        completedBy: user.uid
      });

      if (maintenance.roomId) {
        const roomRef = doc(db, 'hotels', user.hotelId, 'rooms', maintenance.roomId);
        await updateDoc(roomRef, {
          status: 'available',
          maintenanceStatus: null,
          currentMaintenance: null
        });
      }

      fetchMaintenanceList();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleAssignStaff = (maintenanceId, staffId) => {
    setSelectedAssignment({ maintenanceId, staffId });
    setShowDueDateDialog(true);
  };

  const filterMaintenance = (maintenance) => {
    const searchMatch = maintenance.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.description.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = activeTab === 'all' || maintenance.status === activeTab;
    return searchMatch && statusMatch;
  };

  const isOverdue = (maintenance) => {
    if (maintenance.status === 'completed' || !maintenance.scheduledFor) return false;
    const scheduledDate = new Date(maintenance.scheduledFor.seconds * 1000);
    return scheduledDate < new Date();
  };

  const getStatusBadge = (status, isOverdueTask) => {
    const statusColors = {
      pending: isOverdueTask ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800'
    };

    const statusLabels = {
      pending: isOverdueTask ? 'Vencido' : 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completado'
    };

    return <Badge className={statusColors[status]}>{statusLabels[status]}</Badge>;
  };

  const MaintenanceStaffStats = ({ maintenanceList }) => {
    // Agrupar y calcular estadísticas por staff
    const staffStats = maintenanceList.reduce((acc, task) => {
      if (!task.assignedTo) return acc;

      if (!acc[task.assignedTo]) {
        acc[task.assignedTo] = {
          total: 0,
          completed: 0,
          pending: 0,
          avgCompletionTime: 0,
          completionTimes: []
        };
      }

      acc[task.assignedTo].total++;

      if (task.status === 'completed') {
        acc[task.assignedTo].completed++;
        if (task.completedAt && task.createdAt) {
          const completionTime = task.completedAt.seconds - task.createdAt.seconds;
          acc[task.assignedTo].completionTimes.push(completionTime);
        }
      } else {
        acc[task.assignedTo].pending++;
      }

      return acc;
    }, {});

    // Calcular promedios y eficiencia
    Object.keys(staffStats).forEach(staffId => {
      const stats = staffStats[staffId];
      const totalTime = stats.completionTimes.reduce((a, b) => a + b, 0);
      stats.avgCompletionTime = stats.completionTimes.length ?
        totalTime / stats.completionTimes.length / 3600 : 0; // Convertir a horas
      stats.efficiency = stats.completed / stats.total * 100;
    });

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {maintenanceStaff.map(staff => {
          const stats = staffStats[staff.id] || { total: 0, completed: 0, pending: 0, efficiency: 0, avgCompletionTime: 0 };

          return (
            <Card key={staff.id} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="font-medium">{staff.name}</div>
                <Badge className={stats.efficiency > 80 ? 'bg-green-100' :
                  stats.efficiency > 50 ? 'bg-yellow-100' : 'bg-red-100'}>
                  {stats.efficiency.toFixed(1)}% eficiencia
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total asignadas:</span>
                  <span>{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completadas:</span>
                  <span className="text-green-600">{stats.completed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pendientes:</span>
                  <span className="text-yellow-600">{stats.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tiempo promedio:</span>
                  <span>{stats.avgCompletionTime.toFixed(1)} horas</span>
                </div>
                <Button
                  variant="link"
                  onClick={() => setSelectedStaff(staff)}
                  className="mt-2"
                >
                  Ver detalles
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-orange-100 text-orange-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      high: 'Alta',
      medium: 'Media',
      low: 'Baja'
    };
    return labels[priority] || 'Media';
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Mantenimientos</CardTitle>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Mantenimiento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <MaintenanceStaffStats maintenanceList={maintenanceList} />
        </CardContent>

        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar por ubicación o descripción..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="in_progress">En Progreso</TabsTrigger>
              <TabsTrigger value="completed">Completados</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-4">
                {maintenanceList.filter(filterMaintenance).map((maintenance) => {
                  const isOverdueTask = isOverdue(maintenance);
                  const assignedStaff = maintenanceStaff.find(s => s.id === maintenance.assignedTo);

                  return (
                    <div key={maintenance.id} className="p-4 rounded-lg border">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{maintenance.location}</div>
                          <div className="text-sm text-gray-500 mt-1">{maintenance.description}</div>
                          <div className="flex items-center mt-2 space-x-2">
                            {getStatusBadge(maintenance.status, isOverdueTask)}
                            <Badge className={getPriorityColor(maintenance.priority)}>
                              {getPriorityLabel(maintenance.priority)}
                            </Badge>
                            <div className="text-sm text-gray-500">
                              {maintenance.scheduledFor ?
                                `Vence: ${new Date(maintenance.scheduledFor.seconds * 1000).toLocaleDateString('es-CO')}` :
                                'Sin fecha asignada'
                              }
                            </div>
                            {assignedStaff && (
                              <span className="text-sm text-gray-500">
                                Asignado a: {assignedStaff.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!maintenance.assignedTo && maintenance.status !== 'completed' && (
                            <Select onValueChange={(value) => handleAssignStaff(maintenance.id, value)}>
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Asignar personal" />
                              </SelectTrigger>
                              <SelectContent>
                                {maintenanceStaff.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id}>
                                    {staff.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {maintenance.status !== 'completed' && maintenance.assignedTo && (
                            <Button onClick={() => setSelectedMaintenance(maintenance)} variant="outline">
                              Completar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {showAddDialog && (
        <MaintenanceFormDialog
          hotelId={user?.hotelId}
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false);
            fetchMaintenanceList();
          }}
        />
      )}

      {showDueDateDialog && (
        <AssignDueDateDialog
          onClose={() => setShowDueDateDialog(false)}
          onSubmit={async (dueDate) => {
            const maintenanceRef = doc(db, 'hotels', user.hotelId, 'maintenance', selectedAssignment.maintenanceId);
            await updateDoc(maintenanceRef, {
              assignedTo: selectedAssignment.staffId,
              status: 'in_progress',
              scheduledFor: Timestamp.fromDate(new Date(dueDate))
            });
            fetchMaintenanceList();
            setShowDueDateDialog(false);
          }}
        />
      )}

      {selectedMaintenance && (
        <CompletionDialog
          maintenance={selectedMaintenance}
          onClose={() => setSelectedMaintenance(null)}
          onComplete={(notes) => handleCompleteMaintenance(selectedMaintenance, notes)}
        />
      )}


      {/* Modales */}
      {selectedStaff && (
        <Dialog open={true} onOpenChange={() => setSelectedStaff(null)}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Eficiencia - {selectedStaff.name}</DialogTitle>
            </DialogHeader>
            <StaffEfficiencyView
              staffMember={selectedStaff}
              tasks={maintenanceList.filter(m => m.assignedTo === selectedStaff.id)}
            />
          </DialogContent>
        </Dialog>)}
    </div>
  );
};

const AssignDueDateDialog = ({ onClose, onSubmit }) => {
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Fecha Límite</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Fecha de vencimiento</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSubmit(dueDate)}>Asignar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CompletionDialog = ({ maintenance, onClose, onComplete }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    await onComplete(notes);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Completar Mantenimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium">Ubicación</h4>
            <p className="text-sm text-gray-500">{maintenance.location}</p>
          </div>
          <div>
            <h4 className="font-medium">Descripción</h4>
            <p className="text-sm text-gray-500">{maintenance.description}</p>
          </div>
          <div className="space-y-2">
            <Label>Notas de Finalización</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe el trabajo realizado..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? 'Guardando...' : 'Completar Mantenimiento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>


  );
};

export default MaintenancePage;

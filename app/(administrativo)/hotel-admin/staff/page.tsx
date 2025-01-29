// src/app/hotel-admin/staff/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { deleteStaffMember } from '@/lib/firebase/user-management';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { AddStaffDialog } from '@/components/staff/AddStaffDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
// import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PinManagement } from '@/components/staff/PinManagement';
import { Loader2, UserPlus, Key, Trash2, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StaffPage() {
  const { user } = useAuth();
  const { toast } = useToast(); 
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPinManagement, setShowPinManagement] = useState(false);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchStaff = async () => {
      if (!user?.hotelId) return;

      try {
        const staffRef = collection(db, 'hotels', user.hotelId, 'staff');
        const staffSnapshot = await getDocs(staffRef);
        const staffData = staffSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setStaffMembers(staffData);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar el personal",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [user, refreshTrigger]);

  const handleDelete = async () => {
    if (!selectedStaff || !user?.hotelId) return;

    setDeleteLoading(true);
    try {
      await deleteStaffMember(
        selectedStaff.id,
        user.hotelId,
        selectedStaff.userId
      );

      setRefreshTrigger(prev => prev + 1);
      toast({
        title: "Éxito",
        description: "Personal eliminado correctamente"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al eliminar el personal",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setSelectedStaff(null);
    }
  };

  const handleSuspend = async () => {
    if (!selectedStaff || !user?.hotelId) return;

    setDeleteLoading(true);
    try {
      await suspendStaffMember(
        selectedStaff.id,
        user.hotelId,
        selectedStaff.userId
      );

      setRefreshTrigger(prev => prev + 1);
      toast({
        title: "Éxito",
        description: "Personal suspendido correctamente"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error al suspender el personal",
        variant: "destructive"
      });
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setSelectedStaff(null);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      housekeeper: 'bg-blue-100 text-blue-800',
      maintenance: 'bg-yellow-100 text-yellow-800',
      manager: 'bg-purple-100 text-purple-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Personal</CardTitle>
          <Button
            onClick={() => setShowAddStaff(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Agregar Personal
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell>{staff.name}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadgeColor(staff.role)}>
                      {staff.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{staff.email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={staff.status === 'active' ? 'default' : 'secondary'}>
                      {staff.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStaff(staff);
                          setShowPinManagement(true);
                        }}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        PIN
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-yellow-600 hover:text-yellow-700"
                        onClick={() => {
                          setSelectedStaff(staff);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                        
                      
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showAddStaff && (
        <AddStaffDialog
          isOpen={showAddStaff}
          onClose={() => setShowAddStaff(false)}
          onSuccess={() => {
            setRefreshTrigger(prev => prev + 1);
            setShowAddStaff(false);
          }}
        />
      )}

      {showPinManagement && (
        <PinManagement
          staff={selectedStaff}
          isOpen={showPinManagement}
          onClose={() => {
            setShowPinManagement(false);
            setSelectedStaff(null);
          }}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción suspenderá al miembro del personal{' '}
              <strong>{selectedStaff?.name}</strong>. El usuario no podrá acceder al sistema hasta que sea reactivado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSuspend}
              disabled={deleteLoading}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {deleteLoading ? 'Suspendiendo...' : 'Suspender'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
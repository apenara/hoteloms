'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/app/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Filter,
  Tag,
  Edit,
  Eye,
  MoveRight,
  Wrench,
  Loader2,
  Home,
} from 'lucide-react';
import AssetForm from '@/components/assets/AssetForm';
import { Asset, AssetCategory, Room } from '@/app/lib/types';
import AssetTransferDialog from '@/components/assets/AssetTransferDialog'; // Este componente aún no lo hemos creado

// Componente para la página de lista de activos
export default function AssetsList() {
  // Estados
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para búsqueda y filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estados para diálogos
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);

  // Cargar datos iniciales: activos, categorías y habitaciones
  useEffect(() => {
    if (!user?.hotelId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Suscripción a las categorías
        const categoriesRef = collection(db, 'hotels', user.hotelId, 'asset_categories');
        const categoriesQuery = query(categoriesRef, orderBy('name', 'asc'));
        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
          const categoriesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as AssetCategory[];
          setCategories(categoriesData);
        });

        // 2. Suscripción a las habitaciones
        const roomsRef = collection(db, 'hotels', user.hotelId, 'rooms');
        const roomsQuery = query(roomsRef, orderBy('number', 'asc'));
        const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
          const roomsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Room[];
          setRooms(roomsData);
        });

        // 3. Suscripción a los activos
        const assetsRef = collection(db, 'hotels', user.hotelId, 'assets');
        const assetsQuery = query(assetsRef, orderBy('assetCode', 'asc'));
        const unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
          const assetsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Asset[];
          setAssets(assetsData);
          applyFilters(assetsData, searchTerm, categoryFilter, roomFilter, statusFilter);
          setLoading(false);
        });

        // Retornar función para cancelar suscripciones
        return () => {
          unsubscribeCategories();
          unsubscribeRooms();
          unsubscribeAssets();
        };
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Error al cargar los datos. Por favor, intenta de nuevo.');
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.hotelId]);

  // Función para aplicar filtros a los activos
  const applyFilters = (
    assetsList: Asset[],
    search: string,
    category: string,
    room: string,
    status: string
  ) => {
    let filtered = [...assetsList];

    // Filtrar por término de búsqueda
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchLower) ||
          asset.assetCode.toLowerCase().includes(searchLower) ||
          asset.description?.toLowerCase().includes(searchLower) ||
          asset.serialNumber?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por categoría
    if (category !== 'all') {
      filtered = filtered.filter((asset) => asset.categoryId === category);
    }

    // Filtrar por habitación
    if (room !== 'all') {
      filtered = filtered.filter((asset) => asset.roomId === room);
    }

    // Filtrar por estado
    if (status !== 'all') {
      filtered = filtered.filter((asset) => asset.status === status);
    }

    setFilteredAssets(filtered);
  };

  // Efecto para aplicar filtros cuando cambian los criterios
  useEffect(() => {
    applyFilters(assets, searchTerm, categoryFilter, roomFilter, statusFilter);
  }, [assets, searchTerm, categoryFilter, roomFilter, statusFilter]);

  // Funciones para manejar acciones en activos
  const handleEditAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowAssetForm(true);
  };

  const handleTransferAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowTransferDialog(true);
  };

  const handleSendToMaintenance = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowMaintenanceDialog(true);
  };

  const handleCreateMaintenanceRequest = async (details: { description: string; priority: string }) => {
    if (!user?.hotelId || !selectedAsset) return;

    try {
      // 1. Actualizar el estado del activo
      const assetRef = doc(db, 'hotels', user.hotelId, 'assets', selectedAsset.id!);
      await updateDoc(assetRef, {
        status: 'maintenance',
        updatedAt: serverTimestamp(),
      });

      // 2. Obtener datos de la habitación para la solicitud
      let roomNumber = 'No asignada';
      if (selectedAsset.roomId) {
        const roomRef = doc(db, 'hotels', user.hotelId, 'rooms', selectedAsset.roomId);
        const roomDoc = await getDoc(roomRef);
        if (roomDoc.exists()) {
          roomNumber = roomDoc.data().number;
        }
      }

      // 3. Crear la solicitud de mantenimiento
      const maintenanceRef = collection(db, 'hotels', user.hotelId, 'maintenance');
      await addDoc(maintenanceRef, {
        type: 'asset_maintenance',
        assetId: selectedAsset.id,
        assetCode: selectedAsset.assetCode,
        assetName: selectedAsset.name,
        roomId: selectedAsset.roomId,
        roomNumber,
        description: details.description,
        priority: details.priority,
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: {
          id: user.uid,
          name: user.name,
        },
      });

      // 4. Registrar en el historial del activo
      const historyRef = collection(db, 'hotels', user.hotelId, 'assets', selectedAsset.id!, 'history');
      await addDoc(historyRef, {
        type: 'maintenance_request',
        date: serverTimestamp(),
        description: details.description,
        previousStatus: selectedAsset.status,
        newStatus: 'maintenance',
        userId: user.uid,
        userName: user.name || 'Usuario',
      });

      toast({
        title: 'Solicitud creada',
        description: 'Se ha enviado el activo a mantenimiento',
      });

      setShowMaintenanceDialog(false);
    } catch (error) {
      console.error('Error al crear solicitud:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la solicitud de mantenimiento',
        variant: 'destructive',
      });
    }
  };

  // Función para obtener los nombres de categoría y habitación
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : 'No asignada';
  };

  const getRoomNumber = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    return room ? room.number : 'No asignada';
  };

  // Funciones para renderizar badges de estado
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { class: 'bg-green-100 text-green-800', label: 'Activo' },
      maintenance: { class: 'bg-yellow-100 text-yellow-800', label: 'En Mantenimiento' },
      retired: { class: 'bg-red-100 text-red-800', label: 'Dado de Baja' },
      pending: { class: 'bg-blue-100 text-blue-800', label: 'Pendiente de Asignación' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  const getConditionBadge = (condition: string) => {
    const conditionConfig = {
      new: { class: 'bg-emerald-100 text-emerald-800', label: 'Nuevo' },
      good: { class: 'bg-blue-100 text-blue-800', label: 'Buen Estado' },
      fair: { class: 'bg-amber-100 text-amber-800', label: 'Estado Regular' },
      poor: { class: 'bg-red-100 text-red-800', label: 'Mal Estado' },
    };

    const config = conditionConfig[condition as keyof typeof conditionConfig] || conditionConfig.good;
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  // Renderizar diálogo de mantenimiento
  const renderMaintenanceDialog = () => (
    <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar a Mantenimiento</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            {selectedAsset && (
              <div className="p-4 bg-gray-50 rounded-md">
                <h3 className="font-medium">{selectedAsset.name}</h3>
                <p className="text-sm text-gray-500">Código: {selectedAsset.assetCode}</p>
                <p className="text-sm text-gray-500">
                  Ubicación: Habitación {getRoomNumber(selectedAsset.roomId)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción del Problema</label>
              <textarea
                id="maintenanceDescription"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 min-h-[100px]"
                placeholder="Describe el problema que requiere mantenimiento..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select defaultValue="medium">
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              handleCreateMaintenanceRequest({
                description: (document.getElementById('maintenanceDescription') as HTMLTextAreaElement).value,
                priority: document.querySelector('[data-value]')?.getAttribute('data-value') || 'medium',
              })
            }
          >
            Crear Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Renderizado principal
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">Inventario de Activos</CardTitle>
          <Button onClick={() => {
            setSelectedAsset(null);
            setShowAssetForm(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Activo
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filtros y búsqueda */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar activos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Filtro por categoría */}
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todas las categorías" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por habitación */}
            <Select
              value={roomFilter}
              onValueChange={setRoomFilter}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <Home className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todas las habitaciones" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las habitaciones</SelectItem>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    Habitación {room.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filtro por estado */}
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger>
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todos los estados" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="maintenance">En Mantenimiento</SelectItem>
                <SelectItem value="retired">Dados de Baja</SelectItem>
                <SelectItem value="pending">Pendientes de Asignación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de activos */}
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Condición</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No se encontraron activos con los criterios seleccionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.assetCode}</TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={asset.name}>
                            {asset.name}
                          </div>
                        </TableCell>
                        <TableCell>{getCategoryName(asset.categoryId)}</TableCell>
                        <TableCell>Habitación {getRoomNumber(asset.roomId)}</TableCell>
                        <TableCell>{getStatusBadge(asset.status)}</TableCell>
                        <TableCell>{getConditionBadge(asset.condition)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditAsset(asset)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTransferAsset(asset)}
                            title="Trasladar"
                            disabled={asset.status === 'maintenance'}
                          >
                            <MoveRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendToMaintenance(asset)}
                            title="Enviar a mantenimiento"
                            disabled={asset.status === 'maintenance' || asset.status === 'retired'}
                          >
                            <Wrench className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {/* Navegación a detalles */}}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogos */}
      {showAssetForm && (
        <AssetForm
          isOpen={showAssetForm}
          onClose={() => setShowAssetForm(false)}
          assetToEdit={selectedAsset}
          onSuccess={() => {
            setShowAssetForm(false);
            setSelectedAsset(null);
          }}
        />
      )}

      {showTransferDialog && selectedAsset && (
        <AssetTransferDialog
          isOpen={showTransferDialog}
          onClose={() => setShowTransferDialog(false)}
          asset={selectedAsset}
          currentRoomId={selectedAsset.roomId}
          hotelId={user?.hotelId || ''}
          onSuccess={() => {
            setShowTransferDialog(false);
            setSelectedAsset(null);
          }}
        />
      )}

      {renderMaintenanceDialog()}
    </div>
  );
}
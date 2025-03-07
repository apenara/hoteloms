"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { LoadingView } from "@/components/common/LoadingView";
import { ErrorView } from "@/components/common/ErrorView";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Plus, Edit } from "lucide-react";

interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  description: string;
  capacity: number;
  amenities: string[];
  basePrice: number;
  cleaningTimeMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RoomTypeFormData {
  name: string;
  description: string;
  capacity: number;
  amenities: string;
  basePrice: number;
  cleaningTimeMinutes: number;
}

export default function RoomTypesSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [formData, setFormData] = useState<RoomTypeFormData>({
    name: "",
    description: "",
    capacity: 2,
    amenities: "",
    basePrice: 0,
    cleaningTimeMinutes: 30,
  });
  const [saving, setSaving] = useState(false);
  
  // Hardcoded for demo - would normally get from authentication context
  const hotelId = "current-hotel-id";

  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const roomTypesQuery = query(
          collection(db, "room_types"),
          where("hotelId", "==", hotelId)
        );
        
        const roomTypesSnapshot = await getDocs(roomTypesQuery);
        const roomTypesData: RoomType[] = [];
        
        roomTypesSnapshot.forEach((doc) => {
          const data = doc.data();
          roomTypesData.push({
            id: doc.id,
            hotelId: data.hotelId,
            name: data.name,
            description: data.description,
            capacity: data.capacity,
            amenities: data.amenities,
            basePrice: data.basePrice,
            cleaningTimeMinutes: data.cleaningTimeMinutes,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          });
        });
        
        setRoomTypes(roomTypesData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching room types:", err);
        setError("Error al cargar los tipos de habitación");
        setLoading(false);
      }
    };

    fetchRoomTypes();
  }, [hotelId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' || name === 'basePrice' || name === 'cleaningTimeMinutes'
        ? Number(value)
        : value,
    }));
  };

  const handleAddRoomType = async () => {
    setSaving(true);
    
    try {
      const amenitiesArray = formData.amenities
        .split(',')
        .map(item => item.trim())
        .filter(item => item !== '');
      
      const newRoomType = {
        hotelId,
        name: formData.name,
        description: formData.description,
        capacity: formData.capacity,
        amenities: amenitiesArray,
        basePrice: formData.basePrice,
        cleaningTimeMinutes: formData.cleaningTimeMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const docRef = await addDoc(collection(db, "room_types"), newRoomType);
      
      setRoomTypes((prev) => [
        ...prev,
        {
          id: docRef.id,
          ...newRoomType,
        },
      ]);
      
      toast({
        title: "Tipo de habitación creado",
        description: `El tipo de habitación "${formData.name}" ha sido creado correctamente`,
        variant: "default",
      });
      
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error adding room type:", err);
      toast({
        title: "Error",
        description: "No se pudo crear el tipo de habitación",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditRoomType = async () => {
    if (!selectedRoomType) return;
    
    setSaving(true);
    
    try {
      const amenitiesArray = formData.amenities
        .split(',')
        .map(item => item.trim())
        .filter(item => item !== '');
      
      const updatedRoomType = {
        name: formData.name,
        description: formData.description,
        capacity: formData.capacity,
        amenities: amenitiesArray,
        basePrice: formData.basePrice,
        cleaningTimeMinutes: formData.cleaningTimeMinutes,
        updatedAt: new Date(),
      };
      
      await updateDoc(doc(db, "room_types", selectedRoomType.id), updatedRoomType);
      
      setRoomTypes((prev) =>
        prev.map((roomType) =>
          roomType.id === selectedRoomType.id
            ? {
                ...roomType,
                ...updatedRoomType,
                amenities: amenitiesArray,
                updatedAt: new Date(),
              }
            : roomType
        )
      );
      
      toast({
        title: "Tipo de habitación actualizado",
        description: `El tipo de habitación "${formData.name}" ha sido actualizado correctamente`,
        variant: "default",
      });
      
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error updating room type:", err);
      toast({
        title: "Error",
        description: "No se pudo actualizar el tipo de habitación",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoomType = async () => {
    if (!selectedRoomType) return;
    
    setSaving(true);
    
    try {
      await deleteDoc(doc(db, "room_types", selectedRoomType.id));
      
      setRoomTypes((prev) =>
        prev.filter((roomType) => roomType.id !== selectedRoomType.id)
      );
      
      toast({
        title: "Tipo de habitación eliminado",
        description: `El tipo de habitación "${selectedRoomType.name}" ha sido eliminado correctamente`,
        variant: "default",
      });
      
      setIsDeleteDialogOpen(false);
      setSelectedRoomType(null);
    } catch (err) {
      console.error("Error deleting room type:", err);
      toast({
        title: "Error",
        description: "No se pudo eliminar el tipo de habitación",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (roomType: RoomType) => {
    setSelectedRoomType(roomType);
    setFormData({
      name: roomType.name,
      description: roomType.description,
      capacity: roomType.capacity,
      amenities: roomType.amenities.join(", "),
      basePrice: roomType.basePrice,
      cleaningTimeMinutes: roomType.cleaningTimeMinutes,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (roomType: RoomType) => {
    setSelectedRoomType(roomType);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      capacity: 2,
      amenities: "",
      basePrice: 0,
      cleaningTimeMinutes: 30,
    });
    setSelectedRoomType(null);
  };

  // Demo room types for development
  const demoRoomTypes: RoomType[] = [
    {
      id: "rt1",
      hotelId,
      name: "Habitación Estándar",
      description: "Habitación cómoda con todas las comodidades básicas",
      capacity: 2,
      amenities: ["TV", "Wifi", "Aire acondicionado", "Baño privado"],
      basePrice: 1200,
      cleaningTimeMinutes: 25,
      createdAt: new Date(2023, 0, 15),
      updatedAt: new Date(2023, 0, 15),
    },
    {
      id: "rt2",
      hotelId,
      name: "Suite Junior",
      description: "Suite espaciosa con zona de estar separada",
      capacity: 3,
      amenities: ["TV", "Wifi", "Aire acondicionado", "Baño privado", "Minibar", "Sofá"],
      basePrice: 1800,
      cleaningTimeMinutes: 35,
      createdAt: new Date(2023, 0, 15),
      updatedAt: new Date(2023, 0, 15),
    },
    {
      id: "rt3",
      hotelId,
      name: "Suite Ejecutiva",
      description: "Suite de lujo con zona de trabajo y vistas panorámicas",
      capacity: 2,
      amenities: ["TV", "Wifi", "Aire acondicionado", "Baño privado", "Minibar", "Escritorio ejecutivo", "Cafetera"],
      basePrice: 2500,
      cleaningTimeMinutes: 45,
      createdAt: new Date(2023, 0, 15),
      updatedAt: new Date(2023, 0, 15),
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  if (loading) return <LoadingView message="Cargando tipos de habitación..." />;
  if (error) return <ErrorView message={error} />;

  // Use demo data if no real data exists (for development purposes)
  const displayRoomTypes = roomTypes.length > 0 ? roomTypes : demoRoomTypes;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Tipos de Habitación</h2>
          <p className="text-sm text-gray-500">
            Gestiona los diferentes tipos de habitaciones de tu hotel
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Tipo de Habitación</DialogTitle>
              <DialogDescription>
                Añade un nuevo tipo de habitación para tu hotel
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad (personas)</Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Precio Base</Label>
                  <Input
                    id="basePrice"
                    name="basePrice"
                    type="number"
                    min="0"
                    step="10"
                    value={formData.basePrice}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cleaningTimeMinutes">Tiempo de Limpieza (minutos)</Label>
                <Input
                  id="cleaningTimeMinutes"
                  name="cleaningTimeMinutes"
                  type="number"
                  min="1"
                  value={formData.cleaningTimeMinutes}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amenities">Comodidades (separadas por comas)</Label>
                <Textarea
                  id="amenities"
                  name="amenities"
                  rows={2}
                  placeholder="TV, Wifi, Aire acondicionado, Baño privado"
                  value={formData.amenities}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddRoomType} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayRoomTypes.map((roomType) => (
          <Card key={roomType.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{roomType.name}</span>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(roomType)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(roomType)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">{roomType.description}</p>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Capacidad:</span>{" "}
                    <span>{roomType.capacity} personas</span>
                  </div>
                  <div>
                    <span className="font-medium">Precio Base:</span>{" "}
                    <span>{formatCurrency(roomType.basePrice)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Tiempo de Limpieza:</span>{" "}
                    <span>{roomType.cleaningTimeMinutes} minutos</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium mb-1">Comodidades:</h4>
                  <div className="flex flex-wrap gap-2">
                    {roomType.amenities.map((amenity, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-gray-100 rounded-md text-xs"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Habitación</DialogTitle>
            <DialogDescription>
              Modifica los detalles del tipo de habitación
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-capacity">Capacidad (personas)</Label>
                <Input
                  id="edit-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-basePrice">Precio Base</Label>
                <Input
                  id="edit-basePrice"
                  name="basePrice"
                  type="number"
                  min="0"
                  step="10"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cleaningTimeMinutes">Tiempo de Limpieza (minutos)</Label>
              <Input
                id="edit-cleaningTimeMinutes"
                name="cleaningTimeMinutes"
                type="number"
                min="1"
                value={formData.cleaningTimeMinutes}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amenities">Comodidades (separadas por comas)</Label>
              <Textarea
                id="edit-amenities"
                name="amenities"
                rows={2}
                placeholder="TV, Wifi, Aire acondicionado, Baño privado"
                value={formData.amenities}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditRoomType} disabled={saving}>
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Eliminar Tipo de Habitación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este tipo de habitación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedRoomType && (
              <p className="font-medium text-center">
                {selectedRoomType.name}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRoomType}
              disabled={saving}
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/app/hooks/use-toast";
import { LoadingView } from "@/components/common/LoadingView";
import { ErrorView } from "@/components/common/ErrorView";
import { getRoomTypes, RoomType as DBRoomType } from "@/app/services/room-types-service";

type CleaningType = 'regular' | 'checkout' | 'deep';

interface CleaningStandard {
  roomTypeId: string;  // Cambiado a roomTypeId para vincular con el ID del tipo de habitación
  cleaningType: CleaningType;
  standardTimeMinutes: number;
  description: string;
}

// Estándares predeterminados para nuevos tipos de habitación
const getDefaultStandardsForRoomType = (roomTypeId: string, roomTypeName: string): CleaningStandard[] => [
  { roomTypeId, cleaningType: 'regular', standardTimeMinutes: 20, description: `Limpieza diaria básica - ${roomTypeName}` },
  { roomTypeId, cleaningType: 'checkout', standardTimeMinutes: 30, description: `Limpieza de salida - ${roomTypeName}` },
  { roomTypeId, cleaningType: 'deep', standardTimeMinutes: 45, description: `Limpieza profunda - ${roomTypeName}` },
];

export default function CleaningStandardsSettings() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [cleaningStandards, setCleaningStandards] = useState<CleaningStandard[]>([]);
  const [roomTypes, setRoomTypes] = useState<DBRoomType[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Get hotel ID from authentication context
  const { user, staffMember } = useAuth();
  const hotelId = user?.hotelId || staffMember?.hotelId;
  
  // Tipos de limpieza (estos son fijos en el sistema)
  const cleaningTypes: {id: CleaningType, label: string}[] = [
    { id: 'regular', label: 'Regular (Diaria)' },
    { id: 'checkout', label: 'Check-out' },
    { id: 'deep', label: 'Profunda' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!hotelId) {
        setError("No se pudo identificar el hotel. Por favor, inicie sesión nuevamente.");
        setLoading(false);
        return;
      }

      try {
        // 1. Obtener tipos de habitación
        const roomTypesData = await getRoomTypes(hotelId);
        setRoomTypes(roomTypesData);
        
        // 2. Obtener estándares de limpieza actuales
        const hotelDoc = await getDoc(doc(db, "hotels", hotelId));
        if (hotelDoc.exists()) {
          const data = hotelDoc.data();
          
          if (data.cleaningStandards && Array.isArray(data.cleaningStandards)) {
            setCleaningStandards(data.cleaningStandards);
          } else if (roomTypesData.length > 0) {
            // Si no hay estándares pero sí hay tipos de habitación, crear estándares por defecto
            const defaultStandards: CleaningStandard[] = [];
            
            roomTypesData.forEach(roomType => {
              const standards = getDefaultStandardsForRoomType(roomType.id, roomType.name);
              defaultStandards.push(...standards);
            });
            
            setCleaningStandards(defaultStandards);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error al cargar la información");
        setLoading(false);
      }
    };

    fetchData();
  }, [hotelId]);

  const handleTimeChange = (index: number, value: string) => {
    const minutes = parseInt(value);
    if (isNaN(minutes) || minutes < 1) return;
    
    const updatedStandards = [...cleaningStandards];
    updatedStandards[index] = {
      ...updatedStandards[index],
      standardTimeMinutes: minutes
    };
    setCleaningStandards(updatedStandards);
  };

  const handleDescriptionChange = (index: number, value: string) => {
    const updatedStandards = [...cleaningStandards];
    updatedStandards[index] = {
      ...updatedStandards[index],
      description: value
    };
    setCleaningStandards(updatedStandards);
  };
  
  // Esta función obtiene los estándares para un tipo de habitación específico
  const getStandardsForRoomType = (roomTypeId: string): CleaningStandard[] => {
    return cleaningStandards.filter(standard => standard.roomTypeId === roomTypeId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Validar que tenemos el hotelId
    if (!hotelId) {
      toast({
        title: "Error",
        description: "No se pudo identificar el hotel. Por favor, inicie sesión nuevamente.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }
    
    try {
      // Asegurarse de que hay al menos un estándar para cada tipo de habitación y tipo de limpieza
      let updatedStandards = [...cleaningStandards];
      
      // Verificamos que cada tipo de habitación tenga los 3 tipos de limpieza
      roomTypes.forEach(roomType => {
        cleaningTypes.forEach(cleaningType => {
          // Buscar si ya existe el estándar
          const existingStandard = updatedStandards.find(
            s => s.roomTypeId === roomType.id && s.cleaningType === cleaningType.id
          );
          
          // Si no existe, creamos un estándar por defecto
          if (!existingStandard) {
            const newStandard: CleaningStandard = {
              roomTypeId: roomType.id,
              cleaningType: cleaningType.id,
              standardTimeMinutes: 30, // Tiempo por defecto
              description: `Limpieza ${cleaningType.label} para ${roomType.name}`
            };
            
            updatedStandards.push(newStandard);
          }
        });
      });
      
      // Guardar en Firestore
      await updateDoc(doc(db, "hotels", hotelId), {
        cleaningStandards: updatedStandards,
        updatedAt: new Date(),
      });
      
      // Actualizar estado local
      setCleaningStandards(updatedStandards);
      
      toast({
        title: "Estándares actualizados",
        description: "Los estándares de limpieza han sido actualizados correctamente",
        variant: "success", // Cambiado a 'success'
      });
    } catch (err) {
      console.error("Error updating cleaning standards:", err);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los estándares de limpieza",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView message="Cargando estándares de limpieza..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Estándares de Limpieza</h2>
        <p className="text-sm text-gray-500">
          Define el tiempo estándar para cada tipo de limpieza según el tipo de habitación
        </p>
      </div>
      
      {roomTypes.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600 mb-4">No hay tipos de habitación configurados</p>
          <p className="text-sm text-gray-500">
            Para administrar los estándares de limpieza, primero debe crear tipos de habitación en la sección "Tipos de Habitación".
          </p>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {roomTypes.map(roomType => (
              <Card key={roomType.id}>
                <CardHeader>
                  <CardTitle>{roomType.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {cleaningTypes.map(cleaningType => {
                      // Buscar el estándar existente
                      const standardIndex = cleaningStandards.findIndex(
                        s => s.roomTypeId === roomType.id && s.cleaningType === cleaningType.id
                      );
                      
                      // Si no existe, crear uno nuevo temporalmente (se guardará al guardar el formulario)
                      if (standardIndex === -1) {
                        const newStandard: CleaningStandard = {
                          roomTypeId: roomType.id,
                          cleaningType: cleaningType.id,
                          standardTimeMinutes: 30, // Tiempo por defecto
                          description: `Limpieza ${cleaningType.label} para ${roomType.name}`
                        };
                        
                        // Añadir al estado
                        setTimeout(() => {
                          setCleaningStandards(prev => [...prev, newStandard]);
                        }, 0);
                        
                        return (
                          <div key={`${roomType.id}-${cleaningType.id}`} className="p-4 border rounded-md bg-gray-50">
                            <p className="text-center text-gray-500">Cargando...</p>
                          </div>
                        );
                      }
                      
                      const standard = cleaningStandards[standardIndex];
                      
                      return (
                        <div key={`${roomType.id}-${cleaningType.id}`} className="p-4 border rounded-md">
                          <h3 className="font-medium mb-2">{cleaningType.label}</h3>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor={`time-${standardIndex}`}>Tiempo Estándar (minutos)</Label>
                              <Input
                                id={`time-${standardIndex}`}
                                type="number"
                                min="1"
                                value={standard.standardTimeMinutes}
                                onChange={(e) => handleTimeChange(standardIndex, e.target.value)}
                              />
                            </div>
                            
                            <div>
                              <Label htmlFor={`desc-${standardIndex}`}>Descripción</Label>
                              <Input
                                id={`desc-${standardIndex}`}
                                value={standard.description}
                                onChange={(e) => handleDescriptionChange(standardIndex, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar Estándares"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
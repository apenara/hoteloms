"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { LoadingView } from "@/components/common/LoadingView";
import { ErrorView } from "@/components/common/ErrorView";

type RoomType = 'standard' | 'suite' | 'premium' | 'presidential';
type CleaningType = 'regular' | 'checkout' | 'deep';

interface CleaningStandard {
  roomType: RoomType;
  cleaningType: CleaningType;
  standardTimeMinutes: number;
  description: string;
}

const defaultStandards: CleaningStandard[] = [
  { roomType: 'standard', cleaningType: 'regular', standardTimeMinutes: 20, description: 'Limpieza diaria básica' },
  { roomType: 'standard', cleaningType: 'checkout', standardTimeMinutes: 30, description: 'Limpieza de salida' },
  { roomType: 'standard', cleaningType: 'deep', standardTimeMinutes: 45, description: 'Limpieza profunda' },
  { roomType: 'suite', cleaningType: 'regular', standardTimeMinutes: 30, description: 'Limpieza diaria básica' },
  { roomType: 'suite', cleaningType: 'checkout', standardTimeMinutes: 45, description: 'Limpieza de salida' },
  { roomType: 'suite', cleaningType: 'deep', standardTimeMinutes: 60, description: 'Limpieza profunda' },
  { roomType: 'premium', cleaningType: 'regular', standardTimeMinutes: 35, description: 'Limpieza diaria básica' },
  { roomType: 'premium', cleaningType: 'checkout', standardTimeMinutes: 50, description: 'Limpieza de salida' },
  { roomType: 'premium', cleaningType: 'deep', standardTimeMinutes: 70, description: 'Limpieza profunda' },
  { roomType: 'presidential', cleaningType: 'regular', standardTimeMinutes: 45, description: 'Limpieza diaria básica' },
  { roomType: 'presidential', cleaningType: 'checkout', standardTimeMinutes: 60, description: 'Limpieza de salida' },
  { roomType: 'presidential', cleaningType: 'deep', standardTimeMinutes: 90, description: 'Limpieza profunda' },
];

export default function CleaningStandardsSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleaningStandards, setCleaningStandards] = useState<CleaningStandard[]>(defaultStandards);
  const [saving, setSaving] = useState(false);
  
  // Hardcoded for demo - would normally get from authentication context
  const hotelId = "current-hotel-id";
  
  const roomTypes: {id: RoomType, label: string}[] = [
    { id: 'standard', label: 'Estándar' },
    { id: 'suite', label: 'Suite' },
    { id: 'premium', label: 'Premium' },
    { id: 'presidential', label: 'Presidencial' },
  ];
  
  const cleaningTypes: {id: CleaningType, label: string}[] = [
    { id: 'regular', label: 'Regular (Diaria)' },
    { id: 'checkout', label: 'Check-out' },
    { id: 'deep', label: 'Profunda' },
  ];

  useEffect(() => {
    const fetchCleaningStandards = async () => {
      try {
        const hotelDoc = await getDoc(doc(db, "hotels", hotelId));
        if (hotelDoc.exists()) {
          const data = hotelDoc.data();
          if (data.cleaningStandards && Array.isArray(data.cleaningStandards)) {
            setCleaningStandards(data.cleaningStandards);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching cleaning standards:", err);
        setError("Error al cargar los estándares de limpieza");
        setLoading(false);
      }
    };

    fetchCleaningStandards();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateDoc(doc(db, "hotels", hotelId), {
        cleaningStandards,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Estándares actualizados",
        description: "Los estándares de limpieza han sido actualizados correctamente",
        variant: "default",
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
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-6">
          {roomTypes.map(roomType => (
            <Card key={roomType.id}>
              <CardHeader>
                <CardTitle>{roomType.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {cleaningTypes.map(cleaningType => {
                    const standardIndex = cleaningStandards.findIndex(
                      s => s.roomType === roomType.id && s.cleaningType === cleaningType.id
                    );
                    
                    // If standard doesn't exist, create it
                    if (standardIndex === -1) {
                      const newStandard: CleaningStandard = {
                        roomType: roomType.id,
                        cleaningType: cleaningType.id,
                        standardTimeMinutes: 30, // Default
                        description: `Limpieza ${cleaningType.label} para ${roomType.label}`
                      };
                      
                      setCleaningStandards(prev => [...prev, newStandard]);
                      return null;
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
    </div>
  );
}
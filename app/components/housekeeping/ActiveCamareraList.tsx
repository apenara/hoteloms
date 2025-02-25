// src/components/housekeeping/ActiveCamareraList.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, User, Home, CheckCircle, AlertTriangle } from 'lucide-react';
import { Staff, Room } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ActiveCamareraListProps {
  camareras: Staff[];
  habitaciones: Room[];
  onSelectCamarera: (staffId: string) => void;
}

export function ActiveCamareraList({ camareras, habitaciones, onSelectCamarera }: ActiveCamareraListProps) {
  // Agrupar la info de las camareras para mostrar activas e inactivas
  const { activas, inactivas } = useMemo(() => {
    const activas: {
      camarera: Staff;
      habitacionActual?: Room;
      progreso: number;
      tiempoTranscurrido: number;
    }[] = [];
    
    const inactivas: {
      camarera: Staff;
      ultimaLimpieza?: any;
    }[] = [];
    
    camareras.forEach(camarera => {
      // Buscar habitación que está siendo limpiada actualmente por esta camarera
      const habitacionActual = habitaciones.find(h => 
        h.assignedTo === camarera.id && 
        ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'].includes(h.status)
      );
      
      if (habitacionActual) {
        // Si la camarera está activa (limpiando una habitación)
        let tiempoTranscurrido = 0;
        let progreso = 0;
        
        if (habitacionActual.lastStatusChange) {
          // Calcular tiempo transcurrido en minutos
          const startTime = habitacionActual.lastStatusChange.toDate();
          const now = new Date();
          tiempoTranscurrido = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));
          
          // Calcular progreso basado en el tipo de limpieza
          let tiempoEsperado = 30; // Predeterminado
          if (habitacionActual.status === 'cleaning_checkout') tiempoEsperado = 45;
          if (habitacionActual.status === 'cleaning_occupied') tiempoEsperado = 30;
          if (habitacionActual.status === 'cleaning_touch') tiempoEsperado = 15;
          
          progreso = Math.min(100, (tiempoTranscurrido / tiempoEsperado) * 100);
        }
        
        activas.push({
          camarera,
          habitacionActual,
          progreso,
          tiempoTranscurrido
        });
      } else {
        // Camarera inactiva
        // Buscar la última limpieza realizada
        const ultimasLimpiezas = habitaciones
          .filter(h => h.lastCleanedBy === camarera.id)
          .sort((a, b) => {
            if (!a.lastCleaned || !b.lastCleaned) return 0;
            return b.lastCleaned.toDate().getTime() - a.lastCleaned.toDate().getTime();
          });
        
        inactivas.push({
          camarera,
          ultimaLimpieza: ultimasLimpiezas.length > 0 ? {
            habitacion: ultimasLimpiezas[0],
            timestamp: ultimasLimpiezas[0].lastCleaned
          } : undefined
        });
      }
    });
    
    return { activas, inactivas };
  }, [camareras, habitaciones]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sección de camareras activas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-500" />
              Camareras Activas ({activas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay camareras trabajando en este momento
                </div>
              ) : (
                activas.map(({ camarera, habitacionActual, progreso, tiempoTranscurrido }) => (
                  <Card key={camarera.id} className="mb-4">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2 items-center">
                          <User className="h-5 w-5 text-gray-400" />
                          <div>
                            <h3 className="font-medium">{camarera.name}</h3>
                            <p className="text-sm text-gray-500">{camarera.phone || 'Sin teléfono'}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSelectCamarera(camarera.id)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                      
                      {habitacionActual && (
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center">
                              <Home className="h-4 w-4 mr-1 text-gray-500" />
                              <span className="text-sm font-medium">
                                Hab. {habitacionActual.number}
                                <span className="ml-2 text-xs">
                                  ({
                                    habitacionActual.status === 'cleaning_checkout' ? 'Checkout' :
                                    habitacionActual.status === 'cleaning_occupied' ? 'Ocupada' :
                                    habitacionActual.status === 'cleaning_touch' ? 'Retoque' : 'Limpieza'
                                  })
                                </span>
                              </span>
                            </div>
                            <Badge 
                              variant={progreso > 100 ? "destructive" : "outline"}
                              className={progreso > 100 ? "animate-pulse" : ""}
                            >
                              {tiempoTranscurrido} min
                            </Badge>
                          </div>
                          
                          <Progress 
                            value={progreso} 
                            className="h-2"
                            indicatorClassName={
                              progreso > 100 ? "bg-red-500" :
                              progreso > 80 ? "bg-yellow-500" :
                              "bg-green-500"
                            }
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Sección de camareras inactivas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2 text-gray-500" />
              Camareras Inactivas ({inactivas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inactivas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Todas las camareras están activas
                </div>
              ) : (
                inactivas.map(({ camarera, ultimaLimpieza }) => (
                  <Card key={camarera.id} className="mb-4">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2 items-center">
                          <User className="h-5 w-5 text-gray-400" />
                          <div>
                            <h3 className="font-medium">{camarera.name}</h3>
                            <p className="text-sm text-gray-500">{camarera.phone || 'Sin teléfono'}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onSelectCamarera(camarera.id)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                      
                      {ultimaLimpieza ? (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Última limpieza: Hab. {ultimaLimpieza.habitacion.number}</span>
                          </div>
                          {ultimaLimpieza.timestamp && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(ultimaLimpieza.timestamp.seconds * 1000).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm flex items-center">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          Sin actividad reciente
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { notificationManagerService, RequestType } from "@/app/services/notificationManagerService";
import { toast } from "@/app/hooks/use-toast";

export default function TestNotificationsPage() {
  const { user, staffMember } = useAuth();
  const hotelId = user?.hotelId || staffMember?.hotelId;
  
  const [notificationType, setNotificationType] = useState<string>(RequestType.GUEST_MESSAGE);
  const [roomNumber, setRoomNumber] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [title, setTitle] = useState<string>("Mensaje de prueba");
  const [guestName, setGuestName] = useState<string>("");
  const [priority, setPriority] = useState<string>("medium");
  const [sending, setSending] = useState<boolean>(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSendNotification = async () => {
    if (!hotelId) {
      toast({
        title: "Error",
        description: "No se ha identificado el hotel. Por favor, inicie sesión nuevamente.",
        variant: "destructive",
      });
      return;
    }

    if (!roomNumber) {
      toast({
        title: "Error",
        description: "Por favor, ingrese un número de habitación.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setResult(null);
    let success = false;

    try {
      switch (notificationType) {
        case RequestType.NEED_TOWELS:
          success = await notificationManagerService.sendTowelRequest(hotelId, roomNumber, guestName);
          break;
        
        case RequestType.NEED_CLEANING:
          success = await notificationManagerService.sendCleaningRequest(hotelId, roomNumber, guestName);
          break;
        
        case RequestType.GUEST_MESSAGE:
          success = await notificationManagerService.sendGuestMessage(
            hotelId, 
            roomNumber, 
            message || "Mensaje de prueba", 
            guestName
          );
          break;
        
        case RequestType.MAINTENANCE:
          success = await notificationManagerService.sendMaintenanceRequest(
            hotelId, 
            roomNumber, 
            message || "Solicitud de mantenimiento de prueba",
            priority as 'low' | 'medium' | 'high'
          );
          break;
        
        default:
          success = await notificationManagerService.sendRequestNotification(
            notificationType as RequestType,
            { hotelId },
            {
              title: title || "Notificación de prueba",
              message: message || "Mensaje de prueba",
              roomNumber,
              data: { priority, guestName }
            }
          );
      }

      if (success) {
        toast({
          title: "Éxito",
          description: "Notificación enviada correctamente.",
          variant: "default",
        });
        setResult("✅ Notificación enviada correctamente");
      } else {
        toast({
          title: "Error",
          description: "No se pudo enviar la notificación.",
          variant: "destructive",
        });
        setResult("❌ Error al enviar la notificación");
      }
    } catch (error) {
      console.error("Error al enviar la notificación:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar la solicitud.",
        variant: "destructive",
      });
      setResult(`❌ Error: ${error instanceof Error ? error.message : "Desconocido"}`);
    } finally {
      setSending(false);
    }
  };

  if (!hotelId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-gray-500">Debe iniciar sesión para acceder a esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Prueba de Notificaciones</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Enviar Notificación de Prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="notificationType">Tipo de Notificación</Label>
                <Select 
                  value={notificationType} 
                  onValueChange={setNotificationType}
                >
                  <SelectTrigger id="notificationType">
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={RequestType.NEED_TOWELS}>Solicitud de Toallas</SelectItem>
                    <SelectItem value={RequestType.NEED_CLEANING}>Solicitud de Limpieza</SelectItem>
                    <SelectItem value={RequestType.GUEST_MESSAGE}>Mensaje de Huésped</SelectItem>
                    <SelectItem value={RequestType.MAINTENANCE}>Mantenimiento</SelectItem>
                    <SelectItem value={RequestType.DO_NOT_DISTURB}>No Molestar</SelectItem>
                    <SelectItem value={RequestType.ROOM_READY}>Habitación Lista</SelectItem>
                    <SelectItem value={RequestType.GENERAL_ALERT}>Alerta General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="roomNumber">Número de Habitación</Label>
                <Input 
                  id="roomNumber" 
                  value={roomNumber} 
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="101"
                />
              </div>
              
              <div>
                <Label htmlFor="guestName">Nombre del Huésped (opcional)</Label>
                <Input 
                  id="guestName" 
                  value={guestName} 
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
              
              {notificationType === RequestType.MAINTENANCE && (
                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select 
                    value={priority} 
                    onValueChange={setPriority}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Seleccione prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título (para tipos personalizados)</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título de la notificación"
                />
              </div>
              
              <div>
                <Label htmlFor="message">Mensaje</Label>
                <Textarea 
                  id="message" 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Contenido del mensaje"
                  rows={5}
                />
              </div>
            </div>
          </div>
          
          {result && (
            <div className={`p-4 rounded-md ${result.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSendNotification} disabled={sending}>
            {sending ? "Enviando..." : "Enviar Notificación"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
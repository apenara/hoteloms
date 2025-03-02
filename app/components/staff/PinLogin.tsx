// src/components/staff/PinLogin.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { hasPermission } from "@/app/lib/constants/permissions";
import { logAccess } from "@/app/services/access-logs";
import { registerUserToken } from "@/app/services/tokenService";
import { Checkbox } from "../ui/checkbox";

interface PinLoginProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (staffMember: any) => void;
  hotelId: string;
}

interface SavedPinData {
  pin: string;
  hotelId: string;
  timestamp: string;
}

export function PinLogin({
  isOpen,
  onClose,
  onSuccess,
  hotelId,
}: PinLoginProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberPin, setRememberPin] = useState(false);

  useEffect(() => {
    // Intentar cargar PIN guardado al abrir el diálogo
    if (isOpen) {
      const savedPinData = getSavedPin();
      if (savedPinData && savedPinData.hotelId === hotelId) {
        setPin(savedPinData.pin);
        setRememberPin(true);
      }
    }
  }, [isOpen, hotelId]);

  const validatePin = (pin: string) => {
    // Validar que el PIN tenga exactamente 10 dígitos y solo contenga números
    return /^\d{10}$/.test(pin);
  };

  const getSavedPin = (): SavedPinData | null => {
    try {
      const savedPin = localStorage.getItem("savedStaffPin");
      if (savedPin) {
        const pinData = JSON.parse(savedPin);
        // Verificar si el PIN guardado tiene menos de 12 horas
        const savedTime = new Date(pinData.timestamp).getTime();
        const now = new Date().getTime();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;

        if (now - savedTime < TWELVE_HOURS) {
          return pinData;
        } else {
          // Eliminar PIN guardado si ha expirado
          localStorage.removeItem("savedStaffPin");
        }
      }
    } catch (error) {
      console.error("Error al recuperar PIN guardado:", error);
      localStorage.removeItem("savedStaffPin");
    }
    return null;
  };

  // Cache para almacenar respuestas previas de consultas de PIN
  const pinCache = {};

  const savePin = (pin: string) => {
    try {
      const pinData: SavedPinData = {
        pin,
        hotelId,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("savedStaffPin", JSON.stringify(pinData));
    } catch (error) {
      console.error("Error al guardar PIN:", error);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validar formato del PIN
      if (!validatePin(pin)) {
        throw new Error(
          "El PIN debe contener exactamente 10 dígitos numéricos"
        );
      }

      // Verificar si el PIN ya está en cache
      const cacheKey = `${hotelId}_${pin}`;
      if (pinCache[cacheKey] && pinCache[cacheKey].expiry > Date.now()) {
        // Usar datos en cache
        const cachedData = pinCache[cacheKey].data;

        // No solicitamos tokens FCM en vistas públicas de habitaciones
        // para evitar problemas de permisos innecesarios

        // Actualizar acceso y último acceso en segundo plano en paralelo
        Promise.all([
          logAccess({
            userId: cachedData.id,
            userName: cachedData.name,
            role: cachedData.role,
            accessType: "pin",
            hotelId: hotelId,
            action: "pin_login",
          }),

          updateDoc(doc(db, "hotels", hotelId, "staff", cachedData.id), {
            lastLogin: new Date(),
            lastLoginType: "pin",
          }),
        ]).catch((error) => {
          console.error(
            "Error en actualización de acceso en segundo plano:",
            error
          );
          // Ignoramos el error ya que es una operación en segundo plano
        });

        // Notificar éxito inmediatamente
        onSuccess({
          ...cachedData,
          lastAccess: new Date().toISOString(),
        });

        // Guardar PIN si se seleccionó recordar
        if (rememberPin) {
          savePin(pin);
        } else {
          localStorage.removeItem("savedStaffPin");
        }

        onClose();
        setPin("");
        return;
      }

      // Buscar el staff por PIN
      const staffRef = collection(db, "hotels", hotelId, "staff");
      const q = query(staffRef, where("pin", "==", pin));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("PIN inválido o usuario inactivo");
      }

      const staffDoc = querySnapshot.docs[0];
      const staffData = staffDoc.data();

      // Verificar si el staff está activo
      if (staffData.status !== "active") {
        throw new Error("Usuario inactivo. Contacte al administrador");
      }

      // Verificar permisos básicos
      if (!hasPermission(staffData.role, "canChangeRoomStatus")) {
        throw new Error("No tienes los permisos necesarios para acceder");
      }

      // Guardar PIN si se seleccionó recordar
      if (rememberPin) {
        savePin(pin);
      } else {
        localStorage.removeItem("savedStaffPin");
      }

      // No solicitamos tokens FCM en vistas públicas de habitaciones
      // para evitar problemas de permisos innecesarios

      // Registrar acceso y actualizar último acceso de forma paralela
      await Promise.all([
        logAccess({
          userId: staffDoc.id,
          userName: staffData.name,
          role: staffData.role,
          accessType: "pin",
          hotelId: hotelId,
          action: "pin_login",
        }),

        updateDoc(doc(db, "hotels", hotelId, "staff", staffDoc.id), {
          lastLogin: new Date(),
          lastLoginType: "pin",
        }),
      ]);

      // Guardar en cache por 30 minutos
      const userData = {
        id: staffDoc.id,
        ...staffData,
      };

      pinCache[cacheKey] = {
        data: userData,
        expiry: Date.now() + 30 * 60 * 1000, // 30 minutos
      };

      // Notificar éxito y enviar los datos incluyendo el token FCM
      onSuccess({
        ...userData,
        lastAccess: new Date().toISOString(),
      });

      onClose();
      setPin("");
    } catch (error) {
      console.error("Error de autenticación:", error);
      setError(error.message || "Error en la autenticación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Acceso del Personal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="pin">PIN de Acceso</Label>
            <Input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ingrese su PIN de 10 dígitos"
              maxLength={10}
              pattern="\d*"
              inputMode="numeric"
              required
              className="text-center tracking-widest text-lg"
            />
            <p className="text-sm text-gray-500">
              Ingrese su número de documento como PIN
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberPin"
              checked={rememberPin}
              onCheckedChange={(checked) => setRememberPin(checked as boolean)}
            />
            <label
              htmlFor="rememberPin"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Recordar PIN por 12 horas
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || pin.length !== 10}>
              {loading ? "Verificando..." : "Ingresar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

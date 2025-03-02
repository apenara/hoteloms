"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { registerUserToken } from "@/app/services/tokenService";

export default function LoginPage() {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithPin } = useAuth();
  const redirect = searchParams.get("redirect") || "/";
  const hotelId = searchParams.get("hotelId");
  const requiredRole = searchParams.get("role");

  const handlePinSearch = async (pin: string) => {
    try {
      const hotelsRef = collection(db, "hotels");
      const hotelsSnapshot = await getDocs(hotelsRef);

      for (const hotelDoc of hotelsSnapshot.docs) {
        const staffRef = collection(db, "hotels", hotelDoc.id, "staff");
        const q = query(
          staffRef,
          where("pin", "==", pin),
          where("status", "==", "active")
        );
        const staffSnapshot = await getDocs(q);

        if (!staffSnapshot.empty) {
          return {
            hotelId: hotelDoc.id,
            staffData: staffSnapshot.docs[0].data(),
            staffId: staffSnapshot.docs[0].id,
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error buscando PIN:", error);
      return null;
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginData.email,
        loginData.password
      );

      const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
      const userData = userDoc.data();

      if (!userData) {
        throw new Error("No se encontraron datos del usuario");
      }

      // Registrar token FCM con información completa
      const fcmToken = await registerUserToken(
        userCredential.user.uid,
        userData.hotelId || "admin",
        userData.role,
        "email" // Agregar método de autenticación
      );

      // Guardar datos en localStorage/sessionStorage para mantener consistencia
      const authData = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        ...userData,
        timestamp: new Date().toISOString(),
      };

      // Para asegurar la persistencia de la sesión entre cargas y middleware
      localStorage.setItem("authUser", JSON.stringify(authData));
      sessionStorage.setItem("authUser", JSON.stringify(authData));

      // Guardamos el token de autenticación en una cookie para que middleware pueda verificarla
      document.cookie = `authToken=${userCredential.user.uid}; path=/; max-age=28800; SameSite=Lax`;

      // Si hay token FCM, también lo guardamos en cookie
      if (fcmToken) {
        document.cookie = `firebase-token=${fcmToken}; path=/; max-age=28800; SameSite=Lax`;
      }

      // Establecer marca de tiempo de inicio de sesión
      document.cookie = `sessionStart=${Date.now()}; path=/; max-age=28800; SameSite=Lax`;

      // Redireccionar según el rol
      if (userData.role === "super_admin") {
        window.location.href = "/admin/dashboard";
      } else if (userData.role === "hotel_admin") {
        window.location.href = "/hotel-admin/dashboard";
      } else {
        window.location.href = redirect;
      }
    } catch (error) {
      console.error("Error de login:", error);
      setError("Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let targetHotelId = hotelId;
      let staffInfo = null;

      if (!targetHotelId) {
        staffInfo = await handlePinSearch(pin);
        if (!staffInfo) {
          throw new Error("PIN no encontrado en ningún hotel");
        }
        targetHotelId = staffInfo.hotelId;
      }

      const staffMember = await loginWithPin(pin, targetHotelId, requiredRole);

      // Registrar token FCM con la información correcta del staff
      const fcmToken = await registerUserToken(
        staffMember.id,
        targetHotelId,
        staffMember.role,
        "pin" // Agregar método de autenticación
      );

      // Guardamos las cookies necesarias para el middleware
      document.cookie = `staffAccess=${staffMember.id}; path=/; max-age=28800; SameSite=Lax`;
      document.cookie = `sessionStart=${Date.now()}; path=/; max-age=28800; SameSite=Lax`;

      // Si hay token FCM, también lo guardamos en cookie
      if (fcmToken) {
        document.cookie = `firebase-token=${fcmToken}; path=/; max-age=28800; SameSite=Lax`;
      }

      // Creamos un respaldo adicional de información de staff para mayor seguridad
      const staffCacheKey = `staff_data_${staffMember.id}`;
      sessionStorage.setItem(staffCacheKey, JSON.stringify(staffMember));

      // Construir la URL de redirección según el rol
      let redirectUrl = "";
      switch (staffMember.role) {
        case "reception":
          redirectUrl = `/reception/${staffMember.hotelId}/staff`;
          break;
        case "maintenance":
          redirectUrl = `/maintenance/${staffMember.hotelId}/staff`;
          break;
        case "housekeeping":
          redirectUrl = `/housekeeping/${staffMember.hotelId}/staff`;
          break;
        case "hotel_admin":
          redirectUrl = "/hotel-admin/dashboard";
          break;
        default:
          redirectUrl = "/";
      }

      // Esperar un momento para asegurar que la sesión se guardó
      await new Promise((resolve) => setTimeout(resolve, 300));

      window.location.href = redirectUrl;
    } catch (error) {
      console.error("Error de login con PIN:", error);
      setError(error.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  // Determinar la pestaña por defecto
  const defaultTab = hotelId ? "pin" : "email";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa con tu cuenta o PIN de personal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="pin">PIN de Personal</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={loginData.email}
                    onChange={(e) =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    required
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="pin">
              <form onSubmit={handlePinLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pin">PIN de Personal</Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="Ingresa tu PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={10}
                    pattern="\d*"
                    inputMode="numeric"
                    required
                    className="text-center tracking-widest text-lg"
                  />
                  <p className="text-sm text-gray-500 text-center">
                    Ingresa tu número de documento como PIN
                  </p>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verificando..." : "Acceder con PIN"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

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
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithPin } = useAuth();
  const redirect = searchParams.get("redirect") || "/";
  const hotelId = searchParams.get("hotelId");
  const requiredRole = searchParams.get("role");

  // Verificar al cargar si ya hay una sesión en progreso
  useEffect(() => {
    // Primero, verificar si estamos en la página de login después de un logout
    const isAfterLogout = sessionStorage.getItem("justLoggedOut");
    
    if (isAfterLogout === "true") {
      // Limpiar el flag de redirección si acabamos de hacer logout
      sessionStorage.removeItem("isRedirecting");
      sessionStorage.removeItem("justLoggedOut");
      sessionStorage.removeItem("redirectStartTime");
      setIsRedirecting(false);
    } else {
      // Verificar si hay una redirección en progreso
      const redirectingFlag = sessionStorage.getItem("isRedirecting");
      if (redirectingFlag === "true") {
        // Comprobar cuándo se inició la redirección
        const redirectStartTime = parseInt(sessionStorage.getItem("redirectStartTime") || "0");
        const currentTime = new Date().getTime();
        
        // Si han pasado más de 15 segundos, consideramos que la redirección falló
        if (currentTime - redirectStartTime > 15000) {
          // Limpiar el estado de redirección
          sessionStorage.removeItem("isRedirecting");
          sessionStorage.removeItem("redirectStartTime");
          setIsRedirecting(false);
        } else {
          setIsRedirecting(true);
          
          // Calcular progreso basado en tiempo transcurrido (máximo 15 segundos)
          const elapsed = currentTime - redirectStartTime;
          const progressPercentage = Math.min(Math.floor((elapsed / 15000) * 100), 99);
          setLoadingProgress(progressPercentage);
        }
      }
    }
  }, []);

  // Efecto para simular progreso de carga si estamos en estado de redirección
  useEffect(() => {
    let progressInterval;
    
    if (isRedirecting && loadingProgress < 90) {
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          const increment = 90 - prev > 30 ? 5 : 1; // Más rápido al inicio, más lento al final
          return Math.min(prev + increment, 90);
        });
      }, 500);
    }
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isRedirecting, loadingProgress]);

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

  const handleRedirection = (redirectUrl) => {
    setIsRedirecting(true);
    // Iniciar progreso desde cero
    setLoadingProgress(0);
    
    // Guardar el estado de redirección en sessionStorage
    sessionStorage.setItem("isRedirecting", "true");
    // Guardar el tiempo de inicio de la redirección
    sessionStorage.setItem("redirectStartTime", new Date().getTime().toString());
    
    // Esperar un momento para asegurar que la sesión se guardó
    setTimeout(() => {
      // Establecer progreso a 95% justo antes de redireccionar
      setLoadingProgress(95);
      window.location.href = redirectUrl;
    }, 800);
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
      let redirectUrl;
      if (userData.role === "super_admin") {
        redirectUrl = "/admin/dashboard";
      } else if (userData.role === "hotel_admin") {
        redirectUrl = "/hotel-admin/dashboard";
      } else {
        redirectUrl = redirect;
      }

      handleRedirection(redirectUrl);
      
    } catch (error) {
      console.error("Error de login:", error);
      setError("Credenciales inválidas");
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
        case "housekeeper":
          redirectUrl = `/housekeeping/${staffMember.hotelId}/staff`;
          break;
        case "hotel_admin":
          redirectUrl = "/hotel-admin/dashboard";
          break;
        default:
          redirectUrl = "/";
      }

      handleRedirection(redirectUrl);
      
    } catch (error) {
      console.error("Error de login con PIN:", error);
      setError(error.message || "Error al iniciar sesión");
      setLoading(false);
    }
  };

  // Determinar la pestaña por defecto
  const defaultTab = hotelId ? "pin" : "email";

  // Si está redirigiendo, mostrar pantalla de carga mejorada
  if (isRedirecting) {
    return (
      <div className="fixed inset-0 bg-gradient-to-r from-blue-100 to-indigo-50 flex flex-col items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4 flex flex-col items-center">
          {/* Logo del hotel (puedes reemplazar con tu propio logo) */}
          <div className="w-16 h-16 mb-6 flex items-center justify-center">
            <svg
              className="w-full h-full text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
              <path d="M1 21h22" />
              <path d="M7 10.5V7" />
              <path d="M17 10.5V7" />
              <path d="M12 10.5V7" />
              <path d="M7 14.5v-4" />
              <path d="M17 14.5v-4" />
              <path d="M12 14.5v-4" />
            </svg>
          </div>

          {/* Animación de carga */}
          <div className="relative w-20 h-20 mb-4">
            <div className="absolute top-0 left-0 right-0 bottom-0 animate-spin rounded-full border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-100"></div>
            <div className="absolute top-2 left-2 right-2 bottom-2 animate-spin rounded-full border-4 border-t-blue-400 border-r-blue-200 border-b-blue-100 border-l-transparent" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute top-4 left-4 right-4 bottom-4 animate-pulse flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-blue-500"></div>
            </div>
          </div>

          {/* Textos informativos */}
          <h2 className="text-xl font-semibold text-gray-800 text-center">Iniciando sesión</h2>
          <p className="text-gray-500 mt-2 text-center">Estamos preparando tu experiencia</p>
          
          {/* Progreso animado y dinámico */}
          <div className="w-full mt-6 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{loadingProgress}%</p>
        </div>
      </div>
    );
  }

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
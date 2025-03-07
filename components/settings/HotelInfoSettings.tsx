"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { LoadingView } from "@/components/common/LoadingView";
import { ErrorView } from "@/components/common/ErrorView";

export default function HotelInfoSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotelData, setHotelData] = useState({
    hotelName: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    description: "",
    website: "",
    checkInTime: "14:00",
    checkOutTime: "12:00",
  });
  const [saving, setSaving] = useState(false);
  
  // Hardcoded for demo - would normally get from authentication context
  const hotelId = "current-hotel-id";

  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        const hotelDoc = await getDoc(doc(db, "hotels", hotelId));
        if (hotelDoc.exists()) {
          const data = hotelDoc.data();
          setHotelData({
            hotelName: data.hotelName || "",
            ownerName: data.ownerName || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            zipCode: data.zipCode || "",
            country: data.country || "",
            description: data.description || "",
            website: data.website || "",
            checkInTime: data.checkInTime || "14:00",
            checkOutTime: data.checkOutTime || "12:00",
          });
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching hotel data:", err);
        setError("Error al cargar los datos del hotel");
        setLoading(false);
      }
    };

    fetchHotelData();
  }, [hotelId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setHotelData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateDoc(doc(db, "hotels", hotelId), {
        ...hotelData,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Configuración actualizada",
        description: "La información del hotel ha sido actualizada correctamente",
        variant: "default",
      });
    } catch (err) {
      console.error("Error updating hotel data:", err);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del hotel",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView message="Cargando información del hotel..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Información del Hotel</h2>
        <p className="text-sm text-gray-500">
          Actualiza la información básica de tu hotel
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hotelName">Nombre del Hotel</Label>
            <Input 
              id="hotelName"
              name="hotelName"
              value={hotelData.hotelName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ownerName">Nombre del Propietario</Label>
            <Input 
              id="ownerName"
              name="ownerName"
              value={hotelData.ownerName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input 
              id="email"
              name="email"
              type="email"
              value={hotelData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input 
              id="phone"
              name="phone"
              value={hotelData.phone}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input 
              id="address"
              name="address"
              value={hotelData.address}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input 
              id="city"
              name="city"
              value={hotelData.city}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="state">Estado/Provincia</Label>
            <Input 
              id="state"
              name="state"
              value={hotelData.state}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="zipCode">Código Postal</Label>
            <Input 
              id="zipCode"
              name="zipCode"
              value={hotelData.zipCode}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input 
              id="country"
              name="country"
              value={hotelData.country}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="website">Sitio Web</Label>
            <Input 
              id="website"
              name="website"
              value={hotelData.website}
              onChange={handleChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="checkInTime">Hora de Check-in</Label>
            <Input 
              id="checkInTime"
              name="checkInTime"
              type="time"
              value={hotelData.checkInTime}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="checkOutTime">Hora de Check-out</Label>
            <Input 
              id="checkOutTime"
              name="checkOutTime"
              type="time"
              value={hotelData.checkOutTime}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea 
              id="description"
              name="description"
              value={hotelData.description}
              onChange={handleChange}
              rows={4}
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
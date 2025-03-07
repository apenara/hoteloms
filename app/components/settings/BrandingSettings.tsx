"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db } from "@/lib/firebase/config";
import { storage } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingView } from "@/components/common/LoadingView";
import { ErrorView } from "@/components/common/ErrorView";
import { useToast } from "@/app/hooks/use-toast";

interface BrandingData {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export default function BrandingSettings() {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandingData, setBrandingData] = useState<BrandingData>({
    logoUrl: null,
    primaryColor: "#2563eb", // Default blue
    secondaryColor: "#6b7280", // Default gray
    accentColor: "#10b981", // Default green
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Hardcoded for demo - would normally get from authentication context
  const hotelId = "current-hotel-id";

  useEffect(() => {
    const fetchBrandingData = async () => {
      try {
        const hotelDoc = await getDoc(doc(db, "hotels", hotelId));
        if (hotelDoc.exists()) {
          const data = hotelDoc.data();
          setBrandingData({
            logoUrl: data.logoUrl || null,
            primaryColor: data.primaryColor || "#2563eb",
            secondaryColor: data.secondaryColor || "#6b7280",
            accentColor: data.accentColor || "#10b981",
          });
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching branding data:", err);
        setError("Error al cargar los datos de marca");
        setLoading(false);
      }
    };

    fetchBrandingData();
  }, [hotelId]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBrandingData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type and size
    if (!file.type.includes('image/')) {
      toast({
        title: "Error",
        description: "El archivo debe ser una imagen",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "Error",
        description: "La imagen no debe exceder 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingLogo(true);
    
    try {
      // Create storage reference
      const logoRef = ref(storage, `hotels/${hotelId}/logo-${Date.now()}`);
      
      // Upload file
      await uploadBytes(logoRef, file);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(logoRef);
      
      // Delete previous logo if exists
      if (brandingData.logoUrl) {
        try {
          const oldLogoRef = ref(storage, brandingData.logoUrl);
          await deleteObject(oldLogoRef);
        } catch (error) {
          console.error("Error deleting old logo:", error);
        }
      }
      
      // Update state and database
      setBrandingData((prev) => ({
        ...prev,
        logoUrl: downloadUrl,
      }));
      
      await updateDoc(doc(db, "hotels", hotelId), {
        logoUrl: downloadUrl,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Logo actualizado",
        description: "El logo ha sido actualizado correctamente",
        variant: "default",
      });
    } catch (err) {
      console.error("Error uploading logo:", err);
      toast({
        title: "Error",
        description: "No se pudo subir el logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!brandingData.logoUrl) return;
    
    setUploadingLogo(true);
    
    try {
      // Delete logo from storage
      const logoRef = ref(storage, brandingData.logoUrl);
      await deleteObject(logoRef);
      
      // Update state and database
      setBrandingData((prev) => ({
        ...prev,
        logoUrl: null,
      }));
      
      await updateDoc(doc(db, "hotels", hotelId), {
        logoUrl: null,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Logo eliminado",
        description: "El logo ha sido eliminado correctamente",
        variant: "default",
      });
    } catch (err) {
      console.error("Error removing logo:", err);
      toast({
        title: "Error",
        description: "No se pudo eliminar el logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await updateDoc(doc(db, "hotels", hotelId), {
        primaryColor: brandingData.primaryColor,
        secondaryColor: brandingData.secondaryColor,
        accentColor: brandingData.accentColor,
        updatedAt: new Date(),
      });
      
      toast({
        title: "Configuración actualizada",
        description: "Los colores de marca han sido actualizados correctamente",
        variant: "default",
      });
    } catch (err) {
      console.error("Error updating branding colors:", err);
      toast({
        title: "Error",
        description: "No se pudieron actualizar los colores de marca",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView message="Cargando configuración de marca..." />;
  if (error) return <ErrorView message={error} />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">Configuración de Marca</h2>
        <p className="text-sm text-gray-500">
          Personaliza el logo y los colores de tu hotel
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Logo Upload */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Logo del Hotel</h3>
          
          <div className="space-y-4">
            {brandingData.logoUrl ? (
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 relative mb-4 border rounded-md overflow-hidden">
                  <Image 
                    src={brandingData.logoUrl} 
                    alt="Logo del hotel" 
                    fill 
                    style={{ objectFit: "contain" }}
                  />
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                >
                  Eliminar Logo
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 border rounded-md border-dashed">
                <p className="text-gray-500">No hay logo configurado</p>
              </div>
            )}
            
            <div className="mt-4">
              <Label htmlFor="logo-upload">Subir nuevo logo</Label>
              <Input
                id="logo-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG o SVG. Máximo 5MB.
              </p>
            </div>
          </div>
        </Card>
        
        {/* Color Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Colores de Marca</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="primaryColor">Color Principal</Label>
              <div className="flex mt-1">
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  value={brandingData.primaryColor}
                  onChange={handleColorChange}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={brandingData.primaryColor}
                  onChange={handleColorChange}
                  name="primaryColor"
                  className="flex-1 ml-2"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usado para elementos principales, barras de navegación, y botones primarios.
              </p>
            </div>
            
            <div>
              <Label htmlFor="secondaryColor">Color Secundario</Label>
              <div className="flex mt-1">
                <Input
                  id="secondaryColor"
                  name="secondaryColor"
                  type="color"
                  value={brandingData.secondaryColor}
                  onChange={handleColorChange}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={brandingData.secondaryColor}
                  onChange={handleColorChange}
                  name="secondaryColor"
                  className="flex-1 ml-2"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usado para elementos secundarios y texto.
              </p>
            </div>
            
            <div>
              <Label htmlFor="accentColor">Color de Acento</Label>
              <div className="flex mt-1">
                <Input
                  id="accentColor"
                  name="accentColor"
                  type="color"
                  value={brandingData.accentColor}
                  onChange={handleColorChange}
                  className="w-12 h-10 p-1"
                />
                <Input
                  type="text"
                  value={brandingData.accentColor}
                  onChange={handleColorChange}
                  name="accentColor"
                  className="flex-1 ml-2"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usado para destacar elementos, botones de acción, y elementos interactivos.
              </p>
            </div>
            
            <div className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Colores"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
      
      {/* Color Preview */}
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Vista Previa</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div 
            className="h-24 rounded-md flex items-center justify-center text-white" 
            style={{ backgroundColor: brandingData.primaryColor }}
          >
            Color Principal
          </div>
          <div 
            className="h-24 rounded-md flex items-center justify-center text-white" 
            style={{ backgroundColor: brandingData.secondaryColor }}
          >
            Color Secundario
          </div>
          <div 
            className="h-24 rounded-md flex items-center justify-center text-white" 
            style={{ backgroundColor: brandingData.accentColor }}
          >
            Color de Acento
          </div>
        </div>
        <div className="mt-4 p-4 border rounded-md">
          <div className="flex items-center mb-4">
            {brandingData.logoUrl && (
              <div className="w-10 h-10 relative mr-3">
                <Image 
                  src={brandingData.logoUrl} 
                  alt="Logo" 
                  fill 
                  style={{ objectFit: "contain" }}
                />
              </div>
            )}
            <h4 className="font-bold" style={{ color: brandingData.primaryColor }}>
              Dashboard del Hotel
            </h4>
          </div>
          <div className="space-y-2">
            <div className="w-full h-8 rounded-sm" style={{ backgroundColor: brandingData.primaryColor, opacity: 0.1 }}></div>
            <div className="w-3/4 h-8 rounded-sm" style={{ backgroundColor: brandingData.secondaryColor, opacity: 0.1 }}></div>
            <div className="flex space-x-2">
              <div 
                className="px-4 py-2 rounded-md text-white text-sm"
                style={{ backgroundColor: brandingData.primaryColor }}
              >
                Botón Principal
              </div>
              <div 
                className="px-4 py-2 rounded-md text-white text-sm"
                style={{ backgroundColor: brandingData.accentColor }}
              >
                Botón de Acción
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
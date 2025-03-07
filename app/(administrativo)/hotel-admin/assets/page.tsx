"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Tag, QrCode, ListPlus } from "lucide-react";
import AssetsList from "@/app/components/assets/AssetsList";
import AssetCategoriesManager from "@/app/components/assets/AssetCategoriesManager";
import QRCodeGenerator from "@/app/components/assets/QRCodeGenerator";
import RoomAssetBulkLoader from "@/app/components/assets/RoomAssetBulkLoader";

export default function AssetsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("inventory");
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showBulkLoader, setShowBulkLoader] = useState(false);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Administración de Activos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkLoader(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <ListPlus className="h-5 w-5 mr-2" />
            Carga Inicial
          </button>
          <button
            onClick={() => setShowQRGenerator(true)}
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <QrCode className="h-5 w-5 mr-2" />
            Generar QR
          </button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>Inventario</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>Categorías</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-6">
          <AssetsList />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <AssetCategoriesManager />
        </TabsContent>
      </Tabs>

      {/* Generador de QR como diálogo */}
      {showQRGenerator && (
        <QRCodeGenerator
          isOpen={showQRGenerator}
          onClose={() => setShowQRGenerator(false)}
          hotelId={user?.hotelId || ""}
        />
      )}

      {/* Carga masiva de activos por habitación */}
      {showBulkLoader && (
        <RoomAssetBulkLoader
          isOpen={showBulkLoader}
          onClose={() => setShowBulkLoader(false)}
        />
      )}
    </div>
  );
}

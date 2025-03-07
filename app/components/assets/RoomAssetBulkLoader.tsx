"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Save, Trash2, Home } from "lucide-react";
import { toast } from "@/app/hooks/use-toast";
import { Asset, AssetCategory, Room } from "@/app/lib/types";

interface AssetEntry {
  id?: string;
  name: string;
  assetCode: string;
  categoryId: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: "active" | "maintenance" | "retired" | "pending";
  condition: "new" | "good" | "fair" | "poor";
}

interface RoomAssetBulkLoaderProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RoomAssetBulkLoader({
  isOpen,
  onClose,
}: RoomAssetBulkLoaderProps) {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState<string>("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<AssetEntry[]>([]);
  const [newAsset, setNewAsset] = useState<AssetEntry>({
    name: "",
    assetCode: "",
    categoryId: "",
    status: "active",
    condition: "good",
  });
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Cargar habitaciones y categorías
  useEffect(() => {
    if (!user?.hotelId) return;

    setLoading(true);

    // 1. Suscripción a las categorías
    const categoriesRef = collection(db, "hotels", user.hotelId, "asset_categories");
    const categoriesQuery = query(categoriesRef, orderBy("name", "asc"));
    const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
      const categoriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AssetCategory[];
      setCategories(categoriesData);
    });

    // 2. Suscripción a las habitaciones
    const roomsRef = collection(db, "hotels", user.hotelId, "rooms");
    const roomsQuery = query(roomsRef, orderBy("number", "asc"));
    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      const roomsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Room[];
      setRooms(roomsData);
      setLoading(false);
    });

    return () => {
      unsubscribeCategories();
      unsubscribeRooms();
    };
  }, [user?.hotelId]);

  // Generar código automático para un activo
  const generateAssetCode = async () => {
    if (!user?.hotelId || !newAsset.categoryId) return;

    try {
      setIsGeneratingCode(true);

      // Obtener categoría seleccionada para usar su prefijo en el código
      let categoryPrefix = "ACT";
      const category = categories.find((c) => c.id === newAsset.categoryId);
      if (category) {
        categoryPrefix = category.name.substring(0, 3).toUpperCase();
      }

      // Obtener el último activo para generar un código secuencial
      const assetsRef = collection(db, "hotels", user.hotelId, "assets");
      const assetsQuery = query(
        assetsRef,
        orderBy("assetCode", "desc"),
        where("assetCode", ">=", categoryPrefix),
        where("assetCode", "<=", categoryPrefix + "\uf8ff")
      );
      const assetsSnapshot = await getDocs(assetsQuery);

      let nextNumber = 1;
      if (!assetsSnapshot.empty) {
        const lastAssetCode = assetsSnapshot.docs[0].data().assetCode;
        const regex = new RegExp(`${categoryPrefix}(\\d+)`);
        const match = lastAssetCode.match(regex);
        if (match && match[1]) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      // Generar el nuevo código con formato CAT-0001
      const newCode = `${categoryPrefix}-${String(nextNumber).padStart(4, "0")}`;
      setNewAsset((prev) => ({ ...prev, assetCode: newCode }));
    } catch (error) {
      console.error("Error al generar código:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el código automáticamente",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Añadir un activo a la lista temporal
  const addAssetToList = () => {
    if (!newAsset.name || !newAsset.assetCode || !newAsset.categoryId) {
      toast({
        title: "Campos incompletos",
        description: "Por favor completa los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    setAssets([...assets, { ...newAsset }]);
    
    // Reiniciar el formulario pero mantener la categoría para facilitar la carga
    const categoryId = newAsset.categoryId;
    setNewAsset({
      name: "",
      assetCode: "",
      categoryId: categoryId,
      status: "active",
      condition: "good",
    });
    
    // Generar un nuevo código automáticamente
    setTimeout(() => {
      generateAssetCode();
    }, 100);
  };

  // Eliminar un activo de la lista temporal
  const removeAsset = (index: number) => {
    const newAssets = [...assets];
    newAssets.splice(index, 1);
    setAssets(newAssets);
  };

  // Guardar todos los activos
  const saveAllAssets = async () => {
    if (!user?.hotelId || !selectedRoom || assets.length === 0) {
      toast({
        title: "No se puede guardar",
        description: "Selecciona una habitación y añade al menos un activo",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Guardar cada activo en Firestore
      for (const asset of assets) {
        const assetData = {
          ...asset,
          roomId: selectedRoom,
          description: asset.name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Crear el activo
        const assetRef = collection(db, "hotels", user.hotelId, "assets");
        const newAssetDoc = await addDoc(assetRef, assetData);

        // Crear el primer registro en el historial
        const historyRef = collection(
          db,
          "hotels",
          user.hotelId,
          "assets",
          newAssetDoc.id,
          "history"
        );
        await addDoc(historyRef, {
          type: "creation",
          date: serverTimestamp(),
          roomId: selectedRoom,
          previousRoomId: null,
          description: "Activo registrado en el sistema (carga inicial)",
          userId: user.uid,
          userName: user.name || "Usuario",
        });
      }

      toast({
        title: "Activos guardados",
        description: `${assets.length} activos registrados correctamente`,
      });

      // Reiniciar el formulario
      setAssets([]);
      setSelectedRoom("");
    } catch (error) {
      console.error("Error al guardar activos:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar los activos",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Obtener nombre de categoría
  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Desconocida";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carga Inicial de Activos por Habitación</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selección de habitación */}
            <div className="space-y-2">
              <Label htmlFor="room">Selecciona una Habitación</Label>
              <Select
                value={selectedRoom}
                onValueChange={setSelectedRoom}
              >
                <SelectTrigger className="flex items-center">
                  <Home className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Selecciona una habitación" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      Habitación {room.number} (Piso {room.floor})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formulario para añadir activos */}
            <Card className={selectedRoom ? "" : "opacity-50 pointer-events-none"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Añadir Activos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={newAsset.name}
                      onChange={(e) => 
                        setNewAsset({ ...newAsset, name: e.target.value })
                      }
                      placeholder="Ej: Televisor LED"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="assetCode">Código *</Label>
                    <div className="flex gap-1">
                      <Input
                        id="assetCode"
                        value={newAsset.assetCode}
                        onChange={(e) => 
                          setNewAsset({ ...newAsset, assetCode: e.target.value })
                        }
                        placeholder="Ej: TV-0001"
                        className="flex-grow"
                      />
                      <Button
                        onClick={generateAssetCode}
                        variant="outline"
                        type="button"
                        size="icon"
                        disabled={isGeneratingCode || !newAsset.categoryId}
                        title="Generar código automáticamente"
                      >
                        {isGeneratingCode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "G"
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={newAsset.categoryId}
                      onValueChange={(value) => {
                        setNewAsset({ ...newAsset, categoryId: value });
                        // Generar código automáticamente al cambiar la categoría
                        setTimeout(() => {
                          if (value) generateAssetCode();
                        }, 100);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="condition">Condición</Label>
                    <Select
                      value={newAsset.condition}
                      onValueChange={(value) => 
                        setNewAsset({ 
                          ...newAsset, 
                          condition: value as "new" | "good" | "fair" | "poor" 
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Nuevo</SelectItem>
                        <SelectItem value="good">Buen Estado</SelectItem>
                        <SelectItem value="fair">Estado Regular</SelectItem>
                        <SelectItem value="poor">Mal Estado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={addAssetToList}
                    className="self-end"
                    disabled={!newAsset.name || !newAsset.assetCode || !newAsset.categoryId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir
                  </Button>
                </div>

                {/* Lista de activos añadidos */}
                <div className="border rounded-lg mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Condición</TableHead>
                        <TableHead className="w-[60px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No hay activos añadidos a la lista
                          </TableCell>
                        </TableRow>
                      ) : (
                        assets.map((asset, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{asset.assetCode}</TableCell>
                            <TableCell>
                              <div className="max-w-[200px] truncate" title={asset.name}>
                                {asset.name}
                              </div>
                            </TableCell>
                            <TableCell>{getCategoryName(asset.categoryId)}</TableCell>
                            <TableCell>
                              <Badge className={
                                asset.condition === "new" ? "bg-emerald-100 text-emerald-800" :
                                asset.condition === "good" ? "bg-blue-100 text-blue-800" :
                                asset.condition === "fair" ? "bg-amber-100 text-amber-800" :
                                "bg-red-100 text-red-800"
                              }>
                                {asset.condition === "new" ? "Nuevo" :
                                 asset.condition === "good" ? "Buen Estado" :
                                 asset.condition === "fair" ? "Estado Regular" :
                                 "Mal Estado"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAsset(index)}
                                title="Quitar de la lista"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="space-x-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={saveAllAssets}
            disabled={saving || assets.length === 0 || !selectedRoom}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar {assets.length} Activos
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
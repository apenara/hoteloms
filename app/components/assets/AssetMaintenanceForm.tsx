"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db, storage } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/app/hooks/use-toast";
import { Loader2, Wrench, Info, FileText } from "lucide-react";
import ImageUpload from "../maintenance/ImageUpload";

interface Asset {
  id: string;
  name: string;
  assetCode: string;
  description: string;
  categoryId: string;
  roomId: string;
  status: "active" | "maintenance" | "retired" | "pending";
}

interface Room {
  id: string;
  number: string;
  floor: number;
}

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface AssetMaintenanceFormProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  hotelId: string;
  onSuccess: () => void;
}

export default function AssetMaintenanceForm({
  isOpen,
  onClose,
  asset,
  hotelId,
  onSuccess,
}: AssetMaintenanceFormProps) {
  const { user } = useAuth();

  // Estados
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [maintenanceStaff, setMaintenanceStaff] = useState<Staff[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    description: "",
    priority: "medium" as "low" | "medium" | "high",
    assignedTo: "",
    notes: "",
  });

  // Cargar datos iniciales
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!asset || !hotelId) return;

      setLoadingData(true);

      try {
        // 1. Cargar información de la habitación si el activo tiene una asignada
        if (asset.roomId) {
          const roomRef = doc(db, "hotels", hotelId, "rooms", asset.roomId);
          const roomSnap = await getDoc(roomRef);
          if (roomSnap.exists()) {
            setRoom({ id: roomSnap.id, ...roomSnap.data() } as Room);
          }
        }

        // 2. Cargar personal de mantenimiento disponible
        const staffRef = collection(db, "hotels", hotelId, "staff");
        const staffQuery = query(staffRef, where("role", "==", "maintenance"));
        const staffSnap = await getDocs(staffQuery);
        const staffData = staffSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Staff[];
        setMaintenanceStaff(staffData);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar algunos datos necesarios.",
          variant: "destructive",
        });
      } finally {
        setLoadingData(false);
      }
    };

    fetchInitialData();
  }, [asset, hotelId]);

  // Manejar cambios en los inputs
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Subir imágenes a Firebase Storage
  const uploadImages = async (files: File[]) => {
    if (!hotelId || !files.length) return [];

    const uploadPromises = files.map(async (file) => {
      const fileId = uuidv4();
      const fileExtension = file.name.split(".").pop() || "";
      const storagePath = `hotels/${hotelId}/maintenance/${asset.id}/${fileId}.${fileExtension}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      return url;
    });

    return Promise.all(uploadPromises);
  };

  // Enviar activo a mantenimiento
  const handleSubmit = async () => {
    if (!user?.hotelId || !asset.id || !formData.description) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // 1. Actualizar el estado del activo
      const assetRef = doc(db, "hotels", hotelId, "assets", asset.id);
      await updateDoc(assetRef, {
        status: "maintenance",
        updatedAt: serverTimestamp(),
      });

      // 2. Subir imágenes si hay seleccionadas
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages(selectedImages);
      }

      // 3. Crear la solicitud de mantenimiento
      const maintenanceRef = collection(db, "hotels", hotelId, "maintenance");
      const maintenanceData = {
        type: "asset_maintenance",
        assetId: asset.id,
        assetCode: asset.assetCode,
        assetName: asset.name,
        roomId: asset.roomId || null,
        roomNumber: room?.number || "No asignada",
        description: formData.description,
        priority: formData.priority,
        status: "pending",
        assignedTo: formData.assignedTo || null,
        notes: formData.notes || null,
        images: imageUrls,
        createdAt: serverTimestamp(),
        createdBy: {
          id: user.uid,
          name: user.name || "Usuario",
          role: user.role,
        },
      };

      const maintenanceDoc = await addDoc(maintenanceRef, maintenanceData);

      // 4. Registrar en el historial del activo
      const historyRef = collection(
        db,
        "hotels",
        hotelId,
        "assets",
        asset.id,
        "history"
      );
      await addDoc(historyRef, {
        type: "maintenance_request",
        date: serverTimestamp(),
        description: `Activo enviado a mantenimiento: ${formData.description}`,
        previousStatus: asset.status,
        newStatus: "maintenance",
        userId: user.uid,
        userName: user.name || "Usuario",
        maintenanceId: maintenanceDoc.id,
        maintenanceDescription: formData.description,
      });

      toast({
        title: "Solicitud creada",
        description: "El activo ha sido enviado a mantenimiento correctamente.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al crear solicitud de mantenimiento:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud de mantenimiento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Enviar a Mantenimiento
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Información del activo */}
          <div className="p-3 bg-gray-50 rounded-md">
            <h3 className="font-medium">{asset.name}</h3>
            <p className="text-sm text-gray-500">Código: {asset.assetCode}</p>
            {room && (
              <p className="text-sm text-gray-500">
                Ubicación: Habitación {room.number} (Piso {room.floor})
              </p>
            )}
          </div>

          {/* Descripción del problema */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Problema *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe el problema o la razón por la que este activo requiere mantenimiento..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleChange("priority", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Asignar a */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Asignar a</Label>
            <Select
              value={formData.assignedTo}
              onValueChange={(value) => handleChange("assignedTo", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar personal (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {maintenanceStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Si no asignas personal, la solicitud quedará pendiente de
              asignación.
            </p>
          </div>

          {/* Imágenes */}
          <div className="space-y-2">
            <Label>Imágenes</Label>
            <ImageUpload onImagesSelected={setSelectedImages} maxImages={3} />
            <p className="text-xs text-gray-500">
              Puedes subir hasta 3 imágenes (JPG, PNG o WebP, máx. 5MB cada una)
            </p>
          </div>

          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Cualquier información adicional que pueda ser útil..."
              className="min-h-[80px]"
            />
          </div>

          {/* Aviso */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Enviar el activo a mantenimiento cambiará su estado y no estará
              disponible hasta que se complete la reparación.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.description}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Crear Solicitud"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

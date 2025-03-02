"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
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
import { toast } from "@/app/hooks/use-toast";
import { Loader2, CheckSquare, Info } from "lucide-react";
import ImageUpload from "../maintenance/ImageUpload";
import { uploadMaintenanceImages } from "@/app/services/storage";

interface Asset {
  id: string;
  name: string;
  assetCode: string;
  status: "active" | "maintenance" | "retired" | "pending";
}

interface AssetMaintenanceCompletionProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  hotelId: string;
  onSuccess: () => void;
}

export default function AssetMaintenanceCompletion({
  isOpen,
  onClose,
  asset,
  hotelId,
  onSuccess,
}: AssetMaintenanceCompletionProps) {
  const { user } = useAuth();

  // Estados
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [maintenanceId, setMaintenanceId] = useState<string | null>(null);

  // Buscar la solicitud de mantenimiento asociada
  const findMaintenanceRequest = async () => {
    if (!hotelId || !asset.id) return;

    try {
      const maintenanceRef = collection(db, "hotels", hotelId, "maintenance");
      const q = query(
        maintenanceRef,
        where("assetId", "==", asset.id),
        where("status", "in", ["pending", "in_progress"])
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Tomar el primer documento que coincida
        const maintenanceDoc = querySnapshot.docs[0];
        setMaintenanceId(maintenanceDoc.id);
        return maintenanceDoc.id;
      }
      return null;
    } catch (error) {
      console.error("Error al buscar solicitud de mantenimiento:", error);
      return null;
    }
  };

  // Completar el mantenimiento
  const handleComplete = async () => {
    if (!user?.hotelId || !asset.id || !completionNotes.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa las notas de finalización.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Buscar la solicitud de mantenimiento si aún no tenemos el ID
      const foundMaintenanceId =
        maintenanceId || (await findMaintenanceRequest());

      // Subir imágenes si hay seleccionadas
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        setIsUploadingImages(true);
        try {
          imageUrls = await uploadMaintenanceImages(
            hotelId,
            null, // No incluimos roomId ya que es un activo
            asset.id,
            selectedImages
          );
        } catch (error) {
          console.error("Error al subir imágenes:", error);
          throw new Error("Error al subir las imágenes");
        } finally {
          setIsUploadingImages(false);
        }
      }

      // 1. Actualizar el estado del activo de vuelta a activo
      const assetRef = doc(db, "hotels", hotelId, "assets", asset.id);
      await updateDoc(assetRef, {
        status: "active",
        lastMaintenanceDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Si encontramos una solicitud de mantenimiento, actualizarla
      if (foundMaintenanceId) {
        const maintenanceRef = doc(
          db,
          "hotels",
          hotelId,
          "maintenance",
          foundMaintenanceId
        );
        await updateDoc(maintenanceRef, {
          status: "completed",
          completedAt: serverTimestamp(),
          completionNotes: completionNotes,
          completionImages: imageUrls,
          completedBy: {
            id: user.uid,
            name: user.name || "Usuario",
            role: user.role,
          },
        });
      }

      // 3. Registrar en el historial del activo
      const historyRef = collection(
        db,
        "hotels",
        hotelId,
        "assets",
        asset.id,
        "history"
      );
      await addDoc(historyRef, {
        type: "maintenance_complete",
        date: serverTimestamp(),
        description: `Mantenimiento completado: ${completionNotes}`,
        previousStatus: "maintenance",
        newStatus: "active",
        userId: user.uid,
        userName: user.name || "Usuario",
        maintenanceId: foundMaintenanceId,
        notes: completionNotes,
        images: imageUrls,
      });

      toast({
        title: "Mantenimiento completado",
        description: "El activo ha sido devuelto a servicio correctamente.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al completar mantenimiento:", error);
      toast({
        title: "Error",
        description: "No se pudo completar el mantenimiento.",
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
            <CheckSquare className="h-5 w-5" />
            Completar Mantenimiento
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Información del activo */}
          <div className="p-3 bg-gray-50 rounded-md">
            <h3 className="font-medium">{asset.name}</h3>
            <p className="text-sm text-gray-500">Código: {asset.assetCode}</p>
            <p className="text-sm text-gray-500">
              Estado actual:{" "}
              <span className="text-yellow-600 font-medium">
                En Mantenimiento
              </span>
            </p>
          </div>

          {/* Notas de finalización */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas de Finalización *</Label>
            <Textarea
              id="notes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Describe el trabajo realizado y el estado actual del activo..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Imágenes */}
          <div className="space-y-2">
            <Label>Imágenes del Trabajo Realizado</Label>
            <ImageUpload onImagesSelected={setSelectedImages} maxImages={3} />
            <p className="text-xs text-gray-500">
              Puedes subir hasta 3 imágenes (JPG, PNG o WebP, máx. 5MB cada una)
            </p>
          </div>

          {/* Aviso */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Completar el mantenimiento devolverá el activo a estado activo y
              estará disponible para su uso normal.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleComplete}
            disabled={loading || isUploadingImages || !completionNotes.trim()}
          >
            {isUploadingImages ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo imágenes...
              </>
            ) : loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Completando...
              </>
            ) : (
              "Completar Mantenimiento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

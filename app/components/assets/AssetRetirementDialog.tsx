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
} from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/app/hooks/use-toast";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  assetCode: string;
  status: "active" | "maintenance" | "retired" | "pending";
  currentValue?: number;
}

interface AssetRetirementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  hotelId: string;
  onSuccess: () => void;
}

export default function AssetRetirementDialog({
  isOpen,
  onClose,
  asset,
  hotelId,
  onSuccess,
}: AssetRetirementDialogProps) {
  const { user } = useAuth();

  // Estados
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reason: "",
    retirementType: "disposicion", // 'disposicion', 'venta', 'donacion', 'otro'
    notes: "",
    disposalLocation: "",
    authorizedBy: "",
  });

  // Manejar cambios en el formulario
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Dar de baja al activo
  const handleRetirement = async () => {
    if (!user?.hotelId || !asset.id || !formData.reason.trim()) {
      toast({
        title: "Error",
        description:
          "Por favor proporciona una razón para dar de baja el activo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Actualizar el estado del activo a "retired"
      const assetRef = doc(db, "hotels", hotelId, "assets", asset.id);
      await updateDoc(assetRef, {
        status: "retired",
        updatedAt: serverTimestamp(),
      });

      // 2. Registrar en el historial del activo
      const historyRef = collection(
        db,
        "hotels",
        hotelId,
        "assets",
        asset.id,
        "history"
      );
      await addDoc(historyRef, {
        type: "status_change",
        date: serverTimestamp(),
        description: `Activo dado de baja: ${formData.reason}`,
        previousStatus: asset.status,
        newStatus: "retired",
        userId: user.uid,
        userName: user.name || "Usuario",
        retirementData: {
          reason: formData.reason,
          type: formData.retirementType,
          notes: formData.notes,
          disposalLocation: formData.disposalLocation,
          authorizedBy: formData.authorizedBy,
        },
      });

      toast({
        title: "Activo dado de baja",
        description: "El activo ha sido dado de baja correctamente.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al dar de baja el activo:", error);
      toast({
        title: "Error",
        description: "No se pudo dar de baja el activo.",
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
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Dar de Baja Activo
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El activo quedará registrado como
            "Dado de Baja".
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Información del activo */}
          <div className="p-3 bg-gray-50 rounded-md">
            <h3 className="font-medium">{asset.name}</h3>
            <p className="text-sm text-gray-500">Código: {asset.assetCode}</p>
            {asset.currentValue !== undefined && (
              <p className="text-sm text-gray-500">
                Valor actual: ${asset.currentValue.toFixed(2)}
              </p>
            )}
          </div>

          {/* Razón de baja */}
          <div className="space-y-2">
            <Label htmlFor="reason">Razón de la Baja *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleChange("reason", e.target.value)}
              placeholder="Explica por qué este activo debe ser dado de baja..."
              className="min-h-[80px]"
              required
            />
          </div>

          {/* Tipo de baja */}
          <div className="space-y-2">
            <Label htmlFor="retirementType">Tipo de Baja</Label>
            <Select
              value={formData.retirementType}
              onValueChange={(value) => handleChange("retirementType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disposicion">Disposición/Desecho</SelectItem>
                <SelectItem value="venta">Venta</SelectItem>
                <SelectItem value="donacion">Donación</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ubicación de destino */}
          <div className="space-y-2">
            <Label htmlFor="disposalLocation">Ubicación de Destino</Label>
            <Input
              id="disposalLocation"
              value={formData.disposalLocation}
              onChange={(e) => handleChange("disposalLocation", e.target.value)}
              placeholder="¿Dónde se enviará o almacenará el activo?"
            />
          </div>

          {/* Autorizado por */}
          <div className="space-y-2">
            <Label htmlFor="authorizedBy">Autorizado Por</Label>
            <Input
              id="authorizedBy"
              value={formData.authorizedBy}
              onChange={(e) => handleChange("authorizedBy", e.target.value)}
              placeholder="Nombre de quien autoriza esta baja"
            />
          </div>

          {/* Notas adicionales */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Información adicional sobre esta baja..."
              className="min-h-[80px]"
            />
          </div>

          {/* Aviso */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Al dar de baja este activo, dejará de estar disponible en el
              inventario activo y no podrá ser asignado a ninguna habitación.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleRetirement}
            disabled={loading || !formData.reason.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Dar de Baja"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

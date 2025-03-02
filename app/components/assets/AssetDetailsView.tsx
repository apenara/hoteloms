"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Edit,
  MoveRight,
  Wrench,
  ImageIcon,
  FileText,
  X,
  Tag,
  Calendar,
  Home,
  DollarSignIcon,
  Package,
  Clipboard,
  Loader2,
  History,
  AlertTriangle,
  ArrowUpDown,
  FileQuestion,
  CheckSquare,
  Trash2,
} from "lucide-react";
import AssetForm from "./AssetForm";
import AssetTransferDialog from "./AssetTransferDialog";
import AssetMaintenanceCompletion from "./AssetMaintenanceCompletion";
import AssetRetirementDialog from "./AssetRetirementDialog";
import { toast } from "@/app/hooks/use-toast";

// Definir tipos para assets y entradas de historial
interface Asset {
  id: string;
  name: string;
  assetCode: string;
  description: string;
  categoryId: string;
  roomId: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  acquisitionDate?: any;
  warrantyExpiryDate?: any;
  cost?: number;
  currentValue?: number;
  location?: string;
  status: "active" | "maintenance" | "retired" | "pending";
  condition: "new" | "good" | "fair" | "poor";
  notes?: string;
  images?: string[];
  documents?: string[];
  lastMaintenanceDate?: any;
  nextMaintenanceDate?: any;
  createdAt?: any;
  updatedAt?: any;
}

interface AssetHistoryEntry {
  id: string;
  type:
    | "creation"
    | "transfer"
    | "status_change"
    | "maintenance_request"
    | "maintenance_complete"
    | "update";
  date: Date;
  description: string;
  userName: string;
  userId: string;
  roomId?: string;
  previousRoomId?: string;
  previousStatus?: string;
  newStatus?: string;
  maintenanceId?: string;
  maintenanceDescription?: string;
}

interface AssetCategory {
  id: string;
  name: string;
  color: string;
}

interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
}

interface AssetDetailsViewProps {
  assetId: string;
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
}

export default function AssetDetailsView({
  assetId,
  isOpen,
  onClose,
  hotelId,
}: AssetDetailsViewProps) {
  const { user } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [categories, setCategories] = useState<Record<string, AssetCategory>>(
    {}
  );
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [history, setHistory] = useState<AssetHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [showMaintenanceCompletionDialog, setShowMaintenanceCompletionDialog] =
    useState(false);
  const [showRetirementDialog, setShowRetirementDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Cargar los datos del activo y recursos relacionados
  useEffect(() => {
    if (!hotelId || !assetId) return;

    const fetchAssetData = async () => {
      setLoading(true);
      try {
        // 1. Cargar datos del activo
        const assetRef = doc(db, "hotels", hotelId, "assets", assetId);
        const assetSnap = await getDoc(assetRef);

        if (!assetSnap.exists()) {
          toast({
            title: "Error",
            description: "El activo solicitado no existe",
            variant: "destructive",
          });
          onClose();
          return;
        }

        const assetData = { id: assetSnap.id, ...assetSnap.data() } as Asset;
        setAsset(assetData);

        // 2. Cargar todas las categorías para tener referencia
        const categoriesRef = collection(
          db,
          "hotels",
          hotelId,
          "asset_categories"
        );
        const categoriesSnap = await getDocs(categoriesRef);
        const categoriesData = categoriesSnap.docs.reduce((acc, doc) => {
          return { ...acc, [doc.id]: { id: doc.id, ...doc.data() } };
        }, {});
        setCategories(categoriesData);

        // 3. Cargar todas las habitaciones para tener referencia
        const roomsRef = collection(db, "hotels", hotelId, "rooms");
        const roomsSnap = await getDocs(roomsRef);
        const roomsData = roomsSnap.docs.reduce((acc, doc) => {
          return { ...acc, [doc.id]: { id: doc.id, ...doc.data() } };
        }, {});
        setRooms(roomsData);

        // 4. Configurar un listener para el historial del activo
        const historyRef = collection(
          db,
          "hotels",
          hotelId,
          "assets",
          assetId,
          "history"
        );
        const historyQuery = query(historyRef, orderBy("date", "desc"));

        const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
          const historyData = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              date: data.date?.toDate() || new Date(),
            } as AssetHistoryEntry;
          });
          setHistory(historyData);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error al cargar datos del activo:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del activo",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    fetchAssetData();
  }, [hotelId, assetId]);

  // Función para mostrar el diálogo de imagen ampliada
  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  // Renderizar estado con badge
  const renderStatusBadge = (status: string) => {
    const statusConfig = {
      active: { class: "bg-green-100 text-green-800", label: "Activo" },
      maintenance: {
        class: "bg-yellow-100 text-yellow-800",
        label: "En Mantenimiento",
      },
      retired: { class: "bg-red-100 text-red-800", label: "Dado de Baja" },
      pending: {
        class: "bg-blue-100 text-blue-800",
        label: "Pendiente de Asignación",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  // Renderizar condición con badge
  const renderConditionBadge = (condition: string) => {
    const conditionConfig = {
      new: { class: "bg-emerald-100 text-emerald-800", label: "Nuevo" },
      good: { class: "bg-blue-100 text-blue-800", label: "Buen Estado" },
      fair: { class: "bg-amber-100 text-amber-800", label: "Estado Regular" },
      poor: { class: "bg-red-100 text-red-800", label: "Mal Estado" },
    };

    const config =
      conditionConfig[condition as keyof typeof conditionConfig] ||
      conditionConfig.good;
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  // Renderizar el tipo de entrada de historial
  const renderHistoryType = (type: string) => {
    const typeConfig = {
      creation: {
        icon: <Package className="h-4 w-4" />,
        label: "Creación",
        color: "bg-blue-100 text-blue-800",
      },
      transfer: {
        icon: <ArrowUpDown className="h-4 w-4" />,
        label: "Traslado",
        color: "bg-purple-100 text-purple-800",
      },
      status_change: {
        icon: <Tag className="h-4 w-4" />,
        label: "Cambio de Estado",
        color: "bg-amber-100 text-amber-800",
      },
      maintenance_request: {
        icon: <Wrench className="h-4 w-4" />,
        label: "Solicitud de Mantenimiento",
        color: "bg-yellow-100 text-yellow-800",
      },
      maintenance_complete: {
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "Mantenimiento Completado",
        color: "bg-green-100 text-green-800",
      },
      update: {
        icon: <Edit className="h-4 w-4" />,
        label: "Actualización",
        color: "bg-gray-100 text-gray-800",
      },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || {
      icon: <FileQuestion className="h-4 w-4" />,
      label: type,
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <div className="flex items-center">
        <Badge className={`flex items-center gap-1 ${config.color}`}>
          {config.icon}
          <span>{config.label}</span>
        </Badge>
      </div>
    );
  };

  // Renderizar la pestaña de información
  const renderInfoTab = () => {
    if (!asset) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Información Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Código</h3>
              <p className="text-base font-semibold">{asset.assetCode}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Nombre</h3>
              <p className="text-base">{asset.name}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Descripción</h3>
              <p className="text-base">
                {asset.description || "Sin descripción"}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Categoría</h3>
              <div className="flex items-center gap-2">
                {asset.categoryId && categories[asset.categoryId] && (
                  <Badge className={categories[asset.categoryId].color}>
                    {categories[asset.categoryId].name}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Ubicación</h3>
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-gray-400" />
                {asset.roomId && rooms[asset.roomId] ? (
                  <span>
                    Habitación {rooms[asset.roomId].number} (Piso{" "}
                    {rooms[asset.roomId].floor})
                  </span>
                ) : (
                  <span className="text-gray-500">No asignada</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                {renderStatusBadge(asset.status)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Condición</h3>
                {renderConditionBadge(asset.condition)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Especificaciones técnicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clipboard className="h-5 w-5" />
              Especificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Marca</h3>
                <p className="text-base">{asset.brand || "—"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Modelo</h3>
                <p className="text-base">{asset.model || "—"}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Número de Serie
              </h3>
              <p className="text-base font-mono">{asset.serialNumber || "—"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Fecha de Adquisición
                </h3>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {asset.acquisitionDate
                      ? new Date(
                          asset.acquisitionDate.seconds
                            ? asset.acquisitionDate.seconds * 1000
                            : asset.acquisitionDate
                        ).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Fin de Garantía
                </h3>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>
                    {asset.warrantyExpiryDate
                      ? new Date(
                          asset.warrantyExpiryDate.seconds
                            ? asset.warrantyExpiryDate.seconds * 1000
                            : asset.warrantyExpiryDate
                        ).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Costo de Adquisición
                </h3>
                <div className="flex items-center gap-1">
                  <DollarSignIcon className="h-4 w-4 text-gray-400" />
                  <span>{asset.cost ? `$${asset.cost.toFixed(2)}` : "—"}</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Valor Actual
                </h3>
                <div className="flex items-center gap-1">
                  <DollarSignIcon className="h-4 w-4 text-gray-400" />
                  <span>
                    {asset.currentValue
                      ? `$${asset.currentValue.toFixed(2)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Notas</h3>
              <p className="text-base">
                {asset.notes || "Sin notas adicionales"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Imágenes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Imágenes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {asset.images && asset.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {asset.images.map((url, index) => (
                  <div
                    key={index}
                    className="aspect-square border rounded-md overflow-hidden cursor-pointer"
                    onClick={() => handleImageClick(url)}
                  >
                    <img
                      src={url}
                      alt={`Imagen ${index + 1} de ${asset.name}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>No hay imágenes disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {asset.documents && asset.documents.length > 0 ? (
              <div className="space-y-2">
                {asset.documents.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-blue-500" />
                      <span className="text-sm truncate max-w-[200px]">
                        {url.split("/").pop() || `Documento ${index + 1}`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(url, "_blank")}
                    >
                      Ver
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>No hay documentos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Renderizar la pestaña de historial
  const renderHistoryTab = () => {
    if (history.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <History className="h-10 w-10 mx-auto mb-2 opacity-20" />
          <p>No hay registros en el historial</p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.date.toLocaleString()}</TableCell>
                <TableCell>{renderHistoryType(entry.type)}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{entry.userName}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {entry.type === "transfer" && entry.previousRoomId && (
                    <div className="text-xs text-gray-600">
                      <strong>De:</strong> Habitación{" "}
                      {rooms[entry.previousRoomId]?.number ||
                        entry.previousRoomId}
                      <br />
                      <strong>A:</strong> Habitación{" "}
                      {rooms[entry.roomId || ""]?.number || entry.roomId}
                    </div>
                  )}

                  {entry.type === "status_change" && (
                    <div className="text-xs text-gray-600">
                      <strong>De:</strong> {entry.previousStatus}
                      <br />
                      <strong>A:</strong> {entry.newStatus}
                    </div>
                  )}

                  {entry.type === "maintenance_request" && (
                    <div className="text-xs text-gray-600">
                      <strong>Problema:</strong>{" "}
                      {entry.maintenanceDescription || "No especificado"}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  // Renderizar el diálogo de imagen ampliada
  const renderImageDialog = () => (
    <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Imagen de {asset?.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Imagen ampliada"
              className="max-h-[70vh] object-contain"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {loading
                  ? "Cargando detalles..."
                  : `Detalles del Activo: ${asset?.name}`}
              </div>
              {!loading && asset && (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditForm(true)}
                    disabled={loading}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>

                  {/* Mostrar botón de traslado solo si no está en mantenimiento o retirado */}
                  {asset.status !== "maintenance" &&
                    asset.status !== "retired" && (
                      <Button
                        variant="outline"
                        onClick={() => setShowTransferDialog(true)}
                        disabled={loading}
                      >
                        <MoveRight className="h-4 w-4 mr-2" />
                        Trasladar
                      </Button>
                    )}

                  {/* Botón para enviar a mantenimiento */}
                  {asset.status !== "maintenance" &&
                    asset.status !== "retired" && (
                      <Button
                        variant="outline"
                        onClick={() => setShowMaintenanceDialog(true)}
                        disabled={loading}
                      >
                        <Wrench className="h-4 w-4 mr-2" />
                        Mantenimiento
                      </Button>
                    )}

                  {/* Botón para completar mantenimiento */}
                  {asset.status === "maintenance" && (
                    <Button
                      variant="outline"
                      onClick={() => setShowMaintenanceCompletionDialog(true)}
                      disabled={loading}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                    >
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Finalizar Mantenimiento
                    </Button>
                  )}

                  {/* Botón para dar de baja */}
                  {asset.status !== "retired" && (
                    <Button
                      variant="outline"
                      onClick={() => setShowRetirementDialog(true)}
                      disabled={loading}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Dar de Baja
                    </Button>
                  )}
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : asset ? (
            <div className="py-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="info" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Información</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex items-center gap-2"
                  >
                    <History className="h-4 w-4" />
                    <span>Historial</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4">
                  {renderInfoTab()}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  {renderHistoryTab()}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No se pudo cargar la información del activo
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogos adicionales */}
      {asset && (
        <>
          {showEditForm && (
            <AssetForm
              isOpen={showEditForm}
              onClose={() => setShowEditForm(false)}
              assetToEdit={asset}
              onSuccess={() => {
                setShowEditForm(false);
                // No es necesario recargar manualmente, ya que tenemos un listener en el activo
              }}
            />
          )}

          {showTransferDialog && (
            <AssetTransferDialog
              isOpen={showTransferDialog}
              onClose={() => setShowTransferDialog(false)}
              asset={asset}
              currentRoomId={asset.roomId}
              hotelId={hotelId}
              onSuccess={() => {
                setShowTransferDialog(false);
                // No es necesario recargar manualmente, ya que tenemos un listener en el activo
              }}
            />
          )}

          {/* Diálogo para completar el mantenimiento */}
          {showMaintenanceCompletionDialog && (
            <AssetMaintenanceCompletion
              isOpen={showMaintenanceCompletionDialog}
              onClose={() => setShowMaintenanceCompletionDialog(false)}
              asset={asset}
              hotelId={hotelId}
              onSuccess={() => {
                setShowMaintenanceCompletionDialog(false);
                // No es necesario recargar manualmente, ya que tenemos un listener en el activo
              }}
            />
          )}

          {/* Diálogo para dar de baja al activo */}
          {showRetirementDialog && (
            <AssetRetirementDialog
              isOpen={showRetirementDialog}
              onClose={() => setShowRetirementDialog(false)}
              asset={asset}
              hotelId={hotelId}
              onSuccess={() => {
                setShowRetirementDialog(false);
                // No es necesario recargar manualmente, ya que tenemos un listener en el activo
              }}
            />
          )}

          {renderImageDialog()}
        </>
      )}
    </>
  );
}

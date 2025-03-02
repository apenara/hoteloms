"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase/config";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useAuth } from "@/lib/auth";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  QrCode,
  Download,
  Tag,
  Printer,
  RefreshCw,
  Check,
  Home,
  Package,
} from "lucide-react";
import { toast } from "@/app/hooks/use-toast";
import { CheckboxIndicator } from "@radix-ui/react-checkbox";

interface Asset {
  id: string;
  name: string;
  assetCode: string;
  categoryId: string;
  roomId: string;
  status: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Room {
  id: string;
  number: string;
  floor: number;
}

interface QRCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
}

export default function QRCodeGenerator({
  isOpen,
  onClose,
  hotelId,
}: QRCodeGeneratorProps) {
  const { user } = useAuth();
  const qrCodesContainerRef = useRef<HTMLDivElement>(null);

  // Estados
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, Category>>({});
  const [rooms, setRooms] = useState<Record<string, Room>>({});
  const [loading, setLoading] = useState(true);
  const [generatingZip, setGeneratingZip] = useState(false);
  const [filters, setFilters] = useState({
    categoryId: "",
    roomId: "",
    status: "",
    search: "",
  });

  // Opciones de configuración de los QR
  const [config, setConfig] = useState({
    size: 128,
    includeAssetInfo: true,
    backgroundColor: "#ffffff",
    foregroundColor: "#000000",
    logoUrl: "",
    margin: 10,
    level: "M" as "L" | "M" | "Q" | "H",
    includeRoom: true,
    includeCategory: true,
  });

  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      if (!hotelId) return;

      setLoading(true);
      try {
        // 1. Cargar las categorías
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

        // 2. Cargar las habitaciones
        const roomsRef = collection(db, "hotels", hotelId, "rooms");
        const roomsSnap = await getDocs(roomsRef);
        const roomsData = roomsSnap.docs.reduce((acc, doc) => {
          return { ...acc, [doc.id]: { id: doc.id, ...doc.data() } };
        }, {});
        setRooms(roomsData);

        // 3. Cargar los activos
        const assetsRef = collection(db, "hotels", hotelId, "assets");
        const assetsQuery = query(assetsRef, orderBy("assetCode", "asc"));
        const assetsSnap = await getDocs(assetsQuery);
        const assetsData = assetsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Asset[];

        setAssets(assetsData);
        setFilteredAssets(assetsData);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos de activos",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hotelId]);

  // Aplicar filtros cuando cambien
  useEffect(() => {
    let filtered = [...assets];

    // Filtrar por categoría
    if (filters.categoryId) {
      filtered = filtered.filter(
        (asset) => asset.categoryId === filters.categoryId
      );
    }

    // Filtrar por habitación
    if (filters.roomId) {
      filtered = filtered.filter((asset) => asset.roomId === filters.roomId);
    }

    // Filtrar por estado
    if (filters.status) {
      filtered = filtered.filter((asset) => asset.status === filters.status);
    }

    // Filtrar por término de búsqueda
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(searchLower) ||
          asset.assetCode.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAssets(filtered);
  }, [assets, filters]);

  // Seleccionar/deseleccionar todos los activos filtrados
  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      // Si todos están seleccionados, deseleccionar todos
      setSelectedAssets([]);
    } else {
      // Si no todos están seleccionados, seleccionar todos
      setSelectedAssets(filteredAssets.map((asset) => asset.id));
    }
  };

  // Seleccionar/deseleccionar un activo individual
  const handleAssetSelect = (assetId: string) => {
    if (selectedAssets.includes(assetId)) {
      setSelectedAssets(selectedAssets.filter((id) => id !== assetId));
    } else {
      setSelectedAssets([...selectedAssets, assetId]);
    }
  };

  // Generar la URL de acceso al activo para el QR
  const generateAssetUrl = (assetId: string) => {
    // Esta URL debería llevar a una página pública que muestre información del activo escaneado
    return `https://hoteloms.web.app/assets/${hotelId}/${assetId}`;
  };

  // Generar y descargar QR individuales como SVG
  const downloadQrAsSvg = (assetId: string, assetCode: string) => {
    const svgElement = document
      .getElementById(`qr-${assetId}`)
      ?.querySelector("svg");
    if (!svgElement) return;

    // Obtener el SVG como cadena de texto
    const svgData = new XMLSerializer().serializeToString(svgElement);

    // Crear un blob del SVG
    const blob = new Blob([svgData], { type: "image/svg+xml" });

    // Descargar el archivo SVG
    saveAs(blob, `QR-${assetCode}.svg`);
  };

  // Generar y descargar QR individuales como PNG
  const downloadQrAsPng = async (assetId: string, assetCode: string) => {
    const svgElement = document
      .getElementById(`qr-${assetId}`)
      ?.querySelector("svg");
    if (!svgElement) return;

    // Crear un canvas temporal
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Establecer el tamaño del canvas
    const size = config.size + config.margin * 2;
    canvas.width = size;
    canvas.height = size;

    // Convertir SVG a imagen
    const img = new Image();
    img.src =
      "data:image/svg+xml;base64," +
      btoa(new XMLSerializer().serializeToString(svgElement));

    return new Promise<void>((resolve) => {
      img.onload = () => {
        // Dibujar un fondo blanco
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dibujar la imagen del QR
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convertir el canvas a PNG y descargar
        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, `QR-${assetCode}.png`);
          }
          resolve();
        }, "image/png");
      };
    });
  };

  // Generar y descargar todos los QR seleccionados como un archivo ZIP
  const downloadAllAsZip = async () => {
    if (selectedAssets.length === 0) {
      toast({
        title: "Sin selección",
        description: "Por favor selecciona al menos un activo",
        variant: "destructive",
      });
      return;
    }

    setGeneratingZip(true);

    try {
      const zip = new JSZip();
      const promises: Promise<void>[] = [];

      // Crear una carpeta en el ZIP para los archivos PNG
      const pngFolder = zip.folder("png");
      const svgFolder = zip.folder("svg");

      if (!pngFolder || !svgFolder) {
        throw new Error("No se pudieron crear las carpetas en el ZIP");
      }

      // Para cada activo seleccionado
      for (const assetId of selectedAssets) {
        const asset = assets.find((a) => a.id === assetId);
        if (!asset) continue;

        const svgElement = document
          .getElementById(`qr-${assetId}`)
          ?.querySelector("svg");
        if (!svgElement) continue;

        // Guardar SVG en el ZIP
        const svgData = new XMLSerializer().serializeToString(svgElement);
        svgFolder.file(`QR-${asset.assetCode}.svg`, svgData);

        // Convertir a PNG y guardar en el ZIP
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        const size = config.size + config.margin * 2;
        canvas.width = size;
        canvas.height = size;

        const img = new Image();
        img.src = "data:image/svg+xml;base64," + btoa(svgData);

        const promise = new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.fillStyle = config.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
              if (blob) {
                pngFolder.file(`QR-${asset.assetCode}.png`, blob);
              }
              resolve();
            }, "image/png");
          };
        });

        promises.push(promise);
      }

      // Esperar a que todas las conversiones de PNG se completen
      await Promise.all(promises);

      // Generar y descargar el archivo ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(
        zipBlob,
        `QR-Activos-${new Date().toISOString().split("T")[0]}.zip`
      );

      toast({
        title: "ZIP generado",
        description: `Se han generado los códigos QR para ${selectedAssets.length} activos`,
      });
    } catch (error) {
      console.error("Error al generar ZIP:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el archivo ZIP",
        variant: "destructive",
      });
    } finally {
      setGeneratingZip(false);
    }
  };

  // Imprimir los QR seleccionados
  const printSelectedQRs = () => {
    if (selectedAssets.length === 0) {
      toast({
        title: "Sin selección",
        description: "Por favor selecciona al menos un activo",
        variant: "destructive",
      });
      return;
    }

    // Crear una ventana de impresión
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        title: "Error",
        description:
          "No se pudo abrir la ventana de impresión. Verifica que no esté bloqueada.",
        variant: "destructive",
      });
      return;
    }

    // Construir el contenido HTML para la impresión
    let printContent = `
      <html>
      <head>
        <title>Códigos QR - Activos</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .qr-container { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
            gap: 20px; 
            padding: 20px; 
          }
          .qr-item { 
            border: 1px solid #ddd; 
            padding: 15px; 
            text-align: center; 
            page-break-inside: avoid; 
          }
          .qr-code { margin-bottom: 10px; }
          .qr-info { font-size: 12px; line-height: 1.4; }
          @media print {
            @page { margin: 0.5cm; }
            .qr-container { gap: 10px; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
    `;

    // Agregar cada QR seleccionado
    selectedAssets.forEach((assetId) => {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) return;

      const svgElement = document
        .getElementById(`qr-${assetId}`)
        ?.querySelector("svg");
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const assetInfo = [];

      // Información del activo
      assetInfo.push(`<strong>${asset.name}</strong>`);
      assetInfo.push(`Código: ${asset.assetCode}`);

      // Información de categoría si está habilitada
      if (
        config.includeCategory &&
        asset.categoryId &&
        categories[asset.categoryId]
      ) {
        assetInfo.push(`Categoría: ${categories[asset.categoryId].name}`);
      }

      // Información de ubicación si está habilitada
      if (config.includeRoom && asset.roomId && rooms[asset.roomId]) {
        assetInfo.push(`Habitación: ${rooms[asset.roomId].number}`);
      }

      printContent += `
        <div class="qr-item">
          <div class="qr-code">${svgData}</div>
          <div class="qr-info">
            ${assetInfo.join("<br>")}
          </div>
        </div>
      `;
    });

    printContent += `
        </div>
      </body>
      </html>
    `;

    // Escribir el contenido en la ventana de impresión y abrirla
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Esperar a que se carguen las imágenes y luego imprimir
    setTimeout(() => {
      printWindow.print();
      // Opcional: cerrar la ventana después de imprimir
      // printWindow.close();
    }, 500);
  };

  // Renderizar QRs de activos seleccionados
  const renderQRCodes = () => {
    if (filteredAssets.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No se encontraron activos con los filtros seleccionados
        </div>
      );
    }

    return (
      <div
        ref={qrCodesContainerRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
      >
        {filteredAssets.map((asset) => (
          <Card
            key={asset.id}
            className={`${
              selectedAssets.includes(asset.id)
                ? "border-2 border-primary"
                : "border"
            }`}
          >
            <CardContent className="p-4 text-center">
              <div
                id={`qr-${asset.id}`}
                className="mb-2 flex justify-center cursor-pointer"
                onClick={() => handleAssetSelect(asset.id)}
              >
                <QRCodeSVG
                  value={generateAssetUrl(asset.id)}
                  size={config.size}
                  bgColor={config.backgroundColor}
                  fgColor={config.foregroundColor}
                  level={config.level}
                  includeMargin={false}
                />
              </div>

              {config.includeAssetInfo && (
                <div className="text-xs space-y-1">
                  <p className="font-medium truncate">{asset.name}</p>
                  <p className="text-gray-500">{asset.assetCode}</p>

                  {config.includeCategory &&
                    asset.categoryId &&
                    categories[asset.categoryId] && (
                      <div className="flex items-center justify-center gap-1">
                        <Tag className="h-3 w-3 text-gray-400" />
                        <span>{categories[asset.categoryId].name}</span>
                      </div>
                    )}

                  {config.includeRoom &&
                    asset.roomId &&
                    rooms[asset.roomId] && (
                      <div className="flex items-center justify-center gap-1">
                        <Home className="h-3 w-3 text-gray-400" />
                        <span>Habitación {rooms[asset.roomId].number}</span>
                      </div>
                    )}
                </div>
              )}

              <div className="mt-2 flex justify-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadQrAsSvg(asset.id, asset.assetCode)}
                  title="Descargar como SVG"
                >
                  SVG
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadQrAsPng(asset.id, asset.assetCode)}
                  title="Descargar como PNG"
                >
                  PNG
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Generador de Códigos QR para Activos
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-4 h-full overflow-hidden">
          {/* Panel de filtros y configuración */}
          <div className="w-full sm:w-64 flex-shrink-0 overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Filtros de Activos</h3>

                <div>
                  <Label htmlFor="search" className="sr-only">
                    Buscar
                  </Label>
                  <Input
                    id="search"
                    placeholder="Buscar por nombre o código..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="category" className="text-xs">
                    Categoría
                  </Label>
                  <Select
                    value={filters.categoryId}
                    onValueChange={(value) =>
                      setFilters({ ...filters, categoryId: value })
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las categorías</SelectItem>
                      {Object.values(categories).map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="room" className="text-xs">
                    Habitación
                  </Label>
                  <Select
                    value={filters.roomId}
                    onValueChange={(value) =>
                      setFilters({ ...filters, roomId: value })
                    }
                  >
                    <SelectTrigger id="room">
                      <SelectValue placeholder="Todas las habitaciones" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas las habitaciones</SelectItem>
                      {Object.values(rooms).map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Habitación {room.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status" className="text-xs">
                    Estado
                  </Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters({ ...filters, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos los estados</SelectItem>
                      <SelectItem value="active">Activos</SelectItem>
                      <SelectItem value="maintenance">
                        En Mantenimiento
                      </SelectItem>
                      <SelectItem value="retired">Dados de Baja</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Configuración de QR</h3>

                <div>
                  <Label htmlFor="size" className="text-xs">
                    Tamaño (px)
                  </Label>
                  <Input
                    id="size"
                    type="number"
                    min="64"
                    max="512"
                    value={config.size}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        size: parseInt(e.target.value) || 128,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="level" className="text-xs">
                    Nivel de corrección
                  </Label>
                  <Select
                    value={config.level}
                    onValueChange={(value: "L" | "M" | "Q" | "H") =>
                      setConfig({ ...config, level: value })
                    }
                  >
                    <SelectTrigger id="level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L">Baja (L)</SelectItem>
                      <SelectItem value="M">Media (M)</SelectItem>
                      <SelectItem value="Q">Alta (Q)</SelectItem>
                      <SelectItem value="H">Máxima (H)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeAssetInfo"
                    checked={config.includeAssetInfo}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        includeAssetInfo: checked === true,
                      })
                    }
                  >
                    <CheckboxIndicator>
                      <Check className="h-4 w-4" />
                    </CheckboxIndicator>
                  </Checkbox>
                  <Label
                    htmlFor="includeAssetInfo"
                    className="text-xs cursor-pointer"
                  >
                    Incluir info del activo
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCategory"
                    checked={config.includeCategory}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        includeCategory: checked === true,
                      })
                    }
                    disabled={!config.includeAssetInfo}
                  >
                    <CheckboxIndicator>
                      <Check className="h-4 w-4" />
                    </CheckboxIndicator>
                  </Checkbox>
                  <Label
                    htmlFor="includeCategory"
                    className={`text-xs ${
                      !config.includeAssetInfo
                        ? "text-gray-400"
                        : "cursor-pointer"
                    }`}
                  >
                    Mostrar categoría
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeRoom"
                    checked={config.includeRoom}
                    onCheckedChange={(checked) =>
                      setConfig({ ...config, includeRoom: checked === true })
                    }
                    disabled={!config.includeAssetInfo}
                  >
                    <CheckboxIndicator>
                      <Check className="h-4 w-4" />
                    </CheckboxIndicator>
                  </Checkbox>
                  <Label
                    htmlFor="includeRoom"
                    className={`text-xs ${
                      !config.includeAssetInfo
                        ? "text-gray-400"
                        : "cursor-pointer"
                    }`}
                  >
                    Mostrar habitación
                  </Label>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de QRs */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Acciones */}
            <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={filteredAssets.length === 0}
                >
                  {selectedAssets.length === filteredAssets.length &&
                  filteredAssets.length > 0
                    ? "Deseleccionar todo"
                    : "Seleccionar todo"}
                </Button>

                <span className="text-sm text-gray-500">
                  {selectedAssets.length} de {filteredAssets.length}{" "}
                  seleccionados
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={printSelectedQRs}
                  disabled={selectedAssets.length === 0}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={downloadAllAsZip}
                  disabled={selectedAssets.length === 0 || generatingZip}
                >
                  {generatingZip ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Descargar ZIP
                </Button>
              </div>
            </div>

            {/* Contenedor de QRs */}
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderQRCodes()
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

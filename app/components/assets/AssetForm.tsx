'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db, storage } from '@/lib/firebase/config';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/app/hooks/use-toast';
import { 
  Calendar, 
  Loader2, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Info
} from 'lucide-react';

// Interfaz para la categoría de activos
interface AssetCategory {
  id: string;
  name: string;
  color: string;
}

// Interfaz para la habitación
interface Room {
  id: string;
  number: string;
  floor: number;
  type: string;
}

// Interfaz para el activo
interface Asset {
  id?: string;
  name: string;
  assetCode: string;
  description: string;
  categoryId: string;
  roomId: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  acquisitionDate?: Date | null;
  warrantyExpiryDate?: Date | null;
  cost?: number;
  currentValue?: number;
  location?: string;
  status: 'active' | 'maintenance' | 'retired' | 'pending';
  condition: 'new' | 'good' | 'fair' | 'poor';
  notes?: string;
  images?: string[];
  documents?: string[];
  lastMaintenanceDate?: Date | null;
  nextMaintenanceDate?: Date | null;
  createdAt?: any;
  updatedAt?: any;
}

interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: Asset | null;
  onSuccess: () => void;
}

export default function AssetForm({ isOpen, onClose, assetToEdit, onSuccess }: AssetFormProps) {
  const { user } = useAuth();
  
  // Estados para el formulario
  const [asset, setAsset] = useState<Partial<Asset>>({
    name: '',
    assetCode: '',
    description: '',
    categoryId: '',
    roomId: '',
    status: 'active',
    condition: 'good',
  });
  
  // Estados para datos relacionados
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // Estados para manejo de archivos
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  
  // Estados para UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  // Cargar categorías y habitaciones al montar el componente
  useEffect(() => {
    if (!user?.hotelId) return;
    
    const fetchData = async () => {
      try {
        // Cargar categorías
        const categoriesRef = collection(db, 'hotels', user.hotelId, 'asset_categories');
        const categoriesQuery = query(categoriesRef, orderBy('name', 'asc'));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as AssetCategory[];
        setCategories(categoriesData);
        
        // Cargar habitaciones
        const roomsRef = collection(db, 'hotels', user.hotelId, 'rooms');
        const roomsQuery = query(roomsRef, orderBy('number', 'asc'));
        const roomsSnapshot = await getDocs(roomsQuery);
        const roomsData = roomsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];
        setRooms(roomsData);
        
        // Inicializar el formulario con datos del activo a editar si existe
        if (assetToEdit) {
          setAsset(assetToEdit);
          setImageUrls(assetToEdit.images || []);
          setDocumentUrls(assetToEdit.documents || []);
        }
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError('Error al cargar datos necesarios para el formulario');
      }
    };
    
    fetchData();
  }, [user?.hotelId, assetToEdit]);

  // Generar código de activo automáticamente
  const generateAssetCode = async () => {
    if (!user?.hotelId) return;
    
    try {
      setIsGeneratingCode(true);
      
      // Obtener categoría seleccionada para usar su prefijo en el código
      let categoryPrefix = 'ACT';
      if (asset.categoryId) {
        const category = categories.find(c => c.id === asset.categoryId);
        if (category) {
          categoryPrefix = category.name.substring(0, 3).toUpperCase();
        }
      }
      
      // Obtener el último activo para generar un código secuencial
      const assetsRef = collection(db, 'hotels', user.hotelId, 'assets');
      const assetsQuery = query(assetsRef, orderBy('assetCode', 'desc'), where('assetCode', '>=', categoryPrefix), where('assetCode', '<=', categoryPrefix + '\uf8ff'));
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
      const newCode = `${categoryPrefix}-${String(nextNumber).padStart(4, '0')}`;
      setAsset(prev => ({ ...prev, assetCode: newCode }));
      
    } catch (error) {
      console.error('Error al generar código:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el código automáticamente",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Manejar cambios en los inputs del formulario
  const handleChange = (field: string, value: any) => {
    setAsset(prev => ({ ...prev, [field]: value }));
  };

  // Manejar selección de imágenes
  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files);
    setSelectedImages(prev => [...prev, ...newFiles]);
    
    // Crear URLs para preview
    newFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setImageUrls(prev => [...prev, url]);
    });
  };

  // Manejar selección de documentos
  const handleDocumentSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const newFiles = Array.from(e.target.files);
    setSelectedDocuments(prev => [...prev, ...newFiles]);
    
    // Mostrar nombres para preview
    newFiles.forEach(file => {
      // Usamos el nombre del archivo como URL temporal para el preview
      setDocumentUrls(prev => [...prev, file.name]);
    });
  };

  // Eliminar imagen seleccionada
  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Eliminar documento seleccionado
  const removeDocument = (index: number) => {
    setSelectedDocuments(prev => prev.filter((_, i) => i !== index));
    setDocumentUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Subir archivos a Firebase Storage
  const uploadFiles = async (files: File[], folder: string) => {
    if (!user?.hotelId || !files.length) return [];
    
    const uploadPromises = files.map(async file => {
      const fileId = uuidv4();
      const fileExtension = file.name.split('.').pop() || '';
      const storagePath = `hotels/${user.hotelId}/assets/${fileId}.${fileExtension}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      return {
        url,
        name: file.name,
        path: storagePath,
        type: file.type,
        uploadedAt: new Date().toISOString()
      };
    });
    
    const results = await Promise.all(uploadPromises);
    return results.map(result => result.url);
  };

  // Guardar el activo en Firestore
  const handleSubmit = async () => {
    if (!user?.hotelId) return;
    
    // Validaciones básicas
    if (!asset.name || !asset.assetCode || !asset.categoryId || !asset.roomId) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Subir imágenes si hay seleccionadas
      let allImageUrls = [...(asset.images || [])];
      if (selectedImages.length > 0) {
        const newImageUrls = await uploadFiles(selectedImages, 'images');
        allImageUrls = [...allImageUrls, ...newImageUrls];
      }
      
      // Subir documentos si hay seleccionados
      let allDocumentUrls = [...(asset.documents || [])];
      if (selectedDocuments.length > 0) {
        const newDocumentUrls = await uploadFiles(selectedDocuments, 'documents');
        allDocumentUrls = [...allDocumentUrls, ...newDocumentUrls];
      }
      
      // Preparar datos del activo
      const assetData = {
        ...asset,
        images: allImageUrls,
        documents: allDocumentUrls,
        updatedAt: serverTimestamp(),
      };
      
      if (!asset.id) {
        // Es un nuevo activo
        assetData.createdAt = serverTimestamp();
        
        // Crear el activo
        const assetRef = collection(db, 'hotels', user.hotelId, 'assets');
        const newAssetDoc = await addDoc(assetRef, assetData);
        
        // Crear el primer registro en el historial
        const historyRef = collection(db, 'hotels', user.hotelId, 'assets', newAssetDoc.id, 'history');
        await addDoc(historyRef, {
          type: 'creation',
          date: serverTimestamp(),
          roomId: asset.roomId,
          previousRoomId: null,
          description: 'Activo registrado en el sistema',
          userId: user.uid,
          userName: user.name || 'Usuario',
        });
        
        toast({
          title: "Activo creado",
          description: "El activo se ha registrado correctamente"
        });
      } else {
        // Es una actualización
        const assetRef = doc(db, 'hotels', user.hotelId, 'assets', asset.id);
        
        // Obtener datos actuales para comparar cambios
        const currentAssetSnap = await getDoc(assetRef);
        const currentAsset = currentAssetSnap.data();
        
        await updateDoc(assetRef, assetData);
        
        // Registrar en el historial si cambia la habitación
        if (currentAsset && currentAsset.roomId !== asset.roomId) {
          const historyRef = collection(db, 'hotels', user.hotelId, 'assets', asset.id, 'history');
          await addDoc(historyRef, {
            type: 'transfer',
            date: serverTimestamp(),
            roomId: asset.roomId,
            previousRoomId: currentAsset.roomId,
            description: `Activo trasladado de habitación`,
            userId: user.uid,
            userName: user.name || 'Usuario',
          });
        }
        
        // Registrar cambio de estado si aplica
        if (currentAsset && currentAsset.status !== asset.status) {
          const historyRef = collection(db, 'hotels', user.hotelId, 'assets', asset.id, 'history');
          await addDoc(historyRef, {
            type: 'status_change',
            date: serverTimestamp(),
            previousStatus: currentAsset.status,
            newStatus: asset.status,
            description: `Estado cambiado de ${currentAsset.status} a ${asset.status}`,
            userId: user.uid,
            userName: user.name || 'Usuario',
          });
        }
        
        toast({
          title: "Activo actualizado",
          description: "Los cambios se han guardado correctamente"
        });
      }
      
      // Cerrar el formulario y notificar éxito
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Error al guardar activo:', error);
      setError('Ocurrió un error al guardar el activo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {asset.id ? 'Editar Activo' : 'Registrar Nuevo Activo'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="font-medium">Información Básica</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Activo *</Label>
              <Input
                id="name"
                value={asset.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Televisor LED 32'"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetCode">Código de Activo *</Label>
              <div className="flex gap-2">
                <Input
                  id="assetCode"
                  value={asset.assetCode || ''}
                  onChange={(e) => handleChange('assetCode', e.target.value)}
                  placeholder="Ej: TV-0001"
                  required
                />
                <Button 
                  onClick={generateAssetCode} 
                  variant="outline"
                  type="button"
                  disabled={isGeneratingCode || !asset.categoryId}
                >
                  {isGeneratingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generar'}
                </Button>
              </div>
              {!asset.categoryId && (
                <p className="text-xs text-amber-600">Selecciona una categoría para generar el código</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={asset.categoryId || ''}
                onValueChange={(value) => handleChange('categoryId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
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

            <div className="space-y-2">
              <Label htmlFor="room">Habitación *</Label>
              <Select
                value={asset.roomId || ''}
                onValueChange={(value) => handleChange('roomId', value)}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={asset.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Descripción detallada del activo"
                rows={3}
              />
            </div>
          </div>

          {/* Especificaciones y estado */}
          <div className="space-y-4">
            <h3 className="font-medium">Especificaciones y Estado</h3>
            
            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                value={asset.brand || ''}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Ej: Samsung"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={asset.model || ''}
                onChange={(e) => handleChange('model', e.target.value)}
                placeholder="Ej: UN32J4290"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serialNumber">Número de Serie</Label>
              <Input
                id="serialNumber"
                value={asset.serialNumber || ''}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                placeholder="Ej: XYZ12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado *</Label>
              <Select
                value={asset.status || 'active'}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="maintenance">En Mantenimiento</SelectItem>
                  <SelectItem value="retired">Dado de Baja</SelectItem>
                  <SelectItem value="pending">Pendiente de Asignación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">Condición *</Label>
              <Select
                value={asset.condition || 'good'}
                onValueChange={(value) => handleChange('condition', value)}
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
          </div>

          {/* Información de adquisición */}
          <div className="space-y-4">
            <h3 className="font-medium">Información de Adquisición</h3>
            
            <div className="space-y-2">
              <Label htmlFor="acquisitionDate">Fecha de Adquisición</Label>
              <div className="flex items-center gap-2 relative">
                <Calendar className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-500" />
                <Input
                  id="acquisitionDate"
                  type="date"
                  className="pl-8"
                  value={asset.acquisitionDate 
                    ? (asset.acquisitionDate.seconds 
                      ? new Date(asset.acquisitionDate.seconds * 1000).toISOString().split('T')[0] 
                      : (asset.acquisitionDate instanceof Date 
                        ? asset.acquisitionDate.toISOString().split('T')[0]
                        : ''))
                    : ''}
                  onChange={(e) => handleChange('acquisitionDate', e.target.value 
                    ? new Date(e.target.value) 
                    : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="warrantyExpiryDate">Fecha de Expiración de Garantía</Label>
              <div className="flex items-center gap-2 relative">
                <Calendar className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-500" />
                <Input
                  id="warrantyExpiryDate"
                  type="date"
                  className="pl-8"
                  value={asset.warrantyExpiryDate 
                    ? (asset.warrantyExpiryDate.seconds ? new Date(asset.warrantyExpiryDate.seconds * 1000).toISOString().split('T')[0] : '')
                    : (asset.warrantyExpiryDate instanceof Date
                      ? asset.warrantyExpiryDate.toISOString().split('T')[0]
                      : '')
                    }

                  onChange={(e) => handleChange('warrantyExpiryDate', e.target.value 
                    ? new Date(e.target.value) 
                    : null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Costo de Adquisición ($)</Label>
              <Input
                id="cost"
                type="number"
                min="0"
                step="0.01"
                value={asset.cost || ''}
                onChange={(e) => handleChange('cost', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentValue">Valor Actual ($)</Label>
              <Input
                id="currentValue"
                type="number"
                min="0"
                step="0.01"
                value={asset.currentValue || ''}
                onChange={(e) => handleChange('currentValue', e.target.value ? parseFloat(e.target.value) : '')}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Imágenes y documentos */}
          <div className="space-y-4">
            <h3 className="font-medium">Imágenes y Documentos</h3>
            
            <div className="space-y-2">
              <Label>Imágenes</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative w-20 h-20 border rounded-md overflow-hidden">
                    <img 
                      src={url} 
                      alt={`Imagen ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-md"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('asset-images')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Imágenes
                </Button>
                <Input
                  id="asset-images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelection}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Documentos</Label>
              <div className="flex flex-col gap-2 mb-2">
                {documentUrls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                    <div className="flex items-center">
                      <Info className="h-4 w-4 mr-2" />
                      <span className="text-sm truncate max-w-[200px]">
                        {url.split('/').pop() || `Documento ${index + 1}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() => removeDocument(index)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('asset-documents')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Documentos
                </Button>
                <Input
                  id="asset-documents"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  multiple
                  className="hidden"
                  onChange={handleDocumentSelection}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={asset.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Observaciones, información adicional, etc."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !asset.name || !asset.assetCode || !asset.categoryId || !asset.roomId}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {asset.id ? 'Actualizando...' : 'Guardando...'}
              </>
            ) : (
              asset.id ? 'Actualizar Activo' : 'Registrar Activo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

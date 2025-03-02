"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  where,
  getDocs,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/app/hooks/use-toast";
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
  Pencil,
  Trash2,
  Plus,
  Tag,
  Search,
  Info,
  AlertCircle,
} from "lucide-react";

// Interfaz para la categoría de activos
interface AssetCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: any;
  updatedAt: any;
  assetsCount?: number; // número de activos que usan esta categoría
}

export default function AssetCategoriesManager() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Estado para el formulario
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentCategory, setCurrentCategory] =
    useState<Partial<AssetCategory> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<AssetCategory | null>(null);

  // Colores predefinidos para las categorías
  const predefinedColors = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-red-100 text-red-800",
    "bg-yellow-100 text-yellow-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
    "bg-gray-100 text-gray-800",
  ];

  // Suscribirse a los cambios en la colección de categorías
  useEffect(() => {
    if (!user?.hotelId) return;

    setLoading(true);

    const categoriesRef = collection(
      db,
      "hotels",
      user.hotelId,
      "asset_categories"
    );
    const q = query(categoriesRef, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AssetCategory[];

        // Obtener el conteo de activos por categoría
        Promise.all(
          categoriesData.map(async (category) => {
            const assetsRef = collection(db, "hotels", user.hotelId, "assets");
            const assetsQuery = query(
              assetsRef,
              where("categoryId", "==", category.id)
            );
            const assetsSnapshot = await getDocs(assetsQuery);
            return {
              ...category,
              assetsCount: assetsSnapshot.size,
            };
          })
        )
          .then((categoriesWithCount) => {
            setCategories(categoriesWithCount);
            setLoading(false);
          })
          .catch((error) => {
            console.error("Error al obtener conteo de activos:", error);
            setError("Error al cargar las categorías");
            setLoading(false);
          });
      },
      (error) => {
        console.error("Error al cargar categorías:", error);
        setError("Error al cargar las categorías");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.hotelId]);

  // Filtrar categorías por término de búsqueda
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Abrir formulario para agregar una nueva categoría
  const handleAddCategory = () => {
    setCurrentCategory({
      name: "",
      description: "",
      color: predefinedColors[0],
    });
    setIsOpen(true);
  };

  // Abrir formulario para editar una categoría
  const handleEditCategory = (category: AssetCategory) => {
    setCurrentCategory(category);
    setIsOpen(true);
  };

  // Abrir diálogo de confirmación para eliminar una categoría
  const handleDeleteIntent = (category: AssetCategory) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  // Guardar categoría (crear o actualizar)
  const handleSaveCategory = async () => {
    if (!user?.hotelId || !currentCategory?.name) return;

    try {
      setIsProcessing(true);

      if (currentCategory.id) {
        // Actualizar categoría existente
        const categoryRef = doc(
          db,
          "hotels",
          user.hotelId,
          "asset_categories",
          currentCategory.id
        );
        await updateDoc(categoryRef, {
          name: currentCategory.name,
          description: currentCategory.description || "",
          color: currentCategory.color,
          updatedAt: serverTimestamp(),
        });

        toast({
          title: "Categoría actualizada",
          description: "La categoría se ha actualizado correctamente.",
        });
      } else {
        // Crear nueva categoría
        const categoryRef = collection(
          db,
          "hotels",
          user.hotelId,
          "asset_categories"
        );
        await addDoc(categoryRef, {
          name: currentCategory.name,
          description: currentCategory.description || "",
          color: currentCategory.color,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast({
          title: "Categoría creada",
          description: "La categoría se ha creado correctamente.",
        });
      }

      setIsOpen(false);
      setCurrentCategory(null);
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la categoría.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Eliminar categoría
  const handleDeleteCategory = async () => {
    if (!user?.hotelId || !categoryToDelete) return;

    try {
      setIsProcessing(true);

      // Verificar si hay activos asociados a esta categoría
      if ((categoryToDelete.assetsCount || 0) > 0) {
        toast({
          title: "No se puede eliminar",
          description: `Esta categoría está siendo utilizada por ${categoryToDelete.assetsCount} activos. Reasigna estos activos antes de eliminar la categoría.`,
          variant: "destructive",
        });
        setIsDeleteDialogOpen(false);
        setIsProcessing(false);
        return;
      }

      // Eliminar la categoría
      const categoryRef = doc(
        db,
        "hotels",
        user.hotelId,
        "asset_categories",
        categoryToDelete.id
      );
      await deleteDoc(categoryRef);

      toast({
        title: "Categoría eliminada",
        description: "La categoría se ha eliminado correctamente.",
      });

      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al eliminar la categoría.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Renderizar estado de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        Cargando categorías...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Categorías de Activos
          </CardTitle>
          <Button onClick={handleAddCategory}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Categoría
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Buscador */}
          <div className="flex mb-4 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Tabla de categorías */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Activos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-4 text-gray-500"
                    >
                      {searchTerm
                        ? "No se encontraron categorías que coincidan con la búsqueda"
                        : "No hay categorías definidas"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>{category.description}</TableCell>
                      <TableCell>
                        <Badge
                          className={category.color || predefinedColors[0]}
                        >
                          Muestra
                        </Badge>
                      </TableCell>
                      <TableCell>{category.assetsCount || 0}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteIntent(category)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Eliminar
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

      {/* Diálogo para agregar/editar categoría */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentCategory?.id ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={currentCategory?.name || ""}
                onChange={(e) =>
                  setCurrentCategory((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Ej: Mobiliario, Electrónica, Lencería"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={currentCategory?.description || ""}
                onChange={(e) =>
                  setCurrentCategory((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descripción breve de la categoría"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {predefinedColors.map((color) => (
                  <div
                    key={color}
                    className={`h-10 rounded-md cursor-pointer border-2 ${
                      currentCategory?.color === color
                        ? "border-primary"
                        : "border-transparent"
                    } flex items-center justify-center ${color}`}
                    onClick={() =>
                      setCurrentCategory((prev) => ({ ...prev, color }))
                    }
                  >
                    {currentCategory?.color === color && (
                      <Tag className="h-4 w-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={!currentCategory?.name || isProcessing}
            >
              {isProcessing
                ? "Guardando..."
                : currentCategory?.id
                ? "Actualizar"
                : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Eliminar Categoría
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              ¿Estás seguro de que deseas eliminar la categoría{" "}
              <strong>{categoryToDelete?.name}</strong>?
            </p>
            {(categoryToDelete?.assetsCount || 0) > 0 && (
              <Alert variant="destructive" className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Esta categoría está siendo utilizada por{" "}
                  {categoryToDelete?.assetsCount} activos. Debes reasignar estos
                  activos antes de eliminar la categoría.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCategory}
              disabled={
                (categoryToDelete?.assetsCount || 0) > 0 || isProcessing
              }
            >
              {isProcessing ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

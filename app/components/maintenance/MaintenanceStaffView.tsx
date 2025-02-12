import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import ImageUpload from '@/components/maintenance/ImageUpload';
import {
    Clock,
    CheckCircle,
    AlertTriangle,
    Calendar,
    Home,
    Loader2
} from 'lucide-react';
import { uploadMaintenanceImages } from '@/app/services/storage';

const MaintenanceStaffView = ({ hotelId }) => {
    const { staff } = useAuth();
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [completionNotes, setCompletionNotes] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [isUploadingImages, setIsUploadingImages] = useState(false);

    useEffect(() => {
        if (!hotelId || !staff?.id) return;

        const requestsRef = collection(db, 'hotels', hotelId, 'maintenance');
        const q = query(
            requestsRef,
            where('assignedTo', '==', staff.id),
            where('status', 'in', ['pending', 'in_progress']),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requestsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRequests(requestsData);
        });

        return () => unsubscribe();
    }, [hotelId, staff?.id]);

    const handleStartWork = async (requestId) => {
        try {
            const requestRef = doc(db, 'hotels', hotelId, 'maintenance', requestId);
            await updateDoc(requestRef, {
                status: 'in_progress',
                startedAt: Timestamp.now(),
                startedBy: {
                    id: staff.id,
                    name: staff.name
                }
            });
        } catch (error) {
            console.error('Error:', error);
            setError('Error al iniciar el trabajo');
        }
    };

    const handleCompleteWork = async () => {
        if (!selectedRequest || !completionNotes.trim()) return;

        setLoading(true);
        setIsUploadingImages(true);
        try {
            const timestamp = Timestamp.now();
            
            // Subir imágenes si hay alguna seleccionada
            let imageUrls: string[] = [];
            if (selectedImages.length > 0) {
                try {
                    imageUrls = await uploadMaintenanceImages(
                        hotelId,
                        selectedRequest.id,
                        selectedImages
                    );
                } catch (error) {
                    console.error('Error subiendo imágenes:', error);
                    setError('Error al subir las imágenes');
                    return;
                }
            }

            const requestRef = doc(db, 'hotels', hotelId, 'maintenance', selectedRequest.id);
            await updateDoc(requestRef, {
                status: 'completed',
                completedAt: timestamp,
                completionNotes,
                completionImages: imageUrls, // Agregar URLs de las imágenes
                completedBy: {
                    id: staff.id,
                    name: staff.name,
                    timestamp
                }
            });

            const historyRef = collection(db, 'hotels', hotelId, 'rooms', selectedRequest.roomId, 'history');
            await addDoc(historyRef, {
                type: 'maintenance_completed',
                timestamp,
                staffId: staff.id,
                staffName: staff.name,
                notes: completionNotes,
                images: imageUrls, // Agregar URLs de las imágenes
                maintenanceId: selectedRequest.id
            });

            setShowDialog(false);
            setCompletionNotes('');
            setSelectedImages([]);
            setSelectedRequest(null);
        } catch (error) {
            console.error('Error:', error);
            setError('Error al completar el trabajo');
        } finally {
            setLoading(false);
            setIsUploadingImages(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'high': return 'Alta';
            case 'medium': return 'Media';
            case 'low': return 'Baja';
            default: return 'Normal';
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'No especificada';
        return new Date(timestamp.seconds * 1000).toLocaleString('es-CO', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    const getTimeRemaining = (dueDate) => {
        if (!dueDate) return null;
        const now = new Date();
        const due = new Date(dueDate.seconds * 1000);
        const diffTime = due - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return <span className="text-red-600">Vencido hace {Math.abs(diffDays)} días</span>;
        } else if (diffDays === 0) {
            return <span className="text-orange-600">Vence hoy</span>;
        } else {
            return <span className="text-green-600">Vence en {diffDays} días</span>;
        }
    };

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-6 w-6" />
                        Solicitudes de Mantenimiento
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-4">
                        {requests.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No hay solicitudes pendientes
                            </div>
                        ) : (
                            requests.map((request) => (
                                <div
                                    key={request.id}
                                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Home className="h-4 w-4 text-gray-500" />
                                                <h3 className="font-medium">
                                                    {request.location || `Habitación ${request.roomNumber}`}
                                                </h3>
                                                <Badge className={`ml-2 ${getPriorityColor(request.priority)}`}>
                                                    Prioridad: {getPriorityLabel(request.priority)}
                                                </Badge>
                                                {request.status === 'in_progress' && (
                                                    <Badge className="bg-blue-100 text-blue-800">
                                                        En Progreso
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">{request.description}</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    Creado: {formatDate(request.createdAt)}
                                                </span>
                                                {request.dueDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {getTimeRemaining(request.dueDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {request.status === 'pending' ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleStartWork(request.id)}
                                                    className="flex items-center gap-1"
                                                >
                                                    <Clock className="h-4 w-4" />
                                                    Iniciar
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowDialog(true);
                                                    }}
                                                    className="flex items-center gap-1"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    Completar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Completar Trabajo de Mantenimiento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">
                                Notas de Finalización (requerido)
                            </label>
                            <Textarea
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                                placeholder="Describe el trabajo realizado y cualquier observación importante..."
                                className="mt-1"
                                rows={4}
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                Imágenes del trabajo realizado
                            </label>
                            <ImageUpload
                                onImagesSelected={setSelectedImages}
                                maxImages={3}
                                quality={0.8}
                                maxWidth={1280}
                                maxHeight={720}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Puedes subir hasta 3 imágenes del trabajo realizado
                            </p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDialog(false);
                                    setCompletionNotes('');
                                    setSelectedImages([]);
                                }}
                                disabled={loading || isUploadingImages}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleCompleteWork}
                                disabled={loading || isUploadingImages || !completionNotes.trim()}
                            >
                                {isUploadingImages ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Subiendo imágenes...
                                    </>
                                ) : loading ? (
                                    'Completando...'
                                ) : (
                                    'Completar Trabajo'
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MaintenanceStaffView;
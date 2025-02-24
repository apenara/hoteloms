'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationsDialog } from '@/components/dashboard/NotificationsDialog';
import { ROOM_STATES, ROLE_PERMISSIONS, MAINTENANCE_REQUEST_TYPES } from '@/app/lib/constants/room-states';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Search, Building, Clock, MessageSquare, LogOut } from 'lucide-react';
import { ReceptionRoomCard } from '@/app/components/front/receptionRoomCard';
import { toast } from '@/app/hooks/use-toast';
import { Badge } from '@/app/components/ui/badge';
import { GuestRequestDialog } from '@/app/components/front/GuestRequestDialog';


export default function ReceptionStaffPage() {
  const params = useParams();
  const { staff, signOut } = useAuth();
  const [hotelData, setHotelData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRequestFilter, setSelectedRequestFilter] = useState('pending');



  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        const hotelDoc = await getDoc(doc(db, 'hotels', params.hotelId));
        if (hotelDoc.exists()) {
          setHotelData({ id: hotelDoc.id, ...hotelDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching hotel:', error);
      }
    };

    if (params.hotelId) {
      fetchHotelData();
    }
  }, [params.hotelId]);

  useEffect(() => {
    if (!staff || staff.role !== 'reception') {
      setError('Acceso no autorizado');
      return;
    }

    // Suscripción a habitaciones
    const roomsRef = collection(db, 'hotels', params.hotelId, 'rooms');
    const roomsUnsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRooms(roomsData);
      setLoading(false);
    }, (error) => {
      console.error('Error:', error);
      setError('Error al cargar los datos');
      setLoading(false);
    });

    // Suscripción a solicitudes
    const requestsRef = collection(db, 'hotels', params.hotelId, 'requests');
    const requestsQuery = query(
      requestsRef,
      orderBy('createdAt', 'desc')
    );

    const requestsUnsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));
      setRequests(requestsData);
    });

    return () => {
      roomsUnsubscribe();
      requestsUnsubscribe();
    };
  }, [params.hotelId, staff]);

  const uniqueFloors = [...new Set(rooms.map(room => room.floor))].sort((a, b) => a - b);

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFloor = selectedFloor === 'all' || room.floor.toString() === selectedFloor;
    const matchesStatus = selectedStatus === 'all' || room.status === selectedStatus;
    return matchesSearch && matchesFloor && matchesStatus;
  });

  // Modificar la sección de filtrado y visualización de solicitudes 
  const filteredRequests = requests.filter(request => {
    const matchesFilter = selectedRequestFilter === 'all' ||
      request.status === selectedRequestFilter;

    return matchesFilter;
  });

  const RequestCard = ({ request, onComplete }) => {
    // Determinar el tipo de badge según el tipo de mantenimiento
    const getBadgeVariant = () => {
      if (request.type === 'maintenance') {
        switch (request.maintenanceType) {
          case 'emergency': return 'destructive';
          case 'corrective': return 'secondary';
          case 'preventive': return 'outline';
          case 'blocked': return 'default';
          default: return 'secondary';
        }
      }
      return request.status === 'pending' ? 'secondary' : 'outline';
    };


    return (
      <Card className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">
                Habitación {request.roomNumber}
              </span>
              <Badge variant={getBadgeVariant()}>
                {request.type === 'maintenance' ?
                  MAINTENANCE_REQUEST_TYPES[request.maintenanceType]?.label :
                  request.type}
              </Badge>
              <Badge variant={request.status === 'pending' ? 'secondary' : 'outline'}>
                {request.status === 'pending' ? 'Pendiente' : 'Completada'}
              </Badge>
              {request.priority && (
                <Badge variant={
                  request.priority === 'high' ? 'destructive' :
                    request.priority === 'medium' ? 'secondary' :
                      'outline'
                }>
                  {request.priority}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600">{request.description || request.message}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>
                {request.createdAt?.toLocaleString('es-CO', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </span>
            </div>
            {request.type === 'maintenance' && (
              <div className="text-sm text-gray-500">
                {request.requiresBlocking ?
                  'Requiere bloqueo de habitación' :
                  'No requiere bloqueo'}
              </div>
            )}
          </div>
          {request.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => onComplete(request)}
            >
              Completar
            </Button>
          )}
        </div>
      </Card>
    );
  };

  const handleCompleteRequest = async (request) => {
    try {
      const requestRef = doc(db, 'hotels', params.hotelId, 'requests', request.id);
      const timestamp = Timestamp.now();

      await updateDoc(requestRef, {
        status: 'completed',
        completedAt: timestamp,
        completedBy: {
          id: staff.id,
          name: staff.name,
          role: staff.role
        }
      });

      toast({
        title: "Solicitud completada",
        description: "La solicitud ha sido marcada como completada exitosamente."
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo completar la solicitud. Intente nuevamente."
      });
    }
  };

  const roomCounts = rooms.reduce((acc, room) => {
    const status = room.status || 'available';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const sortRooms = (a, b) => {
    const regex = /([a-zA-Z]*)(\d*)/;
    const [, aLetters, aNumbers] = a.number.match(regex) || [];
    const [, bLetters, bNumbers] = b.number.match(regex) || [];

    if (aLetters < bLetters) return -1;
    if (aLetters > bLetters) return 1;

    const aNum = parseInt(aNumbers, 10);
    const bNum = parseInt(bNumbers, 10);
    return aNum - bNum;
  };

  // Ordenar las habitaciones
  const sortedRooms = filteredRooms.sort(sortRooms);


  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-bold">
                {hotelData?.hotelName || 'Cargando...'}
              </CardTitle>
              <p className="text-sm text-gray-500">
                Usuario: {staff?.name} ({staff?.role})
              </p>
            </div>
            <div className="flex items-center gap-4">
              <GuestRequestDialog
                hotelId={params.hotelId}
                rooms={rooms}
                onRequestCreated={() => {
                  toast({
                    title: "Solicitud creada",
                    description: "Se ha creado una nueva solicitud exitosamente"
                  })
                }}
              />
              <NotificationsDialog hotelId={params.hotelId} />
              <Button
                variant="outline"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="rooms" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rooms">Habitaciones</TabsTrigger>
              <TabsTrigger value="requests">Solicitudes</TabsTrigger>
            </TabsList>

            <TabsContent value="rooms">
              <div className="space-y-4">
                {/* Filtros de habitaciones */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        placeholder="Buscar habitación..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                      <SelectTrigger>
                        <Building className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Seleccionar piso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los pisos</SelectItem>
                        {uniqueFloors.map(floor => (
                          <SelectItem key={floor} value={floor.toString()}>
                            Piso {floor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Estado Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(ROOM_STATES)
                    .filter(([key]) => ROLE_PERMISSIONS.reception.canView.includes(key))
                    .map(([status, config]) => (
                      <Card
                        key={status}
                        className={`p-2 cursor-pointer ${config.color} ${selectedStatus === status ? 'ring-2 ring-offset-2' : ''
                          }`}
                        onClick={() => setSelectedStatus(
                          status === selectedStatus ? 'all' : status
                        )}
                      >
                        <CardContent className="p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              <span>{config.label}</span>
                            </div>
                            <span className="font-bold">{roomCounts[status] || 0}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>

                {/* Lista de habitaciones */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {sortedRooms.map((room) => (
                    <ReceptionRoomCard
                      key={room.id}
                      room={room}
                      hotelId={params.hotelId}
                      currentUser={staff}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Select value={selectedRequestFilter} onValueChange={setSelectedRequestFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filtrar solicitudes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="completed">Completadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  {filteredRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No hay solicitudes {selectedRequestFilter === 'pending' ? 'pendientes' : 'completadas'}
                    </div>
                  ) : (
                    filteredRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onComplete={handleCompleteRequest}
                      />
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
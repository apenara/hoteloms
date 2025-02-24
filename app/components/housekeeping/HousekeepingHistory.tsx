// src/components/housekeeping/HousekeepingHistory.tsx
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, 
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  Filter,
  User,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";
import type { Staff, Room } from "@/app/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ROOM_STATES } from "@/app/lib/constants/room-states";

interface HousekeepingHistoryProps {
  camareras: Staff[];
  habitaciones: Room[];
}

export function HousekeepingHistory({
  camareras,
  habitaciones,
}: HousekeepingHistoryProps) {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState({
    key: "fecha",
    direction: "desc" as "asc" | "desc",
  });

  // Generar historial de ejemplo (reemplazar con datos reales)
  const generateHistoryData = () => {
    const history = habitaciones.flatMap((room) => {
      if (!room.lastStatusChange) return [];

      const staff = camareras.find((c) => c.id === room.assignedTo);
      if (!staff) return [];

      return {
        id: room.id,
        fecha: room.lastStatusChange.toDate(),
        habitacion: room.number,
        tipo: ROOM_STATES[room.status]?.label || room.status,
        duracion: room.tiempoLimpieza || 0,
        camarera: staff.name,
        estado: room.status,
        eficiencia: calculateEfficiency(room),
      };
    });

    return history;
  };

  const calculateEfficiency = (room: Room): number => {
    if (!room.tiempoLimpieza) return 0;

    const tiemposEsperados = {
      cleaning_checkout: 45,
      cleaning_occupied: 30,
      cleaning_touch: 15,
    };

    const tiempoEsperado =
      tiemposEsperados[room.status as keyof typeof tiemposEsperados] || 30;
    return Math.min(100, (tiempoEsperado / room.tiempoLimpieza) * 100);
  };

  const getStatusColor = (status: string): string => {
    const colors = {
      cleaning_checkout: "bg-red-100 text-red-800",
      cleaning_occupied: "bg-blue-100 text-blue-800",
      cleaning_touch: "bg-green-100 text-green-800",
      available: "bg-purple-100 text-purple-800",
      inspection: "bg-yellow-100 text-yellow-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const filterData = (data: any[]) => {
    return data.filter((item) => {
      // Filtro por rango de fechas
      const dateInRange =
        (!dateRange.from || item.fecha >= dateRange.from) &&
        (!dateRange.to || item.fecha <= dateRange.to);

      // Filtro por búsqueda
      const searchMatch =
        !searchTerm ||
        item.habitacion.toString().includes(searchTerm) ||
        item.camarera.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro por camarera
      const staffMatch = !selectedStaff || item.camarera === selectedStaff;

      // Filtro por tipo
      const typeMatch = !selectedType || item.estado === selectedType;

      return dateInRange && searchMatch && staffMatch && typeMatch;
    });
  };

  const sortData = (data: any[]) => {
    return [...data].sort((a, b) => {
      if (sortConfig.key === "fecha") {
        return sortConfig.direction === "asc"
          ? a.fecha.getTime() - b.fecha.getTime()
          : b.fecha.getTime() - a.fecha.getTime();
      }

      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const historyData = sortData(filterData(generateHistoryData()));

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Historial de Limpiezas</CardTitle>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy")} -{" "}
                        {format(dateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yy")
                    )
                  ) : (
                    "Seleccionar fechas"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>

            <Select onValueChange={setSelectedStaff} value={selectedStaff}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por camarera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las camareras</SelectItem>
                {camareras.map((staff) => (
                  <SelectItem key={staff.id} value={staff.name}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={setSelectedType} value={selectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de limpieza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(ROOM_STATES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-10"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort("fecha")}
                >
                  <div className="flex items-center gap-1">
                    Fecha/Hora
                    {sortConfig.key === "fecha" &&
                      (sortConfig.direction === "asc" ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      ))}
                  </div>
                </TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Camarera</TableHead>
                <TableHead>Eficiencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyData.map((record, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {format(record.fecha, "dd/MM/yy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.habitacion}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(record.estado)}>
                      {record.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-500" />
                      {record.duracion}min
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      {record.camarera}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        record.eficiencia >= 90
                          ? "bg-green-100 text-green-800"
                          : record.eficiencia >= 70
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {Math.round(record.eficiencia)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// src/components/hotels/RoomCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BedDouble,
  Check,
  Paintbrush,
  AlertTriangle,
  Clock,
  Moon,
} from "lucide-react";
import { RoomStatusMenu } from "./RoomStatusMenu";
import { RoomDetailDialog } from "./RoomDetailDialog";
import { ROOM_STATES } from "@/app/lib/constants/room-states";

// const getStatusIcon = (status: RoomStatus) => {
//  const Icon = ROOM_STATES[status]?.icon || Check;
//  return <Icon className={`h-6 w-6 ${ROOM_STATES[status]?.color || 'text-gray-600'}`} />;
// };

// const getStatusColor = (status: RoomStatus) => {
//  const baseColor = ROOM_STATES[status]?.color || 'bg-gray-100 border-gray-500';
//  return baseColor.replace('text-', 'border-').replace('bg-', 'bg-opacity-20 ');
// };

// const getStatusLabel = (status: RoomStatus) => {
//  return ROOM_STATES[status]?.label || 'Desconocido';
// };

// export function RoomCard({ room, hotelId, onStatusChange, currentUser }) {
//  const [showDetail, setShowDetail] = useState(false);
export function RoomCard({ room, hotelId, onStatusChange, currentUser }) {
  const [showDetail, setShowDetail] = useState(false);
  const statusConfig = ROOM_STATES[room.status] || ROOM_STATES.available;

  return (
    <>
      <Card
        className={`relative hover:shadow-lg transition-shadow ${statusConfig.color}`}
        role="button"
        tabIndex={0}
        onClick={() => setShowDetail(true)}
      >
        <CardContent className="p-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold text-current">
              {room.number}
            </span>
            <statusConfig.icon className="h-6 w-6" />
          </div>

          <div className="flex flex-col gap-2">
            <RoomStatusMenu
              habitacionId={room.id}
              hotelId={hotelId}
              estadoActual={room.status}
              onStatusChange={onStatusChange}
              currentUser={currentUser}
            />

            <div className="flex justify-between items-center text-xs">
              <Badge variant="outline" className="capitalize">
                {room.type || "Standard"}
              </Badge>
              <Badge variant={room.lastCleaned ? "success" : "destructive"}>
                {room.lastCleaned ? "Limpia" : "Pendiente"}
              </Badge>
            </div>

            <Badge className="w-full justify-center font-medium">
              {statusConfig.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {showDetail && (
        <RoomDetailDialog
          isOpen={showDetail}
          onClose={() => setShowDetail(false)}
          room={room}
          hotelId={hotelId}
        />
      )}
    </>
  );
}

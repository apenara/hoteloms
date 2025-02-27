"use client";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageGallery from "./ImageGallery";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface MaintenanceRequestCardProps {
  request: any;
  staff: any[];
  hotelId: string;
  onAssign: (
    request: any,
    staffId: string,
    scheduledDate: Date
  ) => Promise<void>;
}

const MaintenanceRequestCard = ({
  request,
  staff,
  hotelId,
  onAssign,
}: MaintenanceRequestCardProps) => {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [isAssigning, setIsAssigning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleAssign = async () => {
    if (!selectedStaff || !scheduledDate) return;

    setIsAssigning(true);
    try {
      await onAssign(request, selectedStaff, scheduledDate);
    } finally {
      setIsAssigning(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="text-lg font-medium flex items-center gap-2">
              {request.location || `Habitación ${request.roomNumber}`}
              <Badge className={getPriorityColor(request.priority)}>
                {request.priority === "high"
                  ? "Alta"
                  : request.priority === "medium"
                  ? "Media"
                  : "Baja"}
              </Badge>
            </h4>
            <p className="text-sm text-gray-500 mt-1">
              {format(request.createdAt, "d 'de' MMMM 'a las' HH:mm", {
                locale: es,
              })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        <p className="text-gray-600">{request.description}</p>

        {request.images?.length > 0 && (
          <div className="mt-4">
            <ImageGallery images={request.images} thumbnailSize="medium" />
          </div>
        )}

        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Asignado
                </label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar personal" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha Programada
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {format(scheduledDate, "d 'de' MMMM, yyyy", {
                        locale: es,
                      })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarPicker
                      mode="single"
                      selected={scheduledDate}
                      onSelect={(date) => date && setScheduledDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleAssign}
                disabled={!selectedStaff || isAssigning}
                className="w-full sm:w-auto"
              >
                {isAssigning ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Asignando...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Asignar Mantenimiento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MaintenanceRequestCard;

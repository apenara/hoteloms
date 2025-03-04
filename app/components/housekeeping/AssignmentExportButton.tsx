import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Staff, Room } from "@/app/lib/types";
import { ROOM_STATES } from "@/app/lib/constants/room-states";

interface Assignment {
  id: string;
  staffId: string;
  staffName?: string;
  date: any; // Timestamp
  rooms: {
    roomId: string;
    roomNumber: string;
    floor: number;
    status: string;
  }[];
  status: "active" | "completed" | "cancelled";
  createdAt: any; // Timestamp
}

interface AssignmentExportButtonProps {
  assignments: Assignment[];
  habitaciones: Room[];
  camareras: Staff[];
  selectedDate: Date;
}

export function AssignmentExportButton({
  assignments,
  habitaciones,
  camareras,
  selectedDate,
}: AssignmentExportButtonProps) {
  const [loading, setLoading] = useState(false);

  // Función para generar y descargar el documento PDF
  const generateAndDownloadReport = async () => {
    try {
      setLoading(true);

      // Importación dinámica de jspdf y jspdf-autotable para reducir el tamaño del bundle
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      // Crear un nuevo documento PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Configurar la fecha formateada
      const formattedDate = format(selectedDate, "d 'de' MMMM, yyyy", {
        locale: es,
      });

      // Agrupar asignaciones por camarera
      const assignmentsByStaff: Record<string, Assignment> = {};

      assignments.forEach((assignment) => {
        assignmentsByStaff[assignment.staffId] = assignment;
      });

      // Para cada camarera con asignaciones, crear una página
      let isFirstPage = true;
      Object.keys(assignmentsByStaff).forEach((staffId) => {
        // Obtener la información de la camarera
        const camarera = camareras.find((c) => c.id === staffId);
        if (!camarera) return;

        const assignment = assignmentsByStaff[staffId];

        // Agregar una nueva página para cada camarera (excepto la primera)
        if (!isFirstPage) {
          doc.addPage();
        } else {
          isFirstPage = false;
        }

        // Título del documento
        doc.setFontSize(16);
        doc.text(`Asignación de Habitaciones - ${formattedDate}`, 105, 15, {
          align: "center",
        });

        // Información de la camarera
        doc.setFontSize(14);
        doc.text(`Camarera: ${camarera.name}`, 20, 25);

        // Obtener el detalle de cada habitación asignada
        const roomsData = [];

        if (assignment && assignment.rooms && assignment.rooms.length > 0) {
          assignment.rooms.forEach((assignedRoom) => {
            // Buscar la habitación en la lista de habitaciones para obtener más detalles
            const fullRoom = habitaciones.find(
              (h) => h.id === assignedRoom.roomId
            );

            if (fullRoom) {
              // Determinar el estado de la habitación
              const stateInfo = ROOM_STATES[fullRoom.status] || {
                label: fullRoom.status,
              };

              roomsData.push([
                assignedRoom.roomNumber, // Número de habitación
                assignedRoom.floor.toString(), // Piso
                fullRoom.type || "Estándar", // Tipo de habitación
                stateInfo.label, // Estado actual
                fullRoom.lastCleaned
                  ? format(
                      new Date(fullRoom.lastCleaned.seconds * 1000),
                      "dd/MM/yyyy"
                    )
                  : "N/A", // Última limpieza
                "", // Columna para notas/observaciones
              ]);
            }
          });
        }

        // Organizar las habitaciones por piso
        roomsData.sort((a, b) => {
          // Primero ordenar por piso
          const floorA = parseInt(a[1]);
          const floorB = parseInt(b[1]);

          if (floorA !== floorB) {
            return floorA - floorB;
          }

          // Luego por número de habitación
          return a[0].localeCompare(b[0]);
        });

        // Agregar la tabla de habitaciones
        autoTable(doc, {
          head: [
            [
              "Habitación",
              "Piso",
              "Tipo",
              "Estado",
              "Última limpieza",
              "Observaciones",
            ],
          ],
          body: roomsData,
          startY: 35,
          styles: {
            fontSize: 10,
          },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: "bold",
          },
          columnStyles: {
            0: { cellWidth: 25 }, // Habitación
            1: { cellWidth: 15 }, // Piso
            2: { cellWidth: 25 }, // Tipo
            3: { cellWidth: 35 }, // Estado
            4: { cellWidth: 30 }, // Última limpieza
            5: { cellWidth: 50 }, // Observaciones (espacio para notas manuales)
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240],
          },
        });

        // Agregar un área para firma
        const finalY = (doc as any).lastAutoTable.finalY + 20;

        doc.setLineWidth(0.5);
        doc.line(20, finalY + 10, 80, finalY + 10); // Línea para firma
        doc.text("Firma de camarera", 20, finalY + 15);

        doc.line(120, finalY + 10, 180, finalY + 10); // Línea para firma del supervisor
        doc.text("Firma de supervisor", 120, finalY + 15);

        // Agregar pie de página con la fecha de generación
        const pageWidth = doc.internal.pageSize.width;
        doc.setFontSize(8);
        doc.text(
          `Generado el: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
          pageWidth - 15,
          doc.internal.pageSize.height - 10,
          { align: "right" }
        );
      });

      // Si no hay camareras con asignaciones, mostrar un mensaje
      if (isFirstPage) {
        doc.setFontSize(14);
        doc.text("No hay asignaciones para la fecha seleccionada", 105, 30, {
          align: "center",
        });
      }

      // Descargar el PDF
      doc.save(`Asignaciones_${format(selectedDate, "yyyy-MM-dd")}.pdf`);
    } catch (error) {
      console.error("Error al generar el documento:", error);
      alert("Error al generar el documento. Por favor intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={generateAndDownloadReport}
      disabled={loading || assignments.length === 0}
      className="flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Descargar asignaciones
        </>
      )}
    </Button>
  );
}

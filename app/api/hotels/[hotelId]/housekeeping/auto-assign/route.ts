import { NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
  updateDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { asignarHabitacionesAutomaticamente } from "@/app/services/housekeeping-assignment";

export async function POST(
  request: Request,
  { params }: { params: { hotelId: string } }
) {
  try {
    const hotelId = params.hotelId;

    // Obtener datos de la solicitud
    const body = await request.json();
    const { date, options } = body;

    // Usar la lógica de asignación automática existente
    const resultado = await asignarHabitacionesAutomaticamente(
      hotelId,
      options || {}
    );

    // Crear respuesta basada en el resultado
    return NextResponse.json({
      success: resultado.success,
      message: resultado.message,
      assignmentsCreated: resultado.asignaciones?.length || 0,
      asignaciones: resultado.asignaciones || [],
    });
  } catch (error) {
    console.error("Error en la asignación automática:", error);
    return NextResponse.json(
      { success: false, message: "Error en el servidor", error: String(error) },
      { status: 500 }
    );
  }
}

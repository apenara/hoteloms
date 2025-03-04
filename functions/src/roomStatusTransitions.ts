import { onSchedule, ScheduledEvent, ScheduleOptions } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

const scheduleOptions: ScheduleOptions = {
  schedule: "0 5 * * *", // Every day at 5 AM UTC (adjust timezone if needed)
  timeZone: "America/Bogota", // Your timezone
  retryCount: 3, // Retry attempts
  memory: "512MiB", // Memory allocation
};

export const updateRoomStatuses = onSchedule(scheduleOptions, async (event: ScheduledEvent) => {
  try {
    console.log("Iniciando actualización automática diaria de estados de habitaciones");

    const hotelsSnapshot = await db
      .collection("hotels")
      .where("status", "in", ["active", "trial"]) // Only process active or trial hotels
      .get();

    console.log(`Procesando ${hotelsSnapshot.size} hoteles`);

    let totalHotels = 0;
    // let totalRoomsUpdated = 0;

    const promises = hotelsSnapshot.docs.map(async (hotelDoc) => {
      const hotelId = hotelDoc.id;
      const hotelName = hotelDoc.data().hotelName || "Hotel sin nombre";

      console.log(`Procesando hotel: ${hotelName} (${hotelId})`);

      const roomsSnapshot = await db
        .collection("hotels")
        .doc(hotelId)
        .collection("rooms")
        .where("status", "in", ["occupied", "clean_occupied"])
        .get();

      if (roomsSnapshot.empty) {
        console.log(`Hotel ${hotelName}: No hay habitaciones ocupadas para actualizar.`);
        return 0; // Return 0 rooms updated for this hotel
      }

      const batch = db.batch();
      const timestamp = FieldValue.serverTimestamp();

      roomsSnapshot.docs.forEach((roomDoc) => {
        // Update the room
        batch.update(roomDoc.ref, {
          status: "dirty_occupied",
          lastStatusChange: timestamp,
          lastUpdatedBy: {
            id: "system",
            name: "Sistema Automático",
            timestamp: timestamp,
          },
        });

        // Record the change in history
        const historyRef = db
          .collection("hotels")
          .doc(hotelId)
          .collection("rooms")
          .doc(roomDoc.id)
          .collection("history")
          .doc();

        batch.set(historyRef, {
          previousStatus: roomDoc.data().status,
          newStatus: "dirty_occupied",
          timestamp: timestamp,
          staffId: "system",
          notes: "Cambio automático de estado: día nuevo",
        });
      });

      await batch.commit();
    //   totalRoomsUpdated += roomsSnapshot.size;
      totalHotels++;
      console.log(`Hotel ${hotelName}: Se actualizaron ${roomsSnapshot.size} habitaciones a "sucias ocupadas".`);
      return roomsSnapshot.size; // Return number of rooms updated for this hotel
    });

    const updatedCounts = await Promise.all(promises);
    const totalRoomsUpdated2 = updatedCounts.reduce((sum, count) => sum + count, 0); //Sum all updated rooms
    console.log(`Tarea completada. Total: ${totalHotels} hoteles procesados, ${totalRoomsUpdated2} habitaciones actualizadas.`);
    return;
  } catch (error) {
    console.error("Error en la actualización automática de habitaciones:", error);
    return Promise.reject(error); //Explicitly reject errors
  }
});

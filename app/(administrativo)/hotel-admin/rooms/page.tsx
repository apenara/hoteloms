"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Room } from "@/lib/types";
import AssetCategoriesManager from "@/app/components/assets/AssetCategoriesManager";
import AssetForm from "@/app/components/assets/AssetForm";
import AssetsList from "@/app/components/assets/AssetsList";

export default function HotelAdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRooms = async () => {
      if (!user?.hotelId) return;

      try {
        const roomsRef = collection(db, "hotels", user.hotelId, "rooms");
        const roomsSnap = await getDocs(roomsRef);
        const roomsData = roomsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];

        setRooms(roomsData);
      } catch (error) {
        console.error("Error fetching rooms:", error);
      }
    };

    fetchRooms();
  }, [user]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Administración de Habitaciones
        </h1>
       <AssetCategoriesManager/>
       <AssetsList/>

    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Staff, Hotel } from "@/app/lib/types";
import HousekeepingStaffView from "@/components/housekeeping/HousekeepingStaffView";

interface HousekeepingStaffPageProps {
  params: {
    hotelId: string;
    staffId: string;
  };
}

export default function HousekeepingStaffPage() {
  // Hooks
  const router = useRouter();
  const params = useParams<HousekeepingStaffPageProps["params"]>();
  const { staff, signOut } = useAuth() as {
    staff: Staff | null;
    signOut: () => void;
  };

  // State variables
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches hotel data from Firestore.
   * It verifies the staff's access to the specified hotel and retrieves the hotel's information.
   */
  useEffect(() => {
    const fetchData = async () => {
      // Guard clause: Check if the hotelId parameter exists
      if (!params?.hotelId) {
        setError("Hotel no especificado");
        setLoading(false);
        return;
      }

      try {
        // Guard clause: Verify if the staff member belongs to the specified hotel
        if (staff && staff.hotelId !== params.hotelId) {
          setError("No tienes acceso a este hotel");
          setLoading(false);
          return;
        }

        // Fetch the hotel document from Firestore
        const hotelDoc = await getDoc(doc(db, "hotels", params.hotelId));
        if (!hotelDoc.exists()) {
          setError("Hotel no encontrado");
          setLoading(false);
          return;
        }

        // Set the hotel information in the state
        setHotel({ id: hotelDoc.id, ...hotelDoc.data() } as Hotel);
      } catch (error) {
        console.error("Error:", error);
        setError("Error al cargar la información");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params?.hotelId, staff]);
  /**
   * This effect is responsible for redirecting the staff member if they are not authenticated or do not have the correct role.
   */
  useEffect(() => {
    if (!loading && !staff) {
      router.push(`/housekeeping/${params.hotelId}/login`);
    } else if (!loading && staff?.role !== "housekeeper") {
      setError("No tienes permisos de housekeeping");
    }
  }, [staff, loading, router, params?.hotelId]);

  // Display loading indicator
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Display error message
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              {/* Hotel Name */}
              <h1 className="text-lg font-medium">
                {hotel?.name || "Panel de Housekeeping"}
              </h1>
              {/* Welcome message for the staff */}
              <p className="text-sm text-gray-500">Bienvenida, {staff?.name}</p>
            </div>
            {/* Logout Button */}
            <Button
              variant="ghost"
              onClick={() => {
                signOut();
                router.push(`/housekeeping/login/${params.hotelId}`);
              }}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Housekeeping Staff View Component */}
        <HousekeepingStaffView hotelId={params.hotelId} staffId={staff.id} />
      </main>
    </div>
  );
}

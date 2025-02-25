//este es el dashboard del super administrador, donde se muestran las estadísticas de la plataforma
//como el total de hoteles, hoteles activos, hoteles en trial y el total de usuarios registrados
//se puede agregar más secciones como gráficas o tablas
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hotel, Users, Activity, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * @function AdminDashboard
 * @description This component serves as the main dashboard for super administrators.
 * It displays key statistics about the platform, including the total number of hotels,
 * active hotels, hotels in trial, and the total number of users.
 * @returns {JSX.Element} The rendered AdminDashboard component.
 */
export default function AdminDashboard() {
  /**
   * @const stats
   * @description State variable to store key platform statistics.
   * @type {{ totalHotels: number; activeHotels: number; totalUsers: number; hotelsInTrial: number; }}
   * @property {number} totalHotels - The total number of registered hotels.
   * @property {number} activeHotels - The number of hotels with an active subscription.
   * @property {number} totalUsers - The total number of registered users.
   * @property {number} hotelsInTrial - The number of hotels in their trial period.
   */
  const [stats, setStats] = useState({
    totalHotels: 0,
    activeHotels: 0,
    totalUsers: 0,
    hotelsInTrial: 0
  });

  /**
   * @const isLoading
   * @description State variable to track whether the statistics are currently being loaded.
   * @type {boolean}
   */
  const [isLoading, setIsLoading] = useState(true);

  /**
   * @useEffect
   * @description Fetches key platform statistics from Firestore.
   * This hook runs once when the component mounts.
   * @returns {void}
   */
  useEffect(() => {
    /**
     * @function fetchStats
     * @description Asynchronously fetches and sets the platform statistics.
     * It queries Firestore to get the total number of hotels, active hotels,
     * hotels in trial, and the total number of users.
     * @async
     * @returns {Promise<void>}
     */
    async function fetchStats() {
      try {
        // Obtener total de hoteles
        const hotelsSnapshot = await getDocs(collection(db, 'hotels'));
        const totalHotels = hotelsSnapshot.size;

        // Obtener hoteles activos
        const activeHotelsQuery = query(
          collection(db, 'hotels'),
          where('status', '==', 'active')
        );
        const activeHotelsSnapshot = await getDocs(activeHotelsQuery);
        const activeHotels = activeHotelsSnapshot.size;

        // Obtener hoteles en trial
        const trialHotelsQuery = query(
          collection(db, 'hotels'),
          where('status', '==', 'trial')
        );
        const trialHotelsSnapshot = await getDocs(trialHotelsQuery);
        const hotelsInTrial = trialHotelsSnapshot.size;

        // Obtener total de usuarios
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnapshot.size;

        // Update the stats state
        setStats({
          totalHotels,
          activeHotels,
          totalUsers,
          hotelsInTrial
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  /**
   * @constant statsCards
   * @description An array of objects, each defining the data for a statistic card.
   * @type {Array<{ title: string; value: number; icon: JSX.Element; description: string; }>}
   * @property {string} title - The title of the statistic card.
   * @property {number} value - The value of the statistic.
   * @property {JSX.Element} icon - The icon to display on the card.
   * @property {string} description - A brief description of the statistic.
   */
  const statsCards = [
    {
      title: 'Total Hoteles',
      value: stats.totalHotels,
      icon: <Hotel className="w-6 h-6 text-blue-600" />,
      description: 'Hoteles registrados en la plataforma'
    },
    {
      title: 'Hoteles Activos',
      value: stats.activeHotels,
      icon: <Activity className="w-6 h-6 text-green-600" />,
      description: 'Hoteles con suscripción activa'
    },
    {
      title: 'En Período de Prueba',
      value: stats.hotelsInTrial,
      icon: <AlertCircle className="w-6 h-6 text-orange-600" />,
      description: 'Hoteles en trial de 15 días'
    },
    {
      title: 'Total Usuarios',
      value: stats.totalUsers,
      icon: <Users className="w-6 h-6 text-purple-600" />,
      description: 'Usuarios registrados en el sistema'
    }
  ];

  /**
   * @description Conditional rendering for the loading state.
   * If `isLoading` is true, display a loading message.
   */
  if (isLoading) {
    return <div>Cargando estadísticas...</div>;
  }

  /**
   * @description Main component render.
   * Renders the dashboard layout, including the statistics cards.
   */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel de Administración</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Aquí puedes agregar más secciones como gráficas o tablas */}
    </div>
  );
}

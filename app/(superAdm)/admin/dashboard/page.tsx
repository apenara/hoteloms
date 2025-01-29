"use client";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hotel, Users, Activity, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalHotels: 0,
    activeHotels: 0,
    totalUsers: 0,
    hotelsInTrial: 0
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

  if (isLoading) {
    return <div>Cargando estadísticas...</div>;
  }

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
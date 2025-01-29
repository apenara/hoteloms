'use client';
import { Clock, ClipboardList, Shield, Users } from 'lucide-react';

const features = [
  {
    title: 'Gestión en Tiempo Real',
    description: 'Control de estados de habitaciones e inventario actualizado al instante',
    icon: Clock
  },
  {
    title: 'Control Total',
    description: 'Seguimiento detallado de mantenimiento y limpieza',
    icon: ClipboardList
  },
  {
    title: 'Multi-Hotel',
    description: 'Gestiona múltiples propiedades desde una única plataforma',
    icon: Users
  },
  {
    title: 'Seguridad Garantizada',
    description: 'Datos encriptados y respaldos automáticos',
    icon: Shield
  }
];

export default function Features() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Todo lo que necesitas para tu hotel
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Simplifica la gestión diaria con nuestras herramientas
          </p>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="relative p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="absolute top-0 -mt-8 left-1/2 -ml-8">
                <feature.icon className="w-16 h-16 p-3 bg-blue-600 text-white rounded-lg" />
              </div>
              <h3 className="mt-8 text-xl font-medium text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-4 text-base text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
import Image from "next/image";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UseCases() {
  const useCases = [
    {
      title: "Hoteles boutique y pequeños",
      description:
        "Ideal para establecimientos con recursos limitados que necesitan maximizar la eficiencia de su personal.",
      image: "/images/hotel-boutique.jpg", // Tendrías que añadir estas imágenes a tu proyecto
      benefits: [
        "Gestión simplificada para equipos pequeños",
        "Control total con mínima inversión tecnológica",
        "Adaptable a propiedades con 5-30 habitaciones",
      ],
    },
    {
      title: "Hoteles de mediano tamaño",
      description:
        "Solución perfecta para coordinar múltiples equipos y optimizar la asignación de tareas.",
      image: "/images/hotel-medium.jpg",
      benefits: [
        "Coordinación eficiente entre recepción, limpieza y mantenimiento",
        "Reportes detallados para identificar áreas de mejora",
        "Ideal para hoteles de 30-100 habitaciones",
      ],
    },
    {
      title: "Resorts y cadenas hoteleras",
      description:
        "Herramientas avanzadas para establecimientos con operaciones complejas y altos estándares de servicio.",
      image: "/images/hotel-resort.jpg",
      benefits: [
        "Gestión unificada para múltiples edificios o propiedades",
        "Métricas y analytics avanzados para optimización continua",
        "Escalable para propiedades de más de 100 habitaciones",
      ],
    },
  ];

  return (
    <section className="py-16" id="use-cases">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">
            Soluciones para todo tipo de establecimientos
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Desde hoteles boutique en Cartagena hasta grandes cadenas
            nacionales, HotelFlow se adapta a las necesidades específicas de tu
            negocio.
          </p>
        </div>

        {useCases.map((useCase, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              index % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
            } gap-8 mb-16 items-center`}
          >
            <div className="flex-1 relative h-64 w-full md:h-80">
              <div className="absolute inset-0 bg-gray-200 rounded-lg overflow-hidden">
                {/* Puedes reemplazar esto con una imagen real */}
                <div className="w-full h-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                  <span className="text-lg text-gray-500">
                    Imagen de {useCase.title}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-4">{useCase.title}</h3>
              <p className="text-gray-600 mb-4">{useCase.description}</p>
              <ul className="space-y-2">
                {useCase.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-6">Ver más detalles</Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

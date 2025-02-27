import {
  ArrowUp,
  BarChart3,
  Clock,
  Zap,
  CheckCircle,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Benefits() {
  const benefits = [
    {
      icon: <Zap className="h-6 w-6 text-blue-600" />,
      title: "Gestión en tiempo real",
      description:
        "Mantén el control total sobre el estado de tus habitaciones con actualizaciones instantáneas que aseguran la máxima eficiencia operativa.",
    },
    {
      icon: <Clock className="h-6 w-6 text-green-600" />,
      title: "Ahorro de tiempo",
      description:
        "Automatiza procesos y reduce hasta un 40% el tiempo dedicado a la gestión de habitaciones y coordinación del personal.",
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-purple-600" />,
      title: "Métricas avanzadas",
      description:
        "Obtén estadísticas detalladas sobre la eficiencia del personal, tiempos de limpieza y mantenimiento para tomar decisiones basadas en datos.",
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-red-600" />,
      title: "Control de calidad",
      description:
        "Asegura estándares consistentes en todas las habitaciones con sistemas de inspección y verificación integrados.",
    },
    {
      icon: <ArrowUp className="h-6 w-6 text-orange-600" />,
      title: "Mayor satisfacción del huésped",
      description:
        "Mejora la experiencia de tus clientes con habitaciones siempre listas y en perfectas condiciones, reduciendo quejas y aumentando valoraciones positivas.",
    },
    {
      icon: <Shield className="h-6 w-6 text-teal-600" />,
      title: "Reducción de errores",
      description:
        "Elimina confusiones y errores de comunicación entre departamentos con un sistema centralizado y transparente.",
    },
  ];

  return (
    <section className="py-16 bg-gray-50" id="benefits">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">
            Beneficios que transformarán tu operación
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            HotelFlow revoluciona la gestión hotelera con herramientas diseñadas
            para resolver los desafíos diarios de tu establecimiento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, index) => (
            <Card
              key={index}
              className="border-2 hover:border-primary hover:shadow-md transition-all"
            >
              <CardHeader className="pb-2">
                <div className="mb-2">{benefit.icon}</div>
                <CardTitle className="text-xl">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-gray-600">
                  {benefit.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

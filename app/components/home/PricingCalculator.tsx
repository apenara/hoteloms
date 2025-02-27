"use client";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Users,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Shield,
  Zap,
} from "lucide-react";

const PLANES_PRECIOS = {
  basico: {
    nombre: "Plan Básico",
    maxHabitaciones: 50,
    precioHabitacion: 12500,
    descripcion: "Ideal para hoteles pequeños y medianos",
    caracteristicas: [
      "Gestión de estados de habitaciones",
      "Control de personal básico",
      "Reportes esenciales",
      "Soporte por email",
    ],
  },
  profesional: {
    nombre: "Plan Profesional",
    maxHabitaciones: 100,
    precioHabitacion: 10000,
    descripcion: "Perfecto para hoteles en crecimiento",
    caracteristicas: [
      "Todo del Plan Básico",
      "Sistema de mantenimiento avanzado",
      "Dashboard personalizado",
      "Soporte prioritario",
      "Capacitación del personal",
    ],
  },
  enterprise: {
    nombre: "Plan Enterprise",
    maxHabitaciones: Infinity,
    precioHabitacion: 8000,
    descripcion: "Para grandes hoteles y cadenas",
    caracteristicas: [
      "Todo del Plan Profesional",
      "API personalizada",
      "Soporte 24/7",
      "Implementación personalizada",
      "Account Manager dedicado",
    ],
  },
};

const PricingCalculator = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    hotelName: "",
    location: "",
    rooms: "",
    staff: "",
    email: "",
  });

  const [planRecomendado, setPlanRecomendado] = useState(null);
  const [precioMensual, setPrecioMensual] = useState(0);

  const determinarPlan = (numHabitaciones) => {
    if (numHabitaciones <= PLANES_PRECIOS.basico.maxHabitaciones) {
      return "basico";
    } else if (numHabitaciones <= PLANES_PRECIOS.profesional.maxHabitaciones) {
      return "profesional";
    } else {
      return "enterprise";
    }
  };

  const calcularPrecio = (rooms) => {
    const numRooms = parseInt(rooms);
    const tipoPlan = determinarPlan(numRooms);
    const precioHabitacion = PLANES_PRECIOS[tipoPlan].precioHabitacion;
    return numRooms * precioHabitacion;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      if (name === "rooms" && value) {
        const numRooms = parseInt(value);
        const tipoPlan = determinarPlan(numRooms);
        setPlanRecomendado(PLANES_PRECIOS[tipoPlan]);
        setPrecioMensual(calcularPrecio(value));
      }
      return newData;
    });
  };

  const handleSubmit = () => {
    // Aquí implementarías la lógica para enviar los datos a tu CRM o sistema de leads
    console.log("Lead capturado:", {
      ...formData,
      planRecomendado: planRecomendado?.nombre,
      precioMensual,
    });
  };

  const renderPlanCard = () => {
    if (!planRecomendado) return null;

    return (
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-blue-800">
                {planRecomendado.nombre}
              </CardTitle>
              <CardDescription className="text-blue-600">
                {planRecomendado.descripcion}
              </CardDescription>
            </div>
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-sm text-blue-600">
                Precio mensual estimado
              </div>
              <div className="text-4xl font-bold text-blue-800">
                ${precioMensual.toLocaleString("es-CO")} COP
              </div>
              <div className="text-sm text-blue-600">
                ${planRecomendado.precioHabitacion.toLocaleString("es-CO")} por
                habitación
              </div>
            </div>

            <div className="space-y-2">
              {planRecomendado.caracteristicas.map((caracteristica, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{caracteristica}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del Hotel</Label>
              <Input
                name="hotelName"
                value={formData.hotelName}
                onChange={handleInputChange}
                placeholder="Ej: Hotel Paradise"
              />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Select
                name="location"
                onValueChange={(value) =>
                  handleInputChange({ target: { name: "location", value } })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tu ciudad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cartagena">Cartagena</SelectItem>
                  <SelectItem value="bogota">Bogotá</SelectItem>
                  <SelectItem value="medellin">Medellín</SelectItem>
                  <SelectItem value="cali">Cali</SelectItem>
                  <SelectItem value="santa_marta">Santa Marta</SelectItem>
                  <SelectItem value="barranquilla">Barranquilla</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número de Habitaciones</Label>
              <Input
                type="number"
                name="rooms"
                value={formData.rooms}
                onChange={handleInputChange}
                placeholder="Ej: 50"
              />
            </div>
            <div className="space-y-2">
              <Label>Personal del Hotel</Label>
              <Input
                type="number"
                name="staff"
                value={formData.staff}
                onChange={handleInputChange}
                placeholder="Número de empleados"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {renderPlanCard()}

            <div className="space-y-2">
              <Label>Email para recibir más información</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu@email.com"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="w-4 h-4" />
              <span>Prueba gratis por 30 días sin compromiso</span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Calcula tu Plan Ideal</CardTitle>
          <Progress value={step * 33.33} className="mt-2" />
        </CardHeader>
        <CardContent>
          {renderStep()}

          <div className="flex justify-between mt-6">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}

            {step < 3 ? (
              <Button
                className="ml-auto"
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 1 && (!formData.hotelName || !formData.location)) ||
                  (step === 2 && (!formData.rooms || !formData.staff))
                }
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                className="ml-auto"
                onClick={handleSubmit}
                disabled={!formData.email}
              >
                Solicitar Información
                <Zap className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingCalculator;

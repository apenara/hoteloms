"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingView } from "@/components/common/LoadingView";
import { ErrorView } from "@/components/common/ErrorView";

interface Invoice {
  id: string;
  hotelId: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  description: string;
  period?: {
    start: Date;
    end: Date;
  };
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  paymentMethod?: string;
  transactionId?: string;
}

interface Subscription {
  id: string;
  hotelId: string;
  plan: 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'cancelled' | 'trial' | 'expired';
  startDate: Date;
  endDate?: Date;
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  price: number;
  interval: 'month' | 'year';
  paymentMethod?: string;
  lastPayment?: Date;
}

export default function BillingHistory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  
  // Hardcoded for demo - would normally get from authentication context
  const hotelId = "current-hotel-id";
  
  const planNames = {
    basic: "Básico",
    premium: "Premium",
    enterprise: "Empresarial"
  };
  
  const statusColors = {
    active: "success",
    trial: "warning",
    cancelled: "destructive",
    expired: "destructive",
    pending: "warning",
    paid: "success", 
    overdue: "destructive"
  } as const;

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        // Fetch subscription data
        const subscriptionDoc = await getDoc(doc(db, "subscriptions", hotelId));
        if (subscriptionDoc.exists()) {
          const data = subscriptionDoc.data();
          setSubscription({
            id: subscriptionDoc.id,
            hotelId: data.hotelId,
            plan: data.plan,
            status: data.status,
            startDate: data.startDate.toDate(),
            endDate: data.endDate?.toDate(),
            trialEndsAt: data.trialEndsAt?.toDate(),
            currentPeriodStart: data.currentPeriodStart.toDate(),
            currentPeriodEnd: data.currentPeriodEnd.toDate(),
            cancelAtPeriodEnd: data.cancelAtPeriodEnd,
            price: data.price,
            interval: data.interval,
            paymentMethod: data.paymentMethod,
            lastPayment: data.lastPayment?.toDate(),
          });
        }
        
        // Fetch invoices
        const invoicesQuery = query(
          collection(db, "invoices"),
          where("hotelId", "==", hotelId),
          orderBy("issueDate", "desc")
        );
        
        const invoicesSnapshot = await getDocs(invoicesQuery);
        const invoicesData: Invoice[] = [];
        
        invoicesSnapshot.forEach((doc) => {
          const data = doc.data();
          invoicesData.push({
            id: doc.id,
            hotelId: data.hotelId,
            amount: data.amount,
            status: data.status,
            issueDate: data.issueDate.toDate(),
            dueDate: data.dueDate.toDate(),
            paidDate: data.paidDate?.toDate(),
            description: data.description,
            period: data.period ? {
              start: data.period.start.toDate(),
              end: data.period.end.toDate(),
            } : undefined,
            items: data.items,
            paymentMethod: data.paymentMethod,
            transactionId: data.transactionId,
          });
        });
        
        setInvoices(invoicesData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching billing data:", err);
        setError("Error al cargar los datos de facturación");
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [hotelId]);

  const handleDownloadInvoice = (invoiceId: string) => {
    // In a real app, this would generate a PDF or redirect to a download URL
    alert(`Descargando factura ${invoiceId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // For demo purposes, if no subscription exists
  const demoSubscription: Subscription = {
    id: "demo-subscription",
    hotelId: hotelId,
    plan: "premium",
    status: "active",
    startDate: new Date(2023, 0, 15),
    currentPeriodStart: new Date(2023, 5, 15),
    currentPeriodEnd: new Date(2023, 6, 15),
    cancelAtPeriodEnd: false,
    price: 1499,
    interval: "month",
    paymentMethod: "tarjeta",
    lastPayment: new Date(2023, 5, 15),
  };

  // For demo purposes, if no invoices exist
  const demoInvoices: Invoice[] = [
    {
      id: "INV-2023-001",
      hotelId: hotelId,
      amount: 1499,
      status: "paid",
      issueDate: new Date(2023, 5, 15),
      dueDate: new Date(2023, 5, 30),
      paidDate: new Date(2023, 5, 16),
      description: "Suscripción Premium - Junio 2023",
      period: {
        start: new Date(2023, 5, 15),
        end: new Date(2023, 6, 15),
      },
      items: [
        {
          description: "Plan Premium (Mensual)",
          quantity: 1,
          unitPrice: 1499,
          total: 1499,
        }
      ],
      paymentMethod: "Tarjeta terminación 4242",
      transactionId: "txn_1234567890",
    },
    {
      id: "INV-2023-002",
      hotelId: hotelId,
      amount: 1499,
      status: "paid",
      issueDate: new Date(2023, 4, 15),
      dueDate: new Date(2023, 4, 30),
      paidDate: new Date(2023, 4, 15),
      description: "Suscripción Premium - Mayo 2023",
      period: {
        start: new Date(2023, 4, 15),
        end: new Date(2023, 5, 15),
      },
      items: [
        {
          description: "Plan Premium (Mensual)",
          quantity: 1,
          unitPrice: 1499,
          total: 1499,
        }
      ],
      paymentMethod: "Tarjeta terminación 4242",
      transactionId: "txn_0987654321",
    },
  ];

  if (loading) return <LoadingView message="Cargando historial de facturación..." />;
  if (error) return <ErrorView message={error} />;

  // Use demo data if no real data exists (for development purposes)
  const displaySubscription = subscription || demoSubscription;
  const displayInvoices = invoices.length > 0 ? invoices : demoInvoices;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">Facturación</h2>
        <p className="text-sm text-gray-500">
          Administra tu suscripción y consulta el historial de facturas
        </p>
      </div>
      
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Tu Plan Actual</CardTitle>
          <CardDescription>Detalles de tu suscripción</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">
                Plan {planNames[displaySubscription.plan]}
                <Badge 
                  className="ml-2" 
                  variant={statusColors[displaySubscription.status] as "default" | "secondary" | "destructive" | "outline"} 
                >
                  {displaySubscription.status === "active" ? "Activo" : 
                   displaySubscription.status === "trial" ? "Prueba" : 
                   displaySubscription.status === "cancelled" ? "Cancelado" : "Expirado"}
                </Badge>
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Precio:</span>
                  <span>
                    {formatCurrency(displaySubscription.price)} / 
                    {displaySubscription.interval === "month" ? "mes" : "año"}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha de inicio:</span>
                  <span>{formatDate(displaySubscription.startDate)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-500">Período actual:</span>
                  <span>
                    {formatDate(displaySubscription.currentPeriodStart)} - {formatDate(displaySubscription.currentPeriodEnd)}
                  </span>
                </div>
                
                {displaySubscription.status === "trial" && displaySubscription.trialEndsAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Prueba finaliza:</span>
                    <span>{formatDate(displaySubscription.trialEndsAt)}</span>
                  </div>
                )}
                
                {displaySubscription.cancelAtPeriodEnd && (
                  <Alert variant="warning" className="mt-4">
                    <AlertTitle>Suscripción programada para cancelación</AlertTitle>
                    <AlertDescription>
                      Tu suscripción se cancelará al final del período actual el {formatDate(displaySubscription.currentPeriodEnd)}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <h4 className="font-medium">Método de pago</h4>
                <p>{displaySubscription.paymentMethod || "No hay método de pago registrado"}</p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <h4 className="font-medium">Último pago</h4>
                <p>{displaySubscription.lastPayment ? formatDate(displaySubscription.lastPayment) : "N/A"}</p>
              </div>
              
              <div className="flex space-x-2 mt-4">
                <Button variant="outline">Cambiar plan</Button>
                {displaySubscription.cancelAtPeriodEnd ? (
                  <Button variant="secondary">Reactivar suscripción</Button>
                ) : (
                  <Button variant="destructive">Cancelar suscripción</Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturas</CardTitle>
          <CardDescription>Historial completo de facturación</CardDescription>
        </CardHeader>
        <CardContent>
          {displayInvoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell>
                      {invoice.period ? (
                        <span>
                          {formatDate(invoice.period.start)} - {formatDate(invoice.period.end)}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={statusColors[invoice.status] as "default" | "secondary" | "destructive" | "outline"}
                      >
                        {invoice.status === "paid" ? "Pagada" : 
                         invoice.status === "pending" ? "Pendiente" : 
                         invoice.status === "overdue" ? "Vencida" : "Cancelada"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        Descargar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">No hay facturas disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
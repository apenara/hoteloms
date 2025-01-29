import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/ui/globals.css";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: "Hotel Oms",
  description: "Hotel OMS , sistema de operacion Hotelera",
};

export default function InicioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
 
        <div className="flex flex-col min-h-screen">
        <Navbar/>
        <main className="flex-grow">{children}</main>
        <Footer/>
        </div>
      

  );
}

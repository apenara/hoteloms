import './ui/globals.css'
import type { Metadata } from 'next'
import { Inter } from "next/font/google";
import { AuthProvider } from '@/lib/auth'; 

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HotelOms',
  description: 'Sistema de Gestión Hotelera',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
        <AuthProvider>

      <body className={`${inter.className} antialiased`}>
      {children}
      </body>
      </AuthProvider>
    </html>
  )
}
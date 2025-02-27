"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navItems = [
  { label: "Características", href: "/features" },
  { label: "Precios", href: "/pricing" },
  { label: "Contacto", href: "/contact" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-blue-600">Hotel-OMS</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 hover:text-blue-600"
              >
                {item.label}
              </Link>
            ))}

            {/* Botones de autenticación */}
            <Link
              href="/auth/login"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Iniciar Sesión
            </Link>

            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrar Hotel
            </Link>
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block py-2 text-gray-700 hover:text-blue-600"
              >
                {item.label}
              </Link>
            ))}
            {/* Botones de autenticación en móvil */}
            <div className="pt-4 space-y-2">
              <Link
                href="/auth/login"
                className="block py-2 text-gray-700 hover:text-blue-600 font-medium"
              >
                Iniciar Sesión
              </Link>
              <Link
                href="/auth/register"
                className="block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-center"
              >
                Registrar Hotel
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

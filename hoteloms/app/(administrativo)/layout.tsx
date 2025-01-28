'use client';


import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BedDouble,
  Settings,
  ClipboardList,
  AlertTriangle,
  QrCode
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/hotel-admin/dashboard', icon: LayoutDashboard },
  { name: 'Personal', href: '/hotel-admin/staff', icon: Users },
  // { name: 'Habitaciones', href: '/hotel-admin/rooms', icon: BedDouble },
  { name: 'Housekeeping', href: '/hotel-admin/housekeeping', icon: ClipboardList },
  { name: 'Mantenimiento', href: '/hotel-admin/maintenance', icon: AlertTriangle },
  { name: 'Gestion QR', href: '/hotel-admin/qr-manager', icon: QrCode },
  { name: 'Configuración', href: '/hotel-admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (

        <div className="min-h-screen bg-gray-100">
          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white border-r">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-center h-16 px-4 border-b">
                <h1 className="text-xl font-semibold">HotelOMS</h1>
              </div>

              <nav className="flex-1 px-4 py-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${isActive ? 'text-gray-900' : 'text-gray-400'
                          }`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-col p-4 border-t">
                <div className="px-2 py-2 text-sm text-gray-600">
                  {user.name}
                </div>
                <button
                  onClick={() => signOut()}
                  className="px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="pl-64">
            <main className="p-4">
              {children}
            </main>
          </div>
        </div>
  )
}

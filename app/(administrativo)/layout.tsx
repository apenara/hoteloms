'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import {
  LayoutDashboard,
  Hotel,
  Users,
  Settings,
  BedDouble,
  ClipboardList,
  AlertTriangle,
  QrCode,
  Menu,
  LogOut,
  Bell,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationsDialog } from '@/components/dashboard/NotificationsDialog';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, staff, signOut } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      setIsSidebarOpen(!isMobileView);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Verificar autenticación
  useEffect(() => {
    if (!user && !staff) {
      router.push('/auth/login');
    }
  }, [user, staff, router]);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/hotel-admin/dashboard',
      icon: LayoutDashboard
    },
    {
      name: 'Habitaciones',
      href: '/hotel-admin/rooms',
      icon: BedDouble
    },
    {
      name: 'Housekeeping',
      href: '/hotel-admin/housekeeping',
      icon: ClipboardList
    },
    {
      name: 'Mantenimiento',
      href: '/hotel-admin/maintenance',
      icon: AlertTriangle
    },
    {
      name: 'Personal',
      href: '/hotel-admin/staff',
      icon: Users
    },
    {
      name: 'Códigos QR',
      href: '/hotel-admin/qr-manager',
      icon: QrCode
    },
    {
      name: 'Configuración',
      href: '/hotel-admin/settings',
      icon: Settings
    }
  ];

  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  if (!user && !staff) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Overlay para cerrar en móviles */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 transform bg-white shadow-lg transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo y botón cerrar en móviles */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link href="/hotel-admin/dashboard" className="flex items-center space-x-2">
              <Hotel className="h-6 w-6" />
              <span className="text-xl font-bold">HotelOMS</span>
            </Link>
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={closeSidebar}
                className="lg:hidden"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeSidebar}
                    className="group flex items-center rounded-lg px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                  >
                    <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-500" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.name || staff?.name}
                  </p>
                  <p className="text-xs text-gray-500">{user?.email || staff?.role}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex flex-col ${
          isSidebarOpen ? 'lg:ml-64' : ''
        } min-h-screen transition-all duration-200`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex items-center space-x-4">
            <NotificationsDialog hotelId={user?.hotelId || staff?.hotelId} />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
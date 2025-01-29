"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Hotel, 
  Users, 
  Settings,
  LogOut,
  Menu
} from 'lucide-react';

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
      href: '/admin/dashboard'
    },
    {
      title: 'Hoteles',
      icon: <Hotel className="w-4 h-4" />,
      href: '/admin/hotels'
    },
    {
      title: 'Usuarios',
      icon: <Users className="w-4 h-4" />,
      href: '/admin/users'
    },
    {
      title: 'Configuración',
      icon: <Settings className="w-4 h-4" />,
      href: '/admin/settings'
    }
  ];

  const handleLogout = async () => {
    // Implementar logout
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-screen transition-transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } bg-white border-r w-64`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-4 border-b">
            <h1 className="text-xl font-bold text-blue-600">HotelFlow Admin</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                {item.icon}
                <span className="ml-3">{item.title}</span>
              </a>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-center"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <main className={`lg:ml-64 p-8`}>
        {children}
      </main>
    </div>
  );
}
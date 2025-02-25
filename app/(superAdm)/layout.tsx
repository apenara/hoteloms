// esta es la estructura de la pagina de super admin
// es el layout que se va a mostrar en la pagina de super admin
// se muestra el sidebar con las opciones de navegacion

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

/**
 * @interface DashboardLayoutProps
 * @description Defines the props for the DashboardLayout component.
 * @property {React.ReactNode} children - The child components to be rendered within the layout.
 */
interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * @function DashboardLayout
 * @description This component provides the main layout for the Super Admin dashboard.
 * It includes a sidebar with navigation links, a logo, and a logout button.
 * The sidebar can be toggled on smaller screens. The main content is rendered in the main section.
 * @param {DashboardLayoutProps} props - The props passed to the component.
 * @returns {JSX.Element} The rendered DashboardLayout component.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // State Variables
  /**
   * @const isSidebarOpen
   * @description State variable to control the visibility of the sidebar.
   * It is initially set to `true` (open) and will be updated to `false` (closed) when needed.
   * @type {boolean}
   */
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  /**
   * @constant menuItems
   * @description An array of objects, each defining a navigation item for the sidebar.
   * @type {Array<{ title: string; icon: JSX.Element; href: string }>}
   * @property {string} title - The title of the menu item.
   * @property {JSX.Element} icon - The icon to display for the menu item.
   * @property {string} href - The URL for the menu item.
   */
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

  /**
   * @function handleLogout
   * @description Handles the logout action.
   * It redirects the user to the login page.
   * @async
   * @returns {void}
   */
  const handleLogout = async () => {
    // Redirect to login page
    window.location.href = '/auth/login';
  };

  /**
   * @description Main component render
   * Render the main layout of the super admin dashboard.
   */
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
            {/* Map over the navigation menu */}
            {menuItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                {/* Menu item icon */}
                {item.icon}
                {/* Menu item title */}
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

// Este es el layout principal para la sección administrativa de la aplicación.
// Proporciona una barra lateral con enlaces de navegación y un área de contenido principal donde se muestran los componentes secundarios.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
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
  X,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * @interface AdminLayoutProps
 * @description Defines the props for the AdminLayout component.
 * @property {React.ReactNode} children - The child components to be rendered within the layout.
 */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * @function AdminLayout
 * @description This component provides the main layout for the administrative section of the application.
 * It renders a sidebar with navigation links and a main content area where the child components are displayed.
 * It handles user authentication, responsive sidebar behavior, and navigation.
 * @param {AdminLayoutProps} props - The props for the AdminLayout component.
 * @returns {JSX.Element} The rendered AdminLayout component.
 */
export default function AdminLayout({ children }: AdminLayoutProps) {
  // Hooks
  const { user, staff, signOut } = useAuth(); // Custom hook for authentication
  const router = useRouter(); // Next.js router for navigation

  // State variables
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // State to control the sidebar's visibility
  const [isMobile, setIsMobile] = useState(false); // State to track if the screen is in mobile view
  const [isTablet, setIsTablet] = useState(false);

  /**
   * @useEffect
   * @description This hook checks if the screen is in mobile view and adjusts the sidebar's initial visibility accordingly.
   * It also adds a resize event listener to update the mobile state when the window is resized.
   * @listens window#resize
   */
  useEffect(() => {
    const checkScreenSize = () => {
      const isMobileView = window.innerWidth < 768; // Check if the screen width is less than 768px
      const isTabletView = window.innerWidth >= 768 && window.innerWidth < 1024; // Check if it's a tablet
      setIsMobile(isMobileView); // Update the isMobile state
      setIsTablet(isTabletView);
      setIsSidebarOpen(!isMobileView && !isTabletView); // Close the sidebar if in mobile or tablet view, open otherwise
    };

    checkScreenSize(); // Check the initial state on mount
    window.addEventListener("resize", checkScreenSize); // Add the event listener
    return () => window.removeEventListener("resize", checkScreenSize); // Cleanup the listener on unmount
  }, []);

  /**
   * @useEffect
   * @description This hook verifies the user's authentication status.
   * If the user is not authenticated, it redirects to the login page.
   * @dependency user - Changes when the user authentication status changes
   * @dependency staff - Changes when the staff authentication status changes
   * @dependency router - Changes when the router object changes
   */
  useEffect(() => {
    if (!user && !staff) {
      router.push("/auth/login"); // Redirect to login if not authenticated
    }
  }, [user, staff, router]);

  /**
   * @constant navigation
   * @description Defines the navigation items for the sidebar.
   * Each item has a name, a link (href), and an icon.
   */
  const navigation = [
    {
      name: "Dashboard",
      href: "/hotel-admin/dashboard",
      icon: LayoutDashboard,
    },
    // {
    //   name: "Habitaciones",
    //   href: "/hotel-admin/rooms",
    //   icon: BedDouble,
    // },
    {
      name: "Housekeeping",
      href: "/hotel-admin/housekeeping",
      icon: ClipboardList,
    },
    {
      name: "Mantenimiento",
      href: "/hotel-admin/maintenance",
      icon: AlertTriangle,
    },
    {
      name: "Activos",
      href: "/hotel-admin/assets",
      icon: Package,
    },
    {
      name: "Personal",
      href: "/hotel-admin/staff",
      icon: Users,
    },
    {
      name: "Códigos QR",
      href: "/hotel-admin/qr-manager",
      icon: QrCode,
    },
    {
      name: "Configuración",
      href: "/hotel-admin/settings",
      icon: Settings,
    },
  ];

  /**
   * @function closeSidebar
   * @description Closes the sidebar if the application is in mobile or tablet view.
   * @returns {void}
   */
  const closeSidebar = () => {
    if (isMobile || isTablet) {
      setIsSidebarOpen(false);
    }
  };

  // Guard clause: if the user is not authenticated, return null
  if (!user && !staff) return null;

  // Render the main layout
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Overlay for closing the sidebar in mobile view */}
      {(isMobile || isTablet) && isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity duration-300 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-64 transform bg-white ${
          isMobile || isTablet ? "shadow-none" : "shadow-lg"
        }  transition-transform duration-200 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo and close button (mobile) */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link
              href="/hotel-admin/dashboard"
              className="flex items-center space-x-2"
            >
              <Hotel className="h-6 w-6" />
              <span className="text-xl font-bold">HotelOMS</span>
            </Link>
            {(isMobile || isTablet) && (
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
                  <p className="text-xs text-gray-500">
                    {user?.email || staff?.role}
                  </p>
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
        className={`relative flex flex-col ${
          isSidebarOpen ? "lg:ml-64" : ""
        } min-h-screen transition-all duration-200`}
      >
        {/* Overlay to content when the sidebar is open */}
        {(isMobile || isTablet) && isSidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black bg-opacity-25 transition-opacity duration-300 lg:hidden" />
        )}
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
            {/* <NotificationsDialog hotelId={user?.hotelId || staff?.hotelId} /> */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1">
          <div className="mx-auto px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

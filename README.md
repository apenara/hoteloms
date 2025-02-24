# Sistema de Gestión Hotelera HotelOMS
## 1. Arquitectura General

### 1.1 Niveles de Acceso
- **Nivel 1 (Administrativo)**
  - Super Admin: Gestión global del sistema
  - Hotel Admin: Administración de un hotel específico
  - Supervisor: Supervisión de operaciones

- **Nivel 2 (Operativo)**
  - Housekeeping: Personal de limpieza
  - Mantenimiento: Personal técnico
  - Recepción: Personal de front desk

### 1.2 Módulos Principales
- Gestión de Estados de Habitaciones
- Sistema de Logs y Trazabilidad
- Control de Inventario y Mantenimientos
- Portal de Solicitudes para Huéspedes
- Gestión de Personal
- Dashboard Administrativo

## 2. Flujos de Trabajo

### 2.1 Gestión de Estados de Habitaciones

#### Estados Básicos
- Disponible → Ocupada → Check-out
- En Casa (In House)
- No Molestar (Do Not Disturb)

#### Flujo de Limpieza
1. Necesita Limpieza
2. Limpieza Ocupada/Check-out/Retoque
3. Inspección (si se requiere)
4. Disponible

#### Flujo de Mantenimiento
1. Solicitud de Mantenimiento
2. Asignación de Personal
3. En Progreso
4. Completado
5. Verificación
6. Retorno a Estado Disponible

### 2.2 Sistema de Autenticación

#### Personal Administrativo
- Acceso por email/contraseña
- Roles y permisos específicos
- Sesiones prolongadas

#### Personal Operativo
- Acceso por PIN de 10 dígitos
- Autenticación simplificada
- Sesiones de 8 horas
- Acceso a funciones específicas según rol

### 2.3 Gestión de Solicitudes

#### Tipos de Solicitudes
- Limpieza
- Mantenimiento
- Servicio a la habitación
- No molestar

#### Flujo de Solicitudes
1. Creación (huésped o personal)
2. Asignación
3. En proceso
4. Completada
5. Verificación (opcional)

## 3. Reglas de Negocio

### 3.1 Estados de Habitaciones
- Cada cambio de estado genera un registro en el historial
- Los estados requieren notas o justificación
- Ciertos estados requieren inspección antes de cambiar a disponible
- Solo roles específicos pueden realizar ciertos cambios de estado

### 3.2 Personal
- Cada miembro del personal tiene un rol específico
- Los permisos están basados en roles
- Se registra cada acción del personal
- El personal operativo puede usar PIN o email
- Se mantiene historial de eficiencia y tiempos

### 3.3 Mantenimiento
- Las solicitudes tienen prioridades (alta, media, baja)
- Se pueden adjuntar imágenes a las solicitudes
- Se requieren notas de completación
- Se calculan métricas de tiempo de respuesta

## 4. Integraciones

### 4.1 Firebase
- Authentication: Gestión de usuarios
- Firestore: Base de datos principal
- Storage: Almacenamiento de imágenes
- Real-time updates: Actualizaciones en vivo

### 4.2 Características PWA
- Instalable como aplicación
- Funcionamiento offline
- Notificaciones push
- Acceso a cámara para fotos

## 5. Métricas y KPIs

### 5.1 Housekeeping
- Tiempo promedio de limpieza
- Eficiencia por personal
- Tasa de aprobación de inspecciones
- Tiempo de respuesta a solicitudes

### 5.2 Mantenimiento
- Tiempo de resolución
- Tasa de reincidencia
- Solicitudes por tipo
- Eficiencia por técnico

### 5.3 Operaciones
- Ocupación
- Tiempo de check-in/check-out
- Satisfacción del huésped
- Tiempo de respuesta general


# Arquitectura Técnica de HotelOMS

## 1. Archivos Clave del Sistema

### Configuración y Middleware
- `middleware.ts`: Control de rutas y autenticación
  - Maneja niveles de acceso (LEVEL_1_ROUTES, LEVEL_2_ROUTES)
  - Verifica tokens (authToken, staffAccess, firebaseToken)
  - Controla sesiones y expiración
  - Protege rutas según nivel de autorización

### Gestión de Usuarios y Autenticación
- `user-management.ts`: 
  - Creación de usuarios (email y PIN)
  - Gestión de personal
  - Manejo de roles y permisos

### Sistema de Permisos
- `permissions.ts`:
```typescript
export const ROLE_PERMISSIONS = {
  super_admin: {
    canAccessDashboard: true,
    canManageHotels: true,
    canManageSubscriptions: true,
    // ...
  },
  hotel_admin: {
    canManageStaff: true,
    canManageRooms: true,
    // ...
  },
  // ...
}

export const STAFF_PERMISSIONS = {
  housekeeper: {
    canChangeRoomStatus: true,
    allowedStatuses: ['cleaning_occupied', 'cleaning_checkout', ...]
  },
  maintenance: {
    canChangeRoomStatus: true,
    allowedStatuses: ['maintenance', 'available']
  },
  // ...
}
```

### Estados y Flujos
- `room-states.ts`:
```typescript
export const ROOM_STATES = {
  'available': {
    label: 'Disponible',
    icon: CheckCircle,
    color: 'bg-emerald-100 text-emerald-800',
    group: 'reception'
  },
  // ...
}

export const ROLE_STATE_FLOWS = {
  reception: {
    'available': ['occupied'],
    'occupied': ['checkout'],
    // ...
  },
  housekeeper: {
    'need_cleaning': ['cleaning_occupied', 'cleaning_checkout', 'cleaning_touch'],
    // ...
  }
}
```

## 2. Servicios Principales

### Mantenimiento
- `maintenanceService.ts`:
  - Creación de solicitudes
  - Actualización de estados
  - Gestión de completación
  - Estadísticas y métricas

### Estados de Habitaciones
- `roomStateService.ts`:
  - Actualización de estados
  - Registro de historial
  - Manejo de transiciones
  - Validación de permisos

### Housekeeping
- `useRealTimeHousekeeping.ts`:
  - Monitoreo en tiempo real
  - Estadísticas de limpieza
  - Asignación de personal
  - Métricas de eficiencia

## 3. Componentes React Clave

### Autenticación de Personal
- `PinLogin.tsx`: Login con PIN
- `StaffLoginDialog.tsx`: Login con email
- `AddStaffDialog.tsx`: Gestión de personal

### Mantenimiento
- `MaintenanceDialog.tsx`: Solicitudes
- `MaintenanceStaffView.tsx`: Vista de personal
- `ImageUpload.tsx`: Subida de imágenes

### Notificaciones
- `NotificationsDialog.tsx`: Sistema de notificaciones
- `RequestNotifications.tsx`: Gestión de solicitudes

## 4. Estructura de Base de Datos (Firestore)

```
hotels/
  ├─ {hotelId}/
  │  ├─ rooms/
  │  │  ├─ {roomId}/
  │  │  │  ├─ history/
  │  │  │  └─ requests/
  │  ├─ staff/
  │  ├─ maintenance/
  │  └─ requests/
users/
  └─ {userId}/
```

## 5. Mecanismos de Seguridad

### Validación de Acceso
```typescript
// Ejemplo de middleware.ts
export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('authToken')?.value;
  const staffAccess = request.cookies.get('staffAccess')?.value;

  if (LEVEL_1_ROUTES.some(route => pathname.startsWith(route))) {
    if (!authToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  // ...
}
```

### Control de Permisos
```typescript
// Ejemplo de uso de permisos
export function hasPermission(
  role: UserRole | StaffRole,
  permission: string
): boolean {
  if (role in ROLE_PERMISSIONS) {
    return ROLE_PERMISSIONS[role][permission] || false;
  }
  if (role in STAFF_PERMISSIONS) {
    return STAFF_PERMISSIONS[role][permission] || false;
  }
  return false;
}
```

## 6. Integración Firebase

### Configuración
- Authentication: Email y PIN
- Firestore: Base de datos principal
- Storage: Imágenes y archivos
- Real-time updates: Suscripciones y listeners

### Seguridad
- Reglas de Firestore para control de acceso
- Validación de tokens
- Manejo de sesiones
- Encriptación de datos sensibles


ESTRUCUTRA DE ARCHIVOS :
hoteloms
├─ (inicio)
│  ├─ 404.html
│  └─ index.html
├─ .firebase
│  ├─ hosting.cHVibGlj.cache
│  ├─ hosting.KGluaWNpbyk.cache
│  ├─ hosting.YXBw.cache
│  └─ logs
│     └─ vsce-debug.log
├─ .firebaserc
├─ app
│  ├─ (administrativo)
│  │  ├─ hotel-admin
│  │  │  ├─ dashboard
│  │  │  │  └─ page.tsx
│  │  │  ├─ housekeeping
│  │  │  │  └─ page.tsx
│  │  │  ├─ maintenance
│  │  │  │  └─ page.tsx
│  │  │  ├─ qr-manager
│  │  │  │  └─ page.tsx
│  │  │  ├─ rooms
│  │  │  │  └─ page.tsx
│  │  │  ├─ settings
│  │  │  │  └─ page.tsx
│  │  │  └─ staff
│  │  │     └─ page.tsx
│  │  └─ layout.tsx
│  ├─ (inicio)
│  │  ├─ auth
│  │  │  ├─ login
│  │  │  │  └─ page.tsx
│  │  │  └─ register
│  │  │     └─ page.tsx
│  │  ├─ contact
│  │  │  └─ page.tsx
│  │  ├─ features
│  │  │  └─ page.tsx
│  │  ├─ layout.tsx
│  │  ├─ page.tsx
│  │  └─ pricing
│  │     └─ page.tsx
│  ├─ (publico)
│  │  ├─ maintenance
│  │  │  └─ [hotelId]
│  │  │     ├─ login
│  │  │     │  └─ page.tsx
│  │  │     └─ staff
│  │  │        └─ page.tsx
│  │  ├─ reception
│  │  │  └─ [hotelId]
│  │  │     ├─ login
│  │  │     │  └─ page.tsx
│  │  │     └─ staff
│  │  │        └─ page.tsx
│  │  └─ rooms
│  │     └─ [hotelId]
│  │        └─ [roomId]
│  │           ├─ page.tsx
│  │           └─ staff
│  │              └─ page.tsx
│  ├─ (superAdm)
│  │  ├─ admin
│  │  │  ├─ dashboard
│  │  │  │  └─ page.tsx
│  │  │  ├─ hotels
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ [hotelId]
│  │  │  │     ├─ rooms
│  │  │  │     │  └─ page.tsx
│  │  │  │     └─ status
│  │  │  │        └─ page.tsx
│  │  │  └─ users
│  │  │     └─ page.tsx
│  │  └─ layout.tsx
│  ├─ android-chrome-192x192.png
│  ├─ android-chrome-512x512.png
│  ├─ api
│  │  ├─ auth
│  │  │  └─ create-staff-token
│  │  │     └─ route.ts
│  │  └─ notifications
│  │     └─ send
│  │        └─ route.ts
│  ├─ apple-touch-icon.png
│  ├─ components
│  │  ├─ dashboard
│  │  │  ├─ AuthMonitor.tsx
│  │  │  ├─ NotificationsDialog.tsx
│  │  │  └─ RequestNotifications.tsx
│  │  ├─ front
│  │  │  ├─ GuestRequestDialog.tsx
│  │  │  ├─ receptionNotifications.tsx
│  │  │  ├─ receptionRoomCard.tsx
│  │  │  ├─ receptionView.tsx
│  │  │  ├─ RoomHistory.tsx
│  │  │  └─ roomNotificationBadge.tsx
│  │  ├─ home
│  │  │  ├─ Features.tsx
│  │  │  ├─ Hero.tsx
│  │  │  └─ Pricing.tsx
│  │  ├─ hotels
│  │  │  ├─ hotel-form-dialog.tsx
│  │  │  ├─ RequestCard.tsx
│  │  │  ├─ room-form-dialog.tsx
│  │  │  ├─ room-status-manager.tsx
│  │  │  ├─ RoomCard.tsx
│  │  │  ├─ RoomDetailDialog.tsx
│  │  │  ├─ RoomProgressTimer.tsx
│  │  │  └─ RoomStatusMenu.tsx
│  │  ├─ housekeeping
│  │  │  ├─ HousekeepingEfficiencyView.tsx
│  │  │  ├─ HousekeepingHistory.tsx
│  │  │  ├─ HousekeepingMetrics.tsx
│  │  │  ├─ HousekeepingStaffList.tsx
│  │  │  ├─ HousekeepingStats.tsx
│  │  │  └─ QRLogin.tsx
│  │  ├─ layout
│  │  │  ├─ Footer.tsx
│  │  │  └─ Navbar.tsx
│  │  ├─ maintenance
│  │  │  ├─ ImageGallery.tsx
│  │  │  ├─ ImageUpload.tsx
│  │  │  ├─ ImageViewer.tsx
│  │  │  ├─ MaintenanceDialog.tsx
│  │  │  ├─ MaintenanceFilters.tsx
│  │  │  ├─ MaintenanceFormDialog.tsx
│  │  │  ├─ MaintenanceList.tsx
│  │  │  ├─ MaintenancePreview.tsx
│  │  │  ├─ MaintenanceReport.tsx
│  │  │  ├─ MaintenanceRequestCard.tsx
│  │  │  ├─ MaintenanceStaffView.tsx
│  │  │  ├─ MaintenanceStats.tsx
│  │  │  ├─ MaintenanceStatsSummary.tsx
│  │  │  └─ StaffEfficiencyView.tsx
│  │  ├─ qr
│  │  │  └─ QrDownloadManager.tsx
│  │  ├─ shared
│  │  │  └─ ErrorDialog.tsx
│  │  ├─ staff
│  │  │  ├─ AddStaffDialog.tsx
│  │  │  ├─ createStaffMember.tsx
│  │  │  ├─ PinLogin.tsx
│  │  │  ├─ PinManagement.tsx
│  │  │  └─ StaffLoginDialog.tsx
│  │  └─ ui
│  │     ├─ alert-dialog.tsx
│  │     ├─ alert.tsx
│  │     ├─ badge.tsx
│  │     ├─ button.tsx
│  │     ├─ calendar.tsx
│  │     ├─ card.tsx
│  │     ├─ checkbox.tsx
│  │     ├─ command.tsx
│  │     ├─ dialog.tsx
│  │     ├─ dropdown-menu.tsx
│  │     ├─ input.tsx
│  │     ├─ label.tsx
│  │     ├─ popover.tsx
│  │     ├─ progress.tsx
│  │     ├─ scroll-area.tsx
│  │     ├─ select.tsx
│  │     ├─ table.tsx
│  │     ├─ tabs.tsx
│  │     ├─ textarea.tsx
│  │     ├─ toast.tsx
│  │     ├─ toaster.tsx
│  │     └─ tooltip.tsx
│  ├─ favicon-16x16.png
│  ├─ favicon-32x32.png
│  ├─ favicon.ico
│  ├─ hooks
│  │  ├─ use-toast.ts
│  │  ├─ useRealTimeHousekeeping.ts
│  │  ├─ useReception.ts
│  │  └─ useReceptionNotifications.ts
│  ├─ index.html
│  ├─ layout.tsx
│  ├─ lib
│  │  ├─ constants
│  │  │  ├─ permissions.ts
│  │  │  └─ room-states.ts
│  │  ├─ types
│  │  │  ├─ housekeeping.ts
│  │  │  └─ reception.ts
│  │  ├─ types.ts
│  │  ├─ utils
│  │  │  └─ housekeeping.ts
│  │  └─ utils.ts
│  ├─ services
│  │  ├─ access-logs.ts
│  │  ├─ housekeeping-assignment.ts
│  │  ├─ housekeeping.ts
│  │  ├─ maintenanceService.ts
│  │  ├─ notificationService.ts
│  │  ├─ receptionNotificationsService.ts
│  │  ├─ receptionService.ts
│  │  ├─ roomStateService.ts
│  │  ├─ storage.ts
│  │  └─ storageService.ts
│  └─ ui
│     └─ globals.css
├─ components.json
├─ eslint.config.mjs
├─ firebase.json
├─ lib
│  ├─ auth.js
│  ├─ firebase
│  │  ├─ admin-config.ts
│  │  ├─ auth.ts
│  │  ├─ config.ts
│  │  └─ user-management.ts
│  ├─ types.ts
│  └─ utils.ts
├─ middleware.ts
├─ next.config.js
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ public
│  ├─ android
│  │  ├─ android-launchericon-144-144.png
│  │  ├─ android-launchericon-192-192.png
│  │  ├─ android-launchericon-48-48.png
│  │  ├─ android-launchericon-512-512.png
│  │  ├─ android-launchericon-72-72.png
│  │  └─ android-launchericon-96-96.png
│  ├─ firebase-messaging-sw.js
│  ├─ index.html
│  ├─ ios
│  │  ├─ 100.png
│  │  ├─ 1024.png
│  │  ├─ 114.png
│  │  ├─ 120.png
│  │  ├─ 128.png
│  │  ├─ 144.png
│  │  ├─ 152.png
│  │  ├─ 16.png
│  │  ├─ 167.png
│  │  ├─ 180.png
│  │  ├─ 192.png
│  │  ├─ 20.png
│  │  ├─ 256.png
│  │  ├─ 29.png
│  │  ├─ 32.png
│  │  ├─ 40.png
│  │  ├─ 50.png
│  │  ├─ 512.png
│  │  ├─ 57.png
│  │  ├─ 58.png
│  │  ├─ 60.png
│  │  ├─ 64.png
│  │  ├─ 72.png
│  │  ├─ 76.png
│  │  ├─ 80.png
│  │  └─ 87.png
│  ├─ manifest.json
│  └─ windows11
│     ├─ LargeTile.scale-100.png
│     ├─ LargeTile.scale-125.png
│     ├─ LargeTile.scale-150.png
│     ├─ LargeTile.scale-200.png
│     ├─ LargeTile.scale-400.png
│     ├─ SmallTile.scale-100.png
│     ├─ SmallTile.scale-125.png
│     ├─ SmallTile.scale-150.png
│     ├─ SmallTile.scale-200.png
│     ├─ SmallTile.scale-400.png
│     ├─ SplashScreen.scale-100.png
│     ├─ SplashScreen.scale-125.png
│     ├─ SplashScreen.scale-150.png
│     ├─ SplashScreen.scale-200.png
│     ├─ SplashScreen.scale-400.png
│     ├─ Square150x150Logo.scale-100.png
│     ├─ Square150x150Logo.scale-125.png
│     ├─ Square150x150Logo.scale-150.png
│     ├─ Square150x150Logo.scale-200.png
│     ├─ Square150x150Logo.scale-400.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-16.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-20.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-24.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-256.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-30.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-32.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-36.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-40.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-44.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-48.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-60.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-64.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-72.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-80.png
│     ├─ Square44x44Logo.altform-lightunplated_targetsize-96.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-16.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-20.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-24.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-256.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-30.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-32.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-36.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-40.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-44.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-48.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-60.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-64.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-72.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-80.png
│     ├─ Square44x44Logo.altform-unplated_targetsize-96.png
│     ├─ Square44x44Logo.scale-100.png
│     ├─ Square44x44Logo.scale-125.png
│     ├─ Square44x44Logo.scale-150.png
│     ├─ Square44x44Logo.scale-200.png
│     ├─ Square44x44Logo.scale-400.png
│     ├─ Square44x44Logo.targetsize-16.png
│     ├─ Square44x44Logo.targetsize-20.png
│     ├─ Square44x44Logo.targetsize-24.png
│     ├─ Square44x44Logo.targetsize-256.png
│     ├─ Square44x44Logo.targetsize-30.png
│     ├─ Square44x44Logo.targetsize-32.png
│     ├─ Square44x44Logo.targetsize-36.png
│     ├─ Square44x44Logo.targetsize-40.png
│     ├─ Square44x44Logo.targetsize-44.png
│     ├─ Square44x44Logo.targetsize-48.png
│     ├─ Square44x44Logo.targetsize-60.png
│     ├─ Square44x44Logo.targetsize-64.png
│     ├─ Square44x44Logo.targetsize-72.png
│     ├─ Square44x44Logo.targetsize-80.png
│     ├─ Square44x44Logo.targetsize-96.png
│     ├─ StoreLogo.scale-100.png
│     ├─ StoreLogo.scale-125.png
│     ├─ StoreLogo.scale-150.png
│     ├─ StoreLogo.scale-200.png
│     ├─ StoreLogo.scale-400.png
│     ├─ Wide310x150Logo.scale-100.png
│     ├─ Wide310x150Logo.scale-125.png
│     ├─ Wide310x150Logo.scale-150.png
│     ├─ Wide310x150Logo.scale-200.png
│     └─ Wide310x150Logo.scale-400.png
├─ README.md
├─ tailwind.config.ts
└─ tsconfig.json

```
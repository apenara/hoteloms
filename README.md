This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


```
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
├─ .git
│  ├─ COMMIT_EDITMSG
│  ├─ config
│  ├─ description
│  ├─ FETCH_HEAD
│  ├─ gitk.cache
│  ├─ HEAD
│  ├─ hooks
│  │  ├─ applypatch-msg.sample
│  │  ├─ commit-msg.sample
│  │  ├─ fsmonitor-watchman.sample
│  │  ├─ post-update.sample
│  │  ├─ pre-applypatch.sample
│  │  ├─ pre-commit.sample
│  │  ├─ pre-merge-commit.sample
│  │  ├─ pre-push.sample
│  │  ├─ pre-rebase.sample
│  │  ├─ pre-receive.sample
│  │  ├─ prepare-commit-msg.sample
│  │  ├─ push-to-checkout.sample
│  │  ├─ sendemail-validate.sample
│  │  └─ update.sample
│  ├─ index
│  ├─ info
│  │  └─ exclude
│  ├─ logs
│  │  ├─ HEAD
│  │  └─ refs
│  │     ├─ heads
│  │     │  ├─ master
│  │     │  └─ ultimoMantenimientoFuncionando
│  │     └─ remotes
│  │        └─ hoteloms
│  │           ├─ main
│  │           ├─ master
│  │           └─ version-01
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
│  ├─ api
│  │  └─ auth
│  │     └─ create-staff-token
│  ├─ components
│  │  ├─ dashboard
│  │  │  ├─ NotificationsDialog.tsx
│  │  │  └─ RequestNotifications.tsx
│  │  ├─ front
│  │  │  ├─ receptionNotifications.tsx
│  │  │  ├─ receptionRoomCard.tsx
│  │  │  └─ receptionView.tsx
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
│  │  │  ├─ MaintenanceDialog.tsx
│  │  │  ├─ MaintenanceFormDialog.tsx
│  │  │  ├─ MaintenanceList.tsx
│  │  │  ├─ MaintenancePreview.tsx
│  │  │  ├─ MaintenanceReport.tsx
│  │  │  ├─ MaintenanceRequestCard.tsx
│  │  │  ├─ MaintenanceStaffView.tsx
│  │  │  ├─ MaintenanceStats.tsx
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
│  ├─ favicon.ico
│  ├─ hooks
│  │  ├─ use-toast.ts
│  │  ├─ useRealTimeHousekeeping.ts
│  │  └─ useReception.ts
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
│  │  ├─ receptionNotificationsService.ts
│  │  ├─ receptionService.ts
│  │  └─ roomStateService.ts
│  └─ ui
│     └─ globals.css
├─ apphosting.yaml
├─ components.json
├─ eslint.config.mjs
├─ firebase.json
├─ lib
│  ├─ auth.js
│  ├─ firebase
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
├─ README.md
├─ tailwind.config.ts
└─ tsconfig.json

```
```
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
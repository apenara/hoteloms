// // lib/firebase/admin-config.ts
// import admin from 'firebase-admin';

// export function initAdmin() {
//   if (!admin.apps.length) {
//     try {
//       admin.initializeApp({
//         credential: admin.credential.cert({
//           projectId: process.env.FIREBASE_PROJECT_ID,
//           clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
//           privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
//         }),
//         databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
//       });
//     } catch (error) {
//       console.error('Firebase admin initialization error:', error);
//     }
//   }
//   return admin;
// }

// src/lib/firebase/admin-config.ts
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (error) {
    console.error('Error inicializando Firebase Admin:', error);
  }
}

export { admin };
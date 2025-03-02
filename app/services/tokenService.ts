// src/services/tokenService.ts
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { requestNotificationPermission } from "@/lib/firebase/config";

interface TokenRegistrationParams {
  userId: string;
  hotelId: string;
  role: string;
  authMethod: "email" | "pin";
}

export async function registerUserToken(
  userId: string,
  hotelId: string,
  role: string,
  authMethod: "email" | "pin" = "pin"
) {
  try {
    // Usamos sessionStorage para recordar el token actual
    const cachedToken = sessionStorage.getItem(`fcm_token_${userId}`);
    if (cachedToken) {
      return cachedToken;
    }

    const fcmToken = await requestNotificationPermission();
    if (!fcmToken) return null;

    const tokensRef = collection(db, "notification_tokens");

    // Verificar tokens existentes
    const q = query(
      tokensRef,
      where("userId", "==", userId),
      where("token", "==", fcmToken)
    );

    const snapshot = await getDocs(q);

    const tokenData = {
      token: fcmToken,
      userId,
      hotelId,
      role,
      platform: "web",
      authMethod,
      createdAt: Timestamp.now(),
      lastUsed: Timestamp.now(),
      deviceInfo: {
        userAgent: window.navigator.userAgent,
        platform: window.navigator.platform,
      },
    };

    if (snapshot.empty) {
      // Crear nuevo token
      await addDoc(tokensRef, tokenData);
    } else {
      // Actualizar token existente
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, {
        ...tokenData,
        lastUsed: Timestamp.now(),
      });
    }

    // Guardar en sessionStorage para accesos futuros
    sessionStorage.setItem(`fcm_token_${userId}`, fcmToken);

    return fcmToken;
  } catch (error) {
    console.error("Error registering token:", error);
    return null;
  }
}
export async function removeUserTokens(userId: string) {
  try {
    const tokensRef = collection(db, "notification_tokens");
    const q = query(tokensRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return true;
  } catch (error) {
    console.error("Error removing tokens:", error);
    return false;
  }
}

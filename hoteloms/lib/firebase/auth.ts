import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    sendPasswordResetEmail
  } from 'firebase/auth';
  import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
  import { auth, db } from './config';
  
  export async function registerHotel({
    email,
    password,
    hotelData
  }: {
    email: string;
    password: string;
    hotelData: {
      hotelName: string;
      ownerName: string;
      phone: string;
      address: string;
    };
  }) {
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Crear documento del hotel
      const hotelRef = doc(db, 'hotels', user.uid);
      await setDoc(hotelRef, {
        ...hotelData,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
        status: 'trial'
      });
  
      // Crear documento del usuario
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        email: user.email,
        role: 'hotel_admin',
        hotelId: user.uid,
        name: hotelData.ownerName,
        createdAt: serverTimestamp()
      });
  
      return { user };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  
  export async function signIn(email: string, password: string) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return { user: result.user };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  
  export async function signOut() {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  
  export async function resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
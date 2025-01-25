// src/lib/firebase/user-management.ts
import { auth, db } from './config';
import { 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail
//   generatePasswordResetLink
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  addDoc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { generatePin, generateTemporaryPassword } from '@/lib/utils';
import type { UserRole, StaffRole } from '@/lib/types';

interface CreateUserParams {
  email: string;
  name: string;
  role: UserRole | StaffRole;
  hotelId?: string;
}

export async function createHotelUser({
  email,
  name,
  role,
  hotelId
}: CreateUserParams) {
  try {
    // 1. Crear usuario en Firebase Auth con una contraseña temporal
    const temporaryPassword = Math.random().toString(36).slice(-12);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      temporaryPassword
    );
    const uid = userCredential.user.uid;

    // 2. Crear documento en Firestore
    await setDoc(doc(db, 'users', uid), {
      email,
      name,
      role,
      hotelId,
      status: 'pending_activation',
      createdAt: new Date(),
      lastLogin: null,
      authMethod: 'email',
      mustChangePassword: true
    });

    // 3. Si es un hotel_admin, actualizar documento del hotel
    if (role === 'hotel_admin' && hotelId) {
      await setDoc(doc(db, 'hotels', hotelId), {
        adminId: uid
      }, { merge: true });
    }

    // 4. Enviar email para cambio de contraseña
    await sendPasswordResetEmail(auth, email);

    return {
      success: true,
      userId: uid
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function createStaffMember({
  name,
  email,
  role,
  hotelId,
  assignedAreas = []
}: {
  name: string;
  email: string;
  role: StaffRole;
  hotelId: string;
  assignedAreas?: string[];
}) {
  try {
    // 1. Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      generateTemporaryPassword()
    );
    const uid = userCredential.user.uid;

    // 2. Crear documento en la colección users
    await setDoc(doc(db, 'users', uid), {
      email,
      name,
      role,
      hotelId,
      status: 'pending_activation',
      createdAt: new Date(),
      lastLogin: null,
      authMethod: 'email',
      mustChangePassword: true
    });

    // 3. Crear documento en la colección staff usando el mismo UID
    await setDoc(doc(db, 'hotels', hotelId, 'staff', uid), {
      name,
      email,
      role,
      assignedAreas,
      status: 'pending_activation',
      createdAt: new Date(),
      lastLogin: null,
      authMethod: 'email',
      userId: uid // Referencia al mismo ID
    });

    // 4. Enviar email para cambio de contraseña
    await sendPasswordResetEmail(auth, email);

    return {
      success: true,
      userId: uid,
      staffId: uid // Ahora son el mismo ID
    };
  } catch (error) {
    console.error('Error creating staff member:', error);
    throw error;
  }
}

export async function deleteStaffMember(staffId: string, hotelId: string, userId?: string) {
  try {
    const response = await fetch('/api/staff/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        staffId,
        hotelId,
        userId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error deleting staff member');
    }

    return data;
  } catch (error) {
    console.error('Error deleting staff member:', error);
    throw new Error(error instanceof Error ? error.message : 'Error deleting staff member');
  }
}

export async function suspendStaffMember(staffId: string, hotelId: string, userId?: string) {
  try {
    // 1. Actualizar estado en la colección staff
    const staffRef = doc(db, 'hotels', hotelId, 'staff', staffId);
    await updateDoc(staffRef, {
      status: 'inactive',
      suspendedAt: new Date(),
    });

    // 2. Si existe un usuario asociado, actualizar su estado también
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'inactive',
        suspendedAt: new Date(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error suspending staff member:', error);
    throw error;
  }
}

// async function generateUniquePin(hotelId: string): Promise<string> {
//   let pin: string;
//   let isUnique = false;

//   while (!isUnique) {
//     pin = generatePin(6);
//     const staffRef = collection(db, 'hotels', hotelId, 'staff');
//     const q = query(staffRef, where('pin', '==', pin));
//     const querySnapshot = await getDocs(q);
    
//     if (querySnapshot.empty) {
//       isUnique = true;
//     }
//   }

//   return pin;
// }
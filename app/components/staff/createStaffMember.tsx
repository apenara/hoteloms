"use client"
// src/lib/firebase/user-management.ts
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { generatePin, generateTemporaryPassword } from '@/lib/utils'; // Función para generar un PIN único
import { StaffRole } from '@/app/lib/types';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInAnonymously  } from 'firebase/auth';

interface CreateStaffMemberParams {
  name: string;
  email?: string;
  role: string;
  hotelId: string;
  assignedAreas?: string[];
}

export async function createStaffMember({
    name,
    email,
    role,
    hotelId,
    assignedAreas = [],
    pin, // Nuevo parámetro para el PIN
  }: {
    name: string;
    email?: string; // Hacer el email opcional
    role: StaffRole;
    hotelId: string;
    assignedAreas?: string[];
    pin?: string; // Nuevo parámetro para el PIN
  }) {
    try {
      let uid: string;
  
      // 1. Si se proporciona un correo electrónico, crear usuario en Firebase Auth con correo/contraseña
      if (email) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          generateTemporaryPassword()
        );
        uid = userCredential.user.uid;
  
        // 2. Enviar email para cambio de contraseña
        await sendPasswordResetEmail(auth, email);
      } else {
        // 3. Si no se proporciona un correo, crear un usuario anónimo en Firebase Auth
        const userCredential = await signInAnonymously(auth);
        uid = userCredential.user.uid;
      }
  
      // 4. Crear documento en la colección users
      await setDoc(doc(db, 'users', uid), {
        name,
        email: email || null, // Guardar el correo si existe
        role,
        hotelId,
        status: 'active',
        createdAt: new Date(),
        lastLogin: null,
        authMethod: email ? 'email' : 'pin', // Indicar el método de autenticación
        mustChangePassword: email ? true : false, // Solo si se proporciona un correo
      });
  
      // 5. Crear documento en la colección staff
      const staffRef = doc(collection(db, 'hotels', hotelId, 'staff'));
      await setDoc(staffRef, {
        name,
        email: email || null, // Guardar el correo si existe
        role,
        assignedAreas,
        pin: pin || null, // Guardar el PIN si se proporciona
        status: 'active',
        createdAt: new Date(),
        lastLogin: null,
        authMethod: email ? 'email' : 'pin', // Indicar el método de autenticación
        userId: uid, // Usar el uid generado por Firebase Auth
      });
  
      return {
        success: true,
        userId: uid, // Devolver el uid generado
        staffId: staffRef.id, // ID del documento en la colección staff
        pin, // Devolver el PIN asignado
      };
    } catch (error) {
      console.error('Error creating staff member:', error);
      throw error;
    }
  }
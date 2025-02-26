// src/services/receptionNotificationsService.ts
import { 
  collection,
  query,
  where,
  updateDoc,
  doc,
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { STATE_NOTIFICATIONS } from '../lib/constants/room-states';

export const receptionNotificationsService = {
  async createStateChangeNotification(hotelId: string, {
    roomId,
    roomNumber,
    oldState,
    newState,
    details = {}
  }) {
    const notificationConfig = STATE_NOTIFICATIONS[newState];
    if (!notificationConfig) return;

    if (notificationConfig.targetRole === 'reception' || 
        (Array.isArray(notificationConfig.targetRole) && 
         notificationConfig.targetRole.includes('reception'))) {
      
      const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
      //Get all the users with the target role
      const staffRef = collection(db, 'hotels', hotelId, 'staff');
      const staffQuery = query(staffRef, where('role', '==', notificationConfig.targetRole));
      const staffSnapshot = await getDocs(staffQuery);
      const timestamp = Timestamp.now();
      
      const notificationPromises = staffSnapshot.docs.map(async (doc) => {
        const staffMember = doc.data();
        await addDoc(notificationsRef, {
          type: `state_change_${newState}`,
          roomId,
          roomNumber,
          message: notificationConfig.message,
          priority: notificationConfig.priority,
          details: {
            ...details,
            previousState: oldState,
            newState
          },
          timestamp: timestamp,
          status: 'unread',
          targetRole: notificationConfig.targetRole,
          targetStaffId: staffMember.id,
          createdAt: timestamp
        });
      });
      await Promise.all(notificationPromises);
    }
  },

  async markAsRead(hotelId: string, notificationId: string) {
    const notificationRef = doc(db, 'hotels', hotelId, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      status: 'read',
      readAt: serverTimestamp()
    });
  },

  async markAllAsRead(hotelId: string) {
    const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
    const q = query(
      notificationsRef,
      where('targetRole', '==', 'reception'),
      where('status', '==', 'unread')
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        status: 'read',
        readAt: serverTimestamp()
      })
    );

    await Promise.all(updatePromises);
  },

  async deleteOldNotifications(hotelId: string, daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const notificationsRef = collection(db, 'hotels', hotelId, 'notifications');
    const q = query(
      notificationsRef,
      where('timestamp', '<=', Timestamp.fromDate(cutoffDate)),
      where('status', '==', 'read')
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => updateDoc(doc.ref, { deleted: true }));
    await Promise.all(deletePromises);
  }
};

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BellRing } from "lucide-react"
import { RequestNotifications } from './RequestNotifications';

export function NotificationsDialog({ hotelId }) {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
      if (!hotelId) return;
   
      const requestsRef = collection(db, 'hotels', hotelId, 'requests');
      const q = query(requestsRef, where('status', '==', 'pending'));
   
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadCount(snapshot.docs.length);
      });
   
      return () => unsubscribe();
    }, [hotelId]);

 return (

   <Dialog>
     <DialogTrigger asChild>
       <Button variant="ghost" size="icon">
         <BellRing className="h-5 w-5" />
       </Button>
     </DialogTrigger>
     <DialogContent className="sm:max-w-[500px] h-[600px]">
        <DialogTitle>Notificaciones</DialogTitle>
       <RequestNotifications hotelId={hotelId} />
     </DialogContent>
   </Dialog>
 )
}
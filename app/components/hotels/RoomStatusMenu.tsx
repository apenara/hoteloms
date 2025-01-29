// src/components/hotels/RoomStatusMenu.tsx
'use client';

import { BedDouble, Check, Paintbrush, AlertTriangle, Clock, Moon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { updateDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

import { RoomStatus } from '@/lib/types';
import { ROOM_STATES } from '@/app/lib/constants/room-states';

interface RoomStatusMenuProps {
 habitacionId: string;
 hotelId: string;
 estadoActual: RoomStatus;
 onStatusChange: () => void;
 currentUser: any;
}

export function RoomStatusMenu({ habitacionId, hotelId, estadoActual, onStatusChange, currentUser }: RoomStatusMenuProps) {
 const handleStatusChange = async (newStatus: RoomStatus) => {
   try {
     const habitacionRef = doc(db, 'hotels', hotelId, 'rooms', habitacionId);
     const timestamp = new Date();

     await updateDoc(habitacionRef, {
       status: newStatus,
       lastStatusChange: timestamp,
       ...(newStatus.includes('cleaning') && { lastCleaning: timestamp })
     });

     const historyRef = collection(db, 'hotels', hotelId, 'rooms', habitacionId, 'history');
     await addDoc(historyRef, {
       previousStatus: estadoActual,
       newStatus,
       timestamp,
       userName: currentUser.name || 'Usuario',
       userId: currentUser.uid,
       notes: ''
     });

     onStatusChange();
   } catch (error) {
     console.error('Error:', error);
     alert('Error al cambiar el estado');
   }
 };

 const currentStatus = ROOM_STATES[estadoActual] || ROOM_STATES.available;
 const Icon = currentStatus.icon;

 return (
   <DropdownMenu>
     <DropdownMenuTrigger asChild>
       <Button 
         variant="outline" 
         size="sm"
         className="w-full justify-start"
         onClick={(e) => e.stopPropagation()}
       >
         <Icon className={`mr-2 h-4 w-4 ${currentStatus.color}`} />
         {currentStatus.label}
       </Button>
     </DropdownMenuTrigger>
     <DropdownMenuContent align="end">
       {Object.entries(ROOM_STATES).map(([status, config]) => {
         const StateIcon = config.icon;
         return (
           <DropdownMenuItem
             key={status}
             onClick={(e) => {
               e.stopPropagation();
               handleStatusChange(status as RoomStatus);
             }}
             className="cursor-pointer"
           >
             <StateIcon className={`mr-2 h-4 w-4 ${config.color}`} />
             {config.label}
           </DropdownMenuItem>
         );
       })}
     </DropdownMenuContent>
   </DropdownMenu>
 );
}
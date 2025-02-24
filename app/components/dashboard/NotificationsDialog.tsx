// src/components/dashboard/NotificationsDialog.tsx
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useReceptionNotifications } from "@/app/hooks/useReceptionNotifications";
import { RequestNotifications } from './RequestNotifications';

interface NotificationsDialogProps {
  hotelId: string;
}

export function NotificationsDialog({ hotelId }: NotificationsDialogProps) {
  const { unreadCount } = useReceptionNotifications(hotelId);

  return ( 
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-2 -right-2 px-2 py-1 bg-red-500 text-white rounded-full"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>Notificaciones</DialogTitle>
        <RequestNotifications hotelId={hotelId} />
      </DialogContent>
    </Dialog>
  );
}
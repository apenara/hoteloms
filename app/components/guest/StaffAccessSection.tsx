// app/components/guest/StaffAccessSection.tsx
import { Button } from '@/components/ui/button';

interface StaffAccessSectionProps {
  user: any;
  router: any;
  params: any;
  onPinAccess: () => void;
  onEmailAccess: () => void;
}

export function StaffAccessSection({ user, router, params, onPinAccess, onEmailAccess }: StaffAccessSectionProps) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={onPinAccess}
        >
          Acceso con PIN
        </Button>
        <Button
          variant="outline"
          onClick={onEmailAccess}
        >
          Acceso con Email
        </Button>
      </div>

      {user && (
        <Button
          className="w-full mt-4"
          variant="outline"
          onClick={() => router.push(`/rooms/${params.hotelId}/${params.roomId}/staff`)}
        >
          Acceder a Opciones del Personal
        </Button>
      )}
    </div>
  );
}
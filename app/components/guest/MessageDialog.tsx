// app/components/guest/MessageDialog.tsx
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface MessageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  setMessage: (message: string) => void;
  onSubmit: () => void;
}

export function MessageDialog({ isOpen, onClose, message, setMessage, onSubmit }: MessageDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar mensaje a recepción</DialogTitle>
          <DialogDescription>
            Escriba su mensaje y lo atenderemos lo antes posible
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="Escriba su mensaje aquí..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onSubmit}>
              Enviar Mensaje
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
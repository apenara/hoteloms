// app/components/common/ErrorView.tsx
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorViewProps {
  message: string;
}

export function ErrorView({ message }: ErrorViewProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Alert variant="destructive">
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </div>
  );
}
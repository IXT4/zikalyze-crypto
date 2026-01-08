import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface SessionTimeoutModalProps {
  open: boolean;
  remainingTime: number;
  onExtend: () => void;
}

const SessionTimeoutModal = ({
  open,
  remainingTime,
  onExtend,
}: SessionTimeoutModalProps) => {
  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="border-warning/50 bg-card">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/20">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <AlertDialogTitle className="text-center text-xl">
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your session will expire due to inactivity. You will be signed out
            in:
          </AlertDialogDescription>
          <div className="my-4 text-center">
            <span className="text-4xl font-bold text-warning">{timeDisplay}</span>
          </div>
          <AlertDialogDescription className="text-center text-sm">
            Click the button below to stay signed in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogAction
            onClick={onExtend}
            className="w-full bg-primary hover:bg-primary/90 sm:w-auto"
          >
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionTimeoutModal;

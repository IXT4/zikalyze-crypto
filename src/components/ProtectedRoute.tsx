import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import zikalyzeLogo from "@/assets/zikalyze-logo.png";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import SessionTimeoutModal from "@/components/SessionTimeoutModal";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  const handleTimeout = useCallback(async () => {
    await signOut();
    toast.info("You have been signed out due to inactivity");
    navigate("/");
  }, [signOut, navigate]);

  const { showWarning, remainingTime, extendSession } = useSessionTimeout({
    timeoutMs: 15 * 60 * 1000, // 15 minutes
    warningMs: 2 * 60 * 1000, // 2 minutes warning
    onTimeout: handleTimeout,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Return empty div with matching background during loading to prevent flash
  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) return null;

  return (
    <>
      {children}
      <SessionTimeoutModal
        open={showWarning}
        remainingTime={remainingTime}
        onExtend={extendSession}
      />
    </>
  );
};

export default ProtectedRoute;

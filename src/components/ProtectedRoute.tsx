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

  // Seamless loading with logo - matches index.html background exactly
  if (loading) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center"
        style={{ backgroundColor: '#0a0f1a' }}
      >
        <img 
          src={zikalyzeLogo} 
          alt="" 
          className="h-16 w-16 animate-pulse opacity-80"
        />
      </div>
    );
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

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface WalletSession {
  walletId: string;
  publicKey: string;
  name?: string;
  authenticatedAt: string;
}

const isSessionValid = (session: WalletSession | null): boolean => {
  if (!session?.authenticatedAt || !session?.publicKey || !session?.walletId) {
    return false;
  }
  
  const authTime = new Date(session.authenticatedAt).getTime();
  if (isNaN(authTime)) return false;
  
  const now = Date.now();
  return now - authTime < SESSION_DURATION;
};

const parseSession = (sessionStr: string | null): WalletSession | null => {
  if (!sessionStr) return null;
  
  try {
    const parsed = JSON.parse(sessionStr);
    // Validate required fields exist
    if (typeof parsed.walletId !== 'string' || 
        typeof parsed.publicKey !== 'string' || 
        typeof parsed.authenticatedAt !== 'string') {
      return null;
    }
    return parsed as WalletSession;
  } catch {
    return null;
  }
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(() => {
    const sessionStr = localStorage.getItem("wallet_session");
    const session = parseSession(sessionStr);
    
    if (!session || !isSessionValid(session)) {
      localStorage.removeItem("wallet_session");
      navigate("/login", { replace: true });
      return false;
    }
    
    // Refresh session timestamp to extend session on activity
    const refreshedSession = {
      ...session,
      authenticatedAt: new Date().toISOString()
    };
    localStorage.setItem("wallet_session", JSON.stringify(refreshedSession));
    
    return true;
  }, [navigate]);

  useEffect(() => {
    const isValid = checkSession();
    setIsAuthenticated(isValid);
    setIsLoading(false);
  }, [checkSession]);

  // Check session periodically (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      if (!checkSession()) {
        setIsAuthenticated(false);
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, checkSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
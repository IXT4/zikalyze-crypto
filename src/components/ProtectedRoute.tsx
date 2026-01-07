import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const isSessionValid = (session: any): boolean => {
  if (!session?.authenticatedAt || !session?.publicKey) return false;
  const authTime = new Date(session.authenticatedAt).getTime();
  const now = Date.now();
  return now - authTime < SESSION_DURATION;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = localStorage.getItem("wallet_session");
    
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      
      if (!isSessionValid(parsed)) {
        localStorage.removeItem("wallet_session");
        navigate("/login");
        return;
      }

      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem("wallet_session");
      navigate("/login");
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

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
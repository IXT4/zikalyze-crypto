import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ZikalyzeSplash from "@/components/ZikalyzeSplash";

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
    const checkAuth = async () => {
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

        // Quick transition
        await new Promise(resolve => setTimeout(resolve, 400));
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("wallet_session");
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  if (isLoading) {
    return <ZikalyzeSplash message="Loading your dashboard..." />;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
};

export default ProtectedRoute;
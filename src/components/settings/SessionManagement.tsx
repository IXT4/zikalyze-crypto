import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Monitor, Smartphone, Tablet, Globe, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { 
  listSessions, 
  revokeSession as revokeSessionClient, 
  revokeAllOtherSessions,
  type SessionInfo 
} from "@/lib/clientAuth";

export function SessionManagement() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const sessionList = await listSessions(user.id);
      setSessions(sessionList);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [user?.id]);

  const revokeSession = async (sessionId: string) => {
    if (!user?.id) return;
    
    setRevoking(sessionId);
    try {
      const success = await revokeSessionClient(user.id, sessionId);
      
      if (!success) {
        throw new Error("Cannot revoke current session");
      }
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success("Session revoked successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  const revokeAllSessions = async () => {
    if (!user?.id) return;
    
    setRevoking("all");
    try {
      await revokeAllOtherSessions(user.id);
      setSessions(prev => prev.filter(s => s.isCurrent));
      toast.success("All other sessions revoked");
    } catch (error) {
      toast.error("Failed to revoke sessions");
    } finally {
      setRevoking(null);
    }
  };

  const getDeviceIcon = (deviceInfo: string) => {
    const info = deviceInfo.toLowerCase();
    if (info.includes("android") || info.includes("iphone")) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (info.includes("ipad")) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const otherSessions = sessions.filter(s => !s.isCurrent);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage your active sessions across devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Manage your active sessions across devices. You have {sessions.length} active session{sessions.length !== 1 ? "s" : ""}.
            </CardDescription>
          </div>
          {otherSessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={revoking === "all"}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out all other
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Sign out all other sessions?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign you out from all other devices. Your current session will remain active.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={revokeAllSessions}>
                    Sign out all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {sessions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No active sessions found
          </p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                {getDeviceIcon(session.deviceInfo)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{session.deviceInfo}</span>
                  {session.isCurrent && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>Local Device</span>
                  <span>•</span>
                  <span>
                    Active {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
              
              {!session.isCurrent && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={revoking === session.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will sign out the device "{session.deviceInfo}" and require signing in again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => revokeSession(session.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Revoke
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

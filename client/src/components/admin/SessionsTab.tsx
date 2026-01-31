import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Users, User, Building2, Shield, LogOut, RefreshCw, Clock, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

interface UserInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

interface ActiveSession {
  sid: string;
  expire: string;
  userInfo: UserInfo | null;
  createdAt: string | null;
}

interface SessionsData {
  sessions: ActiveSession[];
  stats: {
    totalActive: number;
    byRole: Record<string, number>;
  };
}

export default function SessionsTab() {
  const { toast } = useToast();
  const [sessionToInvalidate, setSessionToInvalidate] = useState<ActiveSession | null>(null);

  const { data, isLoading, refetch } = useQuery<SessionsData>({
    queryKey: ["/api/admin/active-sessions"],
    refetchInterval: 30000,
  });

  const invalidateSessionMutation = useMutation({
    mutationFn: async (sid: string) => {
      return apiRequest("DELETE", `/api/admin/active-sessions/${sid}`);
    },
    onSuccess: () => {
      toast({ title: "Session invalidated", description: "The user has been logged out" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/active-sessions"] });
      setSessionToInvalidate(null);
    },
    onError: () => {
      toast({ title: "Failed to invalidate session", variant: "destructive" });
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><Shield className="h-3 w-3 mr-1" />Super Admin</Badge>;
      case 'partner_admin':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><Building2 className="h-3 w-3 mr-1" />Partner Admin</Badge>;
      case 'partner_team_member':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"><Users className="h-3 w-3 mr-1" />Team Member</Badge>;
      case 'candidate':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><User className="h-3 w-3 mr-1" />Candidate</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const sessions = data?.sessions || [];
  const stats = data?.stats || { totalActive: 0, byRole: {} };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white" data-testid="text-sessions-title">Active Sessions</h2>
          <p className="text-white/70">Monitor and manage user sessions</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="text-white border-white/30 hover:bg-white/10" data-testid="button-refresh-sessions">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-sessions">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.totalActive}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-admin-sessions">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.byRole?.super_admin || 0}
            </div>
            <p className="text-xs text-muted-foreground">Admin sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partners</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-partner-sessions">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats.byRole?.partner_admin || 0) + (stats.byRole?.partner_team_member || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Partner sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Candidates</CardTitle>
            <User className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-candidate-sessions">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.byRole?.candidate || 0}
            </div>
            <p className="text-xs text-muted-foreground">Candidate sessions</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session List</CardTitle>
          <CardDescription>All currently active authenticated sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No active sessions</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Session Started</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Session ID</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.sid} data-testid={`row-session-${session.sid.slice(0, 8)}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{session.userInfo?.email}</span>
                          {(session.userInfo?.firstName || session.userInfo?.lastName) && (
                            <span className="text-xs text-muted-foreground">
                              {[session.userInfo?.firstName, session.userInfo?.lastName].filter(Boolean).join(' ')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{session.userInfo && getRoleBadge(session.userInfo.role)}</TableCell>
                      <TableCell>
                        {session.createdAt ? (
                          <span className="text-sm text-muted-foreground" title={format(new Date(session.createdAt), 'PPpp')}>
                            {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground" title={format(new Date(session.expire), 'PPpp')}>
                            {formatDistanceToNow(new Date(session.expire), { addSuffix: true })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {session.sid.slice(0, 16)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setSessionToInvalidate(session)}
                          data-testid={`button-invalidate-session-${session.sid.slice(0, 8)}`}
                        >
                          <LogOut className="h-4 w-4 mr-1" />
                          Force Logout
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!sessionToInvalidate} onOpenChange={() => setSessionToInvalidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Logout User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately end the session for <strong>{sessionToInvalidate?.userInfo?.email}</strong>. 
              They will be logged out and will need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-invalidate">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToInvalidate && invalidateSessionMutation.mutate(sessionToInvalidate.sid)}
              className="bg-red-600 hover:bg-red-700"
              disabled={invalidateSessionMutation.isPending}
              data-testid="button-confirm-invalidate"
            >
              {invalidateSessionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Force Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

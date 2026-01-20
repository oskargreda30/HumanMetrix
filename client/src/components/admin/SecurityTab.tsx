import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Loader2, Shield, Bell, AlertTriangle, Ban, Send, Users, 
  Radio, Clock, Trash2, RefreshCw, Eye, Plus, X, Mail, MessageSquare
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, formatDistanceToNow } from "date-fns";

interface Announcement {
  enabled: boolean;
  message: string;
  type: "info" | "warning" | "error";
  dismissible: boolean;
  expiresAt?: string;
}

interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  type: string;
  targetAudience: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

interface ActiveSession {
  userId: string;
  email: string;
  role: string;
  lastActivity: string;
  ipAddress?: string;
  userAgent?: string;
}

interface SecurityAlerts {
  failedLogins24h: number;
  criticalErrors24h: number;
  securityEvents: any[];
  totalSecurityEvents7d: number;
}

export default function SecurityTab() {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState("announcement");
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [newIp, setNewIp] = useState("");
  
  const [announcement, setAnnouncement] = useState<Announcement>({
    enabled: false,
    message: "",
    type: "info",
    dismissible: true,
  });

  const [broadcast, setBroadcast] = useState({
    title: "",
    content: "",
    type: "email",
    targetAudience: "all_users",
  });

  const { data: announcementData, isLoading: announcementLoading } = useQuery<Announcement>({
    queryKey: ["/api/admin/security/announcement"],
  });

  const { data: broadcasts, isLoading: broadcastsLoading, refetch: refetchBroadcasts } = useQuery<BroadcastMessage[]>({
    queryKey: ["/api/admin/security/broadcasts"],
  });

  const { data: sessions, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery<ActiveSession[]>({
    queryKey: ["/api/admin/security/sessions"],
  });

  const { data: blockedIps, isLoading: blockedIpsLoading, refetch: refetchBlockedIps } = useQuery<string[]>({
    queryKey: ["/api/admin/security/blocked-ips"],
  });

  const { data: securityAlerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery<SecurityAlerts>({
    queryKey: ["/api/admin/security/alerts"],
  });

  // Initialize announcement from API data
  useState(() => {
    if (announcementData) {
      setAnnouncement(announcementData);
    }
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async (data: Announcement) => {
      return apiRequest("PUT", "/api/admin/security/announcement", data);
    },
    onSuccess: () => {
      toast({ title: "Announcement updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security/announcement"] });
    },
    onError: () => {
      toast({ title: "Failed to update announcement", variant: "destructive" });
    },
  });

  const createBroadcastMutation = useMutation({
    mutationFn: async (data: typeof broadcast) => {
      return apiRequest("POST", "/api/admin/security/broadcasts", data);
    },
    onSuccess: () => {
      toast({ title: "Broadcast created successfully" });
      setShowBroadcastDialog(false);
      setBroadcast({ title: "", content: "", type: "email", targetAudience: "all_users" });
      refetchBroadcasts();
    },
    onError: () => {
      toast({ title: "Failed to create broadcast", variant: "destructive" });
    },
  });

  const sendBroadcastMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/security/broadcasts/${id}/send`, {});
    },
    onSuccess: (_, id) => {
      toast({ title: "Broadcast sent successfully" });
      refetchBroadcasts();
    },
    onError: () => {
      toast({ title: "Failed to send broadcast", variant: "destructive" });
    },
  });

  const deleteBroadcastMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/security/broadcasts/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Broadcast deleted" });
      refetchBroadcasts();
    },
    onError: () => {
      toast({ title: "Failed to delete broadcast", variant: "destructive" });
    },
  });

  const updateBlockedIpsMutation = useMutation({
    mutationFn: async (ips: string[]) => {
      return apiRequest("PUT", "/api/admin/security/blocked-ips", { ips });
    },
    onSuccess: () => {
      toast({ title: "Blocked IPs updated" });
      refetchBlockedIps();
    },
    onError: () => {
      toast({ title: "Failed to update blocked IPs", variant: "destructive" });
    },
  });

  const handleAddBlockedIp = () => {
    if (!newIp.trim()) return;
    const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(newIp.trim())) {
      toast({ title: "Invalid IP address format", variant: "destructive" });
      return;
    }
    const currentIps = blockedIps || [];
    if (currentIps.includes(newIp.trim())) {
      toast({ title: "IP already blocked", variant: "destructive" });
      return;
    }
    updateBlockedIpsMutation.mutate([...currentIps, newIp.trim()]);
    setNewIp("");
  };

  const handleRemoveBlockedIp = (ip: string) => {
    const currentIps = blockedIps || [];
    updateBlockedIpsMutation.mutate(currentIps.filter(i => i !== ip));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500/10 text-green-600">Sent</Badge>;
      case "sending":
        return <Badge className="bg-blue-500/10 text-blue-600">Sending</Badge>;
      case "scheduled":
        return <Badge className="bg-yellow-500/10 text-yellow-600">Scheduled</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case "all_users": return "All Users";
      case "all_partners": return "All Partners";
      case "all_admins": return "All Admins";
      case "b2c_users": return "B2C Users";
      default: return audience;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyan-500" />
            Security & Communications
          </h2>
          <p className="text-white/70">Manage announcements, broadcasts, and security settings</p>
        </div>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList className="bg-white/10">
          <TabsTrigger value="announcement" data-testid="subtab-announcement" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
            <Bell className="h-4 w-4 mr-1" /> Announcement
          </TabsTrigger>
          <TabsTrigger value="broadcast" data-testid="subtab-broadcast" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
            <Radio className="h-4 w-4 mr-1" /> Broadcast
          </TabsTrigger>
          <TabsTrigger value="sessions" data-testid="subtab-sessions" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-1" /> Sessions
          </TabsTrigger>
          <TabsTrigger value="ip-blocking" data-testid="subtab-ip-blocking" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
            <Ban className="h-4 w-4 mr-1" /> IP Blocking
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="subtab-alerts" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
            <AlertTriangle className="h-4 w-4 mr-1" /> Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcement" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Site-Wide Announcement Banner</CardTitle>
              <CardDescription>Display a banner message to all users across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {announcementLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="announcement-enabled">Enable Announcement</Label>
                    <Switch
                      id="announcement-enabled"
                      checked={announcementData?.enabled || announcement.enabled}
                      onCheckedChange={(checked) => setAnnouncement(prev => ({ ...prev, enabled: checked }))}
                      data-testid="switch-announcement-enabled"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Banner Type</Label>
                    <Select 
                      value={announcementData?.type || announcement.type} 
                      onValueChange={(v: "info" | "warning" | "error") => setAnnouncement(prev => ({ ...prev, type: v }))}
                    >
                      <SelectTrigger data-testid="select-banner-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info (Blue)</SelectItem>
                        <SelectItem value="warning">Warning (Yellow)</SelectItem>
                        <SelectItem value="error">Critical (Red)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Enter your announcement message..."
                      value={announcementData?.message || announcement.message}
                      onChange={(e) => setAnnouncement(prev => ({ ...prev, message: e.target.value }))}
                      data-testid="input-announcement-message"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="announcement-dismissible">Allow users to dismiss</Label>
                    <Switch
                      id="announcement-dismissible"
                      checked={announcementData?.dismissible ?? announcement.dismissible}
                      onCheckedChange={(checked) => setAnnouncement(prev => ({ ...prev, dismissible: checked }))}
                      data-testid="switch-dismissible"
                    />
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={() => updateAnnouncementMutation.mutate(announcement)}
                      disabled={updateAnnouncementMutation.isPending}
                      data-testid="button-save-announcement"
                    >
                      {updateAnnouncementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Announcement Settings
                    </Button>
                  </div>

                  {(announcementData?.enabled || announcement.enabled) && announcement.message && (
                    <Alert className={`mt-4 ${
                      announcement.type === "error" ? "border-red-500 bg-red-50 dark:bg-red-900/20" :
                      announcement.type === "warning" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20" :
                      "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    }`}>
                      <AlertDescription className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        <span>Preview: {announcement.message}</span>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Broadcast Messages</CardTitle>
                <CardDescription>Send mass notifications or emails to users</CardDescription>
              </div>
              <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-broadcast">
                    <Plus className="h-4 w-4 mr-2" /> New Broadcast
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Broadcast Message</DialogTitle>
                    <DialogDescription>Send a message to multiple users at once</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        placeholder="Broadcast title..."
                        value={broadcast.title}
                        onChange={(e) => setBroadcast(prev => ({ ...prev, title: e.target.value }))}
                        data-testid="input-broadcast-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        placeholder="Enter your message..."
                        value={broadcast.content}
                        onChange={(e) => setBroadcast(prev => ({ ...prev, content: e.target.value }))}
                        className="min-h-[120px]"
                        data-testid="input-broadcast-content"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Delivery Method</Label>
                      <Select value={broadcast.type} onValueChange={(v) => setBroadcast(prev => ({ ...prev, type: v }))}>
                        <SelectTrigger data-testid="select-broadcast-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email"><Mail className="h-4 w-4 inline mr-2" />Email Only</SelectItem>
                          <SelectItem value="notification"><MessageSquare className="h-4 w-4 inline mr-2" />In-App Only</SelectItem>
                          <SelectItem value="both"><Bell className="h-4 w-4 inline mr-2" />Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <Select value={broadcast.targetAudience} onValueChange={(v) => setBroadcast(prev => ({ ...prev, targetAudience: v }))}>
                        <SelectTrigger data-testid="select-broadcast-audience">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_users">All Users</SelectItem>
                          <SelectItem value="all_partners">All Partners</SelectItem>
                          <SelectItem value="all_admins">All Admins</SelectItem>
                          <SelectItem value="b2c_users">B2C Users Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowBroadcastDialog(false)}>Cancel</Button>
                    <Button 
                      onClick={() => createBroadcastMutation.mutate(broadcast)}
                      disabled={createBroadcastMutation.isPending || !broadcast.title || !broadcast.content}
                      data-testid="button-create-broadcast"
                    >
                      {createBroadcastMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Broadcast
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {broadcastsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : broadcasts && broadcasts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {b.type === "email" ? <Mail className="h-3 w-3 mr-1" /> : 
                             b.type === "notification" ? <MessageSquare className="h-3 w-3 mr-1" /> :
                             <Bell className="h-3 w-3 mr-1" />}
                            {b.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{getAudienceLabel(b.targetAudience)}</TableCell>
                        <TableCell>{getStatusBadge(b.status)}</TableCell>
                        <TableCell>
                          {b.status === "sent" ? (
                            <span className="text-sm">
                              {b.successCount}/{b.recipientCount}
                              {b.failureCount > 0 && <span className="text-red-500 ml-1">({b.failureCount} failed)</span>}
                            </span>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(b.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {b.status === "draft" && (
                              <Button 
                                size="sm" 
                                onClick={() => sendBroadcastMutation.mutate(b.id)}
                                disabled={sendBroadcastMutation.isPending}
                                data-testid={`button-send-broadcast-${b.id}`}
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteBroadcastMutation.mutate(b.id)}
                              disabled={deleteBroadcastMutation.isPending}
                              data-testid={`button-delete-broadcast-${b.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No broadcast messages yet. Create one to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>Recent user activity in the last 24 hours</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchSessions()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : sessions && sessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{session.email || session.userId}</TableCell>
                        <TableCell>
                          <Badge variant={session.role === "super_admin" ? "default" : "secondary"}>
                            {session.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {session.lastActivity ? formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true }) : "-"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{session.ipAddress || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active sessions found in the last 24 hours.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ip-blocking" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>IP Blocking</CardTitle>
              <CardDescription>Block suspicious IP addresses from accessing the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter IP address (e.g., 192.168.1.1)"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  data-testid="input-new-ip"
                />
                <Button 
                  onClick={handleAddBlockedIp}
                  disabled={updateBlockedIpsMutation.isPending}
                  data-testid="button-add-ip"
                >
                  <Plus className="h-4 w-4 mr-2" /> Block IP
                </Button>
              </div>

              {blockedIpsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : blockedIps && blockedIps.length > 0 ? (
                <div className="space-y-2">
                  <Label>Blocked IPs ({blockedIps.length})</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    {blockedIps.map((ip) => (
                      <div key={ip} className="flex items-center justify-between py-2 border-b last:border-0">
                        <span className="font-mono">{ip}</span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleRemoveBlockedIp(ip)}
                          data-testid={`button-unblock-${ip}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No blocked IP addresses. The platform is open to all IPs.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Failed Logins (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{securityAlerts?.failedLogins24h || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Critical Errors (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500">{securityAlerts?.criticalErrors24h || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Security Events (7d)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{securityAlerts?.totalSecurityEvents7d || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Security Events</CardTitle>
                <CardDescription>Login attempts, role changes, and security-related actions</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchAlerts()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                </div>
              ) : securityAlerts?.securityEvents && securityAlerts.securityEvents.length > 0 ? (
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {securityAlerts.securityEvents.map((event: any) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Badge variant={
                              event.action === "login_failed" ? "destructive" :
                              event.action === "role_changed" ? "default" :
                              "secondary"
                            }>
                              {event.action.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{event.userId || "-"}</TableCell>
                          <TableCell className="text-sm font-mono">{event.ipAddress || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {event.createdAt ? formatDistanceToNow(new Date(event.createdAt), { addSuffix: true }) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No security events in the last 7 days.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

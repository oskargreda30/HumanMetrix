import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mail, CheckCircle, XCircle, AlertCircle, RefreshCw, Search, Eye, Send, Users, Building2, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface EmailLog {
  id: string;
  recipientEmail: string;
  recipientName: string | null;
  recipientType: string;
  subject: string;
  emailType: string;
  provider: string;
  status: string;
  messageId: string | null;
  error: string | null;
  metadata: Record<string, any> | null;
  sentAt: string;
}

interface EmailStats {
  total: number;
  sent24h: number;
  failed24h: number;
  byType: Array<{ type: string; count: number }>;
  byRecipientType: Array<{ recipientType: string; count: number }>;
}

type RecipientTypeFilter = 'all' | 'partner' | 'b2b_test_taker' | 'b2c_customer' | 'super_admin';
type StatusFilter = 'all' | 'sent' | 'failed' | 'bounced';

export default function EmailLogsTab() {
  const [recipientTypeFilter, setRecipientTypeFilter] = useState<RecipientTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emailTypeFilter, setEmailTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<EmailStats>({
    queryKey: ["/api/admin/email-logs/stats"],
  });

  const buildQueryUrl = () => {
    const params = new URLSearchParams();
    if (recipientTypeFilter !== 'all') params.set('recipientType', recipientTypeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (emailTypeFilter !== 'all') params.set('emailType', emailTypeFilter);
    if (searchQuery) params.set('search', searchQuery);
    params.set('limit', '100');
    const qs = params.toString();
    return `/api/admin/email-logs${qs ? '?' + qs : ''}`;
  };

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{ logs: EmailLog[]; total: number }>({
    queryKey: [buildQueryUrl()],
  });

  const logs = logsData?.logs || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'bounced':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"><AlertCircle className="h-3 w-3 mr-1" />Bounced</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRecipientTypeBadge = (type: string) => {
    switch (type) {
      case 'partner':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Building2 className="h-3 w-3 mr-1" />Partner</Badge>;
      case 'b2b_test_taker':
        return <Badge variant="outline" className="border-purple-500 text-purple-600"><Users className="h-3 w-3 mr-1" />B2B</Badge>;
      case 'b2c_customer':
        return <Badge variant="outline" className="border-green-500 text-green-600"><User className="h-3 w-3 mr-1" />B2C</Badge>;
      case 'super_admin':
        return <Badge variant="outline" className="border-red-500 text-red-600"><User className="h-3 w-3 mr-1" />Admin</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatEmailType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleRefresh = () => {
    refetchStats();
    refetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-email-logs-title">Email Logs</h2>
          <p className="text-muted-foreground">Track all emails sent from the platform</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-emails">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-emails">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.total ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent (24h)</CardTitle>
            <Send className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-sent-24h">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.sent24h ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed (24h)</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-failed-24h">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats?.failed24h ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Recipient</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1" data-testid="text-by-recipient">
              {statsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                stats?.byRecipientType?.slice(0, 3).map((item) => (
                  <Badge key={item.recipientType} variant="secondary" className="text-xs">
                    {item.recipientType}: {item.count}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email History</CardTitle>
          <CardDescription>Filter and search through sent emails</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
                data-testid="input-search-emails"
              />
            </div>

            <Select value={recipientTypeFilter} onValueChange={(v) => setRecipientTypeFilter(v as RecipientTypeFilter)}>
              <SelectTrigger className="w-40" data-testid="select-recipient-type">
                <SelectValue placeholder="Recipient Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipients</SelectItem>
                <SelectItem value="partner">Partners</SelectItem>
                <SelectItem value="b2b_test_taker">B2B Test Takers</SelectItem>
                <SelectItem value="b2c_customer">B2C Customers</SelectItem>
                <SelectItem value="super_admin">Super Admins</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-32" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
              </SelectContent>
            </Select>

            <Select value={emailTypeFilter} onValueChange={setEmailTypeFilter}>
              <SelectTrigger className="w-40" data-testid="select-email-type">
                <SelectValue placeholder="Email Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invitation">Invitation</SelectItem>
                <SelectItem value="results">Results</SelectItem>
                <SelectItem value="welcome">Welcome</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="password_reset">Password Reset</SelectItem>
                <SelectItem value="low_credits">Low Credits</SelectItem>
                <SelectItem value="payment_receipt">Payment Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No emails found matching your filters</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Email Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-email-${log.id}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium truncate max-w-[200px]">{log.recipientEmail}</span>
                          {log.recipientName && (
                            <span className="text-xs text-muted-foreground">{log.recipientName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRecipientTypeBadge(log.recipientType)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{formatEmailType(log.emailType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{log.provider}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground" title={format(new Date(log.sentAt), 'PPpp')}>
                          {formatDistanceToNow(new Date(log.sentAt), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedEmail(log)}
                          data-testid={`button-view-email-${log.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {logsData && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {logs.length} of {logsData.total} emails
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email Details</DialogTitle>
            <DialogDescription>
              Full details for this email
            </DialogDescription>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recipient</label>
                  <p className="font-medium">{selectedEmail.recipientEmail}</p>
                  {selectedEmail.recipientName && (
                    <p className="text-sm text-muted-foreground">{selectedEmail.recipientName}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recipient Type</label>
                  <div className="mt-1">{getRecipientTypeBadge(selectedEmail.recipientType)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Subject</label>
                <p className="font-medium">{selectedEmail.subject}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Type</label>
                  <div className="mt-1">
                    <Badge variant="outline">{formatEmailType(selectedEmail.emailType)}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Provider</label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="capitalize">{selectedEmail.provider}</Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Sent At</label>
                <p>{format(new Date(selectedEmail.sentAt), 'PPpp')}</p>
              </div>

              {selectedEmail.messageId && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Message ID</label>
                  <p className="text-xs font-mono break-all">{selectedEmail.messageId}</p>
                </div>
              )}

              {selectedEmail.error && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Error</label>
                  <p className="text-sm text-red-600 dark:text-red-400">{selectedEmail.error}</p>
                </div>
              )}

              {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Metadata</label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedEmail.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

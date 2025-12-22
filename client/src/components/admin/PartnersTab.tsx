import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Key, Trash2, Copy, Eye, EyeOff, Building2, Zap, AlertTriangle, Search, ArrowUpDown, Activity, CreditCard, BarChart3, Calendar, ChevronLeft, Package, AlertCircle, RefreshCw, History } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Partner {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  monthlyQuota: number | null;
  pricePerAssessment: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  isActive: boolean;
  createdAt: string;
  currentMonthSessions: number;
  totalTestsCompleted: number;
  currentMonthBillable: number;
  activeApiKeys: number;
  totalApiKeys: number;
  lastApiActivity: string | null;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHint: string;
  environment: string;
  permissions: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  fullKey?: string;
}

interface UsageEvent {
  id: string;
  eventType: string;
  assessmentType: string | null;
  billable: boolean;
  billedAmount: number | null;
  createdAt: string;
}

interface PartnerUsage {
  period: { start: string; end: string };
  summary: { eventType: string; count: number; totalAmount: number }[];
  recentEvents: UsageEvent[];
}

interface PartnerQuota {
  testsPurchased: number;
  testsConsumed: number;
  remaining: number;
  usagePercentage: number;
  isSuspended: boolean;
  last70NoticeAt: string | null;
  last90NoticeAt: string | null;
  apiAccessSuspendedAt: string | null;
}

interface QuotaLedgerEntry {
  id: string;
  transactionType: string;
  quantity: number;
  balanceAfter: number;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface TestPackage {
  id: string;
  partnerId: string;
  packageSize: number;
  pricePerTest: number;
  totalPrice: number;
  stripeSessionId: string | null;
  status: string;
  purchasedAt: string | null;
  createdAt: string;
}

type SortField = "name" | "currentMonthSessions" | "totalTestsCompleted" | "currentMonthBillable" | "createdAt";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";

export default function PartnersTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [detailPartner, setDetailPartner] = useState<Partner | null>(null);
  const [newKeyData, setNewKeyData] = useState<ApiKey | null>(null);
  const [showFullKey, setShowFullKey] = useState(false);
  
  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("currentMonthSessions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("");

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/admin/partners"],
  });
  
  // Fetch organizations for linking partner accounts
  const { data: organizations } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/admin/organizations"],
  });

  const { data: partnerKeys, isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/partners", selectedPartner?.id, "keys"],
    enabled: !!selectedPartner,
  });

  const { data: partnerUsage, isLoading: usageLoading } = useQuery<PartnerUsage>({
    queryKey: ["/api/admin/partners", detailPartner?.id, "usage"],
    enabled: !!detailPartner,
  });

  const { data: partnerQuota, isLoading: quotaLoading, refetch: refetchQuota } = useQuery<PartnerQuota>({
    queryKey: ["/api/admin/partners", detailPartner?.id, "quota"],
    enabled: !!detailPartner,
  });

  const { data: quotaLedger, isLoading: ledgerLoading } = useQuery<QuotaLedgerEntry[]>({
    queryKey: ["/api/admin/partners", detailPartner?.id, "ledger"],
    enabled: !!detailPartner,
  });

  const { data: testPackages, isLoading: packagesLoading } = useQuery<TestPackage[]>({
    queryKey: ["/api/admin/partners", detailPartner?.id, "packages"],
    enabled: !!detailPartner,
  });

  // Filtered and sorted partners
  const filteredPartners = useMemo(() => {
    if (!partners) return [];
    
    let result = [...partners];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.companyName?.toLowerCase().includes(query)) ||
        p.email.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(p => statusFilter === "active" ? p.isActive : !p.isActive);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "currentMonthSessions":
          comparison = a.currentMonthSessions - b.currentMonthSessions;
          break;
        case "totalTestsCompleted":
          comparison = a.totalTestsCompleted - b.totalTestsCompleted;
          break;
        case "currentMonthBillable":
          comparison = a.currentMonthBillable - b.currentMonthBillable;
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [partners, searchQuery, statusFilter, sortField, sortDirection]);

  const createPartnerMutation = useMutation({
    mutationFn: async (data: { name: string; companyName: string; email: string; pricePerAssessment: number; organizationId?: string }) => {
      const res = await apiRequest("POST", "/api/admin/partners", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setIsCreateOpen(false);
      setSelectedOrganizationId("");
      toast({ title: "Partner created", description: "New partner account has been created." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create partner", variant: "destructive" });
    },
  });

  const createKeyMutation = useMutation({
    mutationFn: async (data: { partnerId: string; name: string; environment: string }) => {
      const res = await apiRequest("POST", `/api/admin/partners/${data.partnerId}/keys`, data);
      return res.json() as Promise<ApiKey>;
    },
    onSuccess: (data: ApiKey) => {
      setNewKeyData(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", selectedPartner?.id, "keys"] });
      toast({ title: "API key created", description: "Save the key now - it won't be shown again!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create key", variant: "destructive" });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (data: { partnerId: string; keyId: string }) => {
      const res = await apiRequest("DELETE", `/api/admin/partners/${data.partnerId}/keys/${data.keyId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", selectedPartner?.id, "keys"] });
      toast({ title: "Key revoked", description: "API key has been permanently revoked." });
    },
  });

  const togglePartnerMutation = useMutation({
    mutationFn: async (data: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/partners/${data.id}`, { isActive: data.isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
    },
  });

  const [creditAmount, setCreditAmount] = useState(10);
  const [creditReason, setCreditReason] = useState("");

  const manualCreditMutation = useMutation({
    mutationFn: async (data: { partnerId: string; quantity: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/partners/${data.partnerId}/credit`, { quantity: data.quantity, reason: data.reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", detailPartner?.id, "quota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", detailPartner?.id, "ledger"] });
      setCreditAmount(10);
      setCreditReason("");
      toast({ title: "Credits added", description: `${creditAmount} test credits added successfully.` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add credits", variant: "destructive" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const res = await apiRequest("POST", `/api/admin/partners/${partnerId}/reactivate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", detailPartner?.id, "quota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      toast({ title: "Partner reactivated", description: "API access has been restored." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reactivate partner", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "API key copied to clipboard" });
  };

  const handleCreatePartner = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPartnerMutation.mutate({
      name: formData.get("name") as string,
      companyName: formData.get("companyName") as string,
      email: formData.get("email") as string,
      pricePerAssessment: parseInt(formData.get("pricePerAssessment") as string) || 500,
      organizationId: selectedOrganizationId || undefined,
    });
  };

  const handleCreateKey = (environment: string) => {
    if (!selectedPartner) return;
    const name = environment === "live" ? "Production Key" : "Test Key";
    createKeyMutation.mutate({ partnerId: selectedPartner.id, name, environment });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Show detail view if a partner is selected
  if (detailPartner) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setDetailPartner(null)} className="text-white hover:bg-white/10" data-testid="button-back-to-partners">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Partners
          </Button>
        </div>

        <Card className="bg-white/10 border-white/20">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-white text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                  {detailPartner.companyName || detailPartner.name}
                </CardTitle>
                <CardDescription className="text-white/70 mt-1">
                  {detailPartner.email}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={detailPartner.isActive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}>
                  {detailPartner.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setSelectedPartner(detailPartner)} className="bg-white/10 border-white/30 text-white hover:bg-white/20" data-testid="button-manage-api-keys">
                  <Key className="h-4 w-4 mr-1" />
                  Manage API Keys
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-1">This Month</div>
                <div className="text-2xl font-bold text-white">{detailPartner.currentMonthSessions}</div>
                <div className="text-white/50 text-xs">tests completed</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-1">All Time</div>
                <div className="text-2xl font-bold text-white">{detailPartner.totalTestsCompleted}</div>
                <div className="text-white/50 text-xs">tests completed</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-1">Monthly Billable</div>
                <div className="text-2xl font-bold text-cyan-400">{formatCurrency(detailPartner.currentMonthBillable)}</div>
                <div className="text-white/50 text-xs">this period</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-1">API Keys</div>
                <div className="text-2xl font-bold text-white">{detailPartner.activeApiKeys}<span className="text-white/40">/{detailPartner.totalApiKeys}</span></div>
                <div className="text-white/50 text-xs">active</div>
              </div>
            </div>

            <Tabs defaultValue="activity" className="w-full">
              <TabsList className="bg-white/10 mb-4">
                <TabsTrigger value="activity" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
                  <Activity className="h-4 w-4 mr-2" />
                  Recent Activity
                </TabsTrigger>
                <TabsTrigger value="quota" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
                  <Package className="h-4 w-4 mr-2" />
                  Test Quota
                </TabsTrigger>
                <TabsTrigger value="billing" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                {usageLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
                ) : partnerUsage?.recentEvents && partnerUsage.recentEvents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/20">
                        <TableHead className="text-white/70">Event</TableHead>
                        <TableHead className="text-white/70">Assessment</TableHead>
                        <TableHead className="text-white/70">Billable</TableHead>
                        <TableHead className="text-white/70">Amount</TableHead>
                        <TableHead className="text-white/70">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partnerUsage.recentEvents.slice(0, 20).map((event) => (
                        <TableRow key={event.id} className="border-white/10">
                          <TableCell className="text-white">
                            <Badge variant="outline" className="border-white/30 text-white/80">
                              {event.eventType.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white/80">{event.assessmentType || "-"}</TableCell>
                          <TableCell>
                            {event.billable ? (
                              <Badge className="bg-green-500/20 text-green-300">Yes</Badge>
                            ) : (
                              <Badge className="bg-white/10 text-white/50">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-white/80">
                            {event.billedAmount ? formatCurrency(event.billedAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">{formatDate(event.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-white/50">
                    <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>No recent activity</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="quota">
                {quotaLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
                ) : (
                  <div className="space-y-6">
                    {/* Quota Status */}
                    {partnerQuota?.isSuspended && (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                        <div className="flex-1">
                          <div className="text-red-300 font-medium">API Access Suspended</div>
                          <div className="text-red-400/80 text-sm">This partner's API access has been suspended due to quota exhaustion. Add test credits or reactivate to restore access.</div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => reactivateMutation.mutate(detailPartner.id)}
                          disabled={reactivateMutation.isPending}
                          className="border-red-400 text-red-300 hover:bg-red-500/20"
                          data-testid="button-reactivate-partner"
                        >
                          {reactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                          Reactivate
                        </Button>
                      </div>
                    )}

                    {/* Quota Overview Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/60 text-sm mb-1">Tests Purchased</div>
                        <div className="text-2xl font-bold text-white">{partnerQuota?.testsPurchased || 0}</div>
                        <div className="text-white/50 text-xs">total credits</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/60 text-sm mb-1">Tests Consumed</div>
                        <div className="text-2xl font-bold text-amber-400">{partnerQuota?.testsConsumed || 0}</div>
                        <div className="text-white/50 text-xs">used so far</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/60 text-sm mb-1">Remaining</div>
                        <div className="text-2xl font-bold text-green-400">{partnerQuota?.remaining || 0}</div>
                        <div className="text-white/50 text-xs">available tests</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/60 text-sm mb-1">Usage</div>
                        <div className="text-2xl font-bold text-cyan-400">{partnerQuota?.usagePercentage || 0}%</div>
                        <div className="text-white/50 text-xs">of quota</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-white/80 font-medium">Quota Usage</div>
                        <div className="text-sm text-white/60">{partnerQuota?.testsConsumed || 0} / {partnerQuota?.testsPurchased || 0} tests</div>
                      </div>
                      <Progress 
                        value={partnerQuota?.usagePercentage || 0} 
                        className="h-3"
                      />
                      <div className="flex justify-between mt-2 text-xs text-white/50">
                        <span>0%</span>
                        <span className="text-amber-400">70% Warning</span>
                        <span className="text-red-400">90% Critical</span>
                        <span>100%</span>
                      </div>
                    </div>

                    {/* Manual Credit Form */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/80 font-medium mb-4">Add Manual Credits</div>
                      <div className="flex items-end gap-4">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="creditAmount" className="text-white/70">Number of Tests</Label>
                          <Input 
                            id="creditAmount"
                            type="number" 
                            min={1}
                            value={creditAmount}
                            onChange={(e) => setCreditAmount(parseInt(e.target.value) || 1)}
                            className="bg-slate-800 border-slate-600"
                            data-testid="input-credit-amount"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="creditReason" className="text-white/70">Reason</Label>
                          <Input 
                            id="creditReason"
                            value={creditReason}
                            onChange={(e) => setCreditReason(e.target.value)}
                            placeholder="e.g., Promotional credit"
                            className="bg-slate-800 border-slate-600"
                            data-testid="input-credit-reason"
                          />
                        </div>
                        <Button 
                          onClick={() => manualCreditMutation.mutate({ 
                            partnerId: detailPartner.id, 
                            quantity: creditAmount, 
                            reason: creditReason || "Manual admin credit" 
                          })}
                          disabled={manualCreditMutation.isPending || creditAmount < 1}
                          data-testid="button-add-credit"
                        >
                          {manualCreditMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                          Add Credits
                        </Button>
                      </div>
                    </div>

                    {/* Quota Ledger */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <History className="h-5 w-5 text-cyan-400" />
                        <div className="text-white/80 font-medium">Quota Ledger</div>
                      </div>
                      {ledgerLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-cyan-400" /></div>
                      ) : quotaLedger && quotaLedger.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/20">
                              <TableHead className="text-white/70">Date</TableHead>
                              <TableHead className="text-white/70">Type</TableHead>
                              <TableHead className="text-white/70">Quantity</TableHead>
                              <TableHead className="text-white/70">Balance After</TableHead>
                              <TableHead className="text-white/70">Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotaLedger.slice(0, 20).map((entry) => (
                              <TableRow key={entry.id} className="border-white/10">
                                <TableCell className="text-white/60 text-sm">{formatDate(entry.createdAt)}</TableCell>
                                <TableCell>
                                  <Badge className={entry.transactionType === 'credit' ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}>
                                    {entry.transactionType}
                                  </Badge>
                                </TableCell>
                                <TableCell className={entry.quantity >= 0 ? "text-green-400" : "text-red-400"}>
                                  {entry.quantity >= 0 ? "+" : ""}{entry.quantity}
                                </TableCell>
                                <TableCell className="text-white/80">{entry.balanceAfter}</TableCell>
                                <TableCell className="text-white/60 text-sm">{entry.description || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-6 text-white/50">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>No quota transactions yet</p>
                        </div>
                      )}
                    </div>

                    {/* Package Purchase History */}
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Package className="h-5 w-5 text-cyan-400" />
                        <div className="text-white/80 font-medium">Test Package Purchases</div>
                      </div>
                      {packagesLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-cyan-400" /></div>
                      ) : testPackages && testPackages.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-white/20">
                              <TableHead className="text-white/70">Date</TableHead>
                              <TableHead className="text-white/70">Package Size</TableHead>
                              <TableHead className="text-white/70">Price/Test</TableHead>
                              <TableHead className="text-white/70">Total</TableHead>
                              <TableHead className="text-white/70">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {testPackages.map((pkg) => (
                              <TableRow key={pkg.id} className="border-white/10">
                                <TableCell className="text-white/60 text-sm">{formatDate(pkg.purchasedAt || pkg.createdAt)}</TableCell>
                                <TableCell className="text-white/80 font-medium">{pkg.packageSize} tests</TableCell>
                                <TableCell className="text-white/80">{formatCurrency(pkg.pricePerTest)}</TableCell>
                                <TableCell className="text-cyan-400 font-medium">{formatCurrency(pkg.totalPrice)}</TableCell>
                                <TableCell>
                                  <Badge className={
                                    pkg.status === 'completed' ? "bg-green-500/20 text-green-300" :
                                    pkg.status === 'pending' ? "bg-amber-500/20 text-amber-300" :
                                    "bg-red-500/20 text-red-300"
                                  }>
                                    {pkg.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-6 text-white/50">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p>No test packages purchased yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="billing">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm mb-1">Price Per Assessment</div>
                      <div className="text-xl font-bold text-white">{formatCurrency(detailPartner.pricePerAssessment)}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm mb-1">Monthly Quota</div>
                      <div className="text-xl font-bold text-white">{detailPartner.monthlyQuota || "Unlimited"}</div>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-2">Stripe Integration</div>
                    {detailPartner.stripeCustomerId ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500/20 text-green-300">Connected</Badge>
                          <span className="text-white/60 text-sm font-mono">{detailPartner.stripeCustomerId}</span>
                        </div>
                        {detailPartner.stripeSubscriptionId && (
                          <div className="text-white/60 text-sm">
                            Subscription: <span className="font-mono">{detailPartner.stripeSubscriptionId}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-300">Not Connected</Badge>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">Partner Status</div>
                        <div className="text-white/60 text-sm">Enable or disable this partner account</div>
                      </div>
                      <Switch
                        checked={detailPartner.isActive}
                        onCheckedChange={(checked) => {
                          togglePartnerMutation.mutate({ id: detailPartner.id, isActive: checked });
                          setDetailPartner({ ...detailPartner, isActive: checked });
                        }}
                        data-testid="switch-partner-status"
                      />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-2">Account Details</div>
                    <div className="space-y-2 text-white/80">
                      <div>Contact: {detailPartner.name}</div>
                      <div>Company: {detailPartner.companyName || "-"}</div>
                      <div>Email: {detailPartner.email}</div>
                      <div>Created: {formatDate(detailPartner.createdAt)}</div>
                      <div>Last API Activity: {formatDate(detailPartner.lastApiActivity)}</div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* API Keys Dialog */}
        <Dialog open={!!selectedPartner} onOpenChange={() => { setSelectedPartner(null); setNewKeyData(null); }}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-cyan-400" />
                API Keys for {selectedPartner?.companyName || selectedPartner?.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400">Manage API keys for this partner's integrations.</DialogDescription>
            </DialogHeader>

            {newKeyData?.fullKey && (
              <Card className="bg-amber-900/30 border-amber-500/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-300">Save this API key now!</p>
                      <p className="text-sm text-amber-400/80">It will not be displayed again.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-800 p-3 rounded font-mono text-sm">
                    <code className="flex-1 break-all" data-testid="text-new-api-key">{showFullKey ? newKeyData.fullKey : "•".repeat(40) + newKeyData.fullKey.slice(-4)}</code>
                    <Button variant="ghost" size="sm" onClick={() => setShowFullKey(!showFullKey)} data-testid="button-toggle-key-visibility">
                      {showFullKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(newKeyData.fullKey!)} data-testid="button-copy-key">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 mb-4">
              <Button variant="outline" onClick={() => handleCreateKey("test")} disabled={createKeyMutation.isPending} className="bg-slate-800 border-slate-600 hover:bg-slate-700" data-testid="button-create-test-key">
                <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                Create Test Key
              </Button>
              <Button variant="outline" onClick={() => handleCreateKey("live")} disabled={createKeyMutation.isPending} className="bg-slate-800 border-slate-600 hover:bg-slate-700" data-testid="button-create-live-key">
                <Zap className="h-4 w-4 mr-2 text-green-400" />
                Create Live Key
              </Button>
            </div>

            {keysLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : partnerKeys && partnerKeys.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Key</TableHead>
                    <TableHead className="text-slate-400">Environment</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Last Used</TableHead>
                    <TableHead className="text-slate-400"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partnerKeys.map((key) => (
                    <TableRow key={key.id} className="border-slate-700/50">
                      <TableCell className="text-white">{key.name}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-400">{key.keyPrefix}...{key.keyHint}</TableCell>
                      <TableCell>
                        <Badge className={key.environment === "live" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}>
                          {key.environment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={key.isActive ? "bg-cyan-500/20 text-cyan-300" : "bg-red-500/20 text-red-300"}>
                          {key.isActive ? "Active" : "Revoked"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}</TableCell>
                      <TableCell>
                        {key.isActive && (
                          <Button variant="ghost" size="sm" onClick={() => revokeKeyMutation.mutate({ partnerId: selectedPartner!.id, keyId: key.id })} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`button-revoke-key-${key.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Key className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>No API keys yet. Create a test or live key above.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/10 border-white/20">
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-400" />
              B2B Partners
            </CardTitle>
            <CardDescription className="text-white/70">
              Manage enterprise partners who embed assessments on their platforms
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" data-testid="button-create-partner">
                <Plus className="h-4 w-4 mr-2" />
                Add Partner
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Create Partner Account</DialogTitle>
                <DialogDescription className="text-slate-400">Add a new enterprise partner for B2B integrations.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePartner} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Contact Name</Label>
                  <Input id="name" name="name" required className="bg-slate-800 border-slate-600" data-testid="input-partner-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" name="companyName" className="bg-slate-800 border-slate-600" data-testid="input-partner-company" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required className="bg-slate-800 border-slate-600" data-testid="input-partner-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerAssessment">Price Per Assessment (pence)</Label>
                  <Input id="pricePerAssessment" name="pricePerAssessment" type="number" defaultValue={500} className="bg-slate-800 border-slate-600" data-testid="input-partner-price" />
                  <p className="text-xs text-slate-400">500 pence = £5.00</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationId">Link to Organisation (Optional)</Label>
                  <Select value={selectedOrganizationId} onValueChange={setSelectedOrganizationId}>
                    <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-partner-organization">
                      <SelectValue placeholder="Select an organisation..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="" className="text-slate-400">None</SelectItem>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id} className="text-white">
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">Linking allows org admins to view their partner usage in the dashboard</p>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createPartnerMutation.isPending} data-testid="button-submit-partner">
                    {createPartnerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Partner
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Search, Filter, Sort Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                placeholder="Search partners..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/5 border-white/20 text-white placeholder:text-white/40"
                data-testid="input-search-partners"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[140px] bg-white/5 border-white/20 text-white" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="active" className="text-white">Active</SelectItem>
                <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/20 text-white" data-testid="select-sort-field">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="currentMonthSessions" className="text-white">Monthly Tests</SelectItem>
                <SelectItem value="totalTestsCompleted" className="text-white">Total Tests</SelectItem>
                <SelectItem value="currentMonthBillable" className="text-white">Monthly Billing</SelectItem>
                <SelectItem value="name" className="text-white">Name</SelectItem>
                <SelectItem value="createdAt" className="text-white">Date Created</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSortDirection(d => d === "asc" ? "desc" : "asc")}
              className="text-white/70 hover:text-white hover:bg-white/10"
              data-testid="button-toggle-sort-direction"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Summary Stats */}
          {partners && partners.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 text-xs mb-1">Total Partners</div>
                <div className="text-xl font-bold text-white">{partners.length}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 text-xs mb-1">Active</div>
                <div className="text-xl font-bold text-green-400">{partners.filter(p => p.isActive).length}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 text-xs mb-1">Monthly Tests</div>
                <div className="text-xl font-bold text-cyan-400">{partners.reduce((sum, p) => sum + p.currentMonthSessions, 0)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 text-xs mb-1">Monthly Revenue</div>
                <div className="text-xl font-bold text-amber-400">{formatCurrency(partners.reduce((sum, p) => sum + p.currentMonthBillable, 0))}</div>
              </div>
            </div>
          )}

          {filteredPartners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 hover:bg-white/5">
                  <TableHead className="text-white/70 cursor-pointer" onClick={() => handleSort("name")}>
                    Partner {sortField === "name" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-white/70 cursor-pointer" onClick={() => handleSort("currentMonthSessions")}>
                    This Month {sortField === "currentMonthSessions" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-white/70 cursor-pointer" onClick={() => handleSort("totalTestsCompleted")}>
                    All Time {sortField === "totalTestsCompleted" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-white/70 cursor-pointer" onClick={() => handleSort("currentMonthBillable")}>
                    Billable {sortField === "currentMonthBillable" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-white/70">API Keys</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                  <TableHead className="text-white/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id} className="border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => setDetailPartner(partner)} data-testid={`row-partner-${partner.id}`}>
                    <TableCell className="text-white font-medium">
                      <div>
                        <div>{partner.companyName || partner.name}</div>
                        {partner.companyName && <div className="text-sm text-white/60">{partner.name}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300">{partner.currentMonthSessions}</Badge>
                    </TableCell>
                    <TableCell className="text-white/80">{partner.totalTestsCompleted}</TableCell>
                    <TableCell className="text-amber-300 font-medium">{formatCurrency(partner.currentMonthBillable)}</TableCell>
                    <TableCell>
                      <span className="text-white/80">{partner.activeApiKeys}</span>
                      <span className="text-white/40">/{partner.totalApiKeys}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={partner.isActive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}>
                        {partner.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPartner(partner); }} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10" data-testid={`button-manage-keys-${partner.id}`}>
                          <Key className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={partner.isActive}
                          onCheckedChange={(checked) => togglePartnerMutation.mutate({ id: partner.id, isActive: checked })}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`switch-partner-active-${partner.id}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : partners && partners.length > 0 ? (
            <div className="text-center py-8 text-white/60">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>No partners match your search criteria</p>
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>No partners yet. Create your first B2B partner account.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys Dialog (for list view) */}
      <Dialog open={!!selectedPartner && !detailPartner} onOpenChange={() => { setSelectedPartner(null); setNewKeyData(null); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-cyan-400" />
              API Keys for {selectedPartner?.companyName || selectedPartner?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">Manage API keys for this partner's integrations.</DialogDescription>
          </DialogHeader>

          {newKeyData?.fullKey && (
            <Card className="bg-amber-900/30 border-amber-500/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-300">Save this API key now!</p>
                    <p className="text-sm text-amber-400/80">It will not be displayed again.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 p-3 rounded font-mono text-sm">
                  <code className="flex-1 break-all" data-testid="text-new-api-key">{showFullKey ? newKeyData.fullKey : "•".repeat(40) + newKeyData.fullKey.slice(-4)}</code>
                  <Button variant="ghost" size="sm" onClick={() => setShowFullKey(!showFullKey)} data-testid="button-toggle-key-visibility">
                    {showFullKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(newKeyData.fullKey!)} data-testid="button-copy-key">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 mb-4">
            <Button variant="outline" onClick={() => handleCreateKey("test")} disabled={createKeyMutation.isPending} className="bg-slate-800 border-slate-600 hover:bg-slate-700" data-testid="button-create-test-key">
              <Zap className="h-4 w-4 mr-2 text-yellow-400" />
              Create Test Key
            </Button>
            <Button variant="outline" onClick={() => handleCreateKey("live")} disabled={createKeyMutation.isPending} className="bg-slate-800 border-slate-600 hover:bg-slate-700" data-testid="button-create-live-key">
              <Zap className="h-4 w-4 mr-2 text-green-400" />
              Create Live Key
            </Button>
          </div>

          {keysLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : partnerKeys && partnerKeys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Key</TableHead>
                  <TableHead className="text-slate-400">Environment</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Last Used</TableHead>
                  <TableHead className="text-slate-400"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partnerKeys.map((key) => (
                  <TableRow key={key.id} className="border-slate-700/50">
                    <TableCell className="text-white">{key.name}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-400">{key.keyPrefix}...{key.keyHint}</TableCell>
                    <TableCell>
                      <Badge className={key.environment === "live" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}>
                        {key.environment}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={key.isActive ? "bg-cyan-500/20 text-cyan-300" : "bg-red-500/20 text-red-300"}>
                        {key.isActive ? "Active" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}</TableCell>
                    <TableCell>
                      {key.isActive && (
                        <Button variant="ghost" size="sm" onClick={() => revokeKeyMutation.mutate({ partnerId: selectedPartner!.id, keyId: key.id })} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`button-revoke-key-${key.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <Key className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No API keys yet. Create a test or live key above.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

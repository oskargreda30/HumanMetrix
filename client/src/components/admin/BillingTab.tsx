import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, RefreshCw, Plus, TrendingUp, CreditCard, Receipt, Tag, RotateCcw, AlertCircle, CheckCircle, Clock, Ban, ArrowRight, Building2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface BillingStats {
  totalRevenue: number;
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  averageOrderValue: number;
  revenueByMonth: Array<{ month: string; revenue: number; count: number }>;
}

interface Transaction {
  purchase: {
    id: string;
    userId: string;
    totalAmount: number;
    currency: string;
    amountGBP: number;
    status: string;
    resultsAccessPaid: boolean;
    stripeSessionId: string | null;
    stripePaymentIntentId: string | null;
    discountCode: string | null;
    createdAt: string;
    completedAt: string | null;
  };
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  items: Array<{
    id: string;
    assessmentType: string;
    price: number;
    status: string;
  }>;
}

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  coupon: {
    id: string;
    name: string | null;
    percentOff: number | null;
    amountOff: number | null;
    duration: string | null;
  };
  timesRedeemed: number;
  createdAt: string;
  expiresAt: string | null;
  maxRedemptions: number | null;
}

type StatusFilter = 'all' | 'completed' | 'pending' | 'refunded';

interface BillingChangeRequest {
  id: string;
  partnerId: string;
  partnerName?: string;
  partnerEmail?: string;
  currentBillingType: string;
  requestedBillingType: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export default function BillingTab() {
  const { toast } = useToast();
  const [subTab, setSubTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [createPromoOpen, setCreatePromoOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoPercentOff, setNewPromoPercentOff] = useState("");
  const [newPromoMaxRedemptions, setNewPromoMaxRedemptions] = useState("");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<BillingStats>({
    queryKey: ["/api/admin/billing/stats"],
  });

  const buildTransactionUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') {
      if (statusFilter === 'completed') params.set('status', 'completed');
      else if (statusFilter === 'pending') params.set('status', 'pending');
      else if (statusFilter === 'refunded') params.set('status', 'refunded');
    }
    params.set('limit', '100');
    const qs = params.toString();
    return `/api/admin/billing/transactions${qs ? '?' + qs : ''}`;
  };

  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/billing/transactions", statusFilter],
    queryFn: async () => {
      const response = await fetch(buildTransactionUrl());
      if (!response.ok) throw new Error("Failed to fetch transactions");
      return response.json();
    },
  });

  const { data: promoCodes, isLoading: promoLoading, refetch: refetchPromoCodes } = useQuery<PromoCode[]>({
    queryKey: ["/api/admin/billing/promo-codes"],
  });

  // Billing change requests
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BillingChangeRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  const { data: billingRequests, isLoading: requestsLoading, refetch: refetchRequests } = useQuery<BillingChangeRequest[]>({
    queryKey: ["/api/admin/billing/change-requests", requestStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (requestStatusFilter !== 'all') params.set('status', requestStatusFilter);
      const response = await apiRequest("GET", `/api/admin/billing/change-requests${params.toString() ? '?' + params.toString() : ''}`);
      if (!response.ok) throw new Error("Failed to fetch billing change requests");
      return response.json();
    },
  });

  const handleReviewRequest = async (action: 'approve' | 'reject') => {
    if (!selectedRequest) return;
    setIsProcessingRequest(true);
    try {
      const response = await apiRequest("PATCH", `/api/admin/billing/change-requests/${selectedRequest.id}`, {
        action,
        reviewNotes: reviewNotes || undefined,
      });
      if (response.ok) {
        toast({
          title: action === 'approve' ? "Request approved" : "Request rejected",
          description: action === 'approve' 
            ? `Partner billing has been changed to ${selectedRequest.requestedBillingType}` 
            : "The billing change request has been rejected",
        });
        refetchRequests();
        setReviewDialogOpen(false);
        setSelectedRequest(null);
        setReviewNotes("");
      } else {
        const data = await response.json();
        toast({
          title: "Failed to process request",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to process request",
        description: "An error occurred while processing the request",
        variant: "destructive",
      });
    } finally {
      setIsProcessingRequest(false);
    }
  };

  const refundMutation = useMutation({
    mutationFn: async ({ purchaseId, amount, reason }: { purchaseId: string; amount?: number; reason?: string }) => {
      return apiRequest("POST", "/api/admin/billing/refund", { purchaseId, amount, reason });
    },
    onSuccess: () => {
      toast({ title: "Refund processed successfully" });
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key?.startsWith('/api/admin/billing');
      }});
      setRefundDialogOpen(false);
      setSelectedTransaction(null);
      setRefundAmount("");
      setRefundReason("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to process refund", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const createPromoMutation = useMutation({
    mutationFn: async (data: { code: string; percentOff?: number; amountOff?: number; maxRedemptions?: number }) => {
      return apiRequest("POST", "/api/admin/billing/promo-codes", data);
    },
    onSuccess: () => {
      toast({ title: "Promo code created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/promo-codes"] });
      setCreatePromoOpen(false);
      setNewPromoCode("");
      setNewPromoPercentOff("");
      setNewPromoMaxRedemptions("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create promo code", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const deactivatePromoMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("PATCH", `/api/admin/billing/promo-codes/${id}`, { active: false });
    },
    onSuccess: () => {
      toast({ title: "Promo code deactivated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing/promo-codes"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to deactivate promo code", 
        description: error.message || "An error occurred",
        variant: "destructive" 
      });
    },
  });

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  const getStatusBadge = (transaction: Transaction) => {
    if (transaction.purchase.status === 'refunded') {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Refunded</Badge>;
    }
    if (transaction.purchase.resultsAccessPaid) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Paid</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>;
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0] as string;
      return key?.startsWith('/api/admin/billing');
    }});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white" data-testid="heading-billing">Payment & Billing Oversight</h2>
          <p className="text-white/70">Monitor revenue, manage transactions, and configure promo codes</p>
          <p className="text-xs text-cyan-400/70 mt-1">All amounts are converted to GBP for reporting consistency</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          className="border-white/30 text-white hover:bg-white/10 hover:text-white"
          data-testid="button-refresh-billing"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="overview" data-testid="tab-billing-overview" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-billing-transactions" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="promo-codes" data-testid="tab-billing-promo" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70">
            Promo Codes
          </TabsTrigger>
          <TabsTrigger value="billing-requests" data-testid="tab-billing-requests" className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 relative">
            Change Requests
            {billingRequests && billingRequests.filter(r => r.status === 'pending').length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center bg-amber-500 text-white text-xs">
                {billingRequests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" data-testid="loader-stats" />
            </div>
          ) : stats ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">Total Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white" data-testid="text-total-revenue">
                      {formatCurrency(stats.totalRevenue)}
                    </div>
                    <p className="text-xs text-white/50">All-time revenue</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">Completed Transactions</CardTitle>
                    <CheckCircle className="h-4 w-4 text-cyan-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white" data-testid="text-completed-transactions">
                      {stats.completedTransactions}
                    </div>
                    <p className="text-xs text-white/50">Paid purchases</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">Pending Payments</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white" data-testid="text-pending-transactions">
                      {stats.pendingTransactions}
                    </div>
                    <p className="text-xs text-white/50">Awaiting payment</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-white/70">Avg Order Value</CardTitle>
                    <CreditCard className="h-4 w-4 text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white" data-testid="text-avg-order">
                      {formatCurrency(stats.averageOrderValue)}
                    </div>
                    <p className="text-xs text-white/50">Per transaction</p>
                  </CardContent>
                </Card>
              </div>

              {stats.revenueByMonth.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Revenue Trend (Last 12 Months)</CardTitle>
                    <CardDescription className="text-white/60">Monthly revenue breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.revenueByMonth}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                          <XAxis 
                            dataKey="month" 
                            stroke="rgba(255,255,255,0.5)"
                            tick={{ fill: 'rgba(255,255,255,0.7)' }}
                          />
                          <YAxis 
                            stroke="rgba(255,255,255,0.5)"
                            tick={{ fill: 'rgba(255,255,255,0.7)' }}
                            tickFormatter={(value) => `£${(value / 100).toFixed(0)}`}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(13, 29, 51, 0.95)', 
                              border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'white' }}
                            formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#22d3ee" 
                            strokeWidth={2}
                            dot={{ fill: '#22d3ee', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <p className="text-white/70">Unable to load billing statistics</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" data-testid="loader-transactions" />
            </div>
          ) : transactions && transactions.length > 0 ? (
            <Card className="bg-white/5 border-white/10">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-white/70">Date</TableHead>
                      <TableHead className="text-white/70">Customer</TableHead>
                      <TableHead className="text-white/70">Assessments</TableHead>
                      <TableHead className="text-white/70">Amount (GBP)</TableHead>
                      <TableHead className="text-white/70">Discount</TableHead>
                      <TableHead className="text-white/70">Status</TableHead>
                      <TableHead className="text-white/70">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.purchase.id} className="border-white/10 hover:bg-white/5" data-testid={`row-transaction-${tx.purchase.id}`}>
                        <TableCell className="text-white/80">
                          {format(new Date(tx.purchase.createdAt), "dd MMM yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="text-white">{tx.user.firstName} {tx.user.lastName}</div>
                          <div className="text-xs text-white/50">{tx.user.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tx.items.map((item) => (
                              <Badge key={item.id} variant="outline" className="text-xs text-white/70 border-white/20">
                                {item.assessmentType}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {formatCurrency(tx.purchase.amountGBP || tx.purchase.totalAmount)}
                          {tx.purchase.currency && tx.purchase.currency !== 'GBP' && (
                            <div className="text-xs text-white/50">
                              Original: {tx.purchase.currency} {(tx.purchase.totalAmount / 100).toFixed(2)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {tx.purchase.discountCode || '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(tx)}
                        </TableCell>
                        <TableCell>
                          {tx.purchase.resultsAccessPaid && tx.purchase.status !== 'refunded' && tx.purchase.stripePaymentIntentId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(tx);
                                setRefundDialogOpen(true);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              data-testid={`button-refund-${tx.purchase.id}`}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Refund
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-8 text-center">
                <Receipt className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/70">No transactions found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="promo-codes" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-white/70">Manage discount codes for customer promotions</p>
            <Dialog open={createPromoOpen} onOpenChange={setCreatePromoOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-create-promo">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Promo Code
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/20">
                <DialogHeader>
                  <DialogTitle className="text-white">Create New Promo Code</DialogTitle>
                  <DialogDescription className="text-white/60">
                    Create a new discount code in Stripe
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-white/70">Promo Code</Label>
                    <Input
                      value={newPromoCode}
                      onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                      placeholder="e.g., SUMMER25"
                      className="bg-white/10 border-white/20 text-white"
                      data-testid="input-promo-code"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Discount Percentage</Label>
                    <Input
                      type="number"
                      value={newPromoPercentOff}
                      onChange={(e) => setNewPromoPercentOff(e.target.value)}
                      placeholder="e.g., 20 for 20% off"
                      min="1"
                      max="100"
                      className="bg-white/10 border-white/20 text-white"
                      data-testid="input-promo-percent"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70">Max Redemptions (optional)</Label>
                    <Input
                      type="number"
                      value={newPromoMaxRedemptions}
                      onChange={(e) => setNewPromoMaxRedemptions(e.target.value)}
                      placeholder="Leave empty for unlimited"
                      min="1"
                      className="bg-white/10 border-white/20 text-white"
                      data-testid="input-promo-max"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreatePromoOpen(false)}
                    className="text-white/70 border-white/20"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!newPromoCode || !newPromoPercentOff) {
                        toast({ title: "Please fill in required fields", variant: "destructive" });
                        return;
                      }
                      createPromoMutation.mutate({
                        code: newPromoCode,
                        percentOff: parseInt(newPromoPercentOff),
                        maxRedemptions: newPromoMaxRedemptions ? parseInt(newPromoMaxRedemptions) : undefined,
                      });
                    }}
                    disabled={createPromoMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    data-testid="button-confirm-create-promo"
                  >
                    {createPromoMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {promoLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" data-testid="loader-promo" />
            </div>
          ) : promoCodes && promoCodes.length > 0 ? (
            <Card className="bg-white/5 border-white/10">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-white/70">Code</TableHead>
                      <TableHead className="text-white/70">Discount</TableHead>
                      <TableHead className="text-white/70">Times Used</TableHead>
                      <TableHead className="text-white/70">Max Uses</TableHead>
                      <TableHead className="text-white/70">Status</TableHead>
                      <TableHead className="text-white/70">Created</TableHead>
                      <TableHead className="text-white/70">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.map((promo) => (
                      <TableRow key={promo.id} className="border-white/10 hover:bg-white/5" data-testid={`row-promo-${promo.id}`}>
                        <TableCell className="text-white font-mono font-bold">
                          {promo.code}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {promo.coupon.percentOff 
                            ? `${promo.coupon.percentOff}% off`
                            : promo.coupon.amountOff 
                              ? formatCurrency(promo.coupon.amountOff)
                              : '-'
                          }
                        </TableCell>
                        <TableCell className="text-white/80">
                          {promo.timesRedeemed}
                        </TableCell>
                        <TableCell className="text-white/80">
                          {promo.maxRedemptions || 'Unlimited'}
                        </TableCell>
                        <TableCell>
                          {promo.active ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {format(new Date(promo.createdAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {promo.active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deactivatePromoMutation.mutate(promo.id)}
                              disabled={deactivatePromoMutation.isPending}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              data-testid={`button-deactivate-${promo.id}`}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Deactivate
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-8 text-center">
                <Tag className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/70">No promo codes found</p>
                <p className="text-sm text-white/50 mt-2">Create your first promo code to get started</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Billing Change Requests Tab */}
        <TabsContent value="billing-requests" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-white/70">Review and manage partner billing change requests</p>
            <Select value={requestStatusFilter} onValueChange={(v) => setRequestStatusFilter(v as any)}>
              <SelectTrigger className="w-[150px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {requestsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
          ) : billingRequests && billingRequests.length > 0 ? (
            <Card className="bg-white/5 border-white/10">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/70">Partner</TableHead>
                      <TableHead className="text-white/70">Change Request</TableHead>
                      <TableHead className="text-white/70">Reason</TableHead>
                      <TableHead className="text-white/70">Status</TableHead>
                      <TableHead className="text-white/70">Date</TableHead>
                      <TableHead className="text-white/70">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingRequests.map((request) => (
                      <TableRow key={request.id} className="border-white/10">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-full bg-white/10">
                              <Building2 className="h-4 w-4 text-cyan-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium">{request.partnerName || 'Partner'}</div>
                              {request.partnerEmail && (
                                <div className="text-xs text-white/50">{request.partnerEmail}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-white/80">
                            <Badge variant="outline" className="border-white/30">
                              {request.currentBillingType === 'prepaid' && 'Prepaid'}
                              {request.currentBillingType === 'auto_bill' && 'Auto-Bill'}
                              {request.currentBillingType === 'invoice' && 'Invoice'}
                            </Badge>
                            <ArrowRight className="h-4 w-4 text-white/50" />
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                              {request.requestedBillingType === 'prepaid' && 'Prepaid'}
                              {request.requestedBillingType === 'auto_bill' && 'Auto-Bill'}
                              {request.requestedBillingType === 'invoice' && 'Invoice'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-white/70 max-w-[200px] truncate">
                          {request.reason || '-'}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-0">Pending</Badge>
                          )}
                          {request.status === 'approved' && (
                            <Badge className="bg-green-500/20 text-green-400 border-0">Approved</Badge>
                          )}
                          {request.status === 'rejected' && (
                            <Badge className="bg-red-500/20 text-red-400 border-0">Rejected</Badge>
                          )}
                          {request.status === 'cancelled' && (
                            <Badge className="bg-gray-500/20 text-gray-400 border-0">Cancelled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {format(new Date(request.createdAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setReviewDialogOpen(true);
                                }}
                                data-testid={`button-review-${request.id}`}
                              >
                                Review
                              </Button>
                            </div>
                          )}
                          {request.status !== 'pending' && request.reviewNotes && (
                            <span className="text-xs text-white/50 italic">"{request.reviewNotes}"</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="py-8 text-center">
                <Receipt className="h-12 w-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/70">No billing change requests found</p>
                <p className="text-sm text-white/50 mt-2">
                  {requestStatusFilter === 'pending' 
                    ? 'No pending requests to review' 
                    : 'Try adjusting the status filter'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Billing Change Request Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Review Billing Change Request</DialogTitle>
            <DialogDescription className="text-white/60">
              Approve or reject this partner's request to change their billing type.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 p-4 rounded-lg space-y-3">
                <div className="flex justify-between gap-4">
                  <span className="text-white/70">Partner:</span>
                  <span className="text-white font-medium">{selectedRequest.partnerName || selectedRequest.partnerId}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-white/70">Requested Change:</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/30">
                      {selectedRequest.currentBillingType === 'prepaid' && 'Prepaid'}
                      {selectedRequest.currentBillingType === 'auto_bill' && 'Auto-Bill'}
                      {selectedRequest.currentBillingType === 'invoice' && 'Invoice'}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-white/50" />
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-0">
                      {selectedRequest.requestedBillingType === 'prepaid' && 'Prepaid'}
                      {selectedRequest.requestedBillingType === 'auto_bill' && 'Auto-Bill'}
                      {selectedRequest.requestedBillingType === 'invoice' && 'Invoice'}
                    </Badge>
                  </div>
                </div>
                {selectedRequest.reason && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-white/70 text-sm">Partner's reason:</span>
                    <p className="text-white mt-1">"{selectedRequest.reason}"</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Review Notes (optional)</Label>
                <Input
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-review-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setReviewDialogOpen(false);
                setSelectedRequest(null);
                setReviewNotes("");
              }}
              className="text-white/70 border-white/20"
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReviewRequest('reject')}
              disabled={isProcessingRequest}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              data-testid="button-reject-request"
            >
              {isProcessingRequest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button
              onClick={() => handleReviewRequest('approve')}
              disabled={isProcessingRequest}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-approve-request"
            >
              {isProcessingRequest && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Process Refund</DialogTitle>
            <DialogDescription className="text-white/60">
              Issue a refund for this transaction. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4 py-4">
              <div className="bg-white/5 p-4 rounded-lg space-y-2">
                <div className="flex justify-between gap-4">
                  <span className="text-white/70">Customer:</span>
                  <span className="text-white">{selectedTransaction.user.email}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/70">Original Amount:</span>
                  <span className="text-white font-bold">{formatCurrency(selectedTransaction.purchase.totalAmount)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Refund Amount (pence)</Label>
                <Input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Full refund: ${selectedTransaction.purchase.totalAmount}`}
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-refund-amount"
                />
                <p className="text-xs text-white/50">Leave empty for full refund</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white/70">Reason (optional)</Label>
                <Input
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g., Customer request"
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-refund-reason"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRefundDialogOpen(false);
                setSelectedTransaction(null);
                setRefundAmount("");
                setRefundReason("");
              }}
              className="text-white/70 border-white/20"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTransaction) {
                  refundMutation.mutate({
                    purchaseId: selectedTransaction.purchase.id,
                    amount: refundAmount ? parseInt(refundAmount) : undefined,
                    reason: refundReason || undefined,
                  });
                }
              }}
              disabled={refundMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-refund"
            >
              {refundMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

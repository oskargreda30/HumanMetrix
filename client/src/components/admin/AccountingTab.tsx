import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw, Plus, Link2, Unlink, Receipt, TrendingUp, DollarSign, Upload, AlertCircle, CheckCircle, Clock, FileText, Building2, ArrowUpRight, Trash2, Pencil, Target } from "lucide-react";
import RevenueTargetsTab from "./RevenueTargetsTab";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { useLocation } from "wouter";

interface XeroStatus {
  isConnected: boolean;
  tenantName?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  isConfigured: boolean;
}

interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  syncedCount: number;
  pendingCount: number;
  byCategory: Record<string, { count: number; amount: number }>;
}

interface RevenueStats {
  totalRevenue: number;
  syncedRevenue: number;
  unsyncedCount: number;
  syncedCount: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  vendor: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
  xeroSyncStatus: string;
  xeroSyncError: string | null;
  xeroSyncedAt: string | null;
  createdAt: string;
}

interface UnsyncedRevenue {
  id: string;
  type: 'b2c' | 'b2b';
  amount: number;
  currency: string;
  customerName: string;
  date: string;
}

interface RevenueSyncLog {
  id: string;
  purchaseId: string | null;
  partnerInvoiceId: string | null;
  sourceType: string;
  amount: number;
  currency: string;
  customerName: string | null;
  xeroInvoiceId: string | null;
  syncStatus: string;
  syncError: string | null;
  syncedAt: string | null;
  createdAt: string;
}

const EXPENSE_CATEGORIES = [
  { value: 'software', label: 'Software & SaaS' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'legal', label: 'Legal & Professional' },
  { value: 'office', label: 'Office & Admin' },
  { value: 'travel', label: 'Travel' },
  { value: 'other', label: 'Other' },
];

export default function AccountingTab() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [subTab, setSubTab] = useState("overview");
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    currency: 'GBP',
    category: 'other',
    vendor: '',
    invoiceNumber: '',
    invoiceDate: '',
    dueDate: '',
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const xeroStatus = params.get('xero');
    if (xeroStatus === 'connected') {
      toast({
        title: "Xero Connected",
        description: "Your Xero account has been connected successfully.",
      });
      window.history.replaceState({}, '', '/admin?tab=accounting');
    } else if (xeroStatus === 'error') {
      const message = params.get('message');
      toast({
        title: "Xero Connection Failed",
        description: message || "Failed to connect to Xero. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/admin?tab=accounting');
    }
  }, [location, toast]);

  const { data: xeroStatus, isLoading: xeroLoading, refetch: refetchXero } = useQuery<XeroStatus>({
    queryKey: ["/api/admin/accounting/xero/status"],
  });

  const { data: expenseStats, isLoading: expenseStatsLoading, refetch: refetchExpenseStats } = useQuery<ExpenseStats>({
    queryKey: ["/api/admin/accounting/expenses/stats"],
  });

  const { data: revenueStats, isLoading: revenueStatsLoading, refetch: refetchRevenueStats } = useQuery<RevenueStats>({
    queryKey: ["/api/admin/accounting/revenue/stats"],
  });

  const { data: expenses, isLoading: expensesLoading, refetch: refetchExpenses } = useQuery<Expense[]>({
    queryKey: ["/api/admin/accounting/expenses"],
  });

  const { data: unsyncedRevenue, isLoading: unsyncedLoading, refetch: refetchUnsynced } = useQuery<UnsyncedRevenue[]>({
    queryKey: ["/api/admin/accounting/revenue/unsynced"],
  });

  const { data: syncLogs, isLoading: logsLoading, refetch: refetchLogs } = useQuery<RevenueSyncLog[]>({
    queryKey: ["/api/admin/accounting/revenue/logs"],
  });

  const connectXeroMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/admin/accounting/xero/connect");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to connect to Xero",
        variant: "destructive",
      });
    },
  });

  const disconnectXeroMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/accounting/xero/disconnect");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Xero Disconnected" });
      refetchXero();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Xero",
        variant: "destructive",
      });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: typeof expenseForm) => {
      const response = await apiRequest("POST", "/api/admin/accounting/expenses", {
        ...data,
        amount: parseFloat(data.amount) || 0,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Expense Created" });
      setAddExpenseOpen(false);
      resetExpenseForm();
      refetchExpenses();
      refetchExpenseStats();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof expenseForm> }) => {
      const response = await apiRequest("PATCH", `/api/admin/accounting/expenses/${id}`, {
        ...data,
        amount: data.amount ? parseFloat(data.amount as string) : undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Expense Updated" });
      setEditExpense(null);
      resetExpenseForm();
      refetchExpenses();
      refetchExpenseStats();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/accounting/expenses/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Expense Deleted" });
      setDeleteExpenseId(null);
      refetchExpenses();
      refetchExpenseStats();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const syncExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/admin/accounting/expenses/${id}/sync`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Expense Synced to Xero" });
      refetchExpenses();
      refetchExpenseStats();
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync expense to Xero",
        variant: "destructive",
      });
    },
  });

  const syncRevenueMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await apiRequest("POST", "/api/admin/accounting/revenue/sync", { purchaseId });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Revenue Synced to Xero" });
      refetchUnsynced();
      refetchRevenueStats();
      refetchLogs();
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync revenue to Xero",
        variant: "destructive",
      });
    },
  });

  const syncAllRevenueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/accounting/revenue/sync-all");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bulk Sync Complete",
        description: `${data.synced} synced, ${data.failed} failed`,
      });
      refetchUnsynced();
      refetchRevenueStats();
      refetchLogs();
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync revenue",
        variant: "destructive",
      });
    },
  });

  const resetExpenseForm = () => {
    setExpenseForm({
      description: '',
      amount: '',
      currency: 'GBP',
      category: 'other',
      vendor: '',
      invoiceNumber: '',
      invoiceDate: '',
      dueDate: '',
      status: 'pending',
      notes: '',
    });
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseForm({
      description: expense.description,
      amount: (expense.amount / 100).toString(),
      currency: expense.currency,
      category: expense.category,
      vendor: expense.vendor || '',
      invoiceNumber: expense.invoiceNumber || '',
      invoiceDate: expense.invoiceDate ? expense.invoiceDate.split('T')[0] : '',
      dueDate: expense.dueDate ? expense.dueDate.split('T')[0] : '',
      status: expense.status,
      notes: '',
    });
    setEditExpense(expense);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
    }).format(amount / 100);
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getExpenseStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Paid</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const refetchAll = () => {
    // Invalidate all accounting-related queries to clear cache
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey[0] as string;
      return key?.includes('/api/admin/xero') || key?.includes('/api/admin/expenses') || key?.includes('/api/admin/revenue');
    }});
    // Also explicitly refetch all data
    refetchXero();
    refetchExpenseStats();
    refetchRevenueStats();
    refetchExpenses();
    refetchUnsynced();
    refetchLogs();
    toast({ title: "Data refreshed", description: "All accounting data has been reloaded" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Accounting</h2>
          <p className="text-slate-300">
            Manage expenses, revenue tracking, and Xero integration
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetchAll}
          disabled={xeroLoading || expenseStatsLoading || revenueStatsLoading || expensesLoading || unsyncedLoading || logsLoading}
          data-testid="button-refresh-accounting"
          className="border-white/30 text-white hover:bg-white/10 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${xeroLoading || expenseStatsLoading || revenueStatsLoading || expensesLoading || unsyncedLoading || logsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Xero Integration
          </CardTitle>
          <CardDescription>
            Connect your Xero account to sync expenses and revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {xeroLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking Xero connection...</span>
            </div>
          ) : xeroStatus?.isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Connected to {xeroStatus.tenantName || 'Xero'}</p>
                    {xeroStatus.connectedAt && (
                      <p className="text-sm text-muted-foreground">
                        Connected {format(new Date(xeroStatus.connectedAt), 'PPp')}
                      </p>
                    )}
                    {xeroStatus.lastSyncAt && (
                      <p className="text-sm text-muted-foreground">
                        Last sync: {format(new Date(xeroStatus.lastSyncAt), 'PPp')}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectXeroMutation.mutate()}
                  disabled={disconnectXeroMutation.isPending}
                  data-testid="button-disconnect-xero"
                >
                  {disconnectXeroMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Unlink className="w-4 h-4 mr-2" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!xeroStatus?.isConfigured && (
                <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Xero Not Configured</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Add XERO_CLIENT_ID and XERO_CLIENT_SECRET environment variables to enable integration.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <Button
                onClick={() => connectXeroMutation.mutate()}
                disabled={connectXeroMutation.isPending || !xeroStatus?.isConfigured}
                data-testid="button-connect-xero"
              >
                {connectXeroMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4 mr-2" />
                )}
                Connect to Xero
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-expenses">
              {expenseStatsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                formatCurrency(expenseStats?.totalAmount || 0, 'GBP')
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseStats?.totalExpenses || 0} expenses recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Synced to Xero</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-synced-count">
              {expenseStatsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                expenseStats?.syncedCount || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {expenseStats?.pendingCount || 0} pending sync
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Revenue Synced</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue-synced">
              {revenueStatsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                formatCurrency(revenueStats?.syncedRevenue || 0, 'GBP')
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {revenueStats?.syncedCount || 0} transactions synced
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Pending Sync</CardTitle>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-sync">
              {revenueStatsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                revenueStats?.unsyncedCount || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue transactions awaiting sync
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="targets" data-testid="tab-targets" className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseStatsLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(expenseStats?.byCategory || {}).map(([cat, data]) => (
                      <div key={cat} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {data.count} expenses
                          </span>
                        </div>
                        <span className="font-medium">{formatCurrency(data.amount, 'GBP')}</span>
                      </div>
                    ))}
                    {Object.keys(expenseStats?.byCategory || {}).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">No expenses recorded</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Sync Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {syncLogs?.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{log.customerName || 'Unknown'}</span>
                          <span className="text-muted-foreground ml-2">
                            {formatCurrency(log.amount, log.currency)}
                          </span>
                        </div>
                        {getSyncStatusBadge(log.syncStatus)}
                      </div>
                    ))}
                    {(!syncLogs || syncLogs.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">No sync activity yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="targets">
          <RevenueTargetsTab />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Expense Records</h3>
            <Button onClick={() => setAddExpenseOpen(true)} data-testid="button-add-expense">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sync</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expensesLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : expenses && expenses.length > 0 ? (
                      expenses.map((expense) => (
                        <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{expense.description}</p>
                              {expense.invoiceNumber && (
                                <p className="text-xs text-muted-foreground">#{expense.invoiceNumber}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{expense.vendor || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label || expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(expense.amount, expense.currency)}
                          </TableCell>
                          <TableCell>{getExpenseStatusBadge(expense.status)}</TableCell>
                          <TableCell>{getSyncStatusBadge(expense.xeroSyncStatus)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {xeroStatus?.isConnected && expense.xeroSyncStatus !== 'synced' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => syncExpenseMutation.mutate(expense.id)}
                                  disabled={syncExpenseMutation.isPending}
                                  title="Sync to Xero"
                                  data-testid={`button-sync-expense-${expense.id}`}
                                >
                                  <ArrowUpRight className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditExpense(expense)}
                                title="Edit"
                                data-testid={`button-edit-expense-${expense.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteExpenseId(expense.id)}
                                title="Delete"
                                data-testid={`button-delete-expense-${expense.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No expenses recorded. Click "Add Expense" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Revenue Sync</h3>
            {xeroStatus?.isConnected && unsyncedRevenue && unsyncedRevenue.length > 0 && (
              <Button
                onClick={() => syncAllRevenueMutation.mutate()}
                disabled={syncAllRevenueMutation.isPending}
                data-testid="button-sync-all-revenue"
              >
                {syncAllRevenueMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Sync All ({unsyncedRevenue.length})
              </Button>
            )}
          </div>

          {!xeroStatus?.isConnected && (
            <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <p className="text-amber-800 dark:text-amber-200">
                  Connect your Xero account above to sync revenue transactions.
                </p>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Pending Revenue to Sync</CardTitle>
              <CardDescription>
                Completed sales that have not been synced to Xero
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unsyncedLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : unsyncedRevenue && unsyncedRevenue.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unsyncedRevenue.map((item) => (
                      <TableRow key={item.id} data-testid={`row-unsynced-${item.id}`}>
                        <TableCell className="font-medium">{item.customerName}</TableCell>
                        <TableCell>
                          <Badge variant={item.type === 'b2c' ? 'outline' : 'secondary'}>
                            {item.type === 'b2c' ? 'B2C' : 'B2B'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(item.amount, item.currency)}</TableCell>
                        <TableCell>{format(new Date(item.date), 'PP')}</TableCell>
                        <TableCell>
                          {xeroStatus?.isConnected && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => syncRevenueMutation.mutate(item.id)}
                              disabled={syncRevenueMutation.isPending}
                              data-testid={`button-sync-revenue-${item.id}`}
                            >
                              {syncRevenueMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  All revenue has been synced to Xero
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sync History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {logsLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : syncLogs && syncLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Synced</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {log.customerName || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.sourceType === 'b2c_purchase' ? 'outline' : 'secondary'}>
                              {log.sourceType === 'b2c_purchase' ? 'B2C' : 'B2B'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(log.amount, log.currency)}</TableCell>
                          <TableCell>{getSyncStatusBadge(log.syncStatus)}</TableCell>
                          <TableCell>
                            {log.syncedAt ? format(new Date(log.syncedAt), 'PPp') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No sync history yet
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new expense for accounting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="e.g., AWS hosting - January"
                data-testid="input-expense-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-expense-amount"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={expenseForm.currency}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, currency: v })}
                >
                  <SelectTrigger data-testid="select-expense-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}
                >
                  <SelectTrigger data-testid="select-expense-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={expenseForm.status}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, status: v })}
                >
                  <SelectTrigger data-testid="select-expense-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                placeholder="e.g., Amazon Web Services"
                data-testid="input-expense-vendor"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={expenseForm.invoiceNumber}
                  onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
                  placeholder="INV-001"
                  data-testid="input-expense-invoice-number"
                />
              </div>
              <div>
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={expenseForm.invoiceDate}
                  onChange={(e) => setExpenseForm({ ...expenseForm, invoiceDate: e.target.value })}
                  data-testid="input-expense-invoice-date"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={expenseForm.dueDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, dueDate: e.target.value })}
                data-testid="input-expense-due-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddExpenseOpen(false); resetExpenseForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => createExpenseMutation.mutate(expenseForm)}
              disabled={createExpenseMutation.isPending || !expenseForm.description || !expenseForm.amount}
              data-testid="button-save-expense"
            >
              {createExpenseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editExpense} onOpenChange={(open) => { if (!open) { setEditExpense(null); resetExpenseForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-description">Description *</Label>
              <Input
                id="edit-description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                data-testid="input-edit-expense-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-amount">Amount *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  data-testid="input-edit-expense-amount"
                />
              </div>
              <div>
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  value={expenseForm.currency}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, currency: v })}
                >
                  <SelectTrigger data-testid="select-edit-expense-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}
                >
                  <SelectTrigger data-testid="select-edit-expense-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={expenseForm.status}
                  onValueChange={(v) => setExpenseForm({ ...expenseForm, status: v })}
                >
                  <SelectTrigger data-testid="select-edit-expense-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-vendor">Vendor</Label>
              <Input
                id="edit-vendor"
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                data-testid="input-edit-expense-vendor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditExpense(null); resetExpenseForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={() => editExpense && updateExpenseMutation.mutate({ id: editExpense.id, data: expenseForm })}
              disabled={updateExpenseMutation.isPending || !expenseForm.description || !expenseForm.amount}
              data-testid="button-update-expense"
            >
              {updateExpenseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteExpenseId} onOpenChange={(open) => !open && setDeleteExpenseId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteExpenseId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteExpenseId && deleteExpenseMutation.mutate(deleteExpenseId)}
              disabled={deleteExpenseMutation.isPending}
              data-testid="button-confirm-delete-expense"
            >
              {deleteExpenseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

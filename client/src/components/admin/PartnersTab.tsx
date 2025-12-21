import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Key, Trash2, Copy, Eye, EyeOff, Building2, Zap, AlertTriangle } from "lucide-react";
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
  isActive: boolean;
  createdAt: string;
  currentMonthSessions: number;
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

export default function PartnersTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [newKeyData, setNewKeyData] = useState<ApiKey | null>(null);
  const [showFullKey, setShowFullKey] = useState(false);

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ["/api/admin/partners"],
  });

  const { data: partnerKeys, isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/admin/partners", selectedPartner?.id, "keys"],
    enabled: !!selectedPartner,
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (data: { name: string; companyName: string; email: string; pricePerAssessment: number }) => {
      const res = await apiRequest("POST", "/api/admin/partners", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setIsCreateOpen(false);
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
    });
  };

  const handleCreateKey = (environment: string) => {
    if (!selectedPartner) return;
    const name = environment === "live" ? "Production Key" : "Test Key";
    createKeyMutation.mutate({ partnerId: selectedPartner.id, name, environment });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/10 border-white/20">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
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
          {partners && partners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/20 hover:bg-white/5">
                  <TableHead className="text-white/70">Partner</TableHead>
                  <TableHead className="text-white/70">Email</TableHead>
                  <TableHead className="text-white/70">Sessions This Month</TableHead>
                  <TableHead className="text-white/70">Price/Assessment</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                  <TableHead className="text-white/70">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner) => (
                  <TableRow key={partner.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white font-medium">
                      <div>
                        <div>{partner.name}</div>
                        {partner.companyName && <div className="text-sm text-white/60">{partner.companyName}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/80">{partner.email}</TableCell>
                    <TableCell className="text-white/80">
                      <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300">{partner.currentMonthSessions || 0}</Badge>
                      {partner.monthlyQuota && <span className="text-white/50 ml-1">/ {partner.monthlyQuota}</span>}
                    </TableCell>
                    <TableCell className="text-white/80">£{(partner.pricePerAssessment / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={partner.isActive}
                        onCheckedChange={(checked) => togglePartnerMutation.mutate({ id: partner.id, isActive: checked })}
                        data-testid={`switch-partner-active-${partner.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPartner(partner)} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10" data-testid={`button-manage-keys-${partner.id}`}>
                        <Key className="h-4 w-4 mr-1" />
                        API Keys
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-white/60">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p>No partners yet. Create your first B2B partner account.</p>
            </div>
          )}
        </CardContent>
      </Card>

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

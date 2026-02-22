import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Edit,
  Search,
  ExternalLink,
  Download,
  ArrowRightCircle,
  User,
  Building2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  FileText,
  Target,
  X,
} from "lucide-react";
import {
  LEAD_STATUS_ORDER,
  LEAD_STATUS_LABELS,
  type GeneratedLead,
  type LeadStatus,
} from "@shared/schema";

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500/20 text-blue-300",
  researching: "bg-amber-500/20 text-amber-300",
  contacted: "bg-cyan-500/20 text-cyan-300",
  qualified: "bg-green-500/20 text-green-300",
  converted: "bg-emerald-500/20 text-emerald-300",
  dead: "bg-red-500/20 text-red-300",
};

function generateDorks(name: string, company: string, domain: string): Array<{ label: string; query: string }> {
  const dorks: Array<{ label: string; query: string }> = [];

  if (!name && !company) return dorks;

  if (name) {
    dorks.push({
      label: "Resume / CV search",
      query: `"${name}" filetype:pdf OR filetype:docx (resume OR CV OR "curriculum vitae")`,
    });
    dorks.push({
      label: "Contact details",
      query: `"${name}" ("whatsapp" OR "tel" OR "cell" OR "mobile" OR "contact info" OR "direct dial")`,
    });
  }

  if (name && domain) {
    dorks.push({
      label: `Company site contact`,
      query: `site:${domain} "${name}" ("phone" OR "contact" OR "email")`,
    });
    dorks.push({
      label: "Email patterns",
      query: `"${name}" ("@${domain}" OR "@gmail.com" OR "@yahoo.com" OR "@outlook.com")`,
    });
  }

  if (name && company) {
    dorks.push({
      label: "Data aggregator profiles",
      query: `site:zoominfo.com OR site:rocketreach.co OR site:apollo.io OR site:lusha.com "${name}" "${company}"`,
    });
    dorks.push({
      label: "Social media profiles",
      query: `"${name}" "${company}" site:twitter.com OR site:facebook.com OR site:instagram.com`,
    });
    dorks.push({
      label: "LinkedIn profile",
      query: `site:linkedin.com/in "${name}" "${company}"`,
    });
    dorks.push({
      label: "Public docs & directories",
      query: `site:docs.google.com OR site:drive.google.com "${company}" "contact list" OR "directory" OR "staff"`,
    });
    dorks.push({
      label: "News & press mentions",
      query: `"${name}" "${company}" ("appointed" OR "joined" OR "promoted" OR "announced")`,
    });
  }

  if (company) {
    dorks.push({
      label: "Company employee directory",
      query: `"${company}" "team" OR "our people" OR "staff directory" OR "about us" filetype:html`,
    });
  }

  return dorks;
}

function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const EMPTY_FORM = {
  name: "",
  company: "",
  domain: "",
  email: "",
  phone: "",
  linkedinUrl: "",
  notes: "",
  status: "new" as LeadStatus,
};

export default function LeadsGenerationTab() {
  const { toast } = useToast();
  const [researchName, setResearchName] = useState("");
  const [researchCompany, setResearchCompany] = useState("");
  const [researchDomain, setResearchDomain] = useState("");
  const [generatedDorks, setGeneratedDorks] = useState<Array<{ label: string; query: string }>>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<GeneratedLead | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");

  const { data: leads = [], isLoading } = useQuery<GeneratedLead[]>({
    queryKey: ["/api/admin/leads"],
  });

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filterStatus !== "all") {
      result = result.filter((l) => l.status === filterStatus);
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.domain?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [leads, filterStatus, searchFilter]);

  const createMutation = useMutation({
    mutationFn: (data: typeof EMPTY_FORM) =>
      apiRequest("POST", "/api/admin/leads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      setShowAddDialog(false);
      setForm(EMPTY_FORM);
      toast({ title: "Lead saved" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<typeof EMPTY_FORM>) =>
      apiRequest("PATCH", `/api/admin/leads/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      setEditingLead(null);
      setForm(EMPTY_FORM);
      toast({ title: "Lead updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      toast({ title: "Lead deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const pushToFunnelMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/admin/leads/${id}/push-to-funnel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-funnel"] });
      toast({ title: "Lead pushed to Sales Funnel" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  function handleGenerateDorks() {
    const domain = researchDomain || (researchCompany ? researchCompany.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() + ".com" : "");
    const dorks = generateDorks(researchName, researchCompany, domain);
    setGeneratedDorks(dorks);
    if (!researchDomain && domain) setResearchDomain(domain);
  }

  function handleSaveAsLead() {
    const domain = researchDomain || (researchCompany ? researchCompany.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() + ".com" : "");
    setForm({
      ...EMPTY_FORM,
      name: researchName,
      company: researchCompany,
      domain,
      status: "researching",
      sourceQueries: generatedDorks.map((d) => d.query).join("\n"),
    } as any);
    setShowAddDialog(true);
  }

  function downloadCsv() {
    if (filteredLeads.length === 0) return;
    const headers = ["Name", "Email", "Company", "Domain", "Phone", "LinkedIn", "Status", "Notes", "Created"];
    const rows = filteredLeads.map((l) => [
      l.name,
      l.email || "",
      l.company || "",
      l.domain || "",
      l.phone || "",
      l.linkedinUrl || "",
      LEAD_STATUS_LABELS[l.status as LeadStatus] || l.status,
      (l.notes || "").replace(/"/g, '""'),
      new Date(l.createdAt).toLocaleDateString(),
    ]);
    let csv = headers.join(",") + "\n";
    rows.forEach((r) => {
      csv += r.map((v) => `"${v}"`).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openEdit(lead: GeneratedLead) {
    setEditingLead(lead);
    setForm({
      name: lead.name,
      company: lead.company || "",
      domain: lead.domain || "",
      email: lead.email || "",
      phone: lead.phone || "",
      linkedinUrl: lead.linkedinUrl || "",
      notes: lead.notes || "",
      status: (lead.status as LeadStatus) || "new",
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-cyan-500/30 bg-slate-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-cyan-400 text-lg">
            <Search className="h-5 w-5" />
            Research Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Person Name</Label>
              <Input
                placeholder="e.g. Jane Doe"
                value={researchName}
                onChange={(e) => setResearchName(e.target.value)}
                data-testid="input-research-name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Company</Label>
              <Input
                placeholder="e.g. Acme Corp"
                value={researchCompany}
                onChange={(e) => setResearchCompany(e.target.value)}
                data-testid="input-research-company"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Domain (auto-guessed)</Label>
              <Input
                placeholder="e.g. acme.com"
                value={researchDomain}
                onChange={(e) => setResearchDomain(e.target.value)}
                data-testid="input-research-domain"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleGenerateDorks}
              disabled={!researchName && !researchCompany}
              data-testid="button-generate-dorks"
            >
              <Search className="h-4 w-4 mr-2" />
              Generate Search Queries
            </Button>
            {generatedDorks.length > 0 && (
              <Button variant="outline" onClick={handleSaveAsLead} data-testid="button-save-as-lead">
                <Plus className="h-4 w-4 mr-2" />
                Save as Lead
              </Button>
            )}
          </div>

          {generatedDorks.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium text-muted-foreground">
                Generated Search Queries ({generatedDorks.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {generatedDorks.map((dork, i) => (
                  <a
                    key={i}
                    href={`https://www.google.com/search?q=${encodeURIComponent(dork.query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2 p-3 rounded-md bg-slate-800/50 hover:bg-slate-800 transition-colors group"
                    data-testid={`link-dork-${i}`}
                  >
                    <ExternalLink className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0 opacity-60 group-hover:opacity-100" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-cyan-400">{dork.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{dork.query}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Leads ({filteredLeads.length})
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Search leads..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-48"
                data-testid="input-search-leads"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36" data-testid="select-filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {LEAD_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={downloadCsv}
                disabled={filteredLeads.length === 0}
                data-testid="button-download-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={() => { setForm(EMPTY_FORM); setShowAddDialog(true); }} data-testid="button-add-lead">
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No leads yet. Use the Research Panel above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-md bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                  data-testid={`lead-row-${lead.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{lead.name}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[lead.status as LeadStatus] || ""}`}>
                        {LEAD_STATUS_LABELS[lead.status as LeadStatus] || lead.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {lead.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.company}
                        </span>
                      )}
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.email}
                        </span>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.domain && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {lead.domain}
                        </span>
                      )}
                      {lead.linkedinUrl && (
                        <a
                          href={lead.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                        >
                          <Linkedin className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                      <span className="opacity-60">{timeAgo(lead.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {lead.status !== "converted" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => pushToFunnelMutation.mutate(lead.id)}
                        disabled={pushToFunnelMutation.isPending}
                        title="Push to Sales Funnel"
                        data-testid={`button-push-funnel-${lead.id}`}
                      >
                        <ArrowRightCircle className="h-4 w-4 text-green-400" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(lead)}
                      data-testid={`button-edit-lead-${lead.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete this lead?")) deleteMutation.mutate(lead.id);
                      }}
                      data-testid={`button-delete-lead-${lead.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog || !!editingLead} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setEditingLead(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLead ? "Edit Lead" : "Add Lead"}</DialogTitle>
            <DialogDescription>
              {editingLead ? "Update the lead's details." : "Add a new lead to your list."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-lead-name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Company</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} data-testid="input-lead-company" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-lead-email" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-lead-phone" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Domain</Label>
                <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} data-testid="input-lead-domain" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">LinkedIn URL</Label>
                <Input value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} data-testid="input-lead-linkedin" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as LeadStatus })}>
                <SelectTrigger data-testid="select-lead-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} data-testid="input-lead-notes" />
            </div>
            <Button
              className="w-full"
              disabled={!form.name || createMutation.isPending || updateMutation.isPending}
              onClick={() => {
                if (editingLead) {
                  updateMutation.mutate({ id: editingLead.id, ...form });
                } else {
                  createMutation.mutate(form);
                }
              }}
              data-testid="button-save-lead"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingLead ? "Update Lead" : "Save Lead"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

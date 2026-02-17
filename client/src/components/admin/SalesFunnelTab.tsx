import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  GripVertical,
  Trash2,
  Edit,
  User,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import {
  SALES_FUNNEL_STAGE_ORDER,
  SALES_FUNNEL_STAGE_LABELS,
  type SalesFunnelContact,
  type SalesFunnelStage,
} from "@shared/schema";

const STAGE_COLORS: Record<SalesFunnelStage, string> = {
  lead: "border-l-blue-400",
  contacted: "border-l-cyan-400",
  demo_scheduled: "border-l-amber-400",
  trial: "border-l-green-400",
  negotiation: "border-l-purple-400",
  closed_won: "border-l-emerald-500",
  closed_lost: "border-l-red-400",
};

const STAGE_HEADER_COLORS: Record<SalesFunnelStage, string> = {
  lead: "bg-blue-500/20 text-blue-300",
  contacted: "bg-cyan-500/20 text-cyan-300",
  demo_scheduled: "bg-amber-500/20 text-amber-300",
  trial: "bg-green-500/20 text-green-300",
  negotiation: "bg-purple-500/20 text-purple-300",
  closed_won: "bg-emerald-500/20 text-emerald-300",
  closed_lost: "bg-red-500/20 text-red-300",
};

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
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? "s" : ""} ago`;
}

const EMPTY_FORM = {
  name: "",
  email: "",
  company: "",
  phone: "",
  stage: "lead" as SalesFunnelStage,
  notes: "",
};

export default function SalesFunnelTab() {
  const { toast } = useToast();
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<SalesFunnelContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<SalesFunnelContact | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const { data: contacts = [], isLoading } = useQuery<SalesFunnelContact[]>({
    queryKey: ["/api/admin/sales-funnel"],
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof EMPTY_FORM) => {
      const res = await apiRequest("POST", "/api/admin/sales-funnel", body);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-funnel"] });
      setAddDialogOpen(false);
      setFormData(EMPTY_FORM);
      toast({ title: "Contact added" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add contact", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & Partial<typeof EMPTY_FORM>) => {
      const res = await apiRequest("PATCH", `/api/admin/sales-funnel/${id}`, body);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-funnel"] });
      setEditContact(null);
      toast({ title: "Contact updated" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update contact", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/sales-funnel/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-funnel"] });
      setDeleteContact(null);
      toast({ title: "Contact deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete contact", description: error.message, variant: "destructive" });
    },
  });

  const stageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/sales-funnel/${id}`, { stage });
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sales-funnel"] });
      toast({ title: `Moved to ${SALES_FUNNEL_STAGE_LABELS[variables.stage as SalesFunnelStage]}` });
    },
    onError: (error: any) => {
      toast({ title: "Failed to move contact", description: error.message, variant: "destructive" });
    },
  });

  const handleDragStart = (e: React.DragEvent, contactId: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", contactId);
  };

  const handleDrop = (e: React.DragEvent, targetStage: SalesFunnelStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const contactId = e.dataTransfer.getData("text/plain");
    if (!contactId) return;
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact || contact.stage === targetStage) return;
    stageMutation.mutate({ id: contactId, stage: targetStage });
  };

  const openEditDialog = (contact: SalesFunnelContact) => {
    setEditContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || "",
      company: contact.company || "",
      phone: contact.phone || "",
      stage: (contact.stage as SalesFunnelStage) || "lead",
      notes: contact.notes || "",
    });
  };

  const handleSubmitAdd = () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitEdit = () => {
    if (!editContact || !formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: editContact.id, ...formData });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" data-testid="loader-sales-funnel" />
      </div>
    );
  }

  const contactsByStage: Record<string, SalesFunnelContact[]> = {};
  for (const stage of SALES_FUNNEL_STAGE_ORDER) {
    contactsByStage[stage] = contacts.filter((c) => c.stage === stage);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white" data-testid="text-sales-funnel-title">Sales Pipeline</h2>
          <p className="text-sm text-white/50">{contacts.length} total contacts</p>
        </div>
        <Button
          onClick={() => {
            setFormData(EMPTY_FORM);
            setAddDialogOpen(true);
          }}
          data-testid="button-add-contact"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Contact
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-board">
        {SALES_FUNNEL_STAGE_ORDER.map((stage) => (
          <div key={stage} className="flex-shrink-0 w-64" data-testid={`kanban-column-${stage}`}>
            <div className={`px-3 py-2 rounded-t-md flex items-center justify-between gap-2 ${STAGE_HEADER_COLORS[stage]}`}>
              <span className="text-sm font-medium">{SALES_FUNNEL_STAGE_LABELS[stage]}</span>
              <Badge variant="secondary" className="bg-white/10 text-white/70 text-xs">
                {contactsByStage[stage]?.length || 0}
              </Badge>
            </div>
            <div
              className={`border-x border-b rounded-b-md p-2 space-y-2 min-h-[200px] transition-colors duration-150 border-white/10 ${
                dragOverStage === stage ? "bg-white/10 ring-2 ring-inset ring-white/20" : ""
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverStage(stage);
              }}
              onDragLeave={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (
                  e.clientX < rect.left ||
                  e.clientX > rect.right ||
                  e.clientY < rect.top ||
                  e.clientY > rect.bottom
                ) {
                  if (dragOverStage === stage) setDragOverStage(null);
                }
              }}
              onDrop={(e) => handleDrop(e, stage)}
              data-testid={`kanban-drop-zone-${stage}`}
            >
              {contactsByStage[stage]?.length === 0 ? (
                <p className={`text-xs text-center py-8 ${dragOverStage === stage ? "text-white/50" : "text-white/30"}`}>
                  {dragOverStage === stage ? "Drop here" : "No contacts"}
                </p>
              ) : (
                contactsByStage[stage]?.map((contact) => (
                  <div
                    key={contact.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, contact.id)}
                    className={`p-3 bg-white/5 border border-white/10 rounded-md cursor-grab active:cursor-grabbing group transition-colors hover:bg-white/[0.08] border-l-2 ${STAGE_COLORS[stage]}`}
                    data-testid={`card-contact-${contact.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-1.5 flex-1 min-w-0">
                        <GripVertical className="h-4 w-4 text-white/20 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium text-white truncate" data-testid={`text-contact-name-${contact.id}`}>
                          {contact.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 invisible group-hover:visible">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-white/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(contact);
                          }}
                          data-testid={`button-edit-contact-${contact.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-white/40"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteContact(contact);
                          }}
                          data-testid={`button-delete-contact-${contact.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {contact.company && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/60">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate" data-testid={`text-contact-company-${contact.id}`}>{contact.company}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-white/60">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate" data-testid={`text-contact-email-${contact.id}`}>{contact.email}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <p className="text-xs text-white/40 mt-1.5 line-clamp-1" data-testid={`text-contact-notes-${contact.id}`}>
                        {contact.notes}
                      </p>
                    )}
                    <div className="text-[11px] text-white/30 mt-2" data-testid={`text-contact-time-${contact.id}`}>
                      {timeAgo(contact.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a new contact to the sales pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contact name"
                data-testid="input-contact-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-contact-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Company</label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company name"
                data-testid="input-contact-company"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 890"
                data-testid="input-contact-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Stage</label>
              <Select
                value={formData.stage}
                onValueChange={(val) => setFormData({ ...formData, stage: val as SalesFunnelStage })}
              >
                <SelectTrigger data-testid="select-contact-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALES_FUNNEL_STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s} data-testid={`select-option-stage-${s}`}>
                      {SALES_FUNNEL_STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
                data-testid="input-contact-notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add">
                Cancel
              </Button>
              <Button onClick={handleSubmitAdd} disabled={createMutation.isPending} data-testid="button-submit-add">
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Add Contact
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editContact} onOpenChange={(open) => { if (!open) setEditContact(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contact name"
                data-testid="input-edit-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
                data-testid="input-edit-email"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Company</label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company name"
                data-testid="input-edit-company"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 890"
                data-testid="input-edit-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Stage</label>
              <Select
                value={formData.stage}
                onValueChange={(val) => setFormData({ ...formData, stage: val as SalesFunnelStage })}
              >
                <SelectTrigger data-testid="select-edit-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALES_FUNNEL_STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s} data-testid={`select-edit-option-stage-${s}`}>
                      {SALES_FUNNEL_STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={3}
                data-testid="input-edit-notes"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditContact(null)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={updateMutation.isPending} data-testid="button-submit-edit">
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteContact} onOpenChange={(open) => { if (!open) setDeleteContact(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteContact?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteContact(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteContact) deleteMutation.mutate(deleteContact.id);
              }}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

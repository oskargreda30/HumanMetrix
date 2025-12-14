import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Building2, Users, Plus, Trash2, Edit, UserPlus, Loader2, Crown, User } from "lucide-react";
import type { Organization } from "@shared/schema";

interface OrganizationWithMembers extends Organization {
  memberCount: number;
  members: Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  }>;
}

export default function OrganizationsTab() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<OrganizationWithMembers | null>(null);
  const [newOrg, setNewOrg] = useState({ name: "", slug: "", maxSeats: 10 });
  const [newMember, setNewMember] = useState({ email: "", role: "candidate" });

  const { data: organizations, isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/admin/organizations"],
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: typeof newOrg) => {
      return apiRequest("POST", "/api/admin/organizations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      setIsCreateOpen(false);
      setNewOrg({ name: "", slug: "", maxSeats: 10 });
      toast({ title: "Organisation created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create organisation", description: error.message, variant: "destructive" });
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Organization> }) => {
      return apiRequest("PUT", `/api/admin/organizations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      setIsEditOpen(false);
      setSelectedOrg(null);
      toast({ title: "Organisation updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update organisation", description: error.message, variant: "destructive" });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/organizations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      toast({ title: "Organisation deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete organisation", description: error.message, variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ orgId, data }: { orgId: string; data: typeof newMember }) => {
      return apiRequest("POST", `/api/admin/organizations/${orgId}/members`, { userEmail: data.email, role: data.role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      if (selectedOrg) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations", selectedOrg.id] });
      }
      setIsAddMemberOpen(false);
      setNewMember({ email: "", role: "candidate" });
      toast({ title: "Member added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add member", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ orgId, memberId }: { orgId: string; memberId: string }) => {
      return apiRequest("DELETE", `/api/admin/organizations/${orgId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      if (selectedOrg) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations", selectedOrg.id] });
      }
      toast({ title: "Member removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ orgId, memberId, role }: { orgId: string; memberId: string; role: string }) => {
      return apiRequest("PUT", `/api/admin/organizations/${orgId}/members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations"] });
      if (selectedOrg) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/organizations", selectedOrg.id] });
      }
      toast({ title: "Member role updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update member role", description: error.message, variant: "destructive" });
    },
  });

  const fetchOrgDetails = async (org: Organization) => {
    try {
      const response = await fetch(`/api/admin/organizations/${org.id}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setSelectedOrg(data);
        setIsEditOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch org details:", error);
    }
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" data-testid="heading-organizations">Organisations</h2>
          <p className="text-muted-foreground">Manage employer organisations and their members</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-org">
              <Plus className="mr-2 h-4 w-4" />
              Create Organisation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organisation</DialogTitle>
              <DialogDescription>Add a new employer organisation to the platform</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organisation Name</Label>
                <Input
                  id="org-name"
                  data-testid="input-org-name"
                  value={newOrg.name}
                  onChange={(e) => {
                    setNewOrg({ ...newOrg, name: e.target.value, slug: generateSlug(e.target.value) });
                  }}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">URL Slug</Label>
                <Input
                  id="org-slug"
                  data-testid="input-org-slug"
                  value={newOrg.slug}
                  onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                  placeholder="acme-corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-seats">Maximum Seats</Label>
                <Input
                  id="org-seats"
                  data-testid="input-org-seats"
                  type="number"
                  value={newOrg.maxSeats}
                  onChange={(e) => setNewOrg({ ...newOrg, maxSeats: parseInt(e.target.value) || 10 })}
                  min={1}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button
                data-testid="button-submit-create-org"
                onClick={() => createOrgMutation.mutate(newOrg)}
                disabled={!newOrg.name || !newOrg.slug || createOrgMutation.isPending}
              >
                {createOrgMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations?.map((org) => (
          <Card key={org.id} data-testid={`card-org-${org.id}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">{org.name}</CardTitle>
              </div>
              <Badge variant={org.isActive ? "default" : "secondary"}>
                {org.isActive ? "Active" : "Inactive"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Max {org.maxSeats} seats</span>
                </div>
                <p className="text-xs text-muted-foreground">Slug: {org.slug}</p>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`button-edit-org-${org.id}`}
                    onClick={() => fetchOrgDetails(org)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Manage
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid={`button-delete-org-${org.id}`}
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${org.name}?`)) {
                        deleteOrgMutation.mutate(org.id);
                      }
                    }}
                    disabled={deleteOrgMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!organizations || organizations.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No organisations yet</p>
              <p className="text-sm text-muted-foreground">Create your first organisation to get started</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) setSelectedOrg(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Organisation: {selectedOrg?.name}</DialogTitle>
            <DialogDescription>Edit organisation details and manage members</DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organisation Name</Label>
                  <Input
                    data-testid="input-edit-org-name"
                    value={selectedOrg.name}
                    onChange={(e) => setSelectedOrg({ ...selectedOrg, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL Slug</Label>
                  <Input
                    data-testid="input-edit-org-slug"
                    value={selectedOrg.slug}
                    onChange={(e) => setSelectedOrg({ ...selectedOrg, slug: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Seats</Label>
                  <Input
                    data-testid="input-edit-org-seats"
                    type="number"
                    value={selectedOrg.maxSeats || 10}
                    onChange={(e) => setSelectedOrg({ ...selectedOrg, maxSeats: parseInt(e.target.value) || 10 })}
                    min={1}
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    data-testid="switch-org-active"
                    checked={selectedOrg.isActive}
                    onCheckedChange={(checked) => setSelectedOrg({ ...selectedOrg, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Members ({selectedOrg.memberCount})</h3>
                  <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-member">
                        <UserPlus className="mr-1 h-3 w-3" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                        <DialogDescription>Add an existing user to this organisation</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>User Email</Label>
                          <Input
                            data-testid="input-member-email"
                            value={newMember.email}
                            onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                            placeholder="user@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={newMember.role} onValueChange={(value) => setNewMember({ ...newMember, role: value })}>
                            <SelectTrigger data-testid="select-member-role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="candidate">Candidate</SelectItem>
                              <SelectItem value="admin">Organisation Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
                        <Button
                          data-testid="button-submit-add-member"
                          onClick={() => addMemberMutation.mutate({ orgId: selectedOrg.id, data: newMember })}
                          disabled={!newMember.email || addMemberMutation.isPending}
                        >
                          {addMemberMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Add
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {selectedOrg.members && selectedOrg.members.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrg.members.map((member) => (
                      <div
                        key={member.id}
                        data-testid={`member-row-${member.id}`}
                        className="flex items-center justify-between p-3 border rounded-md"
                      >
                        <div className="flex items-center gap-3">
                          {member.role === "admin" ? (
                            <Crown className="h-4 w-4 text-amber-500" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">
                              {member.firstName && member.lastName
                                ? `${member.firstName} ${member.lastName}`
                                : member.email}
                            </p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={(value) => {
                              updateMemberRoleMutation.mutate({
                                orgId: selectedOrg.id,
                                memberId: member.id,
                                role: value,
                              });
                            }}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-role-${member.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="candidate">Candidate</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`button-remove-member-${member.id}`}
                            onClick={() => {
                              if (confirm(`Remove ${member.email} from this organisation?`)) {
                                removeMemberMutation.mutate({ orgId: selectedOrg.id, memberId: member.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Close</Button>
            <Button
              data-testid="button-save-org"
              onClick={() => {
                if (selectedOrg) {
                  updateOrgMutation.mutate({
                    id: selectedOrg.id,
                    data: {
                      name: selectedOrg.name,
                      slug: selectedOrg.slug,
                      maxSeats: selectedOrg.maxSeats,
                      isActive: selectedOrg.isActive,
                    },
                  });
                }
              }}
              disabled={updateOrgMutation.isPending}
            >
              {updateOrgMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle, Clock, Users } from "lucide-react";
import { format } from "date-fns";

interface ConsentUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  resultsRetentionConsent: boolean | null;
  resultsRetentionConsentDate: string | null;
  createdAt: string | null;
}

export default function ConsentTab() {
  const [filter, setFilter] = useState<string>("opted_in");

  const { data: users, isLoading } = useQuery<ConsentUser[]>({
    queryKey: ["/api/admin/consent", filter],
    queryFn: async () => {
      const response = await fetch(`/api/admin/consent?filter=${filter}`);
      if (!response.ok) throw new Error("Failed to fetch consent data");
      return response.json();
    },
  });

  const getConsentBadge = (consent: boolean | null) => {
    if (consent === true) {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Opted In
        </Badge>
      );
    }
    if (consent === false) {
      return (
        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          Opted Out
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const optedInCount = filter === "opted_in" ? users?.length || 0 : 0;
  const optedOutCount = filter === "opted_out" ? users?.length || 0 : 0;
  const pendingCount = filter === "pending" ? users?.length || 0 : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Results Retention Consent
              </CardTitle>
              <CardDescription className="text-white/70">
                View users who have opted in or out of sharing their results for future opportunities
              </CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white" data-testid="select-consent-filter">
                <SelectValue placeholder="Filter by consent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opted_in">Opted In</SelectItem>
                <SelectItem value="opted_out">Opted Out</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" data-testid="loader-consent" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              No users found with {filter === "opted_in" ? "opt-in" : filter === "opted_out" ? "opt-out" : "pending"} consent status
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="outline" className="text-white/70 border-white/30">
                  {users.length} user{users.length !== 1 ? 's' : ''} found
                </Badge>
              </div>
              <div className="rounded-md border border-white/20 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/20 hover:bg-white/5">
                      <TableHead className="text-white/70">Email</TableHead>
                      <TableHead className="text-white/70">Name</TableHead>
                      <TableHead className="text-white/70">Consent Status</TableHead>
                      <TableHead className="text-white/70">Consent Date</TableHead>
                      <TableHead className="text-white/70">Account Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-white/10 hover:bg-white/5" data-testid={`row-consent-user-${user.id}`}>
                        <TableCell className="text-white font-medium">{user.email}</TableCell>
                        <TableCell className="text-white/80">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.firstName || user.lastName || '-'}
                        </TableCell>
                        <TableCell>{getConsentBadge(user.resultsRetentionConsent)}</TableCell>
                        <TableCell className="text-white/70">
                          {user.resultsRetentionConsentDate 
                            ? format(new Date(user.resultsRetentionConsentDate), 'dd MMM yyyy HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {user.createdAt 
                            ? format(new Date(user.createdAt), 'dd MMM yyyy')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

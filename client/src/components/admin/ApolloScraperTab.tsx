import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Phone,
  Mail,
  Building2,
  MapPin,
  User,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  title: string;
  headline: string;
  email: string | null;
  phone_numbers: Array<{ raw_number: string; type: string }>;
  city: string;
  state: string;
  country: string;
  linkedin_url: string;
  organization: {
    name: string;
    website_url: string;
    industry: string;
    estimated_num_employees: number;
  } | null;
}

interface SearchResult {
  people: ApolloContact[];
  total_entries: number;
  page: number;
  per_page: number;
}

const SENIORITY_OPTIONS = [
  { value: "c_suite", label: "C-Suite" },
  { value: "vp", label: "VP" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
];

const DEFAULT_TITLES = [
  "Managing Director",
  "CEO",
  "Director",
  "Head of Recruitment",
  "Senior Recruitment Consultant",
  "Recruitment Manager",
  "Talent Acquisition Director",
  "Partner",
];

export default function ApolloScraperTab() {
  const [location, setLocation] = useState("");
  const [titles, setTitles] = useState(DEFAULT_TITLES.slice(0, 3).join(", "));
  const [seniority, setSeniority] = useState<string[]>(["c_suite", "vp", "director"]);
  const [industry, setIndustry] = useState("staffing and recruiting");
  const [perPage, setPerPage] = useState("25");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [savedContacts, setSavedContacts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (searchPage: number) => {
      const titleList = titles.split(",").map(t => t.trim()).filter(Boolean);
      const res = await apiRequest("POST", "/api/admin/apollo/search", {
        person_titles: titleList,
        person_locations: location ? [location] : [],
        person_seniorities: seniority,
        organization_industry: industry || undefined,
        per_page: parseInt(perPage),
        page: searchPage,
      });
      return res.json() as Promise<SearchResult>;
    },
    onSuccess: (data, searchPage) => {
      setResults(data);
      setPage(searchPage);
    },
    onError: (err: Error) => {
      const isKeyMissing = err.message?.includes("API key not configured");
      toast({
        title: isKeyMissing ? "API Key Required" : "Search Failed",
        description: isKeyMissing
          ? "Please add your APOLLO_API_KEY to the Secrets tab to use this feature."
          : err.message,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setPage(1);
    searchMutation.mutate(1);
  };

  const handlePageChange = (newPage: number) => {
    searchMutation.mutate(newPage);
  };

  const toggleSeniority = (value: string) => {
    setSeniority(prev =>
      prev.includes(value)
        ? prev.filter(s => s !== value)
        : [...prev, value]
    );
  };

  const handleSaveToFunnel = async (contact: ApolloContact) => {
    try {
      await apiRequest("POST", "/api/admin/apollo/save-to-funnel", {
        name: `${contact.first_name} ${contact.last_name}`,
        email: contact.email || "",
        phone: contact.phone_numbers?.[0]?.raw_number || "",
        company: contact.organization?.name || "",
        title: contact.title || "",
        city: contact.city || "",
        country: contact.country || "",
        linkedin_url: contact.linkedin_url || "",
        source: "apollo_scraper",
      });
      setSavedContacts(prev => new Set(prev).add(contact.id));
      toast({ title: "Saved", description: `${contact.first_name} ${contact.last_name} added to Sales Funnel.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const exportCSV = () => {
    if (!results?.people?.length) return;
    const headers = ["Name", "Title", "Company", "Industry", "Email", "Phone", "City", "Country", "LinkedIn"];
    const rows = results.people.map(p => [
      `${p.first_name} ${p.last_name}`,
      p.title || "",
      p.organization?.name || "",
      p.organization?.industry || "",
      p.email || "",
      p.phone_numbers?.[0]?.raw_number || "",
      p.city || "",
      p.country || "",
      p.linkedin_url || "",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apollo-search-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = results ? Math.ceil(results.total_entries / parseInt(perPage)) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 flex-wrap" data-testid="text-scraper-title">
            <Search className="h-5 w-5" />
            Apollo.io Contact Search
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Search for senior executives at recruitment agencies by location. Powered by Apollo.io API.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scraper-location">City or Region</Label>
              <Input
                id="scraper-location"
                placeholder="e.g. London, UK or New York, US"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                data-testid="input-scraper-location"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scraper-industry">Industry</Label>
              <Input
                id="scraper-industry"
                placeholder="e.g. staffing and recruiting"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                data-testid="input-scraper-industry"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scraper-titles">Job Titles (comma separated)</Label>
            <Input
              id="scraper-titles"
              placeholder="Managing Director, CEO, Head of Recruitment"
              value={titles}
              onChange={(e) => setTitles(e.target.value)}
              data-testid="input-scraper-titles"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {DEFAULT_TITLES.map(t => (
                <Badge
                  key={t}
                  variant="outline"
                  className="cursor-pointer text-xs"
                  onClick={() => {
                    const current = titles.split(",").map(s => s.trim()).filter(Boolean);
                    if (!current.includes(t)) {
                      setTitles([...current, t].join(", "));
                    }
                  }}
                  data-testid={`badge-title-${t.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  + {t}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Seniority Level</Label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map(opt => (
                <Badge
                  key={opt.value}
                  variant={seniority.includes(opt.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleSeniority(opt.value)}
                  data-testid={`badge-seniority-${opt.value}`}
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-2">
              <Label>Results per page</Label>
              <Select value={perPage} onValueChange={setPerPage}>
                <SelectTrigger className="w-[100px]" data-testid="select-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              data-testid="button-search-apollo"
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base" data-testid="text-results-count">
                {results.total_entries.toLocaleString()} contacts found
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-csv">
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {results.people.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No contacts found matching your criteria. Try adjusting your filters.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.people.map((person) => (
                        <TableRow key={person.id} data-testid={`row-contact-${person.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div>
                                <div className="font-medium text-sm">{person.first_name} {person.last_name}</div>
                                {person.linkedin_url && (
                                  <a
                                    href={person.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-500 hover:underline inline-flex items-center gap-0.5"
                                    data-testid={`link-linkedin-${person.id}`}
                                  >
                                    LinkedIn <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{person.title || "—"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <div>
                                <div className="text-sm">{person.organization?.name || "—"}</div>
                                {person.organization?.industry && (
                                  <div className="text-xs text-muted-foreground">{person.organization.industry}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              {[person.city, person.state, person.country].filter(Boolean).join(", ") || "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {person.email && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate max-w-[180px]">{person.email}</span>
                                </div>
                              )}
                              {person.phone_numbers?.[0] && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                  {person.phone_numbers[0].raw_number}
                                </div>
                              )}
                              {!person.email && !person.phone_numbers?.length && (
                                <span className="text-xs text-muted-foreground">No contact info</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={savedContacts.has(person.id) ? "outline" : "default"}
                              disabled={savedContacts.has(person.id)}
                              onClick={() => handleSaveToFunnel(person)}
                              data-testid={`button-save-${person.id}`}
                            >
                              {savedContacts.has(person.id) ? "Saved" : "Add to Funnel"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground" data-testid="text-page-info">
                      Page {page} of {Math.min(totalPages, 500)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page <= 1 || searchMutation.isPending}
                        onClick={() => handlePageChange(page - 1)}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page >= Math.min(totalPages, 500) || searchMutation.isPending}
                        onClick={() => handlePageChange(page + 1)}
                        data-testid="button-next-page"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

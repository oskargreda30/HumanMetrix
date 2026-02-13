import { useState, useMemo, useRef, useEffect } from "react";
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
import { Loader2, Plus, Key, Trash2, Copy, Eye, EyeOff, Building2, Zap, AlertTriangle, Search, ArrowUpDown, Activity, CreditCard, BarChart3, Calendar, ChevronLeft, ChevronDown, Package, AlertCircle, RefreshCw, History, FileText, Send, CheckCircle, Mail, Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CURRENCIES, COUNTRY_PRICING_TIER, PPP_MULTIPLIERS } from "@shared/currencies";
import { COUNTRIES, formatPhoneNumber, getPhonePlaceholder } from "@shared/countries";
import { B2B_VOLUME_TIERS, ASSESSMENT_PRICES } from "@shared/schema";
import stripeLogo from "@assets/images_1769082266515.png";
import airwallexLogo from "@assets/images_1769082266514.jpg";

interface Partner {
  id: string;
  name: string;
  companyName: string | null;
  email: string;
  country: string | null;
  phone: string | null;
  monthlyQuota: number | null;
  pricePerAssessment: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePaymentMethodId: string | null;
  isActive: boolean;
  createdAt: string;
  currentMonthSessions: number;
  totalTestsCompleted: number;
  currentMonthBillable: number;
  activeApiKeys: number;
  totalApiKeys: number;
  lastApiActivity: string | null;
  billingType: 'payg' | 'subscription' | 'enterprise';
  freeTestsAllocated: number;
  prepaidBalance: number;
  currentMonthUsage: number;
  billingCycleAnchor: number | null;
  paymentTermsDays: number | null;
  invoiceNotes: string | null;
  invoiceContact: string | null;
  currency: string;
  organizationId: string | null;
  paymentProvider: 'stripe' | 'airwallex';
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
  isTestMode?: boolean;
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

interface PartnerInvoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  testsUsed: number;
  pricePerTest: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  notes: string | null;
  sentToEmail: string;
  createdAt: string;
}

interface PartnerOrganisation {
  id: string;
  partnerId: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactName: string | null;
  metadata: Record<string, any> | null;
  isActive: boolean;
  createdAt: string;
  apiKeyCount?: number;
  hasActiveKey?: boolean;
  apiKeys?: ApiKey[];
}

interface NewOrgApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  keyHint: string;
  fullKey: string;
  message: string;
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
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>("none");

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

  const { data: partnerInvoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery<PartnerInvoice[]>({
    queryKey: ["/api/admin/partners", detailPartner?.id, "invoices"],
    enabled: !!detailPartner && detailPartner.billingType === 'enterprise',
  });

  // Partner organisations query
  const { data: partnerOrgs, isLoading: orgsLoading, refetch: refetchOrgs } = useQuery<PartnerOrganisation[]>({
    queryKey: ["/api/admin/partners", detailPartner?.id, "organisations"],
    enabled: !!detailPartner,
  });

  // Organisation management state
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [newOrgApiKey, setNewOrgApiKey] = useState<NewOrgApiKey | null>(null);
  const [showNewOrgKey, setShowNewOrgKey] = useState(false);
  const [deleteOrgConfirm, setDeleteOrgConfirm] = useState<PartnerOrganisation | null>(null);

  // Invoice creation state
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [invoicePeriodStart, setInvoicePeriodStart] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [invoicePeriodEnd, setInvoicePeriodEnd] = useState(() => {
    const date = new Date();
    date.setDate(0); // Last day of previous month
    return date.toISOString().split('T')[0];
  });
  const [invoiceTestsUsed, setInvoiceTestsUsed] = useState("");
  const [invoiceVatRate, setInvoiceVatRate] = useState("20");
  const [invoiceNotes, setInvoiceNotes] = useState("");

  // Edit partner state
  const [isEditPartnerOpen, setIsEditPartnerOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPhoneCountry, setEditPhoneCountry] = useState("GB");
  const [editCurrency, setEditCurrency] = useState("GBP");
  const [editPricePerAssessment, setEditPricePerAssessment] = useState(500);
  const [editAdditionalFreeTests, setEditAdditionalFreeTests] = useState(0);
  const [editCurrentFreeTests, setEditCurrentFreeTests] = useState(0);
  const [editBillingType, setEditBillingType] = useState<"payg" | "subscription" | "enterprise">("payg");
  const [editBillingCycleAnchor, setEditBillingCycleAnchor] = useState(1);
  const [editPaymentTerms, setEditPaymentTerms] = useState(30);
  const [editInvoiceContact, setEditInvoiceContact] = useState("");
  const [editInvoiceNotes, setEditInvoiceNotes] = useState("");
  const [editOrganizationId, setEditOrganizationId] = useState("none");
  const [editIsActive, setEditIsActive] = useState(true);
  
  // Edit dropdowns state
  const [editCountryDropdownOpen, setEditCountryDropdownOpen] = useState(false);
  const [editPhoneCodeDropdownOpen, setEditPhoneCodeDropdownOpen] = useState(false);
  const [editCountrySearch, setEditCountrySearch] = useState("");
  const [editPhoneCodeSearch, setEditPhoneCodeSearch] = useState("");
  const [editCountryHighlightIndex, setEditCountryHighlightIndex] = useState(0);
  const [editPhoneCodeHighlightIndex, setEditPhoneCodeHighlightIndex] = useState(0);
  const editCountryDropdownRef = useRef<HTMLDivElement>(null);
  const editPhoneCodeDropdownRef = useRef<HTMLDivElement>(null);
  const editCountryListRef = useRef<HTMLDivElement>(null);
  const editPhoneCodeListRef = useRef<HTMLDivElement>(null);
  
  // Track original values for change detection
  const [originalEditValues, setOriginalEditValues] = useState<{
    currency: string;
    pricePerAssessment: number;
    billingType: string;
    billingCycleAnchor: number;
    paymentTerms: number;
    organizationId: string;
    isActive: boolean;
  } | null>(null);

  const openEditPartnerDialog = (partner: Partner) => {
    setEditName(partner.name || "");
    setEditCompanyName(partner.companyName || "");
    setEditEmail(partner.email || "");
    setEditCountry(partner.country || "");
    // Parse phone to extract country code if possible
    const phoneCountryMatch = COUNTRIES.find(c => partner.phone?.startsWith(c.dialCode));
    if (phoneCountryMatch) {
      setEditPhoneCountry(phoneCountryMatch.code);
      setEditPhone(partner.phone?.replace(phoneCountryMatch.dialCode, "").trim() || "");
    } else {
      setEditPhoneCountry(partner.country || "GB");
      setEditPhone(partner.phone || "");
    }
    setEditCurrency(partner.currency || "GBP");
    setEditPricePerAssessment(partner.pricePerAssessment || 500);
    setEditCurrentFreeTests(partner.freeTestsAllocated || 0);
    setEditAdditionalFreeTests(0); // Start with 0 additional credits
    setEditBillingType((partner.billingType as "payg" | "subscription" | "enterprise") || "payg");
    setEditBillingCycleAnchor(partner.billingCycleAnchor || 1);
    setEditPaymentTerms(partner.paymentTermsDays || 30);
    setEditInvoiceContact(partner.invoiceContact || "");
    setEditInvoiceNotes(partner.invoiceNotes || "");
    setEditOrganizationId(partner.organizationId || "none");
    setEditIsActive(partner.isActive !== false);
    // Store original values for change detection
    setOriginalEditValues({
      currency: partner.currency || "GBP",
      pricePerAssessment: partner.pricePerAssessment || 500,
      billingType: (partner.billingType as string) || "payg",
      billingCycleAnchor: partner.billingCycleAnchor || 1,
      paymentTerms: partner.paymentTermsDays || 30,
      organizationId: partner.organizationId || "none",
      isActive: partner.isActive !== false,
    });
    // Reset dropdown states
    setEditCountryDropdownOpen(false);
    setEditPhoneCodeDropdownOpen(false);
    setEditCountrySearch("");
    setEditPhoneCodeSearch("");
    setIsEditPartnerOpen(true);
  };
  
  // Edit dialog filtered lists
  const editFilteredCountries = useMemo(() => {
    if (!editCountrySearch.trim()) return COUNTRIES;
    const search = editCountrySearch.toLowerCase();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.code.toLowerCase().includes(search)
    );
  }, [editCountrySearch]);

  const editFilteredPhoneCodes = useMemo(() => {
    if (!editPhoneCodeSearch.trim()) return COUNTRIES;
    const search = editPhoneCodeSearch.toLowerCase();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search)
    );
  }, [editPhoneCodeSearch]);
  
  const editSelectedPhoneCountryData = COUNTRIES.find(c => c.code === editPhoneCountry);
  
  const handleEditPhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value, editPhoneCountry);
    setEditPhone(formatted);
  };
  
  const handleEditCountryChange = (countryCode: string) => {
    setEditCountry(countryCode);
    setEditCountryDropdownOpen(false);
    setEditCountrySearch("");
    setEditCountryHighlightIndex(0);
    // Auto-set phone country code to match selected country
    setEditPhoneCountry(countryCode);
  };

  const handleEditPhoneCodeSelect = (countryCode: string) => {
    setEditPhoneCountry(countryCode);
    setEditPhoneCodeDropdownOpen(false);
    setEditPhoneCodeSearch("");
    setEditPhoneCodeHighlightIndex(0);
  };

  const updatePartnerMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const response = await apiRequest("PUT", `/api/admin/partners/${detailPartner?.id}`, data);
      return response.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setDetailPartner(updated);
      setIsEditPartnerOpen(false);
      toast({ title: "Partner Updated", description: "Partner account has been updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message || "Failed to update partner", variant: "destructive" });
    },
  });

  const handleUpdatePartner = () => {
    // Build the full phone number with country code
    const fullPhone = editPhone ? `${editSelectedPhoneCountryData?.dialCode || ""} ${editPhone}`.trim() : "";
    
    // Calculate new free credits total (current + additional)
    const newFreeTestsAllocated = editCurrentFreeTests + editAdditionalFreeTests;
    
    // Check if billing/pricing/account settings changed
    const billingChanged = originalEditValues && (
      originalEditValues.currency !== editCurrency ||
      originalEditValues.pricePerAssessment !== editPricePerAssessment ||
      originalEditValues.billingType !== editBillingType ||
      originalEditValues.billingCycleAnchor !== editBillingCycleAnchor ||
      originalEditValues.paymentTerms !== editPaymentTerms ||
      originalEditValues.organizationId !== editOrganizationId ||
      originalEditValues.isActive !== editIsActive ||
      editAdditionalFreeTests > 0
    );
    
    updatePartnerMutation.mutate({
      name: editName,
      companyName: editCompanyName,
      email: editEmail,
      country: editCountry,
      phone: fullPhone,
      currency: editCurrency,
      pricePerAssessment: editPricePerAssessment,
      freeTestsAllocated: newFreeTestsAllocated,
      billingType: editBillingType,
      billingCycleAnchor: editBillingCycleAnchor,
      paymentTermsDays: editPaymentTerms,
      invoiceContact: editInvoiceContact,
      invoiceNotes: editInvoiceNotes,
      organizationId: editOrganizationId === "none" ? null : editOrganizationId,
      isActive: editIsActive,
      notifyPartner: billingChanged, // Signal backend to send notification
    });
  };

  const sendInvoiceMutation = useMutation({
    mutationFn: async (data: { periodStart: string; periodEnd: string; testsUsed: number; vatRate: number; notes: string }) => {
      const response = await apiRequest("POST", `/api/admin/partners/${detailPartner?.id}/invoices`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Sent",
        description: data.message || `Invoice sent successfully to ${detailPartner?.email}`,
      });
      setIsInvoiceDialogOpen(false);
      refetchInvoices();
      // Reset form
      setInvoiceTestsUsed("");
      setInvoiceNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Invoice",
        description: error.message || "Could not send invoice",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/invoices/${invoiceId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice Updated", description: "Invoice status updated successfully" });
      refetchInvoices();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Invoice",
        description: error.message || "Could not update invoice",
        variant: "destructive",
      });
    },
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

  const [billingType, setBillingType] = useState<"payg" | "subscription" | "enterprise">("payg");
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "airwallex">("airwallex");
  const [freeTests, setFreeTests] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<number>(30);
  const [billingCycleAnchor, setBillingCycleAnchor] = useState<number>(1);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("GBP");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<string>("GB");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [countrySearch, setCountrySearch] = useState<string>("");
  const [phoneCodeSearch, setPhoneCodeSearch] = useState<string>("");
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [phoneCodeDropdownOpen, setPhoneCodeDropdownOpen] = useState(false);
  const [countryHighlightIndex, setCountryHighlightIndex] = useState(0);
  const [phoneCodeHighlightIndex, setPhoneCodeHighlightIndex] = useState(0);
  const [currencySearch, setCurrencySearch] = useState<string>("");
  const [createPricePerAssessment, setCreatePricePerAssessment] = useState<string>("");
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [currencyHighlightIndex, setCurrencyHighlightIndex] = useState(0);
  const [editCurrencySearch, setEditCurrencySearch] = useState<string>("");
  const [editCurrencyDropdownOpen, setEditCurrencyDropdownOpen] = useState(false);
  const [editCurrencyHighlightIndex, setEditCurrencyHighlightIndex] = useState(0);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const phoneCodeDropdownRef = useRef<HTMLDivElement>(null);
  const countryListRef = useRef<HTMLDivElement>(null);
  const phoneCodeListRef = useRef<HTMLDivElement>(null);
  const currencyDropdownRef = useRef<HTMLDivElement>(null);
  const currencyListRef = useRef<HTMLDivElement>(null);
  const editCurrencyDropdownRef = useRef<HTMLDivElement>(null);
  const editCurrencyListRef = useRef<HTMLDivElement>(null);
  
  const selectedPhoneCountryData = COUNTRIES.find(c => c.code === selectedPhoneCountry);
  
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value, selectedPhoneCountry);
    setPhoneNumber(formatted);
  };
  
  const handlePhoneCountryChange = (countryCode: string) => {
    setSelectedPhoneCountry(countryCode);
    if (phoneNumber) {
      const formatted = formatPhoneNumber(phoneNumber, countryCode);
      setPhoneNumber(formatted);
    }
  };

  // Country to currency mapping for auto-recommendation
  const COUNTRY_TO_CURRENCY: Record<string, string> = {
    // Europe
    GB: 'GBP', UK: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR',
    AT: 'EUR', GR: 'EUR', FI: 'EUR', LU: 'EUR', MT: 'EUR', CY: 'EUR', EE: 'EUR', LV: 'EUR', LT: 'EUR', SK: 'EUR',
    SI: 'EUR', HR: 'EUR', CH: 'CHF', NO: 'NOK', SE: 'SEK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON',
    BG: 'BGN', RS: 'RSD', UA: 'UAH', RU: 'RUB', BY: 'BYN', MD: 'MDL', AL: 'ALL', MK: 'MKD', BA: 'BAM', ME: 'EUR',
    XK: 'EUR', IS: 'ISK', LI: 'CHF', AD: 'EUR', MC: 'EUR', SM: 'EUR', VA: 'EUR',
    // Americas
    US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', VE: 'VES', EC: 'USD',
    BO: 'BOB', PY: 'PYG', UY: 'UYU', GY: 'GYD', SR: 'SRD', GT: 'GTQ', HN: 'HNL', SV: 'USD', NI: 'NIO', CR: 'CRC',
    PA: 'USD', BZ: 'BZD', CU: 'CUP', DO: 'DOP', HT: 'HTG', JM: 'JMD', TT: 'TTD', BB: 'BBD', BS: 'BSD', PR: 'USD',
    // Asia Pacific
    AU: 'AUD', NZ: 'NZD', JP: 'JPY', KR: 'KRW', CN: 'CNY', HK: 'HKD', TW: 'TWD', SG: 'SGD', MY: 'MYR', TH: 'THB',
    ID: 'IDR', PH: 'PHP', VN: 'VND', IN: 'INR', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR', MM: 'MMK', KH: 'KHR',
    LA: 'LAK', BN: 'BND', MO: 'MOP', MN: 'MNT', KZ: 'KZT', UZ: 'UZS', TM: 'TMT', KG: 'KGS', TJ: 'TJS', AZ: 'AZN',
    AM: 'AMD', GE: 'GEL', FJ: 'FJD', PG: 'PGK', WS: 'WST', TO: 'TOP', VU: 'VUV', SB: 'SBD',
    // Middle East & North Africa
    AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', JO: 'JOD', LB: 'LBP', IQ: 'IQD', IR: 'IRR',
    IL: 'ILS', PS: 'ILS', SY: 'SYP', YE: 'YER', EG: 'EGP', LY: 'LYD', TN: 'TND', DZ: 'DZD', MA: 'MAD', TR: 'TRY',
    // Sub-Saharan Africa
    ZA: 'ZAR', NG: 'NGN', KE: 'KES', GH: 'GHS', TZ: 'TZS', UG: 'UGX', RW: 'RWF', ET: 'ETB', MW: 'MWK', ZM: 'ZMW',
    ZW: 'ZWL', BW: 'BWP', NA: 'NAD', MZ: 'MZN', AO: 'AOA', CM: 'XAF', CI: 'XOF', SN: 'XOF', ML: 'XOF', BF: 'XOF',
    NE: 'XOF', TG: 'XOF', BJ: 'XOF', GA: 'XAF', CG: 'XAF', CD: 'CDF', MU: 'MUR', SC: 'SCR', MG: 'MGA',
  };

  // Calculate suggested B2B pricing based on country's PPP tier
  const getSuggestedPricing = (countryCode: string, currencyCode: string): { 
    suggestedPrice: number | null; 
    tierName: string; 
    inDatabase: boolean;
  } => {
    const pricingTier = COUNTRY_PRICING_TIER[countryCode];
    if (!pricingTier || pricingTier === 'sea_launch') {
      return { suggestedPrice: null, tierName: '', inDatabase: false };
    }
    
    // Use average of ASSESSMENT_PRICES as the base (in GBP pence)
    const assessmentPriceValues = Object.values(ASSESSMENT_PRICES) as number[];
    const avgPriceGbpPence = Math.round(
      assessmentPriceValues.reduce((sum: number, p: number) => sum + p, 0) / assessmentPriceValues.length
    );
    
    const multiplier = PPP_MULTIPLIERS[pricingTier];
    const adjustedPriceGbpPence = Math.round(avgPriceGbpPence * multiplier);
    
    // Convert from GBP pence to target currency's minor units
    const targetConfig = CURRENCIES[currencyCode];
    if (!targetConfig) {
      return { suggestedPrice: adjustedPriceGbpPence, tierName: pricingTier, inDatabase: true };
    }
    
    // GBP to target: multiply by target exchange rate
    const priceInTargetMinor = Math.round(adjustedPriceGbpPence * targetConfig.exchangeRate);
    
    return { suggestedPrice: priceInTargetMinor, tierName: pricingTier, inDatabase: true };
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setCountryDropdownOpen(false);
    setCountrySearch("");
    setCountryHighlightIndex(0);
    // Auto-recommend currency based on country
    const recommendedCurrency = COUNTRY_TO_CURRENCY[countryCode];
    if (recommendedCurrency && CURRENCIES[recommendedCurrency]) {
      setSelectedCurrency(recommendedCurrency);
    }
    // Auto-set phone country code to match selected country
    setSelectedPhoneCountry(countryCode);
  };

  const handlePhoneCodeSelect = (countryCode: string) => {
    handlePhoneCountryChange(countryCode);
    setPhoneCodeDropdownOpen(false);
    setPhoneCodeSearch("");
    setPhoneCodeHighlightIndex(0);
  };

  // Filtered lists for search
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const search = countrySearch.toLowerCase();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.code.toLowerCase().includes(search)
    );
  }, [countrySearch]);

  const filteredPhoneCodes = useMemo(() => {
    if (!phoneCodeSearch.trim()) return COUNTRIES;
    const search = phoneCodeSearch.toLowerCase();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search)
    );
  }, [phoneCodeSearch]);

  const sortedCurrencies = useMemo(() => 
    Object.values(CURRENCIES).sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  const filteredCurrencies = useMemo(() => {
    if (!currencySearch.trim()) return sortedCurrencies;
    const search = currencySearch.toLowerCase();
    return sortedCurrencies.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.code.toLowerCase().includes(search)
    );
  }, [currencySearch, sortedCurrencies]);

  const filteredEditCurrencies = useMemo(() => {
    if (!editCurrencySearch.trim()) return sortedCurrencies;
    const search = editCurrencySearch.toLowerCase();
    return sortedCurrencies.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.code.toLowerCase().includes(search)
    );
  }, [editCurrencySearch, sortedCurrencies]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
      if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target as Node)) {
        setPhoneCodeDropdownOpen(false);
      }
      if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
      // Edit dialog dropdowns
      if (editCountryDropdownRef.current && !editCountryDropdownRef.current.contains(event.target as Node)) {
        setEditCountryDropdownOpen(false);
      }
      if (editPhoneCodeDropdownRef.current && !editPhoneCodeDropdownRef.current.contains(event.target as Node)) {
        setEditPhoneCodeDropdownOpen(false);
      }
      if (editCurrencyDropdownRef.current && !editCurrencyDropdownRef.current.contains(event.target as Node)) {
        setEditCurrencyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const createPartnerMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      companyName: string; 
      email: string; 
      country?: string;
      phone?: string;
      currency?: string;
      pricePerAssessment: number; 
      organizationId?: string;
      billingType: 'payg' | 'subscription' | 'enterprise';
      paymentProvider: 'stripe' | 'airwallex';
      freeTestsAllocated: number;
      prepaidBalance?: number;
      billingCycleAnchor?: number;
      paymentTermsDays?: number;
      invoiceNotes?: string;
      invoiceContact?: string;
    }) => {
      const res = await apiRequest("POST", "/api/admin/partners", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setIsCreateOpen(false);
      setSelectedOrganizationId("");
      setBillingType("payg");
      setPaymentProvider("stripe");
      setFreeTests(0);
      setPaymentTerms(30);
      setBillingCycleAnchor(1);
      setSelectedCountry("");
      setSelectedPhoneCountry("GB");
      setPhoneNumber("");
      setSelectedCurrency("GBP");
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
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/partners"] });
      const previousPartners = queryClient.getQueryData<Partner[]>(["/api/admin/partners"]);
      queryClient.setQueryData<Partner[]>(["/api/admin/partners"], (old) =>
        old?.map((p) => (p.id === data.id ? { ...p, isActive: data.isActive } : p))
      );
      return { previousPartners };
    },
    onError: (_err, _data, context) => {
      if (context?.previousPartners) {
        queryClient.setQueryData(["/api/admin/partners"], context.previousPartners);
      }
      toast({ title: "Error", description: "Failed to update partner status", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
    },
  });

  const [creditAmount, setCreditAmount] = useState(10);
  const [creditReason, setCreditReason] = useState("");

  const manualCreditMutation = useMutation({
    mutationFn: async (data: { partnerId: string; quantity: number; reason: string }) => {
      const res = await apiRequest("POST", `/api/admin/partners/${data.partnerId}/credit`, { amount: data.quantity, description: data.reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", detailPartner?.id, "quota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", detailPartner?.id, "ledger"] });
      setCreditAmount(10);
      setCreditReason("");
      toast({ title: "Credits added", description: `${creditAmount} credits added successfully.` });
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

  // Delete partner state and mutation
  const [deleteConfirmPartner, setDeleteConfirmPartner] = useState<Partner | null>(null);
  
  // Track which partner is having their email resent
  const [resendingEmailPartnerId, setResendingEmailPartnerId] = useState<string | null>(null);

  const deletePartnerMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/partners/${partnerId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners"] });
      setDeleteConfirmPartner(null);
      setDetailPartner(null);
      toast({ title: "Partner deleted", description: "Partner account has been permanently deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete partner", variant: "destructive" });
    },
  });

  const resendWelcomeEmailMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      setResendingEmailPartnerId(partnerId);
      const res = await apiRequest("POST", `/api/admin/partners/${partnerId}/resend-welcome`);
      return res.json();
    },
    onSuccess: (data) => {
      setResendingEmailPartnerId(null);
      toast({ title: "Email sent", description: `Welcome email with new credentials sent to ${data.email}` });
    },
    onError: (error: any) => {
      setResendingEmailPartnerId(null);
      toast({ title: "Error", description: error.message || "Failed to send welcome email", variant: "destructive" });
    },
  });

  // Organisation mutations
  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; contactEmail?: string; contactName?: string }) => {
      const res = await apiRequest("POST", `/api/admin/partners/${detailPartner?.id}/organisations`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", detailPartner?.id, "organisations"] });
      setIsCreateOrgOpen(false);
      setShowNewOrgKey(false); // Reset reveal state for new key
      setNewOrgApiKey(data.apiKey);
      toast({ title: "Organisation created", description: "A new API key has been generated for this organisation." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create organisation", variant: "destructive" });
    },
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/partners/${detailPartner?.id}/organisations/${orgId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partners", detailPartner?.id, "organisations"] });
      setDeleteOrgConfirm(null);
      toast({ title: "Organisation deleted", description: "Organisation and associated API keys have been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete organisation", variant: "destructive" });
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
      country: (formData.get("country") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      currency: selectedCurrency,
      pricePerAssessment: parseInt(formData.get("pricePerAssessment") as string) || 500,
      organizationId: selectedOrganizationId !== "none" ? selectedOrganizationId : undefined,
      billingType,
      paymentProvider,
      freeTestsAllocated: freeTests,
      // PAYG and Enterprise use prepaid balance
      prepaidBalance: (billingType === "payg" || billingType === "enterprise") ? freeTests : undefined,
      // Subscription uses billing cycle
      billingCycleAnchor: billingType === "subscription" ? billingCycleAnchor : undefined,
      // Enterprise uses invoice fields
      paymentTermsDays: billingType === "enterprise" ? paymentTerms : undefined,
      invoiceNotes: billingType === "enterprise" ? (formData.get("invoiceNotes") as string) : undefined,
      invoiceContact: billingType === "enterprise" ? (formData.get("invoiceContact") as string) : undefined,
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

  const formatCurrency = (pence: number, currency?: string) => {
    const currencySymbols: Record<string, string> = {
      gbp: '£', usd: '$', eur: '€', aud: 'A$', cad: 'C$', sgd: 'S$', hkd: 'HK$', jpy: '¥',
      inr: '₹', myr: 'RM', thb: '฿', php: '₱', idr: 'Rp', vnd: '₫', bdt: '৳', pkr: '₨',
      lkr: 'Rs', mmk: 'K', khr: '៛', npr: '₨', try: '₺', egp: 'E£', ngn: '₦', kes: 'KSh',
      zar: 'R', brl: 'R$', mxn: 'MX$', ars: 'AR$',
    };
    const symbol = currencySymbols[(currency || 'gbp').toLowerCase()] || '£';
    return `${symbol}${(pence / 100).toFixed(2)}`;
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
                <CardDescription className="text-white/70 mt-1 flex items-center gap-2 flex-wrap">
                  {detailPartner.email}
                  <span className="inline-flex items-center gap-1.5 bg-white/10 rounded px-2 py-0.5" data-testid="badge-payment-provider">
                    <img
                      src={detailPartner.paymentProvider === 'airwallex' ? airwallexLogo : stripeLogo}
                      alt={detailPartner.paymentProvider === 'airwallex' ? 'Airwallex' : 'Stripe'}
                      className="h-4 object-contain rounded-sm"
                    />
                    <span className="text-xs text-white/70">
                      {detailPartner.paymentProvider === 'airwallex' ? 'Airwallex' : 'Stripe'}
                    </span>
                  </span>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge className={detailPartner.isActive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}>
                  {detailPartner.isActive ? "Active" : "Inactive"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => openEditPartnerDialog(detailPartner)} className="bg-white/10 border-white/30 text-white hover:bg-white/20" data-testid="button-edit-partner">
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedPartner(detailPartner)} className="bg-white/10 border-white/30 text-white hover:bg-white/20" data-testid="button-manage-api-keys">
                  <Key className="h-4 w-4 mr-1" />
                  Manage API Keys
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmPartner(detailPartner)} className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20" data-testid="button-delete-partner-detail">
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-1">This Month</div>
                <div className="text-2xl font-bold text-white">{detailPartner.currentMonthSessions}</div>
                <div className="text-white/50 text-xs">credits completed</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-1">All Time</div>
                <div className="text-2xl font-bold text-white">{detailPartner.totalTestsCompleted}</div>
                <div className="text-white/50 text-xs">credits completed</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/60 text-sm mb-1">Monthly Billable</div>
                <div className="text-2xl font-bold text-cyan-400">{formatCurrency(detailPartner.currentMonthBillable, detailPartner.currency)}</div>
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
                <TabsTrigger value="organisations" className="data-[state=active]:bg-white/20 text-white/70 data-[state=active]:text-white" data-testid="tab-organisations">
                  <Building2 className="h-4 w-4 mr-2" />
                  Organisations
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
                        <TableHead className="text-white/70">Type</TableHead>
                        <TableHead className="text-white/70">Amount</TableHead>
                        <TableHead className="text-white/70">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partnerUsage.recentEvents.slice(0, 20).map((event) => {
                        const testType = event.isTestMode 
                          ? 'test' 
                          : event.billable 
                            ? 'billed' 
                            : 'free';
                        return (
                          <TableRow key={event.id} className="border-white/10">
                            <TableCell className="text-white">
                              <Badge variant="outline" className="border-white/30 text-white/80">
                                {event.eventType.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white/80">{event.assessmentType || "-"}</TableCell>
                            <TableCell>
                              {testType === 'test' ? (
                                <Badge className="bg-purple-500/20 text-purple-300">Assessment Session</Badge>
                              ) : testType === 'free' ? (
                                <Badge className="bg-blue-500/20 text-blue-300">Free Credit</Badge>
                              ) : (
                                <Badge className="bg-green-500/20 text-green-300">Billed</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-white/80">
                              {event.billedAmount ? formatCurrency(event.billedAmount, detailPartner.currency) : "-"}
                            </TableCell>
                            <TableCell className="text-white/60 text-sm">{formatDate(event.createdAt)}</TableCell>
                          </TableRow>
                        );
                      })}
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
                          <div className="text-red-400/80 text-sm">This partner's API access has been suspended due to quota exhaustion. Add credits or reactivate to restore access.</div>
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
                        <div className="text-white/60 text-sm mb-1">
                          {(() => {
                            const freeTests = partnerQuota?.freeTestsAllocated || 0;
                            const totalTests = partnerQuota?.testsPurchased || 0;
                            const actualPurchased = totalTests - freeTests;
                            if (detailPartner?.billingType === 'enterprise') return 'Test Quota';
                            if (actualPurchased === 0 && freeTests > 0) return 'Free Credits';
                            return 'Total Credits';
                          })()}
                        </div>
                        <div className="text-2xl font-bold text-white">{partnerQuota?.testsPurchased || 0}</div>
                        <div className="text-white/50 text-xs">
                          {(() => {
                            const freeTests = partnerQuota?.freeTestsAllocated || 0;
                            const totalTests = partnerQuota?.testsPurchased || 0;
                            const actualPurchased = totalTests - freeTests;
                            if (detailPartner?.billingType === 'enterprise') return 'allocated credits';
                            if (actualPurchased === 0 && freeTests > 0) return 'complimentary';
                            if (freeTests > 0) return `${actualPurchased} purchased + ${freeTests} free`;
                            return 'total credits';
                          })()}
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4">
                        <div className="text-white/60 text-sm mb-1">Credits Used</div>
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
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
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
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
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
                      <div className="text-white/60 text-sm mb-1">Price Per Credit</div>
                      <div className="text-xl font-bold text-white">{formatCurrency(detailPartner.pricePerAssessment, detailPartner.currency)}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm mb-1">Monthly Quota</div>
                      <div className="text-xl font-bold text-white">
                        {detailPartner.billingType === 'payg' || detailPartner.billingType === 'enterprise' 
                          ? `${detailPartner.prepaidBalance || 0} credits`
                          : detailPartner.monthlyQuota || "Unlimited"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-2">Billing Configuration</div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 text-sm">Billing Model:</span>
                        {detailPartner.billingType === 'payg' ? (
                          <Badge className="bg-cyan-500/20 text-cyan-300">Pay As You Go (PAYG)</Badge>
                        ) : detailPartner.billingType === 'subscription' ? (
                          <Badge className="bg-green-500/20 text-green-300">Subscription + Auto-Bill</Badge>
                        ) : (
                          <Badge className="bg-purple-500/20 text-purple-300">Enterprise Prepayment</Badge>
                        )}
                      </div>
                      
                      {/* PAYG balance */}
                      {(detailPartner.billingType === 'payg' || detailPartner.billingType === 'enterprise') && (
                        <div className="flex items-center gap-3">
                          <span className="text-white/60 text-sm">Credit Balance:</span>
                          <span className="text-white font-bold">{detailPartner.prepaidBalance || 0} tests</span>
                        </div>
                      )}
                      
                      {/* Subscription monthly usage */}
                      {detailPartner.billingType === 'subscription' && (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm">Current Month Usage:</span>
                            <span className="text-white font-bold">{detailPartner.currentMonthUsage || 0} tests</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm">Billing Cycle:</span>
                            <span className="text-white">Day {detailPartner.billingCycleAnchor || 1} of each month</span>
                          </div>
                          {detailPartner.stripePaymentMethodId ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500/20 text-green-300">Card on File</Badge>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-500/20 text-amber-300">No Card on File</Badge>
                              <span className="text-amber-300 text-xs">Card required for subscription</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Enterprise settings */}
                      {detailPartner.billingType === 'enterprise' && (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm">Current Month Usage:</span>
                            <span className="text-white font-bold">{detailPartner.currentMonthUsage || 0} tests</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-white/60 text-sm">Payment Terms:</span>
                            <span className="text-white">Net {detailPartner.paymentTermsDays || 30}</span>
                          </div>
                          {detailPartner.invoiceContact && (
                            <div className="flex items-center gap-3">
                              <span className="text-white/60 text-sm">Invoice Contact:</span>
                              <span className="text-white">{detailPartner.invoiceContact}</span>
                            </div>
                          )}
                          {detailPartner.invoiceNotes && (
                            <div className="pt-2 border-t border-white/10">
                              <span className="text-white/60 text-sm">Invoice Notes:</span>
                              <p className="text-white/80 text-sm mt-1">{detailPartner.invoiceNotes}</p>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Free tests allocation */}
                      {detailPartner.freeTestsAllocated > 0 && (
                        <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                          <span className="text-white/60 text-sm">Welcome Package:</span>
                          <Badge className="bg-green-500/20 text-green-300">{detailPartner.freeTestsAllocated} Free Credits</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-2">Payment Integration</div>
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

                  {/* Invoice Management Section - Only for Invoice-billed Partners */}
                  {detailPartner.billingType === 'enterprise' && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-purple-400" />
                          <span className="text-white font-medium">Invoice Management</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
                          onClick={() => setIsInvoiceDialogOpen(true)}
                          data-testid="button-send-invoice"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Invoice
                        </Button>
                      </div>

                      {/* Invoice History */}
                      {invoicesLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
                        </div>
                      ) : partnerInvoices && partnerInvoices.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-white/60 text-sm mb-2">Invoice History</div>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-white/10">
                                <TableHead className="text-white/60">Invoice</TableHead>
                                <TableHead className="text-white/60">Period</TableHead>
                                <TableHead className="text-white/60">Tests</TableHead>
                                <TableHead className="text-white/60">Total</TableHead>
                                <TableHead className="text-white/60">Status</TableHead>
                                <TableHead className="text-white/60">Due</TableHead>
                                <TableHead className="text-white/60"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {partnerInvoices.map((invoice) => (
                                <TableRow key={invoice.id} className="border-white/10" data-testid={`row-invoice-${invoice.id}`}>
                                  <TableCell className="text-white font-mono text-sm" data-testid={`text-invoice-number-${invoice.id}`}>
                                    {invoice.invoiceNumber}
                                  </TableCell>
                                  <TableCell className="text-white/80 text-sm" data-testid={`text-invoice-period-${invoice.id}`}>
                                    {new Date(invoice.periodStart).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - {new Date(invoice.periodEnd).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </TableCell>
                                  <TableCell className="text-white/80" data-testid={`text-invoice-tests-${invoice.id}`}>{invoice.testsUsed}</TableCell>
                                  <TableCell className="text-white font-medium" data-testid={`text-invoice-total-${invoice.id}`}>
                                    {invoice.currency === 'gbp' ? '£' : invoice.currency === 'usd' ? '$' : '€'}{invoice.totalAmount.toFixed(2)}
                                  </TableCell>
                                  <TableCell data-testid={`text-invoice-status-${invoice.id}`}>
                                    <Badge className={
                                      invoice.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                                      invoice.status === 'overdue' ? 'bg-red-500/20 text-red-300' :
                                      invoice.status === 'cancelled' ? 'bg-gray-500/20 text-gray-300' :
                                      'bg-amber-500/20 text-amber-300'
                                    }>
                                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-white/60 text-sm" data-testid={`text-invoice-due-${invoice.id}`}>
                                    {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                                  </TableCell>
                                  <TableCell>
                                    {invoice.status === 'sent' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-400 hover:text-green-300"
                                        onClick={() => updateInvoiceStatusMutation.mutate({ invoiceId: invoice.id, status: 'paid' })}
                                        disabled={updateInvoiceStatusMutation.isPending}
                                        data-testid={`button-mark-paid-${invoice.id}`}
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Mark Paid
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-white/40">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No invoices sent yet</p>
                          <p className="text-sm mt-1">Send an invoice to start billing this partner</p>
                        </div>
                      )}
                    </div>
                  )}
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
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-2">Payment Provider</div>
                    <div className="flex items-center gap-3">
                      <img
                        src={detailPartner.paymentProvider === 'airwallex' ? airwallexLogo : stripeLogo}
                        alt={detailPartner.paymentProvider === 'airwallex' ? 'Airwallex' : 'Stripe'}
                        className="h-8 object-contain rounded"
                        data-testid="img-payment-provider-logo"
                      />
                      <div>
                        <div className="text-white font-medium capitalize" data-testid="text-payment-provider-name">
                          {detailPartner.paymentProvider === 'airwallex' ? 'Airwallex' : 'Stripe'}
                        </div>
                        <div className="text-white/50 text-xs">
                          {detailPartner.paymentProvider === 'airwallex'
                            ? 'Primary payment provider'
                            : 'Payment provider'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="organisations">
                <div className="space-y-4">
                  {/* New Organisation API Key Display */}
                  {newOrgApiKey?.fullKey && (
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
                          <code className="flex-1 break-all" data-testid="text-new-org-api-key">
                            {showNewOrgKey ? newOrgApiKey.fullKey : "•".repeat(40) + newOrgApiKey.fullKey.slice(-4)}
                          </code>
                          <Button variant="ghost" size="sm" onClick={() => setShowNewOrgKey(!showNewOrgKey)} data-testid="button-toggle-org-key-visibility">
                            {showNewOrgKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(newOrgApiKey.fullKey)} data-testid="button-copy-org-key">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-white/60" 
                          onClick={() => { setNewOrgApiKey(null); setShowNewOrgKey(false); }}
                          data-testid="button-dismiss-new-org-key"
                        >
                          Dismiss
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-white/60 text-sm">
                      Manage client organisations for this partner. Each organisation gets its own API key for usage tracking.
                    </div>
                    <Button 
                      onClick={() => setIsCreateOrgOpen(true)} 
                      className="bg-cyan-600 hover:bg-cyan-700"
                      data-testid="button-add-organisation"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Organisation
                    </Button>
                  </div>

                  {orgsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>
                  ) : partnerOrgs && partnerOrgs.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/20">
                          <TableHead className="text-white/70">Organisation Name</TableHead>
                          <TableHead className="text-white/70">Contact</TableHead>
                          <TableHead className="text-white/70">API Keys</TableHead>
                          <TableHead className="text-white/70">Status</TableHead>
                          <TableHead className="text-white/70">Created</TableHead>
                          <TableHead className="text-white/70"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partnerOrgs.map((org) => (
                          <TableRow key={org.id} className="border-white/10">
                            <TableCell className="text-white font-medium" data-testid={`text-org-name-${org.id}`}>
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-cyan-400" />
                                {org.name}
                              </div>
                              <div className="text-white/40 text-xs font-mono mt-1">{org.slug}</div>
                            </TableCell>
                            <TableCell className="text-white/70">
                              {org.contactName && <div>{org.contactName}</div>}
                              {org.contactEmail && <div className="text-sm text-white/50">{org.contactEmail}</div>}
                              {!org.contactName && !org.contactEmail && <span className="text-white/40">-</span>}
                            </TableCell>
                            <TableCell>
                              <Badge className={org.hasActiveKey ? "bg-green-500/20 text-green-300" : "bg-white/10 text-white/50"}>
                                {org.apiKeyCount || 0} {org.apiKeyCount === 1 ? 'key' : 'keys'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {org.isActive ? (
                                <Badge className="bg-green-500/20 text-green-300">Active</Badge>
                              ) : (
                                <Badge className="bg-red-500/20 text-red-300">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-white/60 text-sm">{formatDate(org.createdAt)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => setDeleteOrgConfirm(org)}
                                data-testid={`button-delete-org-${org.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-white/50">
                      <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                      <p>No client organisations yet</p>
                      <p className="text-sm mt-1">Add organisations to track usage per client company</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Create Organisation Dialog */}
        <Dialog open={isCreateOrgOpen} onOpenChange={(open) => { setIsCreateOrgOpen(open); }}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-400" />
                Add Client Organisation
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Create a new client organisation for {detailPartner?.companyName || detailPartner?.name}. An API key will be automatically generated.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createOrgMutation.mutate({
                name: formData.get("orgName") as string,
                contactEmail: formData.get("contactEmail") as string || undefined,
                contactName: formData.get("contactName") as string || undefined,
              });
            }}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-white">Organisation Name *</Label>
                  <Input
                    name="orgName"
                    placeholder="e.g., Acme Corporation"
                    required
                    className="bg-slate-800 border-slate-600 text-white"
                    data-testid="input-org-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Contact Name</Label>
                  <Input
                    name="contactName"
                    placeholder="e.g., John Smith"
                    className="bg-slate-800 border-slate-600 text-white"
                    data-testid="input-contact-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Contact Email</Label>
                  <Input
                    name="contactEmail"
                    type="email"
                    placeholder="e.g., john@acme.com"
                    className="bg-slate-800 border-slate-600 text-white"
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOrgOpen(false)} className="bg-slate-800 border-slate-600" data-testid="button-cancel-org">
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrgMutation.isPending} className="bg-cyan-600 hover:bg-cyan-700" data-testid="button-create-org">
                  {createOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Organisation
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Organisation Confirmation Dialog */}
        <Dialog open={!!deleteOrgConfirm} onOpenChange={() => setDeleteOrgConfirm(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-red-400">Delete Organisation</DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you sure you want to delete "{deleteOrgConfirm?.name}"? This will also revoke all associated API keys. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOrgConfirm(null)} className="bg-slate-800 border-slate-600" data-testid="button-cancel-delete-org">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteOrgConfirm && deleteOrgMutation.mutate(deleteOrgConfirm.id)}
                disabled={deleteOrgMutation.isPending}
                data-testid="button-confirm-delete-org"
              >
                {deleteOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Organisation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {/* Send Invoice Dialog */}
        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Send Invoice
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Create and send an invoice to {detailPartner.companyName || detailPartner.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodStart">Period Start</Label>
                  <Input
                    id="periodStart"
                    type="date"
                    value={invoicePeriodStart}
                    onChange={(e) => setInvoicePeriodStart(e.target.value)}
                    className="bg-slate-800 border-slate-600"
                    data-testid="input-invoice-period-start"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodEnd">Period End</Label>
                  <Input
                    id="periodEnd"
                    type="date"
                    value={invoicePeriodEnd}
                    onChange={(e) => setInvoicePeriodEnd(e.target.value)}
                    className="bg-slate-800 border-slate-600"
                    data-testid="input-invoice-period-end"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testsUsed">Number of Credits Used</Label>
                <Input
                  id="testsUsed"
                  type="number"
                  min="1"
                  value={invoiceTestsUsed}
                  onChange={(e) => setInvoiceTestsUsed(e.target.value)}
                  placeholder="Enter number of tests to invoice"
                  className="bg-slate-800 border-slate-600"
                  data-testid="input-invoice-tests-used"
                />
                {invoiceTestsUsed && detailPartner.pricePerAssessment && (
                  <p className="text-sm text-slate-400">
                    Subtotal: {formatCurrency(parseInt(invoiceTestsUsed) * detailPartner.pricePerAssessment, detailPartner.currency)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatRate">VAT Rate (%)</Label>
                <Select value={invoiceVatRate} onValueChange={setInvoiceVatRate}>
                  <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-invoice-vat-rate">
                    <SelectValue placeholder="Select VAT rate..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="0" className="text-white">0% (Exempt/Non-UK)</SelectItem>
                    <SelectItem value="20" className="text-white">20% (Standard UK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceNotesField">Notes (Optional)</Label>
                <Textarea
                  id="invoiceNotesField"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder="Additional notes for this invoice..."
                  className="bg-slate-800 border-slate-600 min-h-[80px]"
                  data-testid="input-invoice-notes-field"
                />
              </div>

              {/* Invoice Preview */}
              {invoiceTestsUsed && parseInt(invoiceTestsUsed) > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <div className="text-sm text-slate-400 mb-2">Invoice Preview</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">{invoiceTestsUsed} tests @ {formatCurrency(detailPartner.pricePerAssessment, detailPartner.currency)}</span>
                      <span className="text-white">{formatCurrency(parseInt(invoiceTestsUsed) * detailPartner.pricePerAssessment, detailPartner.currency)}</span>
                    </div>
                    {parseInt(invoiceVatRate) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-white/70">VAT ({invoiceVatRate}%)</span>
                        <span className="text-white">{formatCurrency(Math.round((parseInt(invoiceTestsUsed) * detailPartner.pricePerAssessment) * (parseInt(invoiceVatRate) / 100)), detailPartner.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-600 font-medium">
                      <span className="text-white">Total</span>
                      <span className="text-cyan-400">
                        {formatCurrency(Math.round((parseInt(invoiceTestsUsed) * detailPartner.pricePerAssessment) * (1 + parseInt(invoiceVatRate) / 100)), detailPartner.currency)}
                      </span>
                    </div>
                    <div className="text-white/50 text-xs mt-2">
                      Due: {new Date(new Date().getTime() + (detailPartner.paymentTermsDays || 30) * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}
                      {' '}(Net {detailPartner.paymentTermsDays || 30})
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsInvoiceDialogOpen(false)}
                className="bg-slate-800 border-slate-600"
                data-testid="button-cancel-send-invoice"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!invoiceTestsUsed || parseInt(invoiceTestsUsed) <= 0) {
                    toast({
                      title: "Invalid Input",
                      description: "Please enter a valid number of tests",
                      variant: "destructive",
                    });
                    return;
                  }
                  sendInvoiceMutation.mutate({
                    periodStart: invoicePeriodStart,
                    periodEnd: invoicePeriodEnd,
                    testsUsed: parseInt(invoiceTestsUsed),
                    vatRate: parseInt(invoiceVatRate),
                    notes: invoiceNotes,
                  });
                }}
                disabled={sendInvoiceMutation.isPending || !invoiceTestsUsed || parseInt(invoiceTestsUsed) <= 0}
                className="bg-purple-600 hover:bg-purple-500"
                data-testid="button-confirm-send-invoice"
              >
                {sendInvoiceMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invoice
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Partner Confirmation Dialog (for detail view) */}
        <Dialog open={!!deleteConfirmPartner} onOpenChange={() => setDeleteConfirmPartner(null)}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Delete Partner
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you sure you want to permanently delete this partner account?
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-white font-medium mb-2">{deleteConfirmPartner?.companyName || deleteConfirmPartner?.name}</p>
                <p className="text-sm text-slate-400">{deleteConfirmPartner?.email}</p>
              </div>
              <p className="text-sm text-red-300">
                This action cannot be undone. All associated data including API keys, sessions, usage records, and invoices will be permanently deleted.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmPartner(null)} className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700" data-testid="button-cancel-delete-partner-detail">
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteConfirmPartner && deletePartnerMutation.mutate(deleteConfirmPartner.id)}
                disabled={deletePartnerMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete-partner-detail"
              >
                {deletePartnerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Partner
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Partner Dialog (for detail view) */}
        <Dialog open={isEditPartnerOpen} onOpenChange={setIsEditPartnerOpen}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-cyan-400" />
                Edit Partner Account
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Update partner information and billing settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name-detail">Contact Name</Label>
                  <Input 
                    id="edit-name-detail" 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-slate-800 border-slate-600" 
                    data-testid="input-edit-partner-name-detail"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-company-detail">Company Name</Label>
                  <Input 
                    id="edit-company-detail" 
                    value={editCompanyName} 
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="bg-slate-800 border-slate-600" 
                    data-testid="input-edit-partner-company-detail"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email-detail">Email</Label>
                <Input 
                  id="edit-email-detail" 
                  type="email"
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-slate-800 border-slate-600" 
                  data-testid="input-edit-partner-email-detail"
                />
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <div ref={editCountryDropdownRef} className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditCountryDropdownOpen(!editCountryDropdownOpen);
                      setEditCountryHighlightIndex(0);
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={editCountryDropdownOpen}
                    className="w-full justify-between bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    data-testid="select-edit-partner-country-detail"
                  >
                    {editCountry ? (
                      <>
                        {COUNTRIES.find(c => c.code === editCountry)?.flag}{" "}
                        {COUNTRIES.find(c => c.code === editCountry)?.name}
                      </>
                    ) : (
                      <span className="text-slate-400">Select country...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                  {editCountryDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-700 bg-slate-800 shadow-lg">
                      <div className="p-2 border-b border-slate-700">
                        <Input
                          role="combobox"
                          aria-controls="edit-country-listbox"
                          aria-expanded={editCountryDropdownOpen}
                          value={editCountrySearch}
                          onChange={(e) => {
                            setEditCountrySearch(e.target.value);
                            setEditCountryHighlightIndex(0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setEditCountryHighlightIndex(prev => Math.min(prev + 1, editFilteredCountries.length - 1));
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setEditCountryHighlightIndex(prev => Math.max(prev - 1, 0));
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              if (editFilteredCountries[editCountryHighlightIndex]) {
                                handleEditCountryChange(editFilteredCountries[editCountryHighlightIndex].code);
                              }
                            } else if (e.key === "Escape") {
                              setEditCountryDropdownOpen(false);
                            }
                          }}
                          placeholder="Search countries..."
                          className="bg-slate-900 border-slate-600 text-white"
                          autoFocus
                        />
                      </div>
                      <div ref={editCountryListRef} role="listbox" id="edit-country-listbox" className="max-h-[200px] overflow-y-auto">
                        {editFilteredCountries.map((country, index) => (
                          <div
                            key={country.code}
                            role="option"
                            aria-selected={editCountry === country.code}
                            className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                              index === editCountryHighlightIndex ? "bg-slate-700" : "hover:bg-slate-700"
                            } ${editCountry === country.code ? "bg-cyan-900/30" : ""}`}
                            onClick={() => handleEditCountryChange(country.code)}
                          >
                            <span>{country.flag}</span>
                            <span className="text-white">{country.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <div className="flex gap-2">
                  <div ref={editPhoneCodeDropdownRef} className="relative w-[140px]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditPhoneCodeDropdownOpen(!editPhoneCodeDropdownOpen);
                        setEditPhoneCodeHighlightIndex(0);
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={editPhoneCodeDropdownOpen}
                      className="w-full justify-between bg-slate-800 border-slate-600 text-white hover:bg-slate-700 px-2"
                      data-testid="select-edit-phone-code-detail"
                    >
                      {editSelectedPhoneCountryData ? (
                        <span className="flex items-center gap-1 text-sm">
                          {editSelectedPhoneCountryData.flag} {editSelectedPhoneCountryData.dialCode}
                        </span>
                      ) : (
                        <span className="text-slate-400">Code</span>
                      )}
                      <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                    </Button>
                    {editPhoneCodeDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-[280px] rounded-md border border-slate-700 bg-slate-800 shadow-lg">
                        <div className="p-2 border-b border-slate-700">
                          <Input
                            role="combobox"
                            aria-controls="edit-phone-code-listbox"
                            aria-expanded={editPhoneCodeDropdownOpen}
                            value={editPhoneCodeSearch}
                            onChange={(e) => {
                              setEditPhoneCodeSearch(e.target.value);
                              setEditPhoneCodeHighlightIndex(0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "ArrowDown") {
                                e.preventDefault();
                                setEditPhoneCodeHighlightIndex(prev => Math.min(prev + 1, editFilteredPhoneCodes.length - 1));
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                setEditPhoneCodeHighlightIndex(prev => Math.max(prev - 1, 0));
                              } else if (e.key === "Enter") {
                                e.preventDefault();
                                if (editFilteredPhoneCodes[editPhoneCodeHighlightIndex]) {
                                  handleEditPhoneCodeSelect(editFilteredPhoneCodes[editPhoneCodeHighlightIndex].code);
                                }
                              } else if (e.key === "Escape") {
                                setEditPhoneCodeDropdownOpen(false);
                              }
                            }}
                            placeholder="Search..."
                            className="bg-slate-900 border-slate-600 text-white"
                            autoFocus
                          />
                        </div>
                        <div ref={editPhoneCodeListRef} role="listbox" id="edit-phone-code-listbox" className="max-h-[200px] overflow-y-auto">
                          {editFilteredPhoneCodes.map((country, index) => (
                            <div
                              key={country.code}
                              role="option"
                              aria-selected={editPhoneCountry === country.code}
                              className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                                index === editPhoneCodeHighlightIndex ? "bg-slate-700" : "hover:bg-slate-700"
                              } ${editPhoneCountry === country.code ? "bg-cyan-900/30" : ""}`}
                              onClick={() => handleEditPhoneCodeSelect(country.code)}
                            >
                              <span>{country.flag}</span>
                              <span className="text-white text-sm">{country.name}</span>
                              <span className="text-slate-400 text-sm ml-auto">{country.dialCode}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <Input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => handleEditPhoneChange(e.target.value)}
                    placeholder={getPhonePlaceholder(editPhoneCountry)}
                    className="flex-1 bg-slate-800 border-slate-600"
                    data-testid="input-edit-partner-phone-detail"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <div className="relative" ref={editCurrencyDropdownRef}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditCurrencyDropdownOpen(!editCurrencyDropdownOpen);
                      setEditCurrencyHighlightIndex(0);
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={editCurrencyDropdownOpen}
                    className="w-full justify-between bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    data-testid="select-edit-partner-currency-detail"
                  >
                    {editCurrency ? (
                      <>
                        {CURRENCIES[editCurrency]?.code} ({CURRENCIES[editCurrency]?.symbol}) - {CURRENCIES[editCurrency]?.name}
                      </>
                    ) : (
                      <span className="text-slate-400">Select currency...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                  {editCurrencyDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-700 bg-slate-800 shadow-lg">
                      <div className="p-2 border-b border-slate-700">
                        <Input
                          role="combobox"
                          aria-controls="edit-currency-listbox"
                          aria-expanded={editCurrencyDropdownOpen}
                          aria-activedescendant={filteredEditCurrencies.length > 0 && editCurrencyHighlightIndex >= 0 ? `edit-currency-option-${filteredEditCurrencies[editCurrencyHighlightIndex]?.code}` : undefined}
                          aria-autocomplete="list"
                          placeholder="Search currency..."
                          value={editCurrencySearch}
                          onChange={(e) => {
                            setEditCurrencySearch(e.target.value);
                            setEditCurrencyHighlightIndex(0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (filteredEditCurrencies.length > 0 && editCurrencyHighlightIndex >= 0) {
                                setEditCurrency(filteredEditCurrencies[editCurrencyHighlightIndex].code);
                                setEditCurrencyDropdownOpen(false);
                                setEditCurrencySearch("");
                              }
                            } else if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setEditCurrencyHighlightIndex(prev => Math.min(prev + 1, filteredEditCurrencies.length - 1));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setEditCurrencyHighlightIndex(prev => Math.max(prev - 1, 0));
                            } else if (e.key === 'Escape') {
                              setEditCurrencyDropdownOpen(false);
                              setEditCurrencySearch("");
                            } else if (e.key === 'Tab') {
                              setEditCurrencyDropdownOpen(false);
                              setEditCurrencySearch("");
                            }
                          }}
                          className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                          autoFocus
                          data-testid="input-edit-currency-search"
                        />
                      </div>
                      <div ref={editCurrencyListRef} id="edit-currency-listbox" className="max-h-[200px] overflow-y-auto" role="listbox" aria-label="Currencies">
                        {filteredEditCurrencies.length === 0 ? (
                          <div className="p-2 text-center text-slate-400 text-sm" role="status">No currency found</div>
                        ) : (
                          filteredEditCurrencies.map((currency, index) => (
                            <div
                              key={currency.code}
                              id={`edit-currency-option-${currency.code}`}
                              ref={(el) => {
                                if (index === editCurrencyHighlightIndex && el) {
                                  el.scrollIntoView({ block: 'nearest' });
                                }
                              }}
                              onClick={() => {
                                setEditCurrency(currency.code);
                                setEditCurrencyDropdownOpen(false);
                                setEditCurrencySearch("");
                              }}
                              role="option"
                              aria-selected={editCurrency === currency.code || index === editCurrencyHighlightIndex}
                              className={`px-3 py-2 cursor-pointer text-white flex items-center gap-2 ${
                                index === editCurrencyHighlightIndex ? 'bg-slate-600' : 'hover:bg-slate-700'
                              }`}
                              data-testid={`edit-currency-option-${currency.code}`}
                            >
                              <span className="font-mono text-sm">{currency.code}</span>
                              <span className="text-slate-400">({currency.symbol})</span>
                              <span className="flex-1 truncate">{currency.name}</span>
                              {editCurrency === currency.code && (
                                <CheckCircle className="h-4 w-4 text-cyan-400" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-cyan-400 mb-3">Pricing & Billing</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-price-detail">Price Per Credit (minor units)</Label>
                  <Input 
                    id="edit-price-detail" 
                    type="number"
                    value={editPricePerAssessment} 
                    onChange={(e) => setEditPricePerAssessment(parseInt(e.target.value) || 0)}
                    className="bg-slate-800 border-slate-600" 
                    data-testid="input-edit-partner-price-detail"
                  />
                  <p className="text-xs text-slate-400">
                    {editCurrency && CURRENCIES[editCurrency] 
                      ? `${editPricePerAssessment} = ${CURRENCIES[editCurrency].symbol}${(editPricePerAssessment / 100).toFixed(2)}`
                      : `${editPricePerAssessment / 100} in major units`}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Free Credits</Label>
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700/50 rounded-lg px-4 py-2 flex-1">
                      <div className="text-xs text-slate-400 mb-1">Current Balance</div>
                      <div className="text-lg font-semibold text-white">{editCurrentFreeTests} tests</div>
                    </div>
                    <span className="text-slate-400 text-xl">+</span>
                    <div className="flex-1">
                      <Label htmlFor="edit-additional-tests-detail" className="text-xs text-slate-400 mb-1 block">Add More</Label>
                      <Input 
                        id="edit-additional-tests-detail" 
                        type="number"
                        min={0}
                        value={editAdditionalFreeTests} 
                        onChange={(e) => setEditAdditionalFreeTests(Math.max(0, parseInt(e.target.value) || 0))}
                        className="bg-slate-800 border-slate-600" 
                        data-testid="input-edit-partner-add-free-tests-detail"
                      />
                    </div>
                  </div>
                  {editAdditionalFreeTests > 0 && (
                    <p className="text-xs text-cyan-400">
                      New total: {editCurrentFreeTests + editAdditionalFreeTests} free credits
                    </p>
                  )}
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Billing Model</Label>
                  <Select value={editBillingType} onValueChange={(v) => setEditBillingType(v as "payg" | "subscription" | "enterprise")}>
                    <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-edit-billing-type-detail">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="payg" className="text-white">Pay As You Go (PAYG)</SelectItem>
                      <SelectItem value="subscription" className="text-white">Subscription + Auto-Bill</SelectItem>
                      <SelectItem value="enterprise" className="text-white">Enterprise Prepayment</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">
                    {editBillingType === "payg" 
                      ? "No card on file. Bulk discounts via upfront purchase. API suspended at zero credits." 
                      : editBillingType === "subscription"
                      ? "Card on file. Min monthly charge + auto-bill for additional usage."
                      : "For high-volume BPOs. Pro-forma invoicing for bulk credit blocks."}
                  </p>
                </div>

                {editBillingType === "subscription" && (
                  <div className="space-y-2 mt-4">
                    <Label>Billing Cycle Day</Label>
                    <Select value={String(editBillingCycleAnchor)} onValueChange={(v) => setEditBillingCycleAnchor(parseInt(v))}>
                      <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-edit-billing-cycle-detail">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="1" className="text-white">1st of month</SelectItem>
                        <SelectItem value="15" className="text-white">15th of month</SelectItem>
                        <SelectItem value="28" className="text-white">28th of month (last day)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {editBillingType === "enterprise" && (
                  <>
                    <div className="space-y-2 mt-4">
                      <Label>Payment Terms</Label>
                      <Select value={String(editPaymentTerms)} onValueChange={(v) => setEditPaymentTerms(parseInt(v))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-edit-payment-terms-detail">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="15" className="text-white">Net 15</SelectItem>
                          <SelectItem value="30" className="text-white">Net 30</SelectItem>
                          <SelectItem value="45" className="text-white">Net 45</SelectItem>
                          <SelectItem value="60" className="text-white">Net 60</SelectItem>
                          <SelectItem value="90" className="text-white">Net 90</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="edit-invoice-contact-detail">Invoice Contact Email</Label>
                      <Input 
                        id="edit-invoice-contact-detail" 
                        type="email"
                        value={editInvoiceContact} 
                        onChange={(e) => setEditInvoiceContact(e.target.value)}
                        placeholder="accounts@company.com"
                        className="bg-slate-800 border-slate-600" 
                        data-testid="input-edit-invoice-contact-detail"
                      />
                    </div>
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="edit-invoice-notes-detail">Invoice Notes</Label>
                      <Input 
                        id="edit-invoice-notes-detail" 
                        value={editInvoiceNotes} 
                        onChange={(e) => setEditInvoiceNotes(e.target.value)}
                        placeholder="Special terms or notes..."
                        className="bg-slate-800 border-slate-600" 
                        data-testid="input-edit-invoice-notes-detail"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-slate-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-cyan-400 mb-3">Account Settings</h4>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Link to Organisation</Label>
                    <Select value={editOrganizationId} onValueChange={setEditOrganizationId}>
                      <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-edit-partner-org-detail">
                        <SelectValue placeholder="Select an organisation..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="none" className="text-slate-400">None</SelectItem>
                        {organizations?.filter((org, index, arr) => 
                          arr.findIndex(o => o.id === org.id) === index
                        ).map((org) => (
                          <SelectItem key={org.id} value={org.id} className="text-white">
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Account Status</Label>
                      <p className="text-xs text-slate-400">Enable or disable this partner account</p>
                    </div>
                    <Switch 
                      checked={editIsActive} 
                      onCheckedChange={setEditIsActive}
                      data-testid="switch-edit-partner-active-detail"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsEditPartnerOpen(false)} className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePartner}
                disabled={updatePartnerMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-save-partner-detail"
              >
                {updatePartnerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
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
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-h-[85vh] overflow-y-auto">
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
                  <Label>Country</Label>
                  <div ref={countryDropdownRef} className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCountryDropdownOpen(!countryDropdownOpen);
                        setCountryHighlightIndex(0);
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={countryDropdownOpen}
                      className="w-full justify-between bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                      data-testid="select-partner-country"
                    >
                      {selectedCountry ? (
                        <>
                          {COUNTRIES.find(c => c.code === selectedCountry)?.flag}{" "}
                          {COUNTRIES.find(c => c.code === selectedCountry)?.name}
                        </>
                      ) : (
                        <span className="text-slate-400">Select country...</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    {countryDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-700 bg-slate-800 shadow-lg">
                        <div className="p-2 border-b border-slate-700">
                          <Input
                            role="combobox"
                            aria-controls="country-listbox"
                            aria-expanded={countryDropdownOpen}
                            aria-activedescendant={filteredCountries.length > 0 && countryHighlightIndex >= 0 ? `country-option-${filteredCountries[countryHighlightIndex]?.code}` : undefined}
                            aria-autocomplete="list"
                            placeholder="Search country..."
                            value={countrySearch}
                            onChange={(e) => {
                              setCountrySearch(e.target.value);
                              setCountryHighlightIndex(0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                if (filteredCountries.length > 0 && countryHighlightIndex >= 0 && countryHighlightIndex < filteredCountries.length) {
                                  handleCountryChange(filteredCountries[countryHighlightIndex].code);
                                }
                              } else if (e.key === 'Escape' || e.key === 'Tab') {
                                setCountryDropdownOpen(false);
                                setCountrySearch("");
                                setCountryHighlightIndex(0);
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                if (filteredCountries.length > 0) {
                                  setCountryHighlightIndex(prev => 
                                    prev < filteredCountries.length - 1 ? prev + 1 : 0
                                  );
                                }
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                if (filteredCountries.length > 0) {
                                  setCountryHighlightIndex(prev => 
                                    prev > 0 ? prev - 1 : filteredCountries.length - 1
                                  );
                                }
                              }
                            }}
                            onBlur={(e) => {
                              if (!countryDropdownRef.current?.contains(e.relatedTarget as Node)) {
                                setTimeout(() => {
                                  setCountryDropdownOpen(false);
                                  setCountrySearch("");
                                  setCountryHighlightIndex(0);
                                }, 150);
                              }
                            }}
                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                            autoFocus
                            data-testid="input-country-search"
                          />
                        </div>
                        <div ref={countryListRef} id="country-listbox" className="max-h-[200px] overflow-y-auto" role="listbox" aria-label="Countries">
                          {filteredCountries.length === 0 ? (
                            <div className="p-2 text-center text-slate-400 text-sm" role="status">No country found</div>
                          ) : (
                            filteredCountries.map((country, index) => (
                              <div
                                key={country.code}
                                id={`country-option-${country.code}`}
                                ref={(el) => {
                                  if (index === countryHighlightIndex && el) {
                                    el.scrollIntoView({ block: 'nearest' });
                                  }
                                }}
                                onClick={() => handleCountryChange(country.code)}
                                role="option"
                                aria-selected={selectedCountry === country.code || index === countryHighlightIndex}
                                className={`px-3 py-2 cursor-pointer text-white flex items-center gap-2 ${
                                  index === countryHighlightIndex ? 'bg-slate-600' : 'hover:bg-slate-700'
                                }`}
                                data-testid={`country-option-${country.code}`}
                              >
                                <span>{country.flag}</span>
                                <span>{country.name}</span>
                                {selectedCountry === country.code && (
                                  <CheckCircle className="ml-auto h-4 w-4 text-cyan-400" />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="hidden" name="country" value={selectedCountry ? COUNTRIES.find(c => c.code === selectedCountry)?.name || '' : ''} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="flex gap-2">
                    <div ref={phoneCodeDropdownRef} className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setPhoneCodeDropdownOpen(!phoneCodeDropdownOpen);
                          setPhoneCodeHighlightIndex(0);
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={phoneCodeDropdownOpen}
                        className="w-[140px] justify-between bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                        data-testid="select-phone-code"
                      >
                        {selectedPhoneCountryData ? (
                          <>
                            {selectedPhoneCountryData.flag} {selectedPhoneCountryData.dialCode}
                          </>
                        ) : (
                          <span className="text-slate-400">+44</span>
                        )}
                        <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      {phoneCodeDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-[280px] rounded-md border border-slate-700 bg-slate-800 shadow-lg">
                          <div className="p-2 border-b border-slate-700">
                            <Input
                              role="combobox"
                              aria-controls="phone-code-listbox"
                              aria-expanded={phoneCodeDropdownOpen}
                              aria-activedescendant={filteredPhoneCodes.length > 0 && phoneCodeHighlightIndex >= 0 ? `phone-code-option-${filteredPhoneCodes[phoneCodeHighlightIndex]?.code}` : undefined}
                              aria-autocomplete="list"
                              placeholder="Search country code..."
                              value={phoneCodeSearch}
                              onChange={(e) => {
                                setPhoneCodeSearch(e.target.value);
                                setPhoneCodeHighlightIndex(0);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (filteredPhoneCodes.length > 0 && phoneCodeHighlightIndex >= 0 && phoneCodeHighlightIndex < filteredPhoneCodes.length) {
                                    handlePhoneCodeSelect(filteredPhoneCodes[phoneCodeHighlightIndex].code);
                                  }
                                } else if (e.key === 'Escape' || e.key === 'Tab') {
                                  setPhoneCodeDropdownOpen(false);
                                  setPhoneCodeSearch("");
                                  setPhoneCodeHighlightIndex(0);
                                } else if (e.key === 'ArrowDown') {
                                  e.preventDefault();
                                  if (filteredPhoneCodes.length > 0) {
                                    setPhoneCodeHighlightIndex(prev => 
                                      prev < filteredPhoneCodes.length - 1 ? prev + 1 : 0
                                    );
                                  }
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault();
                                  if (filteredPhoneCodes.length > 0) {
                                    setPhoneCodeHighlightIndex(prev => 
                                      prev > 0 ? prev - 1 : filteredPhoneCodes.length - 1
                                    );
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                if (!phoneCodeDropdownRef.current?.contains(e.relatedTarget as Node)) {
                                  setTimeout(() => {
                                    setPhoneCodeDropdownOpen(false);
                                    setPhoneCodeSearch("");
                                    setPhoneCodeHighlightIndex(0);
                                  }, 150);
                                }
                              }}
                              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                              autoFocus
                              data-testid="input-phone-code-search"
                            />
                          </div>
                          <div ref={phoneCodeListRef} id="phone-code-listbox" className="max-h-[200px] overflow-y-auto" role="listbox" aria-label="Phone country codes">
                            {filteredPhoneCodes.length === 0 ? (
                              <div className="p-2 text-center text-slate-400 text-sm" role="status">No country found</div>
                            ) : (
                              filteredPhoneCodes.map((country, index) => (
                                <div
                                  key={country.code}
                                  id={`phone-code-option-${country.code}`}
                                  ref={(el) => {
                                    if (index === phoneCodeHighlightIndex && el) {
                                      el.scrollIntoView({ block: 'nearest' });
                                    }
                                  }}
                                  onClick={() => handlePhoneCodeSelect(country.code)}
                                  role="option"
                                  aria-selected={selectedPhoneCountry === country.code || index === phoneCodeHighlightIndex}
                                  className={`px-3 py-2 cursor-pointer text-white flex items-center gap-2 ${
                                    index === phoneCodeHighlightIndex ? 'bg-slate-600' : 'hover:bg-slate-700'
                                  }`}
                                  data-testid={`phone-code-option-${country.code}`}
                                >
                                  <span>{country.flag}</span>
                                  <span className="flex-1">{country.name}</span>
                                  <span className="text-slate-400">{country.dialCode}</span>
                                  {selectedPhoneCountry === country.code && (
                                    <CheckCircle className="h-4 w-4 text-cyan-400" />
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <Input 
                      id="phoneNumber" 
                      name="phoneNumber" 
                      type="tel" 
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder={getPhonePlaceholder(selectedPhoneCountry)} 
                      className="flex-1 bg-slate-800 border-slate-600" 
                      data-testid="input-partner-phone" 
                    />
                  </div>
                  <input type="hidden" name="phone" value={selectedPhoneCountryData?.dialCode || '+44'} />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <div className="relative" ref={currencyDropdownRef}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setCurrencyDropdownOpen(!currencyDropdownOpen);
                        setCurrencyHighlightIndex(0);
                      }}
                      aria-haspopup="listbox"
                      aria-expanded={currencyDropdownOpen}
                      className="w-full justify-between bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                      data-testid="select-partner-currency"
                    >
                      {selectedCurrency ? (
                        <>
                          {CURRENCIES[selectedCurrency]?.code} ({CURRENCIES[selectedCurrency]?.symbol}) - {CURRENCIES[selectedCurrency]?.name}
                        </>
                      ) : (
                        <span className="text-slate-400">Select currency...</span>
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    {currencyDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-700 bg-slate-800 shadow-lg">
                        <div className="p-2 border-b border-slate-700">
                          <Input
                            role="combobox"
                            aria-controls="currency-listbox"
                            aria-expanded={currencyDropdownOpen}
                            aria-activedescendant={filteredCurrencies.length > 0 && currencyHighlightIndex >= 0 ? `currency-option-${filteredCurrencies[currencyHighlightIndex]?.code}` : undefined}
                            aria-autocomplete="list"
                            placeholder="Search currency..."
                            value={currencySearch}
                            onChange={(e) => {
                              setCurrencySearch(e.target.value);
                              setCurrencyHighlightIndex(0);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (filteredCurrencies.length > 0 && currencyHighlightIndex >= 0) {
                                  setSelectedCurrency(filteredCurrencies[currencyHighlightIndex].code);
                                  setCurrencyDropdownOpen(false);
                                  setCurrencySearch("");
                                }
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setCurrencyHighlightIndex(prev => Math.min(prev + 1, filteredCurrencies.length - 1));
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setCurrencyHighlightIndex(prev => Math.max(prev - 1, 0));
                              } else if (e.key === 'Escape') {
                                setCurrencyDropdownOpen(false);
                                setCurrencySearch("");
                              } else if (e.key === 'Tab') {
                                setCurrencyDropdownOpen(false);
                                setCurrencySearch("");
                              }
                            }}
                            className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                            autoFocus
                            data-testid="input-currency-search"
                          />
                        </div>
                        <div ref={currencyListRef} id="currency-listbox" className="max-h-[200px] overflow-y-auto" role="listbox" aria-label="Currencies">
                          {filteredCurrencies.length === 0 ? (
                            <div className="p-2 text-center text-slate-400 text-sm" role="status">No currency found</div>
                          ) : (
                            filteredCurrencies.map((currency, index) => (
                              <div
                                key={currency.code}
                                id={`currency-option-${currency.code}`}
                                ref={(el) => {
                                  if (index === currencyHighlightIndex && el) {
                                    el.scrollIntoView({ block: 'nearest' });
                                  }
                                }}
                                onClick={() => {
                                  setSelectedCurrency(currency.code);
                                  setCurrencyDropdownOpen(false);
                                  setCurrencySearch("");
                                }}
                                role="option"
                                aria-selected={selectedCurrency === currency.code || index === currencyHighlightIndex}
                                className={`px-3 py-2 cursor-pointer text-white flex items-center gap-2 ${
                                  index === currencyHighlightIndex ? 'bg-slate-600' : 'hover:bg-slate-700'
                                }`}
                                data-testid={`currency-option-${currency.code}`}
                              >
                                <span className="font-mono text-sm">{currency.code}</span>
                                <span className="text-slate-400">({currency.symbol})</span>
                                <span className="flex-1 truncate">{currency.name}</span>
                                {selectedCurrency === currency.code && (
                                  <CheckCircle className="h-4 w-4 text-cyan-400" />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">Partner's preferred billing currency</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerAssessment">
                    Price Per Credit ({selectedCurrency && CURRENCIES[selectedCurrency] 
                      ? `${CURRENCIES[selectedCurrency].code} minor units` 
                      : 'minor units'})
                  </Label>
                  <Input 
                    id="pricePerAssessment" 
                    name="pricePerAssessment" 
                    type="number" 
                    value={createPricePerAssessment}
                    onChange={(e) => setCreatePricePerAssessment(e.target.value)}
                    placeholder="Enter price..."
                    className="bg-slate-800 border-slate-600" 
                    data-testid="input-partner-price" 
                  />
                  {createPricePerAssessment && selectedCurrency && CURRENCIES[selectedCurrency] && (
                    <p className="text-xs text-slate-400">
                      {CURRENCIES[selectedCurrency].decimalPlaces === 0 
                        ? `${parseInt(createPricePerAssessment).toLocaleString()} = ${CURRENCIES[selectedCurrency].symbol}${parseInt(createPricePerAssessment).toLocaleString()}`
                        : `${createPricePerAssessment} = ${CURRENCIES[selectedCurrency].symbol}${(parseInt(createPricePerAssessment) / 100).toFixed(2)}`}
                    </p>
                  )}
                  {(() => {
                    if (!selectedCountry) return null;
                    const suggestion = getSuggestedPricing(selectedCountry, selectedCurrency);
                    if (!suggestion.inDatabase) {
                      return (
                        <p className="text-xs text-amber-400">
                          Country not in database - enter price manually
                        </p>
                      );
                    }
                    if (suggestion.suggestedPrice !== null) {
                      const currencyConfig = CURRENCIES[selectedCurrency];
                      const displayPrice = currencyConfig?.decimalPlaces === 0 
                        ? suggestion.suggestedPrice.toLocaleString()
                        : (suggestion.suggestedPrice / 100).toFixed(2);
                      return (
                        <p className="text-xs text-cyan-400">
                          Suggested: {currencyConfig?.symbol}{displayPrice} ({suggestion.tierName.toUpperCase()} market, Boutique tier)
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2 h-5 px-2 text-xs"
                            onClick={() => setCreatePricePerAssessment(String(suggestion.suggestedPrice))}
                            data-testid="button-apply-suggested-price"
                          >
                            Apply
                          </Button>
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-cyan-400 mb-3">Deal Configuration</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="freeTests">Free Credits Allocation</Label>
                    <Input 
                      id="freeTests" 
                      type="number" 
                      min={0} 
                      max={500}
                      value={freeTests || ''} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+/, '') || '0';
                        const num = Math.min(500, Math.max(0, parseInt(val) || 0));
                        setFreeTests(num);
                      }}
                      className="bg-slate-800 border-slate-600" 
                      data-testid="input-partner-free-tests" 
                    />
                    <p className="text-xs text-slate-400">Complimentary tests to get the partner started (0-500)</p>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>Billing Model</Label>
                    <Select value={billingType} onValueChange={(v) => setBillingType(v as "payg" | "subscription" | "enterprise")}>
                      <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-billing-type">
                        <SelectValue placeholder="Select billing model..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="payg" className="text-white">Pay As You Go (PAYG)</SelectItem>
                        <SelectItem value="subscription" className="text-white">Subscription + Auto-Bill</SelectItem>
                        <SelectItem value="enterprise" className="text-white">Enterprise Prepayment</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400">
                      {billingType === "payg" 
                        ? "No card on file. Bulk discounts via upfront purchase. API suspended at zero credits." 
                        : billingType === "subscription"
                        ? "Card on file. Min monthly charge + auto-bill for additional usage at base rates."
                        : "For high-volume BPOs. Pro-forma invoicing for bulk credit blocks. No credit extended."}
                    </p>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>Payment Provider</Label>
                    <Select value={paymentProvider} onValueChange={(v) => setPaymentProvider(v as "stripe" | "airwallex")}>
                      <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-payment-provider">
                        <SelectValue placeholder="Select payment provider..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="stripe" className="text-white">
                          <div className="flex items-center gap-2">
                            <img src={stripeLogo} alt="Stripe" className="h-5 w-5 rounded object-cover" />
                            <span>Stripe</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="airwallex" className="text-white">
                          <div className="flex items-center gap-2">
                            <img src={airwallexLogo} alt="Airwallex" className="h-5 w-5 rounded object-cover" />
                            <span>Airwallex</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-400">Payment gateway for processing partner billing</p>
                  </div>

                  {billingType === "subscription" && (
                    <div className="space-y-2 mt-4">
                      <Label>Billing Cycle Day</Label>
                      <Select value={String(billingCycleAnchor)} onValueChange={(v) => setBillingCycleAnchor(parseInt(v))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-billing-cycle">
                          <SelectValue placeholder="Select billing day..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="1" className="text-white">1st of month</SelectItem>
                          <SelectItem value="15" className="text-white">15th of month</SelectItem>
                          <SelectItem value="28" className="text-white">28th of month (last day)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-400">Day of month when the auto-billing cycle ends and card is charged</p>
                    </div>
                  )}

                  {billingType === "enterprise" && (
                    <>
                      <div className="space-y-2 mt-4">
                        <Label>Payment Terms</Label>
                        <Select value={String(paymentTerms)} onValueChange={(v) => setPaymentTerms(parseInt(v))}>
                          <SelectTrigger className="bg-slate-800 border-slate-600" data-testid="select-payment-terms">
                            <SelectValue placeholder="Select payment terms..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="15" className="text-white">Net 15</SelectItem>
                            <SelectItem value="30" className="text-white">Net 30</SelectItem>
                            <SelectItem value="45" className="text-white">Net 45</SelectItem>
                            <SelectItem value="60" className="text-white">Net 60</SelectItem>
                            <SelectItem value="90" className="text-white">Net 90</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="invoiceContact">Invoice Contact Email (Optional)</Label>
                        <Input 
                          id="invoiceContact" 
                          name="invoiceContact" 
                          type="email"
                          placeholder="accounts@company.com"
                          className="bg-slate-800 border-slate-600" 
                          data-testid="input-invoice-contact" 
                        />
                        <p className="text-xs text-slate-400">If different from partner email</p>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="invoiceNotes">Invoice Notes (Optional)</Label>
                        <Input 
                          id="invoiceNotes" 
                          name="invoiceNotes" 
                          placeholder="Special terms or notes..."
                          className="bg-slate-800 border-slate-600" 
                          data-testid="input-invoice-notes" 
                        />
                      </div>
                    </>
                  )}
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
            <div className="relative flex-1 min-w-0 md:min-w-[200px]">
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
              <SelectTrigger className="w-full md:w-[140px] bg-white/5 border-white/20 text-white" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="active" className="text-white">Active</SelectItem>
                <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/20 text-white" data-testid="select-sort-field">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="currentMonthSessions" className="text-white">Monthly Credits</SelectItem>
                <SelectItem value="totalTestsCompleted" className="text-white">Total Credits</SelectItem>
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
                <div className="text-white/60 text-xs mb-1">Monthly Credits</div>
                <div className="text-xl font-bold text-cyan-400">{partners.reduce((sum, p) => sum + p.currentMonthSessions, 0)}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-white/60 text-xs mb-1">Monthly Revenue</div>
                <div className="text-xl font-bold text-amber-400">{formatCurrency(partners.reduce((sum, p) => sum + p.currentMonthBillable, 0), 'gbp')}</div>
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
                  <TableHead className="text-white/70">Email</TableHead>
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
                      <div className="flex items-center gap-2">
                        <div>
                          <div>{partner.companyName || partner.name}</div>
                          {partner.companyName && <div className="text-sm text-white/60">{partner.name}</div>}
                        </div>
                        <img
                          src={partner.paymentProvider === 'airwallex' ? airwallexLogo : stripeLogo}
                          alt={partner.paymentProvider === 'airwallex' ? 'Airwallex' : 'Stripe'}
                          className="h-5 w-5 object-contain rounded-sm shrink-0"
                          title={partner.paymentProvider === 'airwallex' ? 'Airwallex' : 'Stripe'}
                          data-testid={`img-provider-${partner.id}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-white/80 text-sm">
                      {partner.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300">{partner.currentMonthSessions}</Badge>
                    </TableCell>
                    <TableCell className="text-white/80">{partner.totalTestsCompleted}</TableCell>
                    <TableCell className="text-amber-300 font-medium">{formatCurrency(partner.currentMonthBillable, partner.currency)}</TableCell>
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
                      <div className="flex gap-1 items-center">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPartner(partner); }} className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10" data-testid={`button-manage-keys-${partner.id}`}>
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); resendWelcomeEmailMutation.mutate(partner.id); }} 
                          disabled={resendingEmailPartnerId === partner.id}
                          className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" 
                          data-testid={`button-resend-email-${partner.id}`}
                          title="Resend welcome email with new password"
                        >
                          {resendingEmailPartnerId === partner.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        </Button>
                        <Switch
                          checked={partner.isActive}
                          onCheckedChange={(checked) => togglePartnerMutation.mutate({ id: partner.id, isActive: checked })}
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`switch-partner-active-${partner.id}`}
                        />
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteConfirmPartner(partner); }} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`button-delete-partner-${partner.id}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Delete Partner Confirmation Dialog */}
      <Dialog open={!!deleteConfirmPartner} onOpenChange={() => setDeleteConfirmPartner(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Delete Partner
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to permanently delete this partner account?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-white font-medium mb-2">{deleteConfirmPartner?.companyName || deleteConfirmPartner?.name}</p>
              <p className="text-sm text-slate-400">{deleteConfirmPartner?.email}</p>
            </div>
            <p className="text-sm text-red-300">
              This action cannot be undone. All associated data including API keys, sessions, usage records, and invoices will be permanently deleted.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmPartner(null)} className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700" data-testid="button-cancel-delete-partner">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmPartner && deletePartnerMutation.mutate(deleteConfirmPartner.id)}
              disabled={deletePartnerMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-partner"
            >
              {deletePartnerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Partner
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

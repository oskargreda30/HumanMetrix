import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { COUNTRIES, US_STATES } from "@shared/countries";
import { useRef, useMemo } from "react";

// Initialize Stripe with public key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Loader2, Package, TrendingUp, AlertTriangle, CheckCircle, CreditCard, Activity, BarChart2, BarChart3, FileText, Receipt, Building2, ArrowLeft, ExternalLink, Settings, Key, Bell, BellOff, RefreshCw, Copy, Check, Shield, Webhook, Link2, FileSpreadsheet, Home, Users, ClipboardList, Clock, Plus, Trash2, Eye, EyeOff, Mail, Calendar, ChevronRight, ChevronLeft, X, Sparkles, HelpCircle, Palette, Info, Upload, Lock, ChevronDown, Pencil, Download, ShoppingCart, Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeveloperSubTabs } from "@/components/DeveloperSubTabs";
import { PartnerTour } from "@/components/PartnerTour";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import dashboardBg from "@assets/image_1763608498774.png";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BulkInvitationsTab } from "@/components/partner/BulkInvitationsTab";
import PartnerAnalysisTab from "@/components/partner/PartnerAnalysisTab";
import PartnerResultsTab from "@/components/partner/PartnerResultsTab";
import { PdfImportModal } from "@/components/PdfImportModal";
import { HiringPipelineTab } from "@/components/HiringPipelineTab";
import PartnerTermsAcceptanceDialog from "@/components/PartnerTermsAcceptanceDialog";
import { EcosystemAutoProject } from "@/components/ecosystem/EcosystemAutoProject";
import { useCurrency } from "@/contexts/CurrencyContext";

// Helper component for info tooltips - accessible with keyboard
function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="More information"
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-muted-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface CardStatus {
  hasCard: boolean;
  cardLast4?: string;
  cardBrand?: string;
  overageRatePerCredit?: number;
  billingType: string;
}

interface OverageHistoryItem {
  id: string;
  billingMonth: string;
  overageCredits: number;
  overageAmount: number;
  chargeStatus: string;
  stripePaymentIntentId?: string;
  createdAt: string;
}

function PrepaidCardManagementInner({ partnerId, currency = 'GBP', billingType = 'payg' }: { partnerId: string; currency?: string; billingType?: string }) {
  const currencySymbols: Record<string, string> = {
    gbp: '£', usd: '$', eur: '€', aud: 'A$', cad: 'C$', sgd: 'S$', hkd: 'HK$', jpy: '¥',
    inr: '₹', myr: 'RM', thb: '฿', php: '₱', idr: 'Rp', vnd: '₫', bdt: '৳', pkr: '₨',
    lkr: 'Rs', mmk: 'K', khr: '៛', npr: '₨', try: '₺', egp: 'E£', ngn: '₦', kes: 'KSh',
    zar: 'R', brl: 'R$', mxn: 'MX$', ars: 'AR$',
  };
  const currSymbol = currencySymbols[currency.toLowerCase()] || '£';
  const formatAmount = (pence: number) => `${currSymbol}${(pence / 100).toFixed(2)}`;
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  
  // Detect dark mode for Stripe CardElement styling
  const [isDarkMode, setIsDarkMode] = useState(false);
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  
  // Billing details state
  const [billingName, setBillingName] = useState("");
  const [billingLine1, setBillingLine1] = useState("");
  const [billingLine2, setBillingLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountry, setBillingCountry] = useState("");
  
  // Country dropdown state
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [countryHighlightIndex, setCountryHighlightIndex] = useState(0);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const countryListRef = useRef<HTMLDivElement>(null);
  const countryInputRef = useRef<HTMLInputElement>(null);
  
  // State dropdown for US
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [stateHighlightIndex, setStateHighlightIndex] = useState(0);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const stateListRef = useRef<HTMLDivElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);
  
  // Filtered countries based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const search = countrySearch.toLowerCase();
    return COUNTRIES.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.code.toLowerCase().includes(search)
    );
  }, [countrySearch]);
  
  // Filtered states based on search
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return US_STATES;
    const search = stateSearch.toLowerCase();
    return US_STATES.filter(s => 
      s.name.toLowerCase().includes(search) || 
      s.code.toLowerCase().includes(search)
    );
  }, [stateSearch]);
  
  // Click outside handlers for country dropdown
  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [countryDropdownOpen]);
  
  // Click outside handlers for state dropdown
  useEffect(() => {
    if (!stateDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setStateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [stateDropdownOpen]);
  
  // Determine if this is a subscription billing type
  const isSubscription = billingType === 'subscription';
  
  // Check if billing details are complete
  const isBillingComplete = billingName.trim() && billingLine1.trim() && billingCity.trim() && 
    billingPostalCode.trim() && billingCountry && (billingCountry !== 'US' || billingState);
  
  const handleCountrySelect = (countryCode: string) => {
    setBillingCountry(countryCode);
    setCountryDropdownOpen(false);
    setCountrySearch("");
    setCountryHighlightIndex(0);
    // Clear state if changing from US
    if (countryCode !== 'US') {
      setBillingState("");
    }
  };
  
  const handleStateSelect = (stateCode: string) => {
    setBillingState(stateCode);
    setStateDropdownOpen(false);
    setStateSearch("");
    setStateHighlightIndex(0);
  };

  const { data: cardStatus, isLoading, refetch } = useQuery<CardStatus>({
    queryKey: ["/api/partner/card/status"],
  });

  const { data: overageHistory } = useQuery<OverageHistoryItem[]>({
    queryKey: ["/api/partner/overage-history"],
  });

  const handleSaveCard = async () => {
    if (!stripe || !elements) return;

    setIsSettingUp(true);
    setCardError(null);

    try {
      // Validate billing details
      if (!isBillingComplete) {
        setCardError("Please complete all required billing details");
        setIsSettingUp(false);
        return;
      }
      
      // Build billing details from form
      const billingDetails = {
        name: billingName.trim(),
        address: {
          line1: billingLine1.trim(),
          line2: billingLine2.trim() || undefined,
          city: billingCity.trim(),
          state: billingCountry === 'US' ? billingState : (billingState || undefined),
          postal_code: billingPostalCode.trim(),
          country: billingCountry,
        },
      };
      
      const response = await apiRequest("POST", "/api/partner/card/setup-intent");
      const { clientSecret } = await response.json();

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (setupIntent?.payment_method) {
        await apiRequest("POST", "/api/partner/card/confirm", {
          paymentMethodId: setupIntent.payment_method,
        });

        toast({
          title: "Card saved",
          description: isSubscription 
            ? "Your payment method has been saved and verified."
            : "Your card has been saved for overage billing.",
        });
        setShowAddCard(false);
        refetch();
        // Also refresh dashboard card status for live API key check
        queryClient.invalidateQueries({ queryKey: ["/api/partner/card/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/partner/overage-history"] });
      }
    } catch (error: any) {
      setCardError(error.message || "Failed to save card");
      toast({
        title: "Error",
        description: error.message || "Failed to save card",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp(false);
    }
  };


  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const formatCardBrand = (brand?: string) => {
    if (!brand) return "";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {isSubscription ? 'Payment Method' : 'Card on File'}
          </CardTitle>
          <CardDescription>
            {isSubscription 
              ? 'Add a payment method to enable live API access and subscription billing'
              : 'Save a card for automatic billing when usage exceeds your purchased credits'
            }
          </CardDescription>
        </div>
        {cardStatus?.hasCard && (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {cardStatus?.hasCard ? (
          <>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {formatCardBrand(cardStatus.cardBrand)} ending in {cardStatus.cardLast4}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-1" />
                To update or remove your payment method, please contact us at{' '}
                <a href="mailto:hello@humanmetrix.com" className="text-primary hover:underline font-medium">
                  hello@humanmetrix.com
                </a>
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <Info className="h-4 w-4 inline mr-1" />
                {isSubscription 
                  ? 'Your payment method is on file for subscription billing. You can now create live API keys.'
                  : 'With a card on file, your API access stays active even when purchased credits run out. Usage is billed automatically on the 1st of each month.'
                }
              </p>
            </div>

            {overageHistory && overageHistory.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Overage History</p>
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Month</th>
                        <th className="px-3 py-2 text-right font-medium">Tests</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                        <th className="px-3 py-2 text-right font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {overageHistory.slice(0, 6).map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">{item.billingMonth}</td>
                          <td className="px-3 py-2 text-right">{item.overageCredits}</td>
                          <td className="px-3 py-2 text-right">{formatAmount(item.overageAmount)}</td>
                          <td className="px-3 py-2 text-right">
                            <Badge 
                              variant="outline" 
                              className={
                                item.chargeStatus === 'paid' 
                                  ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                                  : item.chargeStatus === 'pending'
                                  ? 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                                  : 'bg-red-500/10 text-red-600 border-red-500/30'
                              }
                            >
                              {item.chargeStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : showAddCard ? (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Billing Details</Label>
                <div className="p-4 border rounded-lg bg-background space-y-4">
                  <div>
                    <Label htmlFor="billing-name" className="text-sm text-muted-foreground">Full Name *</Label>
                    <Input
                      id="billing-name"
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="John Smith"
                      className="mt-1"
                      data-testid="input-billing-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="billing-line1" className="text-sm text-muted-foreground">Address Line 1 *</Label>
                    <Input
                      id="billing-line1"
                      value={billingLine1}
                      onChange={(e) => setBillingLine1(e.target.value)}
                      placeholder="123 Main Street"
                      className="mt-1"
                      data-testid="input-billing-line1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="billing-line2" className="text-sm text-muted-foreground">Address Line 2</Label>
                    <Input
                      id="billing-line2"
                      value={billingLine2}
                      onChange={(e) => setBillingLine2(e.target.value)}
                      placeholder="Apartment, suite, unit, etc. (optional)"
                      className="mt-1"
                      data-testid="input-billing-line2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billing-city" className="text-sm text-muted-foreground">City *</Label>
                      <Input
                        id="billing-city"
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        placeholder="London"
                        className="mt-1"
                        data-testid="input-billing-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billing-postal" className="text-sm text-muted-foreground">
                        {billingCountry === 'US' ? 'ZIP Code' : 'Postal Code'} *
                      </Label>
                      <Input
                        id="billing-postal"
                        value={billingPostalCode}
                        onChange={(e) => setBillingPostalCode(e.target.value)}
                        placeholder={billingCountry === 'US' ? '10001' : 'SW1A 1AA'}
                        className="mt-1"
                        data-testid="input-billing-postal"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div ref={countryDropdownRef} className="relative">
                      <Label className="text-sm text-muted-foreground">Country *</Label>
                      <div className="relative mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCountryDropdownOpen(!countryDropdownOpen);
                            setCountrySearch("");
                            setCountryHighlightIndex(0);
                            setTimeout(() => countryInputRef.current?.focus(), 0);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background hover:bg-muted/50 transition-colors text-left"
                          aria-haspopup="listbox"
                          aria-expanded={countryDropdownOpen}
                          data-testid="button-billing-country"
                        >
                          <span className={billingCountry ? '' : 'text-muted-foreground'}>
                            {billingCountry 
                              ? `${COUNTRIES.find(c => c.code === billingCountry)?.flag} ${COUNTRIES.find(c => c.code === billingCountry)?.name}`
                              : 'Select country'}
                          </span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                        {countryDropdownOpen && (
                          <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg">
                            <div className="p-2 border-b">
                              <Input
                                ref={countryInputRef}
                                value={countrySearch}
                                onChange={(e) => {
                                  setCountrySearch(e.target.value);
                                  setCountryHighlightIndex(0);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (filteredCountries.length > 0 && countryHighlightIndex >= 0) {
                                      handleCountrySelect(filteredCountries[countryHighlightIndex].code);
                                    }
                                  } else if (e.key === 'Escape') {
                                    setCountryDropdownOpen(false);
                                  } else if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setCountryHighlightIndex(prev => Math.min(prev + 1, filteredCountries.length - 1));
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setCountryHighlightIndex(prev => Math.max(prev - 1, 0));
                                  }
                                }}
                                placeholder="Search countries..."
                                className="h-8"
                                data-testid="input-country-search"
                              />
                            </div>
                            <div ref={countryListRef} className="max-h-[200px] overflow-y-auto" role="listbox">
                              {filteredCountries.length === 0 ? (
                                <div className="p-2 text-center text-muted-foreground text-sm">No country found</div>
                              ) : (
                                filteredCountries.map((country, index) => (
                                  <div
                                    key={country.code}
                                    ref={(el) => {
                                      if (index === countryHighlightIndex && el) {
                                        el.scrollIntoView({ block: 'nearest' });
                                      }
                                    }}
                                    onClick={() => handleCountrySelect(country.code)}
                                    className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                                      index === countryHighlightIndex ? 'bg-muted' : 'hover:bg-muted/50'
                                    }`}
                                    role="option"
                                    aria-selected={billingCountry === country.code}
                                    data-testid={`country-option-${country.code}`}
                                  >
                                    <span>{country.flag}</span>
                                    <span>{country.name}</span>
                                    {billingCountry === country.code && (
                                      <Check className="h-4 w-4 ml-auto text-primary" />
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {billingCountry === 'US' ? (
                      <div ref={stateDropdownRef} className="relative">
                        <Label className="text-sm text-muted-foreground">State *</Label>
                        <div className="relative mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setStateDropdownOpen(!stateDropdownOpen);
                              setStateSearch("");
                              setStateHighlightIndex(0);
                              setTimeout(() => stateInputRef.current?.focus(), 0);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 border rounded-md bg-background hover:bg-muted/50 transition-colors text-left"
                            aria-haspopup="listbox"
                            aria-expanded={stateDropdownOpen}
                            data-testid="button-billing-state"
                          >
                            <span className={billingState ? '' : 'text-muted-foreground'}>
                              {billingState 
                                ? US_STATES.find(s => s.code === billingState)?.name
                                : 'Select state'}
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </button>
                          {stateDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg">
                              <div className="p-2 border-b">
                                <Input
                                  ref={stateInputRef}
                                  value={stateSearch}
                                  onChange={(e) => {
                                    setStateSearch(e.target.value);
                                    setStateHighlightIndex(0);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (filteredStates.length > 0 && stateHighlightIndex >= 0) {
                                        handleStateSelect(filteredStates[stateHighlightIndex].code);
                                      }
                                    } else if (e.key === 'Escape') {
                                      setStateDropdownOpen(false);
                                    } else if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      setStateHighlightIndex(prev => Math.min(prev + 1, filteredStates.length - 1));
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      setStateHighlightIndex(prev => Math.max(prev - 1, 0));
                                    }
                                  }}
                                  placeholder="Search states..."
                                  className="h-8"
                                  data-testid="input-state-search"
                                />
                              </div>
                              <div ref={stateListRef} className="max-h-[200px] overflow-y-auto" role="listbox">
                                {filteredStates.length === 0 ? (
                                  <div className="p-2 text-center text-muted-foreground text-sm">No state found</div>
                                ) : (
                                  filteredStates.map((state, index) => (
                                    <div
                                      key={state.code}
                                      ref={(el) => {
                                        if (index === stateHighlightIndex && el) {
                                          el.scrollIntoView({ block: 'nearest' });
                                        }
                                      }}
                                      onClick={() => handleStateSelect(state.code)}
                                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${
                                        index === stateHighlightIndex ? 'bg-muted' : 'hover:bg-muted/50'
                                      }`}
                                      role="option"
                                      aria-selected={billingState === state.code}
                                      data-testid={`state-option-${state.code}`}
                                    >
                                      <span>{state.name}</span>
                                      {billingState === state.code && (
                                        <Check className="h-4 w-4 ml-auto text-primary" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="billing-state" className="text-sm text-muted-foreground">State / Province</Label>
                        <Input
                          id="billing-state"
                          value={billingState}
                          onChange={(e) => setBillingState(e.target.value)}
                          placeholder="Optional"
                          className="mt-1"
                          data-testid="input-billing-state"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Card Details</Label>
                <div className="p-4 border rounded-lg bg-background">
                  <CardElement
                    key={isDarkMode ? 'dark' : 'light'}
                    options={{
                      style: {
                        base: {
                          fontSize: "16px",
                          color: isDarkMode ? "#ffffff" : "#1f2937",
                          backgroundColor: "transparent",
                          iconColor: isDarkMode ? "#9ca3af" : "#6b7280",
                          "::placeholder": { color: isDarkMode ? "#6b7280" : "#9ca3af" },
                        },
                        invalid: { color: "#ef4444", iconColor: "#ef4444" },
                      },
                    }}
                    onChange={(event) => {
                      setCardComplete(event.complete);
                      setCardError(event.error ? event.error.message : null);
                    }}
                  />
                </div>
              </div>
              {cardError && (
                <p className="text-sm text-destructive">{cardError}</p>
              )}
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                Your card details are securely processed by Stripe. We never store your full card number. 
                {isSubscription && ' Your card will be authorized to verify it can be charged.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveCard}
                disabled={!cardComplete || !isBillingComplete || isSettingUp || !stripe}
                data-testid="button-confirm-save-card"
              >
                {isSettingUp && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSubscription ? 'Save & Verify Card' : 'Save Card'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddCard(false);
                  setCardError(null);
                  // Reset billing form
                  setBillingName("");
                  setBillingLine1("");
                  setBillingLine2("");
                  setBillingCity("");
                  setBillingState("");
                  setBillingPostalCode("");
                  setBillingCountry("");
                }}
                disabled={isSettingUp}
                data-testid="button-cancel-save-card"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border-2 border-dashed rounded-lg text-center">
              <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                {isSubscription 
                  ? 'No payment method on file. Add a card to create live API keys and enable billing.'
                  : 'No card saved. Add a card to keep API access active when purchased credits run out.'
                }
              </p>
              <Button onClick={() => setShowAddCard(true)} data-testid="button-add-card">
                <Plus className="h-4 w-4 mr-2" />
                Add Card
              </Button>
            </div>
            {isSubscription ? (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  A payment method is required to create live API keys and use the platform in production.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Without a card on file, your API access will be suspended when purchased credits are exhausted.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PrepaidCardManagement({ partnerId, currency, billingType }: { partnerId: string; currency?: string; billingType?: string }) {
  return (
    <Elements stripe={stripePromise}>
      <PrepaidCardManagementInner partnerId={partnerId} currency={currency} billingType={billingType} />
    </Elements>
  );
}

interface PartnerAccount {
  hasPartnerAccount: boolean;
  isTeamMember?: boolean;
  teamMemberRole?: string;
  isAdmin?: boolean;
  user?: {
    name: string;
    email: string;
  };
  partner?: {
    id: string;
    name: string;
    companyName: string | null;
    billingType: string;
    billingSetupComplete: boolean;
    testsPurchased: number;
    testsConsumed: number;
    remaining: number;
    isSuspended: boolean;
    suspendedAt: string | null;
    activeApiKeys: number;
    createdAt: string;
    freeTestsAllocated: number;
    freeTestsExpiresAt: string | null;
    currency: string;
    prepaidCreditsExpiresAt: string | null;
    tourCompleted: boolean;
    termsAccepted: boolean;
    termsAcceptedAt: string | null;
  };
}

interface UsageStats {
  currentMonth: {
    sessions: number;
    period: { start: string; end: string };
  };
  allTime: {
    totalTests: number;
  };
  quota: {
    purchased: number;
    consumed: number;
    remaining: number;
  };
  monthlyUsage: Array<{ month: string; sessions: number }>;
  recentEvents: Array<{
    id: string;
    eventType: string;
    createdAt: string;
    metadata?: any;
  }>;
}

interface BillingData {
  billingType: string;
  summary: {
    totalSpent: number;
    pendingAmount: number;
    pendingInvoices: number;
  };
  items: Array<{
    id: string;
    type: 'receipt' | 'invoice';
    date: string;
    description: string;
    amount: number;
    currency: string;
    status: string;
    invoiceNumber?: string;
    dueDate?: string;
    tests?: number;
    pricePerCredit?: number;
    testsUsed?: number;
  }>;
}

interface PartnerSettings {
  hasPartnerAccount: boolean;
  settings?: {
    quotaAlertEnabled: boolean;
    quotaAlertThreshold: number;
    quotaAlertEmail: string;
    autoTopUpEnabled: boolean;
    autoTopUpThreshold: number;
    autoTopUpPackage: string | null;
    brandingEnabled: boolean;
    brandingPrimaryColor: string;
    brandingAccentColor: string;
    brandingWelcomeTitle: string;
    brandingWelcomeMessage: string;
    brandingCompanyDisplayName: string;
    logoUrl: string;
    billingType: string;
    billingEmail: string;
  };
}

interface ApiKey {
  id: string;
  name: string;
  environment: string;
  keyPrefix: string;
  keyHint: string;
  displayKey: string;
  permissions: string[];
  rateLimit: number;
  lastUsedAt: string | null;
  createdAt: string;
  organisationId: string | null;
  isActive: boolean;
  revokedAt: string | null;
}

interface ApiKeysData {
  hasPartnerAccount: boolean;
  apiKeys: ApiKey[];
}

interface PartnerOrganization {
  id: string;
  partnerId: string;
  name: string;
  slug: string;
  adminEmail: string | null;
  adminName: string | null;
  isActive: boolean;
  createdAt: string;
  testsUsed: number;
  activeTests: number;
}

interface OrganizationsData {
  organizations: PartnerOrganization[];
}

interface OrganizationDetails {
  organization: PartnerOrganization;
  stats: {
    totalTests: number;
    completedTests: number;
    pendingTests: number;
    inProgressTests: number;
  };
  results: Array<{
    sessionId: string;
    assessmentType: string;
    externalUserId: string | null;
    externalEmail: string | null;
    completedAt: string | null;
    score: any;
  }>;
}

interface ActivityLog {
  activities: Array<{
    id: string;
    type: string;
    description: string;
    metadata?: any;
    createdAt: string;
    organizationId: string | null;
  }>;
  total: number;
}

interface PartnerResult {
  sessionId: string;
  assessmentType: string;
  externalUserId: string | null;
  externalEmail: string | null;
  completedAt: string | null;
  createdAt: string;
  organization: { id: string; name: string } | null;
  scores: any;
  overallScore: number | null;
}

interface ResultsData {
  results: PartnerResult[];
  total: number;
}

interface PartnerAnalytics {
  testsOverTime: Array<{ date: string; count: number }>;
  byAssessmentType: Array<{ type: string; count: number; avgScore: number | null }>;
  byOrganization: Array<{ orgId: string; orgName: string; count: number }>;
  scoreDistribution?: Array<{ type: string; buckets: Array<{ range: string; count: number }> }>;
}

interface PartnerNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    sessionId?: string;
    assessmentType?: string;
    externalUserId?: string;
    externalEmail?: string;
    totalScore?: number;
    percentile?: number;
    candidateEmail?: string;
    candidateName?: string;
  };
}

interface NotificationsData {
  notifications: PartnerNotification[];
  unreadCount: number;
}

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  inviteStatus: string;
  createdAt: string;
  acceptedAt: string | null;
}

interface TeamData {
  members: TeamMember[];
}

const PACKAGE_OPTIONS = [
  { value: 'starter', label: 'Starter (10 credits)' },
  { value: 'growth', label: 'Growth (25 credits)' },
  { value: 'professional', label: 'Professional (50 credits)' },
  { value: 'business', label: 'Business (100 credits)' },
  { value: 'enterprise', label: 'Enterprise (250 credits)' },
  { value: 'enterprise_plus', label: 'Enterprise+ (500 credits)' },
];

export default function PartnerDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("home");
  const { toast } = useToast();
  const { currency, formatLocalPrice, getAdjustedPriceInPence, countryCode, pricingTier, isLoading: currencyLoading } = useCurrency();
  
  // Handle URL query parameters for tab navigation and purchase cancellation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const purchaseCancelled = params.get('purchase_cancelled');
    
    if (tab && ['home', 'billing', 'results', 'invitations', 'team', 'api-keys', 'settings', 'ecosystem', 'usage', 'developer', 'analytics', 'notifications', 'activity', 'pipeline'].includes(tab)) {
      setActiveTab(tab);
    }
    
    if (purchaseCancelled === 'true') {
      toast({
        title: "Purchase cancelled",
        description: "Your credit purchase was cancelled. You can try again anytime.",
      });
      // Clear the query params from URL without triggering a reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);
  
  // Promo code state for package purchases
  const [promoCode, setPromoCode] = useState("");
  
  
  // Tour state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialChecked, setTutorialChecked] = useState(false);
  
  
  // Terms acceptance state
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  
  // Organization state
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showAddOrgDialog, setShowAddOrgDialog] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState("");
  const [newOrgAdminName, setNewOrgAdminName] = useState("");
  
  // Settings state
  const [quotaAlertEnabled, setQuotaAlertEnabled] = useState(true);
  const [quotaAlertThreshold, setQuotaAlertThreshold] = useState(80);
  const [quotaAlertEmail, setQuotaAlertEmail] = useState("");
  const [autoTopUpEnabled, setAutoTopUpEnabled] = useState(false);
  const [autoTopUpThreshold, setAutoTopUpThreshold] = useState(10);
  const [autoTopUpPackage, setAutoTopUpPackage] = useState<string | null>(null);
  // Branding settings state
  const [brandingEnabled, setBrandingEnabled] = useState(false);
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState("#0891b2");
  const [brandingAccentColor, setBrandingAccentColor] = useState("#06b6d4");
  const [brandingWelcomeTitle, setBrandingWelcomeTitle] = useState("");
  const [brandingWelcomeMessage, setBrandingWelcomeMessage] = useState("");
  const [brandingCompanyDisplayName, setBrandingCompanyDisplayName] = useState("");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // API key rotation state
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [confirmRotateKeyId, setConfirmRotateKeyId] = useState<string | null>(null);
  const [confirmRevokeKeyId, setConfirmRevokeKeyId] = useState<string | null>(null);
  const [confirmRemoveMemberId, setConfirmRemoveMemberId] = useState<string | null>(null);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");
  const [editMemberRole, setEditMemberRole] = useState("");
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Create API key state
  const [showCreateKeyDialog, setShowCreateKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<"test" | "live">("test");
  const [creatingKeyType, setCreatingKeyType] = useState<'test' | 'live' | null>(null);
  const [newKeyData, setNewKeyData] = useState<{ fullKey: string; environment: string } | null>(null);
  
  // Purchase state
  const [purchasingPackageSize, setPurchasingPackageSize] = useState<number | null>(null);

  // Billing change request state
  const [showBillingChangeDialog, setShowBillingChangeDialog] = useState(false);
  const [selectedBillingType, setSelectedBillingType] = useState<string | null>(null);
  const [billingChangeReason, setBillingChangeReason] = useState("");
  const [isSubmittingBillingChange, setIsSubmittingBillingChange] = useState(false);
  const [isCancellingBillingChange, setIsCancellingBillingChange] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  
  // PDF Import modal state
  const [showPdfImportModal, setShowPdfImportModal] = useState(false);
  
  // Enterprise billing setup state
  const [showBillingSetupDialog, setShowBillingSetupDialog] = useState(false);
  const [billingSetupForm, setBillingSetupForm] = useState({
    billingAddressLine1: "",
    billingAddressLine2: "",
    billingCity: "",
    billingPostcode: "",
    billingCountry: "",
    vatNumber: "",
    companyRegistrationNumber: "",
    invoiceContact: "",
    billingEmail: "",
    purchaseOrderRequired: false,
    defaultPurchaseOrderNumber: "",
  });
  const [isSubmittingBillingSetup, setIsSubmittingBillingSetup] = useState(false);

  const { data: account, isLoading: accountLoading } = useQuery<PartnerAccount>({
    queryKey: ["/api/partner/account"],
  });

  const { data: dashboardCardStatus } = useQuery<CardStatus>({
    queryKey: ["/api/partner/card/status"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageStats>({
    queryKey: ["/api/partner/me/usage"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: billing, isLoading: billingLoading } = useQuery<BillingData>({
    queryKey: ["/api/partner/me/billing"],
    enabled: !!account?.hasPartnerAccount,
  });

  // Credit package pricing with currency conversion
  interface PricingData {
    currency: string;
    packages: Array<{
      size: number;
      name: string;
      price: number;
      pricePerTest: number;
      discountPercent: number;
      subscriptionDiscountPercent: number;
      savings: number;
    }>;
    exchangeRate: number;
    pppMultiplier: number;
    basePricePerTest: number;
    isZeroDecimal: boolean;
  }

  const { data: pricing, isLoading: pricingLoading } = useQuery<PricingData>({
    queryKey: ["/api/partner/me/pricing"],
    queryFn: async () => {
      const res = await fetch(`/api/partner/me/pricing`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch pricing');
      return res.json();
    },
    enabled: !!account?.hasPartnerAccount,
  });

  // Currency symbols for partner pricing display (uses partner's assigned currency, not geolocation)
  const partnerCurrencySymbols: Record<string, string> = {
    'GBP': '£', 'USD': '$', 'EUR': '€', 'SGD': 'S$', 'AUD': 'A$', 'CAD': 'C$',
    'HKD': 'HK$', 'JPY': '¥', 'INR': '₹', 'MYR': 'RM', 'THB': '฿',
  };

  // Format price using partner's assigned currency from API (not geolocation)
  const formatPartnerPrice = (amountInSmallestUnit: number): string => {
    const partnerCurrency = pricing?.currency || 'GBP';
    const symbol = partnerCurrencySymbols[partnerCurrency] || partnerCurrency + ' ';
    const isZeroDecimal = pricing?.isZeroDecimal || false;
    const amount = isZeroDecimal ? amountInSmallestUnit : amountInSmallestUnit / 100;
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Billing change request data
  interface BillingChangeRequestData {
    pendingRequest: {
      id: string;
      requestedBillingType: string;
      reason?: string;
      createdAt: string;
      status: string;
    } | null;
    history: Array<{
      id: string;
      currentBillingType: string;
      requestedBillingType: string;
      reason?: string;
      status: string;
      reviewNotes?: string;
      createdAt: string;
      reviewedAt?: string;
    }>;
  }

  const { data: billingChangeData, isLoading: billingChangeLoading, refetch: refetchBillingChange } = useQuery<BillingChangeRequestData>({
    queryKey: ["/api/partner/me/billing-change-request"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<PartnerSettings>({
    queryKey: ["/api/partner/me/settings"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: apiKeys, isLoading: apiKeysLoading } = useQuery<ApiKeysData>({
    queryKey: ["/api/partner/me/api-keys"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: organizations, isLoading: organizationsLoading } = useQuery<OrganizationsData>({
    queryKey: ["/api/partner/me/organizations"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: selectedOrg, isLoading: selectedOrgLoading } = useQuery<OrganizationDetails>({
    queryKey: ["/api/partner/me/organizations", selectedOrgId],
    enabled: !!selectedOrgId,
  });

  const { data: activityLog, isLoading: activityLoading } = useQuery<ActivityLog>({
    queryKey: ["/api/partner/me/activity-log"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: resultsData, isLoading: resultsLoading } = useQuery<ResultsData>({
    queryKey: ["/api/partner/me/results"],
    enabled: !!account?.hasPartnerAccount,
  });

  // Analytics state
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [analyticsDays, setAnalyticsDays] = useState(30);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<PartnerAnalytics>({
    queryKey: ['/api/partner/me/analytics', analyticsPeriod, analyticsDays],
    queryFn: async () => {
      const res = await fetch(`/api/partner/me/analytics?period=${analyticsPeriod}&days=${analyticsDays}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery<NotificationsData>({
    queryKey: ["/api/partner/me/notifications"],
    enabled: !!account?.hasPartnerAccount,
  });

  const { data: notificationPrefs, refetch: refetchNotificationPrefs } = useQuery<{ preferences: Record<string, boolean> }>({
    queryKey: ["/api/partner/me/notification-preferences"],
    enabled: !!account?.hasPartnerAccount,
  });

  const updateNotificationPrefsMutation = useMutation({
    mutationFn: async (preferences: Record<string, boolean>) => {
      return await apiRequest("PATCH", "/api/partner/me/notification-preferences", { preferences });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/notification-preferences"] });
      toast({ title: "Notification preferences updated" });
    },
    onError: () => {
      toast({ title: "Failed to update preferences", variant: "destructive" });
    },
  });

  const { data: team, isLoading: teamLoading } = useQuery<TeamData>({
    queryKey: ["/api/partner/me/team"],
    enabled: !!account?.hasPartnerAccount,
  });

  // Team member state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Initialize settings from fetched data
  const initSettings = () => {
    if (settings?.settings) {
      setQuotaAlertEnabled(settings.settings.quotaAlertEnabled);
      setQuotaAlertThreshold(settings.settings.quotaAlertThreshold);
      setQuotaAlertEmail(settings.settings.quotaAlertEmail);
      setAutoTopUpEnabled(settings.settings.autoTopUpEnabled);
      setAutoTopUpThreshold(settings.settings.autoTopUpThreshold);
      setAutoTopUpPackage(settings.settings.autoTopUpPackage);
      // Branding settings
      setBrandingEnabled(settings.settings.brandingEnabled ?? false);
      setBrandingPrimaryColor(settings.settings.brandingPrimaryColor || '#0891b2');
      setBrandingAccentColor(settings.settings.brandingAccentColor || '#06b6d4');
      setBrandingWelcomeTitle(settings.settings.brandingWelcomeTitle || '');
      setBrandingWelcomeMessage(settings.settings.brandingWelcomeMessage || '');
      setBrandingCompanyDisplayName(settings.settings.brandingCompanyDisplayName || '');
      setBrandingLogoUrl(settings.settings.logoUrl || '');
    }
  };

  // Tour completion mutation - saves to database for cross-device persistence
  const tourCompleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/partner/me/tour-completed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/account"] });
    },
  });

  // Check if user needs to accept terms (must accept before accessing dashboard)
  useEffect(() => {
    if (account?.hasPartnerAccount && account?.partner?.id && !termsChecked) {
      setTermsChecked(true);
      if (!account.partner.termsAccepted) {
        setShowTermsDialog(true);
      }
    }
  }, [account, termsChecked]);

  // Check if user needs to see tutorial on first login (uses database-backed tourCompleted flag)
  // Only show after terms are accepted
  useEffect(() => {
    if (account?.hasPartnerAccount && account?.partner?.id && !tutorialChecked && account.partner.termsAccepted) {
      setTutorialChecked(true);
      // Check database-backed tourCompleted flag instead of localStorage
      if (!account.partner.tourCompleted) {
        // Small delay to let the dashboard load first
        setTimeout(() => setShowTutorial(true), 500);
      }
    }
  }, [account, tutorialChecked]);

  // Tour handlers
  const handleTourComplete = () => {
    // Save to database for cross-device persistence
    tourCompleteMutation.mutate();
    setShowTutorial(false);
    setActiveTab('home');
    toast({
      title: "Tour completed!",
      description: "You can take the tour again anytime using the 'Take a Tour' button.",
    });
  };

  const handleTourClose = () => {
    // Save to database for cross-device persistence
    tourCompleteMutation.mutate();
    setShowTutorial(false);
  };

  const handleRestartTutorial = () => {
    setActiveTab('home');
    setShowTutorial(true);
  };

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<{
      quotaAlertEnabled: boolean;
      quotaAlertThreshold: number;
      quotaAlertEmail: string;
      autoTopUpEnabled: boolean;
      autoTopUpThreshold: number;
      autoTopUpPackage: string | null;
      brandingEnabled: boolean;
      brandingPrimaryColor: string;
      brandingAccentColor: string;
      brandingWelcomeTitle: string;
      brandingWelcomeMessage: string;
      brandingCompanyDisplayName: string;
      logoUrl: string;
    }>) => {
      const response = await apiRequest("PATCH", "/api/partner/me/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/settings"] });
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("POST", "/api/change-password", data);
      return response.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to change password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ currentPassword, newPassword });
  };

  // Purchase test package mutation
  const purchaseMutation = useMutation({
    mutationFn: async (packageSize: number) => {
      const response = await apiRequest("POST", "/api/partner/purchase/checkout", { 
        packageSize,
        countryCode, // Server computes PPP from this
        promoCode: promoCode.trim() || undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
      setPurchasingPackageSize(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create checkout",
        description: error.message,
        variant: "destructive",
      });
      setPurchasingPackageSize(null);
    },
  });

  const handlePurchase = (packageSize: number) => {
    setPurchasingPackageSize(packageSize);
    purchaseMutation.mutate(packageSize);
  };

  // Billing change request handlers
  const handleSubmitBillingChange = async () => {
    if (!selectedBillingType) return;
    setIsSubmittingBillingChange(true);
    try {
      const response = await apiRequest("POST", "/api/partner/me/billing-change-request", {
        requestedBillingType: selectedBillingType,
        reason: billingChangeReason || undefined,
      });
      if (response.ok) {
        toast({
          title: "Request submitted",
          description: "Your billing change request has been submitted for review.",
        });
        setShowBillingChangeDialog(false);
        setSelectedBillingType(null);
        setBillingChangeReason("");
        refetchBillingChange();
      } else {
        const data = await response.json();
        toast({
          title: "Failed to submit request",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to submit request",
        description: "An error occurred while submitting your request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingBillingChange(false);
    }
  };

  const handleCancelBillingChange = async (requestId: string) => {
    setIsCancellingBillingChange(true);
    try {
      const response = await apiRequest("DELETE", `/api/partner/me/billing-change-request/${requestId}`);
      if (response.ok) {
        toast({
          title: "Request cancelled",
          description: "Your billing change request has been cancelled.",
        });
        refetchBillingChange();
      } else {
        const data = await response.json();
        toast({
          title: "Failed to cancel request",
          description: data.message || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Failed to cancel request",
        description: "An error occurred while cancelling your request.",
        variant: "destructive",
      });
    } finally {
      setIsCancellingBillingChange(false);
    }
  };

  // Create organization mutation
  const createOrgMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; adminEmail?: string; adminName?: string }) => {
      const response = await apiRequest("POST", "/api/partner/me/organizations", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/organizations"] });
      setShowAddOrgDialog(false);
      setNewOrgName("");
      setNewOrgSlug("");
      setNewOrgAdminEmail("");
      setNewOrgAdminName("");
      toast({
        title: "Organization created",
        description: "The organization has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete organization mutation
  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const response = await apiRequest("DELETE", `/api/partner/me/organizations/${orgId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/organizations"] });
      setSelectedOrgId(null);
      toast({
        title: "Organization deleted",
        description: "The organization has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete organization",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateOrg = () => {
    if (!newOrgName || !newOrgSlug) return;
    createOrgMutation.mutate({
      name: newOrgName,
      slug: newOrgSlug,
      adminEmail: newOrgAdminEmail || undefined,
      adminName: newOrgAdminName || undefined,
    });
  };

  // Rotate API key mutation
  const rotateKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("POST", `/api/partner/me/api-keys/${keyId}/rotate`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/api-keys"] });
      setNewApiKey(data.newKey);
      setShowNewKeyDialog(true);
      setRotatingKeyId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to rotate key",
        description: error.message,
        variant: "destructive",
      });
      setRotatingKeyId(null);
    },
  });

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (data: { name: string; environment: "test" | "live" }) => {
      const response = await apiRequest("POST", "/api/partner/me/api-keys", data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/account"] });
      
      // Ensure the API key data is present in response
      if (data?.apiKey?.fullKey) {
        setNewKeyData({ fullKey: data.apiKey.fullKey, environment: variables.environment });
        setShowCreateKeyDialog(false);
        setNewKeyName("");
        setNewKeyEnvironment("test");
        toast({
          title: "API Key Created",
          description: "Your new API key has been generated. Copy it now - it won't be shown again.",
        });
      } else {
        console.error("API key creation response missing fullKey:", data);
        toast({
          title: "API Key Created",
          description: "Key was created but the full key could not be displayed. Please contact support.",
          variant: "destructive",
        });
      }
      setCreatingKeyType(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create API key",
        description: error.message,
        variant: "destructive",
      });
      setCreatingKeyType(null);
    },
  });

  // Revoke API key mutation
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const response = await apiRequest("DELETE", `/api/partner/me/api-keys/${keyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partner/account"] });
      setRevokingKeyId(null);
      toast({
        title: "API key revoked",
        description: "The API key has been permanently deactivated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to revoke key",
        description: error.message,
        variant: "destructive",
      });
      setRevokingKeyId(null);
    },
  });

  const handleCreateKey = () => {
    if (!newKeyName) return;
    createKeyMutation.mutate({ name: newKeyName, environment: newKeyEnvironment });
  };

  const handleCreateTestKey = () => {
    setCreatingKeyType('test');
    createKeyMutation.mutate({ name: `Test Key - ${new Date().toLocaleDateString()}`, environment: 'test' });
  };

  const handleCreateLiveKey = () => {
    const isSubscriptionBilling = account?.partner?.billingType === 'subscription';
    const hasCard = dashboardCardStatus?.hasCard === true;
    
    if (isSubscriptionBilling && !hasCard) {
      toast({
        title: "Payment method required",
        description: "Add a payment method before creating live API keys.",
        variant: "destructive",
      });
      return;
    }
    
    setCreatingKeyType('live');
    createKeyMutation.mutate({ name: `Live Key - ${new Date().toLocaleDateString()}`, environment: 'live' });
  };

  const handleClearNewKey = () => {
    setNewKeyData(null);
  };

  const handleRevokeKey = (keyId: string) => {
    setConfirmRevokeKeyId(keyId);
  };

  const confirmRevoke = () => {
    if (confirmRevokeKeyId) {
      setRevokingKeyId(confirmRevokeKeyId);
      revokeKeyMutation.mutate(confirmRevokeKeyId);
      setConfirmRevokeKeyId(null);
    }
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      quotaAlertEnabled,
      quotaAlertThreshold,
      quotaAlertEmail,
      autoTopUpEnabled,
      autoTopUpThreshold,
      autoTopUpPackage,
      brandingEnabled,
      brandingPrimaryColor,
      brandingAccentColor,
      brandingWelcomeTitle,
      brandingWelcomeMessage,
      brandingCompanyDisplayName,
      logoUrl: brandingLogoUrl,
    });
  };

  const handleRotateKey = (keyId: string) => {
    setConfirmRotateKeyId(keyId);
  };

  const confirmRotate = () => {
    if (confirmRotateKeyId) {
      setRotatingKeyId(confirmRotateKeyId);
      rotateKeyMutation.mutate(confirmRotateKeyId);
      setConfirmRotateKeyId(null);
    }
  };

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(newApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Team member mutations
  const inviteMemberMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string; role: string }) => {
      const response = await apiRequest("POST", "/api/partner/me/team/invite", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/team"] });
      setShowInviteDialog(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("member");
      const message = data?.message || "Team member has been invited.";
      const title = data?.reactivated ? "Invitation renewed" : (data?.resent ? "Invitation resent" : "Invitation sent");
      toast({ title, description: message });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to send invitation", description: error.message, variant: "destructive" });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/partner/me/team/${id}/resend`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/team"] });
      toast({ 
        title: "Invitation resent", 
        description: data.message || "A new invitation email has been sent."
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to resend invitation", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/partner/me/team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/team"] });
      toast({ title: "Member removed" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; role: string }) => {
      const response = await apiRequest("PATCH", `/api/partner/me/team/${data.id}`, { name: data.name, role: data.role });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/team"] });
      setEditMemberId(null);
      setEditMemberName("");
      setEditMemberRole("");
      toast({ title: "Member updated", description: "Team member has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  // Notification mutations
  const markReadMutation = useMutation({
    mutationFn: async ({ id, recipientId }: { id: string; recipientId?: string }) => {
      // If recipientId is provided, use it and flag it as recipient-based
      const targetId = recipientId || id;
      await apiRequest("POST", `/api/partner/me/notifications/${targetId}/read`, {
        isRecipientId: !!recipientId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/partner/me/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/partner/me/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const partnerCurrency = account?.partner?.currency || 'GBP';
  
  // Format currency using API-provided isZeroDecimal flag
  // Uses the same roundPriceUp approach as home page pricing
  const formatCurrency = (amount: number, currency?: string, isZeroDecimalOverride?: boolean) => {
    const curr = currency || partnerCurrency;
    const currencySymbols: Record<string, string> = {
      // Tier 1 - Developed Markets
      gbp: '£',
      usd: '$',
      eur: '€',
      sgd: 'S$',
      aud: 'A$',
      cad: 'C$',
      jpy: '¥',
      chf: 'Fr',
      nzd: 'NZ$',
      hkd: 'HK$',
      // Tier 2 - Emerging Markets
      myr: 'RM',
      thb: '฿',
      php: '₱',
      inr: '₹',
      aed: 'د.إ',
      sar: '﷼',
      zar: 'R',
      brl: 'R$',
      mxn: 'Mex$',
      krw: '₩',
      twd: 'NT$',
      // Tier 3 - SEA Emerging Markets
      idr: 'Rp',
      vnd: '₫',
      mmk: 'K',
      khr: '៛',
      lak: '₭',
      bnd: 'B$',
      pkr: '₨',
      bdt: '৳',
      lkr: 'Rs',
      npr: '₨',
      try: '₺',
      egp: 'E£',
      ngn: '₦',
      kes: 'KSh',
      clp: 'CLP$',
      cop: 'COL$',
      pen: 'S/',
      ars: 'AR$',
    };
    
    // Use API-provided flag if available, otherwise fallback to local check
    const isZeroDecimal = isZeroDecimalOverride ?? pricing?.isZeroDecimal ?? false;
    
    const symbol = currencySymbols[curr.toLowerCase()] || '£';
    
    if (isZeroDecimal) {
      // Zero-decimal currencies: amount is already in whole units
      return `${symbol}${amount.toLocaleString()}`;
    }
    // Regular currencies: amount is in cents, divide by 100
    // Display without decimals since roundPriceUp already gives clean numbers
    const displayAmount = amount / 100;
    // Show decimals only if the amount has fractional cents after division
    const hasDecimals = displayAmount % 1 !== 0;
    return `${symbol}${displayAmount.toLocaleString(undefined, { 
      minimumFractionDigits: hasDecimals ? 2 : 0, 
      maximumFractionDigits: 2 
    })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (accountLoading) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <Navigation />
        <main className="flex-grow flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loader-partner-dashboard" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!account?.hasPartnerAccount) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `url(${dashboardBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
          }} />
        </div>
        <Navigation />
        <main className="flex-grow flex items-center justify-center relative z-10 py-16 px-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>No Partner Account</CardTitle>
              <CardDescription>
                Your organisation does not have a B2B partner account. Contact our team to set up API access for your organisation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => setLocation("/dashboard")}
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const partner = account.partner!;
  const isAdmin = account.isAdmin ?? true; // Default to true for backwards compatibility
  const isTeamMember = account.isTeamMember ?? false;
  const teamMemberRole = account.teamMemberRole;
  const usagePercentage = partner.testsPurchased > 0 
    ? Math.round((partner.testsConsumed / partner.testsPurchased) * 100) 
    : 0;

  // Role-based access control for tabs
  // Viewer: Read-only access to Overview, Results, Analysis, Notifications
  // Member: Above + Invitations, Usage, Analytics
  // Developer: Member access + API Keys, Webhooks, ATS Integrations, Scheduled Exports
  // Admin/Owner: Full access to all features
  const isViewer = teamMemberRole === 'viewer';
  const isDeveloper = teamMemberRole === 'developer';
  const isMemberOrAbove = !isViewer; // member, developer, admin, owner, or direct partner
  const isDeveloperOrAbove = isDeveloper || isAdmin; // developer, admin, owner have dev access
  const canAccessBilling = isAdmin; // Only admin/owner can access billing
  const canAccessUsage = isMemberOrAbove; // member+ can see usage
  const canAccessInvitations = isMemberOrAbove; // member+ can send invitations
  const canAccessAnalytics = isMemberOrAbove; // member+ can see analytics
  const canAccessSettings = isAdmin; // Only admin/owner can access account settings
  const canAccessActivityLog = isMemberOrAbove; // member+ can see activity log
  const canAccessDeveloperTools = isDeveloperOrAbove; // developer+ can access API keys, webhooks, integrations

  return (
    <div className="min-h-screen flex flex-col relative">
      <Helmet>
        <title>Partner Dashboard | HumanMetrix</title>
        <meta name="description" content="View your B2B partner usage statistics and billing history." />
      </Helmet>

      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url(${dashboardBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.75), rgba(13, 29, 51, 0.85))'
        }} />
      </div>

      <Navigation />

      <main className="flex-grow py-8 md:py-16 relative z-10">
        <div className="mx-auto max-w-7xl px-3 md:px-6 lg:px-8">
          <div className="mb-4 md:mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1 md:mb-2">
                  <h1 className="text-xl md:text-3xl font-bold text-white" data-testid="text-partner-name">
                    {partner.companyName || partner.name}
                  </h1>
                  {partner.isSuspended ? (
                    <Badge variant="destructive" className="gap-1 text-xs md:text-sm">
                      <AlertTriangle className="h-3 w-3" />
                      API Suspended
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-xs md:text-sm bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                      <CheckCircle className="h-3 w-3" />
                      Partner
                    </Badge>
                  )}
                  {isTeamMember && teamMemberRole && (
                    <Badge variant="outline" className="gap-1 text-xs md:text-sm bg-white/10 text-white/90 border-white/20 capitalize">
                      <Users className="h-3 w-3" />
                      {teamMemberRole}
                    </Badge>
                  )}
                </div>
                <p className="text-xs md:text-base text-white/80">
                  Manage your assessments, organizations, and API integrations
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestartTutorial}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 self-start md:self-auto text-xs md:text-sm"
                data-testid="button-help-tutorial"
              >
                <HelpCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Take a Tour
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
            <TabsList className="flex flex-wrap justify-start gap-1 h-auto p-1 bg-white/10 border border-white/20 w-auto">
              <TabsTrigger value="home" data-testid="tab-home" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Overview
              </TabsTrigger>
              <TabsTrigger value="pipeline" data-testid="tab-pipeline" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Candidates
              </TabsTrigger>
              <TabsTrigger value="analysis" data-testid="tab-analysis" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Analysis
              </TabsTrigger>
              <TabsTrigger value="results" data-testid="tab-results" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Results
              </TabsTrigger>
              {canAccessInvitations && (
                <TabsTrigger value="invitations" data-testid="tab-invitations" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Invites
                </TabsTrigger>
              )}
              <TabsTrigger value="ecosystem" data-testid="tab-ecosystem" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] relative data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Ecosystem Index
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-[8px] md:text-[10px] bg-cyan-500 text-white border-0">New</Badge>
              </TabsTrigger>
              <TabsTrigger value="cohort-benchmarking" data-testid="tab-cohort-benchmarking" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] relative data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                Cohort Benchmarking
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-[8px] md:text-[10px] bg-amber-500 text-white border-0">Soon</Badge>
              </TabsTrigger>
              {/* Organizations tab hidden for now - feature preserved in code */}
              {false && (
                <TabsTrigger value="organizations" data-testid="tab-organizations" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Orgs
                </TabsTrigger>
              )}
              {isAdmin && (
                <TabsTrigger value="team" data-testid="tab-team" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Team
                </TabsTrigger>
              )}
              {canAccessBilling && (
                <TabsTrigger value="billing" data-testid="tab-billing" className="text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 min-w-[70px] data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  <CreditCard className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  Billing
                </TabsTrigger>
              )}
              
              {/* Settings Dropdown - contains Usage, Developer, Analytics, Notifications, Settings, Activity Log */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-0.5 md:gap-1 px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors ${
                      ['usage', 'developer', 'analytics', 'notifications', 'settings', 'activity'].includes(activeTab)
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                    data-testid="dropdown-settings"
                  >
                    <Settings className="h-3 w-3 md:h-4 md:w-4" />
                    Settings
                    {(notifications?.unreadCount ?? 0) > 0 && (
                      <span className="bg-red-500 text-white text-[10px] md:text-xs rounded-full h-3.5 w-3.5 md:h-4 md:w-4 flex items-center justify-center ml-0.5 md:ml-1">
                        {notifications!.unreadCount > 9 ? '9+' : notifications!.unreadCount}
                      </span>
                    )}
                    <ChevronDown className="h-2.5 w-2.5 md:h-3 md:w-3 ml-0.5 md:ml-1" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {canAccessUsage && (
                    <DropdownMenuItem 
                      onClick={() => setActiveTab('usage')}
                      className={activeTab === 'usage' ? 'bg-accent' : ''}
                      data-testid="dropdown-item-usage"
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Usage
                    </DropdownMenuItem>
                  )}
                  {canAccessDeveloperTools && (
                    <DropdownMenuItem 
                      onClick={() => setActiveTab('developer')}
                      className={activeTab === 'developer' ? 'bg-accent' : ''}
                      data-testid="dropdown-item-developer"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Developer
                    </DropdownMenuItem>
                  )}
                  {canAccessAnalytics && (
                    <DropdownMenuItem 
                      onClick={() => setActiveTab('analytics')}
                      className={activeTab === 'analytics' ? 'bg-accent' : ''}
                      data-testid="dropdown-item-analytics"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setActiveTab('notifications')}
                    className={activeTab === 'notifications' ? 'bg-accent' : ''}
                    data-testid="dropdown-item-notifications"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                    {(notifications?.unreadCount ?? 0) > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {notifications!.unreadCount > 9 ? '9+' : notifications!.unreadCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  {canAccessSettings && (
                    <DropdownMenuItem 
                      onClick={() => { setActiveTab('settings'); initSettings(); }}
                      className={activeTab === 'settings' ? 'bg-accent' : ''}
                      data-testid="dropdown-item-settings"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </DropdownMenuItem>
                  )}
                  {canAccessActivityLog && (
                    <DropdownMenuItem 
                      onClick={() => setActiveTab('activity')}
                      className={activeTab === 'activity' ? 'bg-accent' : ''}
                      data-testid="dropdown-item-activity"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Activity Log
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TabsList>

            {/* Home Tab */}
            <TabsContent value="home" className="space-y-4 md:space-y-6" data-testid="panel-home">
              {/* Free Tests Expiry Banner */}
              {(() => {
                if (!partner?.freeTestsAllocated || partner.freeTestsAllocated === 0) return null;
                if (!partner?.freeTestsExpiresAt) return null;
                
                // Hide when all free credits have been used up
                const freeTestsRemaining = partner.freeTestsAllocated - (partner.testsConsumed || 0);
                if (freeTestsRemaining <= 0) return null;
                
                const expiryDate = new Date(partner.freeTestsExpiresAt);
                const now = new Date();
                const diffMs = expiryDate.getTime() - now.getTime();
                const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                
                // Don't show if already expired
                if (daysRemaining <= 0) return null;
                
                const isUrgent = daysRemaining <= 2;
                
                return (
                  <Card className={`border-2 ${isUrgent ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-950/30'}`} data-testid="card-free-tests-expiry">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${isUrgent ? 'bg-amber-500' : 'bg-cyan-500'}`}>
                            <Clock className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className={`font-semibold ${isUrgent ? 'text-amber-700 dark:text-amber-400' : 'text-cyan-700 dark:text-cyan-400'}`}>
                              {isUrgent ? 'Free Tests Expiring Soon!' : 'Free Tests Available'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              You have <strong>{freeTestsRemaining}</strong> complimentary test{freeTestsRemaining !== 1 ? 's' : ''} that expire{freeTestsRemaining === 1 ? 's' : ''} in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong>
                              {' '}({expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant={isUrgent ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => window.open('/developers', '_blank')}
                          className={isUrgent ? 'bg-amber-600 hover:bg-amber-700' : ''}
                        >
                          Get Started
                          <ExternalLink className="h-3 w-3 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Welcome Message */}
              <div className="text-center py-6">
                <h2 className="text-2xl font-semibold mb-2 text-white" data-testid="text-welcome">
                  Welcome back{partner?.companyName ? `, ${partner.companyName}` : ''}
                </h2>
                <p className="text-white/90 text-lg">What do you want to do today?</p>
              </div>

              {/* Quick Actions */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActiveTab("invitations"); window.scrollTo(0, 0); }} data-testid="card-quick-invite">
                  <CardContent className="pt-6 text-center">
                    <Send className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">Quick Invite</h3>
                    <p className="text-sm text-muted-foreground">Send assessment invitations</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActiveTab("billing"); window.scrollTo(0, 0); }} data-testid="card-quick-billing">
                  <CardContent className="pt-6 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">Purchase Credits</h3>
                    <p className="text-sm text-muted-foreground">Top up your balance</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActiveTab("results"); window.scrollTo(0, 0); }} data-testid="card-quick-results">
                  <CardContent className="pt-6 text-center">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">View Results</h3>
                    <p className="text-sm text-muted-foreground">See assessment results</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActiveTab("ecosystem"); window.scrollTo(0, 0); }} data-testid="card-quick-team-analysis">
                  <CardContent className="pt-6 text-center">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h3 className="font-semibold">Team Analysis</h3>
                    <p className="text-sm text-muted-foreground">AI-powered diagnostics</p>
                  </CardContent>
                </Card>
              </div>

              {/* Account Overview */}
              <div className="grid gap-2 md:gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <CardTitle className="text-xs md:text-sm font-medium">Candidates Onboarded</CardTitle>
                      <InfoTooltip content="Total number of candidates who have completed assessments." />
                    </div>
                    <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className="text-xl md:text-2xl font-bold" data-testid="text-candidates-onboarded">
                      {resultsData?.total ?? 0}
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">completed assessments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <CardTitle className="text-xs md:text-sm font-medium">Credits Available</CardTitle>
                      <InfoTooltip content="Credits available for new assessments. Purchase more when running low." />
                    </div>
                    <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                    <div className={`text-xl md:text-2xl font-bold ${partner.remaining <= 10 ? 'text-destructive' : partner.remaining <= 25 ? 'text-amber-500' : ''}`} data-testid="text-credits-available">
                      {partner.remaining.toLocaleString()}
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      <Button 
                        variant="ghost" 
                        className="h-auto p-0 text-[10px] md:text-xs text-primary underline hover:underline" 
                        onClick={() => { setActiveTab("billing"); window.scrollTo(0, 0); }}
                        data-testid="link-purchase-more"
                      >
                        Purchase more
                      </Button>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-4" data-testid="panel-results">
              <div className="text-center py-4 md:py-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 text-white">Assessment Results</h2>
                <p className="text-white/90 text-sm md:text-base">Access detailed assessment results and download reports.</p>
              </div>
              <PartnerResultsTab />
            </TabsContent>

            {/* Invitations Tab */}
            <TabsContent value="invitations" className="space-y-4" data-testid="panel-invitations">
              <div className="text-center py-4 md:py-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 text-white">Candidate Invitations</h2>
                <p className="text-white/90 text-sm md:text-base">Send assessment invitations and track their status.</p>
              </div>
              {partner?.id && partner?.billingType ? (
                <BulkInvitationsTab 
                  partnerId={partner.id} 
                  billingType={partner.billingType}
                  hasCardOnFile={dashboardCardStatus?.hasCard}
                  testsRemaining={partner.remaining}
                  onNavigateToBilling={() => setActiveTab('billing')}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Organizations Tab */}
            <TabsContent value="organizations" className="space-y-4" data-testid="panel-organizations">
              {selectedOrgId ? (
                // Organization Details View
                <div className="space-y-4">
                  <Button variant="outline" onClick={() => setSelectedOrgId(null)} className="gap-2" data-testid="button-back-orgs">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Organizations
                  </Button>
                  
                  {selectedOrgLoading ? (
                    <Card>
                      <CardContent className="py-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </CardContent>
                    </Card>
                  ) : selectedOrg ? (
                    <>
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg">{selectedOrg.organization.name}</CardTitle>
                              <CardDescription>Organization Details</CardDescription>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteOrgMutation.mutate(selectedOrgId)}
                              disabled={deleteOrgMutation.isPending}
                              data-testid="button-delete-org"
                            >
                              {deleteOrgMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label className="text-muted-foreground">Admin Name</Label>
                              <p className="font-medium">{selectedOrg.organization.adminName || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Admin Email</Label>
                              <p className="font-medium">{selectedOrg.organization.adminEmail || 'Not set'}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Slug</Label>
                              <p className="font-medium font-mono">{selectedOrg.organization.slug}</p>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Status</Label>
                              <Badge variant={selectedOrg.organization.isActive ? "default" : "secondary"}>
                                {selectedOrg.organization.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{selectedOrg.stats.totalTests}</div>
                            <p className="text-sm text-muted-foreground">Total Tests</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-green-500">{selectedOrg.stats.completedTests}</div>
                            <p className="text-sm text-muted-foreground">Completed</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-amber-500">{selectedOrg.stats.inProgressTests}</div>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold">{selectedOrg.stats.pendingTests}</div>
                            <p className="text-sm text-muted-foreground">Pending</p>
                          </CardContent>
                        </Card>
                      </div>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Assessment Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {selectedOrg.results.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="font-medium">No completed assessments yet</p>
                              <p className="text-sm mt-1">Assessments assigned to this organization will appear here once completed.</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {selectedOrg.results.map((result) => (
                                <div key={result.sessionId} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div>
                                    <div className="font-medium">{result.externalEmail || result.externalUserId || 'Anonymous'}</div>
                                    <div className="text-sm text-muted-foreground">
                                      <Badge variant="outline" className="mr-2">{result.assessmentType}</Badge>
                                      {result.completedAt && formatDate(result.completedAt)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : null}
                </div>
              ) : (
                // Organizations List View
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Organizations</h2>
                    <p className="text-white/70 text-sm">Manage client organizations under your partner account</p>
                  </div>

                  {organizationsLoading ? (
                    <Card>
                      <CardContent className="py-8 flex justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </CardContent>
                    </Card>
                  ) : organizations?.organizations.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="font-medium">No organizations yet</p>
                        <p className="text-sm mt-1">Organizations help you group candidates by client or department.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => setShowAddOrgDialog(true)}
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          Add Your First Organization
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {organizations?.organizations.map((org) => (
                        <Card 
                          key={org.id} 
                          className="cursor-pointer hover:border-primary transition-colors"
                          onClick={() => setSelectedOrgId(org.id)}
                          data-testid={`org-card-${org.id}`}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{org.name}</CardTitle>
                              <Badge variant={org.isActive ? "default" : "secondary"}>
                                {org.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <CardDescription className="font-mono text-xs">{org.slug}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Credits Used:</span>{' '}
                                <span className="font-semibold">{org.testsUsed}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Active:</span>{' '}
                                <span className="font-semibold">{org.activeTests}</span>
                              </div>
                            </div>
                            {org.adminEmail && (
                              <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {org.adminEmail}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Activity Log Tab */}
            <TabsContent value="activity" className="space-y-4" data-testid="panel-activity">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Log</CardTitle>
                  <CardDescription>Complete history of account activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : activityLog?.activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No activity recorded yet</p>
                      <p className="text-sm mt-1">Your account activity will appear here as you use the platform.</p>
                      <p className="text-sm">This includes API calls, assessments, billing events, and more.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activityLog?.activities.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`activity-${activity.id}`}>
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Activity className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{activity.description}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <Badge variant="outline">{activity.type}</Badge>
                                {formatDate(activity.createdAt)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="space-y-4" data-testid="panel-usage">
              {/* Free Tests Expiry Banner in Usage Tab */}
              {(() => {
                if (!partner?.freeTestsAllocated || partner.freeTestsAllocated === 0) return null;
                if (!partner?.freeTestsExpiresAt) return null;
                
                // Hide when all free credits have been used up
                const freeTestsRemaining = partner.freeTestsAllocated - (partner.testsConsumed || 0);
                if (freeTestsRemaining <= 0) return null;
                
                const expiryDate = new Date(partner.freeTestsExpiresAt);
                const now = new Date();
                const diffMs = expiryDate.getTime() - now.getTime();
                const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                
                if (daysRemaining <= 0) return null;
                
                const isUrgent = daysRemaining <= 2;
                
                return (
                  <Card className={`border-2 ${isUrgent ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'border-cyan-500/50 bg-cyan-50 dark:bg-cyan-950/30'}`}>
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isUrgent ? 'bg-amber-500' : 'bg-cyan-500'}`}>
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className={`font-semibold ${isUrgent ? 'text-amber-700 dark:text-amber-400' : 'text-cyan-700 dark:text-cyan-400'}`}>
                            Free Tests: <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> remaining
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {freeTestsRemaining} complimentary test{freeTestsRemaining !== 1 ? 's' : ''} expire{freeTestsRemaining === 1 ? 's' : ''} on {expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {usageLoading ? (
                <Card>
                  <CardContent className="py-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : usage ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">This Month</CardTitle>
                        <CardDescription>
                          {new Date(usage.currentMonth.period.start).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold text-primary" data-testid="text-month-sessions">
                          {usage.currentMonth.sessions}
                        </div>
                        <p className="text-sm text-muted-foreground">assessments completed</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">All Time</CardTitle>
                        <CardDescription>
                          Since account creation
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-4xl font-bold" data-testid="text-total-tests">
                          {usage.allTime.totalTests}
                        </div>
                        <p className="text-sm text-muted-foreground">total assessments</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Usage Forecasting */}
                  {(() => {
                    const monthlyData = usage.monthlyUsage || [];
                    const recentMonths = monthlyData.slice(-3);
                    const avgUsage = recentMonths.length > 0 
                      ? Math.round(recentMonths.reduce((sum, m) => sum + m.sessions, 0) / recentMonths.length)
                      : 0;
                    const projectedNextMonth = Math.round(avgUsage * 1.1); // 10% growth assumption
                    const remaining = partner?.remaining || 0;
                    const monthsUntilEmpty = avgUsage > 0 ? Math.floor(remaining / avgUsage) : null;
                    const runOutDate = monthsUntilEmpty !== null && monthsUntilEmpty < 12
                      ? new Date(Date.now() + monthsUntilEmpty * 30 * 24 * 60 * 60 * 1000)
                      : null;

                    return (
                      <Card className="border-primary/20">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <TrendingUp className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-lg">Usage Forecast</CardTitle>
                                <CardDescription>Projected usage based on your recent activity</CardDescription>
                              </div>
                            </div>
                            {monthsUntilEmpty !== null && monthsUntilEmpty <= 2 && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Low Credits
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className={`grid gap-4 ${avgUsage > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                            <div className="p-4 rounded-lg bg-muted/30 border">
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                Avg. Monthly Usage
                              </div>
                              <div className="text-2xl font-bold" data-testid="text-avg-usage">
                                {avgUsage}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Based on last {recentMonths.length} month{recentMonths.length !== 1 ? 's' : ''}
                              </p>
                            </div>

                            <div className="p-4 rounded-lg bg-muted/30 border">
                              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Next Month Projection
                              </div>
                              <div className="text-2xl font-bold text-primary" data-testid="text-projected-usage">
                                {projectedNextMonth}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Estimated tests needed
                              </p>
                            </div>

                            {avgUsage > 0 && (
                              <div className="p-4 rounded-lg bg-muted/30 border">
                                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Credits Runway
                                </div>
                                <div className={`text-2xl font-bold ${monthsUntilEmpty !== null && monthsUntilEmpty <= 2 ? 'text-destructive' : monthsUntilEmpty !== null && monthsUntilEmpty <= 4 ? 'text-amber-500' : ''}`} data-testid="text-runway">
                                  {monthsUntilEmpty === null ? '12+ months' : monthsUntilEmpty === 0 ? 'This month' : `${monthsUntilEmpty} month${monthsUntilEmpty !== 1 ? 's' : ''}`}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {runOutDate ? `Until ~${runOutDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : 'At current rate'}
                                </p>
                              </div>
                            )}
                          </div>

                          {monthsUntilEmpty !== null && monthsUntilEmpty <= 3 && (
                            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                <span className="text-sm">
                                  {monthsUntilEmpty === 0 
                                    ? 'Your credits may run out this month. Consider purchasing more.'
                                    : `Based on your usage, you'll need more credits in ${monthsUntilEmpty} month${monthsUntilEmpty !== 1 ? 's' : ''}.`
                                  }
                                </span>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => setActiveTab('billing')}
                                data-testid="button-buy-credits"
                              >
                                Buy Credits
                              </Button>
                            </div>
                          )}

                          {avgUsage === 0 && (
                            <div className="mt-4 p-3 rounded-lg bg-muted/50 border text-center text-sm text-muted-foreground">
                              Not enough usage data to generate accurate forecasts. Continue using assessments to build your forecast.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Monthly Usage Trend</CardTitle>
                      <CardDescription>Last 6 months activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={usage.monthlyUsage}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis className="text-xs" />
                            <RechartsTooltip 
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {usage.recentEvents.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                        <CardDescription>Latest assessment sessions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {usage.recentEvents.map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-md bg-primary/10">
                                  <Activity className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {event.eventType === 'session_completed' ? 'Assessment Completed' : 
                                     event.eventType === 'session_started' ? 'Session Started' :
                                     event.eventType}
                                    {event.candidateEmail && (
                                      <span className="text-muted-foreground font-normal"> - {event.candidateEmail}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(event.createdAt)}
                                  </div>
                                </div>
                              </div>
                              {event.metadata?.assessmentType && (
                                <Badge variant="secondary">{event.metadata.assessmentType}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Unable to load usage data
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="billing" className="space-y-3 md:space-y-4" data-testid="panel-billing">
              <div className="text-center py-4 md:py-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 text-white">Billing & Credits</h2>
                <p className="text-white/90 text-sm md:text-base">View usage, purchase credits, and manage payment methods.</p>
              </div>
              {billingLoading ? (
                <Card>
                  <CardContent className="py-6 md:py-8 flex justify-center">
                    <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : billing ? (
                <>
                  {/* Billing Model Header */}
                  <Card>
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 space-y-0 p-3 md:p-6">
                      <div>
                        <CardTitle className="text-sm md:text-lg flex items-center gap-1.5 md:gap-2">
                          <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
                          {(!account?.partner?.billingType || account?.partner?.billingType === 'payg') && 'Pay As You Go (PAYG)'}
                          {account?.partner?.billingType === 'subscription' && 'Subscription + Auto-Bill'}
                          {account?.partner?.billingType === 'enterprise' && 'Enterprise Prepayment'}
                        </CardTitle>
                        <CardDescription className="text-[10px] md:text-sm">
                          {(!account?.partner?.billingType || account?.partner?.billingType === 'payg') && 'No card on file. Bulk discounts via upfront purchase. API suspended at zero credits.'}
                          {account?.partner?.billingType === 'subscription' && 'Card on file. Min monthly charge + auto-bill for additional usage.'}
                          {account?.partner?.billingType === 'enterprise' && 'For high-volume BPOs. Pro-forma invoicing for bulk credit blocks.'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[10px] md:text-sm self-start md:self-auto" data-testid="badge-billing-type">
                        {(!account?.partner?.billingType || account?.partner?.billingType === 'payg') && 'PAYG'}
                        {account?.partner?.billingType === 'subscription' && 'Subscription'}
                        {account?.partner?.billingType === 'enterprise' && 'Enterprise'}
                      </Badge>
                    </CardHeader>
                  </Card>

                  {/* Pending Billing Change Request Alert */}
                  {billingChangeData?.pendingRequest && (
                    <Card className="border-2 border-orange-500 bg-orange-500/20 dark:bg-orange-600/25">
                      <CardContent className="py-3 md:py-4 p-3 md:p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="p-2 md:p-2.5 rounded-full bg-orange-500 dark:bg-orange-600">
                              <Clock className="h-4 w-4 md:h-5 md:w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-bold text-orange-700 dark:text-orange-300 text-sm md:text-base">Billing Change Pending</p>
                              <p className="text-xs md:text-sm text-orange-900/80 dark:text-orange-100/80">
                                Your request to change to{' '}
                                <span className="font-medium">
                                  {billingChangeData.pendingRequest.requestedBillingType === 'payg' && 'Pay As You Go'}
                                  {billingChangeData.pendingRequest.requestedBillingType === 'subscription' && 'Subscription'}
                                  {billingChangeData.pendingRequest.requestedBillingType === 'enterprise' && 'Enterprise'}
                                </span>{' '}
                                billing is being reviewed.
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelBillingChange(billingChangeData.pendingRequest!.id)}
                            disabled={isCancellingBillingChange}
                            data-testid="button-cancel-billing-change"
                            className="text-xs md:text-sm self-start md:self-auto"
                          >
                            {isCancellingBillingChange ? (
                              <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin mr-1.5 md:mr-2" />
                            ) : (
                              <X className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                            )}
                            Cancel Request
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Credit Balance Stats - shown for PAYG or when no billing type set */}
                  {(!account?.partner?.billingType || account?.partner?.billingType === 'payg') && (
                    <div className="grid gap-2 md:gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                          <CardTitle className="text-xs md:text-sm font-medium">Credit Balance</CardTitle>
                          <Package className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                          <div className="text-xl md:text-2xl font-bold text-primary" data-testid="text-credit-balance">
                            {partner?.testsPurchased ? (partner.testsPurchased - partner.testsConsumed) : 0} credits
                          </div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            Available credits
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                          <CardTitle className="text-xs md:text-sm font-medium">Total Purchased</CardTitle>
                          <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                          <div className="text-xl md:text-2xl font-bold" data-testid="text-total-purchased">
                            {Math.max(0, (partner?.testsPurchased || 0) - (partner?.freeTestsAllocated || 0))} credits
                          </div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            All time credits
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 md:pb-2 p-3 md:p-6">
                          <CardTitle className="text-xs md:text-sm font-medium">Total Spent</CardTitle>
                          <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                          <div className="text-xl md:text-2xl font-bold" data-testid="text-total-spent">
                            {formatCurrency(billing.summary.totalSpent)}
                          </div>
                          <p className="text-[10px] md:text-xs text-muted-foreground">
                            All time purchases
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Buy Credits - Available for all partners */}
                  <Card>
                      <CardHeader className="pb-1.5 md:pb-2 p-3 md:p-6">
                        <CardTitle className="text-sm md:text-lg font-semibold" data-testid="text-buy-credits-title">Buy Credits</CardTitle>
                        <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-muted-foreground">
                          <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
                          <span>1 credit = 1 assessment or AI feature use</span>
                          <InfoTooltip content="Purchase credits in bulk. Prices shown in your local currency." />
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                        {(pricingLoading || currencyLoading) ? (
                          <div className="flex justify-center py-6 md:py-8">
                            <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-primary" />
                          </div>
                        ) : pricing?.packages && pricing.packages.length > 0 ? (
                          <>
                            {/* Promo Code Input */}
                            <div className="mb-3 md:mb-4 flex items-center gap-2">
                              <div className="flex-1">
                                <Label htmlFor="promo-code" className="sr-only">Promo Code</Label>
                                <Input
                                  id="promo-code"
                                  placeholder="Enter promo code (optional)"
                                  value={promoCode}
                                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                  className="uppercase text-xs md:text-sm h-8 md:h-10"
                                  data-testid="input-promo-code"
                                />
                              </div>
                              {promoCode && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPromoCode("")}
                                  data-testid="button-clear-promo"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {pricing.packages.map((pkg: any) => {
                                // Use partner's assigned pricing (no PPP adjustment for B2B partners)
                                const packagePrice = pkg.price; // Price from API already in partner's currency
                                const pricePerTest = pkg.pricePerTest;
                                const savings = pkg.savings || 0;
                                const hasDiscount = pkg.discountPercent > 0;
                                const isPayg = account?.partner?.billingType === 'payg';
                                const isEnterprise = account?.partner?.billingType === 'enterprise';
                                const subscriptionDiscountPercent = pkg.subscriptionDiscountPercent || 0;
                                
                                return (
                                  <div 
                                    key={pkg.size} 
                                    className="border rounded-lg p-4 flex flex-col relative hover-elevate transition-all"
                                    data-testid={`package-${pkg.size}`}
                                  >
                                    {/* Show discount badge for subscription users */}
                                    {hasDiscount && (
                                      <div className="absolute -top-2 -right-2">
                                        <Badge className="bg-green-500 text-white border-0 text-xs">
                                          {pkg.discountPercent}% OFF
                                        </Badge>
                                      </div>
                                    )}
                                    <div className="text-center mb-3">
                                      <div className="text-4xl font-bold mb-1">
                                        {pkg.size}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        credits
                                      </div>
                                    </div>
                                    <div className="text-center border-t pt-3 mb-3">
                                      <div className="text-lg font-semibold">
                                        {formatPartnerPrice(packagePrice)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {formatPartnerPrice(pricePerTest)}/credit
                                      </div>
                                    </div>
                                    {/* Show savings for subscription users with discounts */}
                                    {savings > 0 && (
                                      <div className="text-xs text-green-600 dark:text-green-400 text-center mb-3">
                                        Save {formatPartnerPrice(savings)}
                                      </div>
                                    )}
                                    {/* Show subscription discount info for PAYG/Enterprise users */}
                                    {(isPayg || isEnterprise) && subscriptionDiscountPercent > 0 && (
                                      <div className="text-xs text-blue-600 dark:text-blue-400 text-center mb-3" data-testid={`subscription-discount-note-${pkg.size}`}>
                                        Subscription: {subscriptionDiscountPercent}% off
                                      </div>
                                    )}
                                    <Button
                                      className="mt-auto w-full"
                                      onClick={() => handlePurchase(pkg.size)}
                                      disabled={purchasingPackageSize === pkg.size}
                                      data-testid={`button-purchase-${pkg.size}`}
                                    >
                                      {purchasingPackageSize === pkg.size ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        "Buy"
                                      )}
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Note for PAYG/Enterprise users about subscription discounts */}
                            {(account?.partner?.billingType === 'payg' || account?.partner?.billingType === 'enterprise') && (
                              <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800" data-testid="subscription-discount-banner">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                  <span className="font-medium">Subscription users get volume discounts</span> ranging from 2% to 15% off on credit packages. Upgrade to a subscription plan to unlock these savings.
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="py-8 text-center text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No packages available</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                  {/* Auto-Bill Billing Stats */}
                  {account?.partner?.billingType === 'subscription' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-tests-used">
                            {partner?.testsConsumed || 0} credits
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Billed automatically each month
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${billing.summary.pendingAmount > 0 ? 'text-amber-500' : ''}`} data-testid="text-pending-amount">
                            {formatCurrency(billing.summary.pendingAmount)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Outstanding balance
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-total-spent">
                            {formatCurrency(billing.summary.totalSpent)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            All time purchases
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Invoice Billing Stats */}
                  {account?.partner?.billingType === 'enterprise' && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-pending-invoices">
                            {billing.summary.pendingInvoices}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Awaiting payment
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className={`text-2xl font-bold ${billing.summary.pendingAmount > 0 ? 'text-amber-500' : ''}`} data-testid="text-pending-amount">
                            {formatCurrency(billing.summary.pendingAmount)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {billing.summary.pendingInvoices} pending invoice{billing.summary.pendingInvoices !== 1 ? 's' : ''}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold" data-testid="text-total-spent">
                            {formatCurrency(billing.summary.totalSpent)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            All time purchases
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Billing Options */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Billing Options
                        <InfoTooltip content="Choose the billing model that works best for your organization. Request a change and our team will review it within 1-2 business days." />
                      </CardTitle>
                      <CardDescription>
                        Compare billing models and request a change if needed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        {/* PAYG Option */}
                        <div 
                          className={`border rounded-lg p-4 transition-colors flex flex-col ${
                            account?.partner?.billingType === 'payg' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-muted-foreground/50'
                          }`}
                          data-testid="billing-option-payg"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              <span className="font-semibold">Pay As You Go</span>
                            </div>
                            {account?.partner?.billingType === 'payg' && (
                              <Badge className="bg-primary/20 text-primary border-0">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 flex-1">
                            No card on file. Purchase credits upfront with bulk discounts. API suspended at zero.
                          </p>
                          <ul className="text-sm space-y-1 mb-4">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              No recurring charges
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              Bulk discounts available
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              Control your spend
                            </li>
                          </ul>
                          {!billingChangeData?.pendingRequest && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-auto"
                              onClick={() => {
                                if (account?.partner?.billingType === 'payg') {
                                  setSelectedBillingType(null);
                                } else {
                                  setSelectedBillingType('payg');
                                }
                                setShowBillingChangeDialog(true);
                              }}
                              data-testid="button-request-payg"
                            >
                              Request Change
                            </Button>
                          )}
                        </div>

                        {/* Subscription Option */}
                        <div 
                          className={`border rounded-lg p-4 transition-colors flex flex-col ${
                            account?.partner?.billingType === 'subscription' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-muted-foreground/50'
                          }`}
                          data-testid="billing-option-subscription"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-5 w-5 text-primary" />
                              <span className="font-semibold">Subscription</span>
                            </div>
                            {account?.partner?.billingType === 'subscription' && (
                              <Badge className="bg-primary/20 text-primary border-0">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 flex-1">
                            Card on file. Min monthly charge + auto-bill for additional usage at base rates.
                          </p>
                          <ul className="text-sm space-y-1 mb-4">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              Predictable monthly base
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              Pay as you grow
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              Automatic billing
                            </li>
                          </ul>
                          {!billingChangeData?.pendingRequest && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-auto"
                              onClick={() => {
                                if (account?.partner?.billingType === 'subscription') {
                                  setSelectedBillingType(null);
                                } else {
                                  setSelectedBillingType('subscription');
                                }
                                setShowBillingChangeDialog(true);
                              }}
                              data-testid="button-request-subscription"
                            >
                              Request Change
                            </Button>
                          )}
                        </div>

                        {/* Enterprise Option */}
                        <div 
                          className={`border rounded-lg p-4 transition-colors flex flex-col ${
                            account?.partner?.billingType === 'enterprise' 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-muted-foreground/50'
                          }`}
                          data-testid="billing-option-enterprise"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <span className="font-semibold">Enterprise</span>
                            </div>
                            {account?.partner?.billingType === 'enterprise' && (
                              <Badge className="bg-primary/20 text-primary border-0">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-4 flex-1">
                            For high-volume BPOs. Pro-forma invoicing for bulk credit blocks.
                          </p>
                          <ul className="text-sm space-y-1 mb-4">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              Bulk credit blocks
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              Pro-forma invoicing
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                              Custom contracts
                            </li>
                          </ul>
                          {!billingChangeData?.pendingRequest && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-auto"
                              onClick={() => {
                                if (account?.partner?.billingType === 'enterprise') {
                                  setSelectedBillingType(null);
                                } else {
                                  setSelectedBillingType('enterprise');
                                }
                                setShowBillingChangeDialog(true);
                              }}
                              data-testid="button-request-enterprise"
                            >
                              Request Change
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Request History */}
                      {billingChangeData?.history && billingChangeData.history.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="text-sm font-medium mb-3">Request History</h4>
                          <div className="space-y-2">
                            {billingChangeData.history.slice(0, 5).map((request) => (
                              <div key={request.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <span>
                                    {request.currentBillingType} → {request.requestedBillingType}
                                  </span>
                                  <Badge 
                                    variant={request.status === 'approved' ? 'secondary' : request.status === 'rejected' ? 'destructive' : 'outline'}
                                    className={request.status === 'approved' ? 'bg-green-500/20 text-green-600' : ''}
                                  >
                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                  </Badge>
                                </div>
                                <span className="text-muted-foreground">{formatDate(request.createdAt)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment Methods Section - for Subscription and PAYG billing types */}
                  {(account?.partner?.billingType === 'subscription' || account?.partner?.billingType === 'payg') && (
                    <div data-testid="section-payment-methods">
                      <PrepaidCardManagement 
                        partnerId={account?.partner?.id || ''} 
                        currency={account?.partner?.currency}
                        billingType={account?.partner?.billingType}
                      />
                    </div>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Billing History</CardTitle>
                      <CardDescription>
                        {account?.partner?.billingType === 'enterprise' 
                          ? 'Invoices and payment history' 
                          : 'Receipts and invoices'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {billing.items.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p className="font-medium">No billing history yet</p>
                          <p className="text-sm mt-1">Your receipts and invoices will appear here after your first purchase.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {billing.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`billing-item-${item.id}`}>
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-md ${item.type === 'receipt' ? 'bg-green-500/10' : 'bg-primary/10'}`}>
                                  {item.type === 'receipt' ? (
                                    <Receipt className="h-5 w-5 text-green-500" />
                                  ) : (
                                    <FileText className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium">{item.description}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {formatDate(item.date)}
                                    {item.invoiceNumber && ` • ${item.invoiceNumber}`}
                                  </div>
                                  {item.tests && (
                                    <div className="text-xs text-muted-foreground">
                                      {item.tests} credits @ {formatCurrency(item.pricePerCredit || 0)}/credit
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="font-bold text-lg">
                                    {formatCurrency(item.amount, item.currency)}
                                  </div>
                                  {item.type === 'receipt' ? (
                                    <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                                      Paid
                                    </Badge>
                                  ) : (
                                    <Badge 
                                      variant={item.status === 'paid' ? 'secondary' : item.status === 'overdue' ? 'destructive' : 'outline'}
                                      className={item.status === 'paid' ? 'bg-green-500/20 text-green-600' : ''}
                                    >
                                      {item.status === 'sent' ? 'Pending' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </Badge>
                                  )}
                                  {item.dueDate && item.status !== 'paid' && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Due: {formatDate(item.dueDate)}
                                    </div>
                                  )}
                                </div>
                                {(item.type === 'receipt' || item.status === 'paid') && (
                                  <div className="flex items-center gap-1">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => window.open(`/api/partner/me/receipt/${item.type}/${item.id}`, '_blank')}
                                          data-testid={`button-view-receipt-${item.id}`}
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View Receipt</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = `/api/partner/me/receipt/${item.type}/${item.id}?download=true`;
                                            link.download = `HumanMetrix_Receipt_${item.id}.pdf`;
                                            link.click();
                                          }}
                                          data-testid={`button-download-receipt-${item.id}`}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Download Receipt</TooltipContent>
                                    </Tooltip>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Unable to load billing data
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-3 md:space-y-4" data-testid="panel-settings">
              <div className="text-center py-4 md:py-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 text-white">Settings</h2>
                <p className="text-white/90 text-sm md:text-base">Configure your organization profile and preferences.</p>
              </div>
              {settingsLoading ? (
                <Card>
                  <CardContent className="py-6 md:py-8 flex justify-center">
                    <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Contract & Terms */}
                  <Card data-testid="card-contract-terms">
                    <CardHeader className="pb-2 md:pb-3 p-3 md:p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-3">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="p-1.5 md:p-2 rounded-lg bg-muted">
                            <FileText className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-sm md:text-lg">Contract & Terms</CardTitle>
                            <CardDescription className="text-[10px] md:text-sm">Your current agreement details</CardDescription>
                          </div>
                        </div>
                        <Badge 
                          variant={partner?.isSuspended ? "destructive" : "default"}
                          data-testid="badge-account-status"
                          className="text-[10px] md:text-xs self-start md:self-auto"
                        >
                          {partner?.isSuspended ? 'Suspended' : 'Active'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 p-3 md:p-6 md:pt-0">
                      <div className="grid gap-2 md:gap-4 grid-cols-2 lg:grid-cols-4">
                        <div className="p-2 md:p-3 rounded-lg bg-muted/30 border">
                          <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Billing Model</div>
                          <div className="font-semibold flex items-center gap-1.5 md:gap-2 text-xs md:text-sm" data-testid="text-billing-model">
                            <CreditCard className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                            {account?.partner?.billingType === 'payg' && 'Pay As You Go'}
                            {account?.partner?.billingType === 'subscription' && 'Subscription'}
                            {account?.partner?.billingType === 'enterprise' && 'Enterprise'}
                          </div>
                        </div>
                        <div className="p-2 md:p-3 rounded-lg bg-muted/30 border">
                          <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Member Since</div>
                          <div className="font-semibold flex items-center gap-1.5 md:gap-2 text-xs md:text-sm" data-testid="text-member-since">
                            <Calendar className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                            {partner?.createdAt ? new Date(partner.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                          </div>
                        </div>
                        <div className="p-2 md:p-3 rounded-lg bg-muted/30 border">
                          <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Company</div>
                          <div className="font-semibold flex items-center gap-1.5 md:gap-2 text-xs md:text-sm truncate" data-testid="text-company-name">
                            <Building2 className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                            <span className="truncate">{partner?.companyName || partner?.name || 'Not specified'}</span>
                          </div>
                        </div>
                        <div className="p-2 md:p-3 rounded-lg bg-muted/30 border">
                          <div className="text-[10px] md:text-xs text-muted-foreground mb-0.5 md:mb-1">Account ID</div>
                          <div className="font-semibold flex items-center gap-1.5 md:gap-2 font-mono text-xs md:text-sm" data-testid="text-account-id">
                            <Shield className="h-3 w-3 md:h-4 md:w-4 text-primary flex-shrink-0" />
                            {partner?.id?.slice(0, 8) || 'N/A'}...
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t">
                        <p className="text-[10px] md:text-sm text-muted-foreground">
                          For contract modifications or questions, please contact your account manager.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Account Details */}
                  <Card data-testid="card-account-details">
                    <CardHeader className="p-3 md:p-6">
                      <CardTitle className="text-sm md:text-lg flex items-center gap-1.5 md:gap-2">
                        <Users className="h-4 w-4 md:h-5 md:w-5" />
                        Account Details
                      </CardTitle>
                      <CardDescription className="text-[10px] md:text-sm">
                        Your login information for this partner account
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                      <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                        <div className="space-y-0.5 md:space-y-1">
                          <Label className="text-muted-foreground text-[10px] md:text-xs">Name</Label>
                          <p className="font-medium text-xs md:text-sm" data-testid="text-account-name">{account?.user?.name || 'Partner User'}</p>
                        </div>
                        <div className="space-y-0.5 md:space-y-1">
                          <Label className="text-muted-foreground text-[10px] md:text-xs">Email</Label>
                          <p className="font-medium text-xs md:text-sm" data-testid="text-account-email">{account?.user?.email || 'Not available'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="p-3 md:p-6">
                      <CardTitle className="text-sm md:text-lg flex items-center gap-1.5 md:gap-2">
                        <Bell className="h-4 w-4 md:h-5 md:w-5" />
                        Quota Alerts
                        <InfoTooltip content="Set up email notifications to alert you when your remaining credits drop below a certain percentage. Helps prevent running out of credits unexpectedly." />
                      </CardTitle>
                      <CardDescription>
                        Get notified when your test credits are running low
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="quota-alerts">Enable quota alerts</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive email notifications when credits drop below threshold
                          </p>
                        </div>
                        <Switch
                          id="quota-alerts"
                          checked={quotaAlertEnabled}
                          onCheckedChange={setQuotaAlertEnabled}
                          data-testid="switch-quota-alerts"
                        />
                      </div>

                      {quotaAlertEnabled && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="alert-threshold">Alert threshold (%)</Label>
                            <Select
                              value={quotaAlertThreshold.toString()}
                              onValueChange={(v) => setQuotaAlertThreshold(parseInt(v))}
                            >
                              <SelectTrigger data-testid="select-quota-threshold">
                                <SelectValue placeholder="Select threshold" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="90">90% used (10% remaining)</SelectItem>
                                <SelectItem value="80">80% used (20% remaining)</SelectItem>
                                <SelectItem value="70">70% used (30% remaining)</SelectItem>
                                <SelectItem value="50">50% used (50% remaining)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="alert-email">Notification email</Label>
                            <Input
                              id="alert-email"
                              type="email"
                              placeholder="billing@company.com"
                              value={quotaAlertEmail}
                              onChange={(e) => setQuotaAlertEmail(e.target.value)}
                              data-testid="input-quota-email"
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {settings?.settings?.billingType === 'payg' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Auto Top-Up
                          <InfoTooltip content="Automatically purchase a pre-selected credit package when your balance falls below a threshold. Uses your saved payment method. Only available for PAYG accounts." />
                        </CardTitle>
                        <CardDescription>
                          Automatically purchase more tests when your balance runs low
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="auto-topup">Enable auto top-up</Label>
                            <p className="text-sm text-muted-foreground">
                              Automatically purchase credits when remaining tests fall below threshold
                            </p>
                          </div>
                          <Switch
                            id="auto-topup"
                            checked={autoTopUpEnabled}
                            onCheckedChange={setAutoTopUpEnabled}
                            data-testid="switch-auto-topup"
                          />
                        </div>

                        {autoTopUpEnabled && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="topup-threshold">Trigger when remaining tests fall below</Label>
                              <Input
                                id="topup-threshold"
                                type="number"
                                min={1}
                                max={100}
                                value={autoTopUpThreshold}
                                onChange={(e) => setAutoTopUpThreshold(parseInt(e.target.value) || 10)}
                                data-testid="input-topup-threshold"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="topup-package">Package to purchase</Label>
                              <Select
                                value={autoTopUpPackage || ""}
                                onValueChange={(v) => setAutoTopUpPackage(v || null)}
                              >
                                <SelectTrigger data-testid="select-topup-package">
                                  <SelectValue placeholder="Select a package" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PACKAGE_OPTIONS.map((pkg) => (
                                    <SelectItem key={pkg.value} value={pkg.value}>
                                      {pkg.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* White-Label Branding Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        White-Label Branding
                        <InfoTooltip content="Display your company logo, colors, and messaging instead of HumanMetrix branding. Candidates will see your brand throughout the assessment experience." />
                      </CardTitle>
                      <CardDescription>
                        Customize the assessment experience with your company branding for candidates
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="branding-enabled">Enable white-label branding</Label>
                          <p className="text-sm text-muted-foreground">
                            Show your branding instead of HumanMetrix branding to candidates
                          </p>
                        </div>
                        <Switch
                          id="branding-enabled"
                          checked={brandingEnabled}
                          onCheckedChange={setBrandingEnabled}
                          data-testid="switch-branding-enabled"
                        />
                      </div>

                      {brandingEnabled && (
                        <>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="branding-display-name">Display Name</Label>
                              <Input
                                id="branding-display-name"
                                placeholder="Your Company Name"
                                value={brandingCompanyDisplayName}
                                onChange={(e) => setBrandingCompanyDisplayName(e.target.value)}
                                maxLength={100}
                                data-testid="input-branding-display-name"
                              />
                              <p className="text-xs text-muted-foreground">
                                Shown to candidates during assessments
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>Company Logo</Label>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Input
                                    id="branding-logo"
                                    type="url"
                                    placeholder="https://your-company.com/logo.png"
                                    value={brandingLogoUrl}
                                    onChange={(e) => setBrandingLogoUrl(e.target.value)}
                                    data-testid="input-branding-logo"
                                    className="flex-1"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">or</span>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                    id="branding-logo-upload"
                                    className="hidden"
                                    data-testid="input-branding-logo-upload"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        try {
                                          const res = await fetch("/api/uploads/request-url", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            credentials: "include",
                                            body: JSON.stringify({
                                              name: file.name,
                                              size: file.size,
                                              contentType: file.type,
                                            }),
                                          });
                                          if (!res.ok) {
                                            throw new Error("Failed to get upload URL");
                                          }
                                          const { uploadURL, objectPath } = await res.json();
                                          const uploadRes = await fetch(uploadURL, {
                                            method: "PUT",
                                            body: file,
                                            headers: { "Content-Type": file.type },
                                          });
                                          if (!uploadRes.ok) {
                                            throw new Error("Failed to upload file");
                                          }
                                          setBrandingLogoUrl(objectPath);
                                          // Reset file input to allow re-uploading the same file
                                          e.target.value = "";
                                          toast({
                                            title: "Logo uploaded",
                                            description: "Your logo has been uploaded successfully.",
                                          });
                                        } catch (err) {
                                          toast({
                                            title: "Upload failed",
                                            description: "Failed to upload logo. Please try again.",
                                            variant: "destructive",
                                          });
                                        }
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => document.getElementById("branding-logo-upload")?.click()}
                                    data-testid="button-upload-logo"
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Logo
                                  </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Enter a URL or upload an image (PNG, JPEG, SVG, or WebP recommended)
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="branding-primary-color">Primary Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="branding-primary-color"
                                  type="color"
                                  value={brandingPrimaryColor}
                                  onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-branding-primary-color"
                                />
                                <Input
                                  value={brandingPrimaryColor}
                                  onChange={(e) => setBrandingPrimaryColor(e.target.value)}
                                  placeholder="#0891b2"
                                  className="flex-1 font-mono"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="branding-accent-color">Accent Color</Label>
                              <div className="flex gap-2">
                                <Input
                                  id="branding-accent-color"
                                  type="color"
                                  value={brandingAccentColor}
                                  onChange={(e) => setBrandingAccentColor(e.target.value)}
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-branding-accent-color"
                                />
                                <Input
                                  value={brandingAccentColor}
                                  onChange={(e) => setBrandingAccentColor(e.target.value)}
                                  placeholder="#06b6d4"
                                  className="flex-1 font-mono"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="branding-welcome-title">Welcome Title</Label>
                            <Input
                              id="branding-welcome-title"
                              placeholder="Welcome to Your Assessment"
                              value={brandingWelcomeTitle}
                              onChange={(e) => setBrandingWelcomeTitle(e.target.value)}
                              maxLength={100}
                              data-testid="input-branding-welcome-title"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="branding-welcome-message">Welcome Message</Label>
                            <Textarea
                              id="branding-welcome-message"
                              placeholder="A personalized message for candidates before they start their assessment..."
                              value={brandingWelcomeMessage}
                              onChange={(e) => setBrandingWelcomeMessage(e.target.value)}
                              maxLength={500}
                              rows={3}
                              data-testid="input-branding-welcome-message"
                            />
                            <p className="text-xs text-muted-foreground">
                              {brandingWelcomeMessage.length}/500 characters
                            </p>
                          </div>

                          {/* Preview */}
                          <div className="border rounded-lg p-4 bg-muted/30">
                            <p className="text-sm font-medium mb-3 flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Preview
                            </p>
                            <div 
                              className="p-4 rounded-lg border-2"
                              style={{ borderColor: brandingPrimaryColor }}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                {brandingLogoUrl ? (
                                  <img 
                                    src={brandingLogoUrl} 
                                    alt="Logo preview" 
                                    className="h-10 w-auto max-w-[120px] object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div 
                                    className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
                                    style={{ backgroundColor: brandingPrimaryColor }}
                                  >
                                    {(brandingCompanyDisplayName || 'C').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-semibold">
                                  {brandingCompanyDisplayName || 'Your Company'}
                                </span>
                              </div>
                              <h3 
                                className="font-semibold text-lg mb-1"
                                style={{ color: brandingPrimaryColor }}
                              >
                                {brandingWelcomeTitle || 'Welcome to Your Assessment'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {brandingWelcomeMessage || 'Your personalized welcome message will appear here...'}
                              </p>
                              <Button 
                                size="sm" 
                                className="mt-3"
                                style={{ 
                                  backgroundColor: brandingPrimaryColor,
                                  borderColor: brandingPrimaryColor 
                                }}
                              >
                                Start Assessment
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Change Password Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Lock className="h-5 w-5" />
                        Change Password
                      </CardTitle>
                      <CardDescription>
                        Update your account password
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            data-testid="input-current-password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            data-testid="button-toggle-current-password"
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password (min 8 characters)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            data-testid="input-new-password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            data-testid="button-toggle-new-password"
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            data-testid="input-confirm-password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            data-testid="button-toggle-confirm-password"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                        </div>
                      </div>
                      <Button
                        onClick={handleChangePassword}
                        disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                        data-testid="button-change-password"
                      >
                        {changePasswordMutation.isPending && (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        )}
                        Change Password
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateSettingsMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      )}
                      Save Settings
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Developer Hub Tab */}
            <TabsContent value="developer" className="space-y-6" data-testid="panel-developer">
              <DeveloperSubTabs 
                apiKeys={apiKeys}
                apiKeysLoading={apiKeysLoading}
                onCreateTestKey={handleCreateTestKey}
                onCreateLiveKey={handleCreateLiveKey}
                onRotateKey={handleRotateKey}
                onRevokeKey={handleRevokeKey}
                rotatingKeyId={rotatingKeyId}
                revokingKeyId={revokingKeyId}
                creatingKeyType={creatingKeyType}
                newKeyData={newKeyData}
                onClearNewKey={handleClearNewKey}
                onReactivateKey={() => {
                  setActiveTab('billing');
                  setTimeout(() => {
                    const paymentSection = document.querySelector('[data-testid="section-payment-methods"]');
                    if (paymentSection) {
                      paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
                billingType={account?.partner?.billingType}
                hasCardOnFile={dashboardCardStatus?.hasCard}
                onAddPaymentMethod={() => {
                  setActiveTab('billing');
                  setTimeout(() => {
                    const paymentMethodsSection = document.querySelector('[data-testid="section-payment-methods"]');
                    if (paymentMethodsSection) {
                      paymentMethodsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
              />
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6" data-testid="panel-analytics">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 flex-wrap">
                  <div>
                    <CardTitle>Assessment Analytics</CardTitle>
                    <CardDescription>Visualize your assessment usage and performance</CardDescription>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <Select value={analyticsPeriod} onValueChange={(v: 'daily' | 'weekly' | 'monthly') => setAnalyticsPeriod(v)}>
                      <SelectTrigger className="w-32" data-testid="select-analytics-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={analyticsDays.toString()} onValueChange={(v) => setAnalyticsDays(parseInt(v))}>
                      <SelectTrigger className="w-32" data-testid="select-analytics-days">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="365">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => window.open('/api/partner/me/export/results', '_blank')} data-testid="button-export-results">
                        <FileText className="h-4 w-4 mr-1.5" />
                        Export Results
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open('/api/partner/me/export/usage', '_blank')} data-testid="button-export-usage">
                        <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                        Export Usage
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open('/api/partner/me/export/billing', '_blank')} data-testid="button-export-billing">
                        <Receipt className="h-4 w-4 mr-1.5" />
                        Export Billing
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : analytics ? (
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Tests Over Time Chart */}
                      <div className="lg:col-span-2 border rounded-lg p-4">
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">Tests Completed Over Time</h3>
                            <InfoTooltip content="Shows the volume of completed assessments over time. Use the period selector above to switch between daily, weekly, or monthly views." />
                          </div>
                          <p className="text-sm text-muted-foreground">Number of assessments completed per {analyticsPeriod === 'daily' ? 'day' : analyticsPeriod === 'weekly' ? 'week' : 'month'}</p>
                        </div>
                        <div className="h-80">
                          {analytics.testsOverTime.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                data={analytics.testsOverTime} 
                                barCategoryGap="20%"
                              >
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" className="text-xs" />
                                <YAxis className="text-xs" allowDecimals={false} />
                                <RechartsTooltip />
                                <Bar 
                                  dataKey="count" 
                                  fill="hsl(var(--primary))" 
                                  radius={[4, 4, 0, 0]} 
                                  maxBarSize={40} 
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                              <p className="font-medium">No data for this period</p>
                              <p className="text-sm">Complete some assessments to see trends over time.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* By Assessment Type */}
                      <div className="border rounded-lg p-4">
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">By Assessment Type</h3>
                            <InfoTooltip content="Shows how many of each assessment type have been completed, along with the average score for each type." />
                          </div>
                          <p className="text-sm text-muted-foreground">Breakdown of tests by type with average scores</p>
                        </div>
                        {analytics.byAssessmentType.length > 0 ? (
                          <div className="space-y-4">
                            {analytics.byAssessmentType.map((item, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                                  <p className="text-sm text-muted-foreground">{item.count} tests</p>
                                </div>
                                {item.avgScore !== null && (
                                  <Badge variant="secondary">Avg: {item.avgScore}%</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No completed assessments yet. Data will appear as candidates finish tests.</p>
                        )}
                      </div>

                      {/* Score Distribution Charts */}
                      <div className="lg:col-span-2 border rounded-lg p-4">
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">Score Distribution</h3>
                            <InfoTooltip content="Visualize how candidates score across each assessment type. Each bar shows the number of candidates who scored within that range (0-20%, 21-40%, etc.)." />
                          </div>
                          <p className="text-sm text-muted-foreground">How candidates score across assessments</p>
                        </div>
                        {analytics.scoreDistribution && analytics.scoreDistribution.length > 0 ? (
                          <div className="grid gap-6 md:grid-cols-2">
                            {analytics.scoreDistribution.map((dist, i) => (
                              <div key={i} className="space-y-3">
                                <h4 className="font-medium text-sm">
                                  {dist.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                </h4>
                                <div className="h-40">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dist.buckets} layout="vertical">
                                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                                      <XAxis type="number" className="text-xs" />
                                      <YAxis dataKey="range" type="category" className="text-xs" width={50} />
                                      <RechartsTooltip 
                                        formatter={(value: number) => [`${value} candidates`, 'Count']}
                                      />
                                      <Bar 
                                        dataKey="count" 
                                        fill="hsl(var(--primary))" 
                                        radius={[0, 4, 4, 0]}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                            <p className="font-medium">No score data yet</p>
                            <p className="text-sm">Score distribution will appear after candidates complete assessments.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <BarChart2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No analytics data yet</p>
                      <p className="text-sm mt-1">Analytics will populate as your candidates complete assessments.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analysis Tab - includes Individual Report, Compare Candidates, and Role Fit sub-tabs */}
            <TabsContent value="analysis" className="space-y-6" data-testid="panel-analysis">
              <div className="text-center py-4 md:py-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 text-white">Candidate Analysis</h2>
                <p className="text-white/90 text-sm md:text-base">Compare candidates side-by-side with AI-powered insights.</p>
              </div>
              <PartnerAnalysisTab />
            </TabsContent>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="space-y-6" data-testid="panel-pipeline">
              <div className="text-center py-4 md:py-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 text-white">Candidate Pipeline</h2>
                <p className="text-white/90 text-sm md:text-base">View, search, and manage your candidate assessments.</p>
              </div>
              <HiringPipelineTab />
            </TabsContent>

            {/* Ecosystem Index Tab */}
            <TabsContent value="ecosystem" className="space-y-6" data-testid="panel-ecosystem">
              <div className="text-center py-4 md:py-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 text-white">Ecosystem Index</h2>
                <p className="text-white/90 text-sm md:text-base">AI-powered team diagnostics to assess capabilities and identify gaps.</p>
              </div>
              <EcosystemAutoProject 
                partnerId={partner?.id}
                billingType={partner?.billingType}
                hasCardOnFile={dashboardCardStatus?.hasCard}
                creditsRemaining={partner?.remaining}
                onNavigateToBilling={() => setActiveTab('billing')}
              />
            </TabsContent>

            {/* Cohort Benchmarking Tab */}
            <TabsContent value="cohort-benchmarking" className="space-y-6" data-testid="panel-cohort-benchmarking">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Cohort Benchmarking
                    <Badge variant="secondary" className="bg-amber-500 text-white border-0">Coming Soon</Badge>
                  </CardTitle>
                  <CardDescription>Compare candidate performance against industry benchmarks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-cyan-500/10 flex items-center justify-center mb-6">
                      <BarChart3 className="h-8 w-8 text-cyan-500" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
                    <p className="text-muted-foreground max-w-md">
                      We're working very hard on this feature and it will be available very soon. 
                      Cohort Benchmarking will allow you to compare candidate performance with percentile 
                      rankings and peer group analysis.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6" data-testid="panel-notifications">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="all" data-testid="tab-notifications-all">
                    <Bell className="h-4 w-4 mr-1.5" />
                    All Notifications
                    {notifications?.unreadCount ? (
                      <Badge variant="secondary" className="ml-2">{notifications.unreadCount}</Badge>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="settings" data-testid="tab-notifications-settings">
                    <Settings className="h-4 w-4 mr-1.5" />
                    Settings
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Settings</CardTitle>
                      <CardDescription>Choose which notifications you want to receive. Mandatory notifications cannot be disabled as they contain critical information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Assessment Notifications */}
                      <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <ClipboardList className="h-5 w-5 text-primary" />
                          Assessment Notifications
                        </h3>
                        <div className="space-y-3 ml-7">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Individual Assessment Completed</p>
                              <p className="text-sm text-muted-foreground">Get notified when a candidate completes an individual assessment</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.assessment_completed !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ assessment_completed: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-assessment-completed"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">All Assessments Completed</p>
                              <p className="text-sm text-muted-foreground">Get notified when a candidate finishes all assigned assessments</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.assessment_all_completed !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ assessment_all_completed: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-assessment-all-completed"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Assessment Link Expired</p>
                              <p className="text-sm text-muted-foreground">Get notified when a candidate's invitation link expires</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.assessment_link_expired !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ assessment_link_expired: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-assessment-link-expired"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">High Incomplete Rate Alert</p>
                              <p className="text-sm text-muted-foreground">Get notified when many candidates don't complete their assessments</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.high_incomplete_rate !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ high_incomplete_rate: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-high-incomplete-rate"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Team Notifications */}
                      <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Team Notifications
                        </h3>
                        <div className="space-y-3 ml-7">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Team Member Role Changed</p>
                              <p className="text-sm text-muted-foreground">Get notified when a team member's role is updated</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.team_member_role_changed !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ team_member_role_changed: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-team-member-role-changed"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Team Member Joined</p>
                              <p className="text-sm text-muted-foreground">Get notified when someone joins your team</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.team_member_joined !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ team_member_joined: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-team-member-joined"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Team Member Removed</p>
                              <p className="text-sm text-muted-foreground">Get notified when someone is removed from your team</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.team_member_removed !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ team_member_removed: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-team-member-removed"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Usage & Reports */}
                      <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <BarChart2 className="h-5 w-5 text-primary" />
                          Usage & Reports
                        </h3>
                        <div className="space-y-3 ml-7">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Monthly Usage Summary</p>
                              <p className="text-sm text-muted-foreground">Receive a monthly summary of your assessment usage</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.monthly_summary !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ monthly_summary: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-monthly-summary"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">New IP Address Detected</p>
                              <p className="text-sm text-muted-foreground">Get notified when your API is accessed from a new location</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.new_ip_access !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ new_ip_access: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-new-ip-access"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Billing Notifications */}
                      <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <CreditCard className="h-5 w-5 text-primary" />
                          Billing & Payment Confirmations
                        </h3>
                        <div className="space-y-3 ml-7">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Payment Receipt</p>
                              <p className="text-sm text-muted-foreground">Get a confirmation when payments are processed successfully</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.billing_success !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ billing_success: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-billing-success"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Credits Purchased</p>
                              <p className="text-sm text-muted-foreground">Get a confirmation when you purchase additional credits</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.credits_purchased !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ credits_purchased: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-credits-purchased"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">Invoice Generated</p>
                              <p className="text-sm text-muted-foreground">Get notified when new invoices are created</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notificationPrefs?.preferences?.invoice_generated !== false}
                                onChange={(e) => updateNotificationPrefsMutation.mutate({ invoice_generated: e.target.checked })}
                                disabled={updateNotificationPrefsMutation.isPending}
                                data-testid="toggle-invoice-generated"
                              />
                              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Mandatory Notifications */}
                      <div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-amber-500" />
                          Mandatory Notifications
                          <Badge variant="outline" className="text-amber-600 border-amber-300">Cannot be disabled</Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground ml-7 mb-3">
                          These notifications are critical for security and account management and cannot be turned off.
                        </p>
                        <div className="space-y-3 ml-7">
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium">API Key Regenerated</p>
                              <p className="text-sm text-muted-foreground">When your API key is regenerated for security</p>
                            </div>
                            <Badge variant="secondary">Always On</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium">Failed Authentication Attempts</p>
                              <p className="text-sm text-muted-foreground">When multiple failed login attempts are detected</p>
                            </div>
                            <Badge variant="secondary">Always On</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium">API Access Suspended</p>
                              <p className="text-sm text-muted-foreground">When your API access is suspended or restored</p>
                            </div>
                            <Badge variant="secondary">Always On</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium">Payment Failed</p>
                              <p className="text-sm text-muted-foreground">When a payment attempt fails</p>
                            </div>
                            <Badge variant="secondary">Always On</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium">Critical Quota Warning</p>
                              <p className="text-sm text-muted-foreground">When your credits are almost exhausted (95%+)</p>
                            </div>
                            <Badge variant="secondary">Always On</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                            <div>
                              <p className="font-medium">Card Expiring Soon</p>
                              <p className="text-sm text-muted-foreground">When your payment card is about to expire</p>
                            </div>
                            <Badge variant="secondary">Always On</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="all">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>Stay updated with your account activity</CardDescription>
                  </div>
                  {(notifications?.unreadCount ?? 0) > 0 && (
                    <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending} data-testid="button-mark-all-read">
                      <Check className="h-4 w-4 mr-1.5" />
                      Mark All Read
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {notificationsLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : notifications?.notifications && notifications.notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 border rounded-lg ${notif.isRead ? 'opacity-60' : ''}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-full ${
                                notif.type.includes('warning') || notif.type.includes('critical') 
                                  ? 'bg-amber-500/10 text-amber-500' 
                                  : notif.type.includes('success') || notif.type.includes('purchase')
                                    ? 'bg-green-500/10 text-green-500'
                                    : 'bg-primary/10 text-primary'
                              }`}>
                                <Bell className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{notif.title}</p>
                                <p className="text-sm text-muted-foreground">{notif.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(notif.createdAt)}
                                </p>
                                {notif.type === 'assessment_completed' && notif.metadata?.sessionId && (
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        // Navigate to Results tab and filter by this session
                                        setActiveTab('results');
                                        // Store sessionId for filtering - will be picked up by results tab
                                        sessionStorage.setItem('filterSessionId', notif.metadata!.sessionId!);
                                      }}
                                      data-testid={`button-view-results-${notif.id}`}
                                    >
                                      <Eye className="h-4 w-4 mr-1.5" />
                                      View Results
                                    </Button>
                                    {notificationPrefs?.preferences?.assessment_completed !== false && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updateNotificationPrefsMutation.mutate({ assessment_completed: false })}
                                        disabled={updateNotificationPrefsMutation.isPending}
                                        data-testid={`button-turn-off-individual-assessment-notifications-${notif.id}`}
                                      >
                                        <BellOff className="h-4 w-4 mr-1.5" />
                                        Turn Off These Notifications
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {notif.type === 'assessment_all_completed' && (
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => {
                                        // Navigate to Results tab and filter by candidate email
                                        setActiveTab('results');
                                        if (notif.metadata?.candidateEmail) {
                                          sessionStorage.setItem('filterCandidateEmail', notif.metadata.candidateEmail);
                                        }
                                      }}
                                      data-testid={`button-view-all-results-${notif.id}`}
                                    >
                                      <Eye className="h-4 w-4 mr-1.5" />
                                      View Results
                                    </Button>
                                    {notificationPrefs?.preferences?.assessment_all_completed !== false && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updateNotificationPrefsMutation.mutate({ assessment_all_completed: false })}
                                        disabled={updateNotificationPrefsMutation.isPending}
                                        data-testid={`button-turn-off-assessment-notifications-${notif.id}`}
                                      >
                                        <BellOff className="h-4 w-4 mr-1.5" />
                                        Turn Off These Notifications
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {notif.type === 'credits_purchased' && account?.partner?.billingType === 'payg' && (
                                  <Button 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => {
                                      setActiveTab('billing');
                                      setTimeout(() => {
                                        const packagesSection = document.querySelector('[data-testid="package-10"]');
                                        if (packagesSection) {
                                          packagesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                      }, 100);
                                    }}
                                    data-testid={`button-purchase-more-${notif.id}`}
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                                    Purchase More Credits
                                  </Button>
                                )}
                                {(notif.type.includes('quota') || notif.type.includes('warning') || notif.type.includes('critical') || notif.type.includes('low_balance')) && (
                                  <Button 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => {
                                      setActiveTab('billing');
                                      setTimeout(() => {
                                        if (account?.partner?.billingType === 'payg') {
                                          const packagesSection = document.querySelector('[data-testid="package-10"]');
                                          if (packagesSection) {
                                            packagesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }
                                        } else {
                                          const paymentSection = document.querySelector('[data-testid="section-payment-methods"]');
                                          if (paymentSection) {
                                            paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                          }
                                        }
                                      }, 100);
                                    }}
                                    data-testid={`button-manage-billing-${notif.id}`}
                                  >
                                    {account?.partner?.billingType === 'payg' ? (
                                      <>
                                        <ShoppingCart className="h-4 w-4 mr-1.5" />
                                        Purchase Credits
                                      </>
                                    ) : (
                                      <>
                                        <CreditCard className="h-4 w-4 mr-1.5" />
                                        Manage Billing
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                            {!notif.isRead && (
                              <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate({ id: notif.id, recipientId: (notif as any).recipientId })} data-testid={`button-mark-read-${notif.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No notifications yet</p>
                      <p className="text-sm mt-1">You'll receive notifications for quota alerts, billing updates, and system announcements.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Team Tab */}
            <TabsContent value="team" className="space-y-4 md:space-y-6" data-testid="panel-team">
              <div className="text-center py-4 md:py-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-1 md:mb-2 text-white">Team Management</h2>
                <p className="text-white/90 text-sm md:text-base">Manage team members and control access permissions.</p>
              </div>
              <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 space-y-0 p-3 md:p-6">
                  <div>
                    <CardTitle className="text-sm md:text-lg">Team Members</CardTitle>
                    <CardDescription className="text-xs md:text-sm">Manage access to your partner account</CardDescription>
                  </div>
                  {isAdmin && (
                    <Button onClick={() => setShowInviteDialog(true)} data-testid="button-invite-member" size="sm" className="text-xs md:text-sm self-start md:self-auto">
                      <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />
                      Invite Member
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  {teamLoading ? (
                    <div className="flex justify-center py-8 md:py-12">
                      <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
                    </div>
                  ) : team?.members && team.members.length > 0 ? (
                    <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {team.members.map((member) => (
                        <div key={member.id} className="p-3 md:p-4 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm md:text-base truncate">{member.name || member.email}</p>
                              <p className="text-xs md:text-sm text-muted-foreground truncate">{member.email}</p>
                              <div className="flex items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2">
                                <Badge variant={member.inviteStatus === 'accepted' ? 'secondary' : 'outline'} className="text-[10px] md:text-xs">
                                  {member.inviteStatus === 'accepted' ? 'Active' : 'Pending'}
                                </Badge>
                                <Badge variant="outline" className="capitalize text-[10px] md:text-xs">{member.role}</Badge>
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="flex gap-0.5 md:gap-1 flex-shrink-0">
                                {member.inviteStatus !== 'accepted' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => resendInvitationMutation.mutate(member.id)}
                                    disabled={resendInvitationMutation.isPending}
                                    title="Resend invitation"
                                    data-testid={`button-resend-invite-${member.id}`}
                                  >
                                    {resendInvitationMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    setEditMemberId(member.id);
                                    setEditMemberName(member.name || "");
                                    setEditMemberRole(member.role || "member");
                                  }}
                                  data-testid={`button-edit-member-${member.id}`}
                                >
                                  <Pencil className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setConfirmRemoveMemberId(member.id)}
                                  disabled={removeMemberMutation.isPending}
                                  data-testid={`button-remove-member-${member.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 md:py-12 text-center text-muted-foreground">
                      <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
                      <p className="font-medium text-sm md:text-base">No team members yet</p>
                      <p className="text-xs md:text-sm mt-1">
                        {isAdmin 
                          ? "Invite colleagues to help manage assessments and view results."
                          : "Only admins can invite team members."}
                      </p>
                      {isAdmin && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3 md:mt-4 text-xs md:text-sm"
                          onClick={() => setShowInviteDialog(true)}
                        >
                          <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-1.5" />
                          Invite Your First Team Member
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Invite Dialog */}
              <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join your partner account
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="invite-email">Email</Label>
                      <Input 
                        id="invite-email" 
                        type="email" 
                        value={inviteEmail} 
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@company.com"
                        data-testid="input-invite-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invite-name">Name (optional)</Label>
                      <Input 
                        id="invite-name" 
                        value={inviteName} 
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="John Smith"
                        data-testid="input-invite-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="invite-role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger data-testid="select-invite-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-w-md">
                          <SelectItem value="viewer" textValue="Viewer" className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">Viewer</span>
                              <span className="text-xs text-muted-foreground">View results, candidates & reports</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="member" textValue="Member" className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">Member</span>
                              <span className="text-xs text-muted-foreground">Send invitations, view analytics & usage stats</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="developer" textValue="Developer" className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">Developer</span>
                              <span className="text-xs text-muted-foreground">API keys, webhooks, ATS & scheduled exports</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin" textValue="Admin" className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">Admin</span>
                              <span className="text-xs text-muted-foreground">Full access, billing, account settings & team management</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => inviteMemberMutation.mutate({ email: inviteEmail, name: inviteName || undefined, role: inviteRole })}
                      disabled={!inviteEmail || inviteMemberMutation.isPending}
                      data-testid="button-send-invite"
                    >
                      {inviteMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Mail className="h-4 w-4 mr-1.5" />}
                      Send Invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Edit Member Dialog */}
              <Dialog open={!!editMemberId} onOpenChange={(open) => {
                if (!open) {
                  setEditMemberId(null);
                  setEditMemberName("");
                  setEditMemberRole("");
                }
              }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Team Member</DialogTitle>
                    <DialogDescription>
                      Update the team member's name and role
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-member-name">Name</Label>
                      <Input 
                        id="edit-member-name" 
                        value={editMemberName} 
                        onChange={(e) => setEditMemberName(e.target.value)}
                        placeholder="Enter name"
                        data-testid="input-edit-member-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-member-role">Role</Label>
                      <Select value={editMemberRole} onValueChange={setEditMemberRole}>
                        <SelectTrigger data-testid="select-edit-member-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-w-md">
                          <SelectItem value="viewer" textValue="Viewer" className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">Viewer</span>
                              <span className="text-xs text-muted-foreground">View results, candidates & reports</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="member" textValue="Member" className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">Member</span>
                              <span className="text-xs text-muted-foreground">Send invitations, view analytics & usage stats</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="developer" textValue="Developer" className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">Developer</span>
                              <span className="text-xs text-muted-foreground">API keys, webhooks, ATS & scheduled exports</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin" textValue="Admin" className="py-3">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">Admin</span>
                              <span className="text-xs text-muted-foreground">Full access, billing, account settings & team management</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => {
                      setEditMemberId(null);
                      setEditMemberName("");
                      setEditMemberRole("");
                    }}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (editMemberId) {
                          updateMemberMutation.mutate({ id: editMemberId, name: editMemberName, role: editMemberRole });
                        }
                      }}
                      disabled={updateMemberMutation.isPending}
                      data-testid="button-save-member"
                    >
                      {updateMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

          </Tabs>
        </div>
      </main>

      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New API Key Generated</DialogTitle>
            <DialogDescription>
              Your API key has been rotated. Copy the new key now - you won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm break-all">
              <code data-testid="text-new-api-key">{newApiKey}</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCopyKey} data-testid="button-copy-new-key">
              {copiedKey ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copiedKey ? "Copied!" : "Copy Key"}
            </Button>
            <Button onClick={() => setShowNewKeyDialog(false)} data-testid="button-close-key-dialog">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateKeyDialog} onOpenChange={setShowCreateKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for accessing the HumanMetrix API.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name *</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production Server, Development"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                data-testid="input-new-key-name"
              />
              <p className="text-xs text-muted-foreground">A descriptive name to identify this key</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="key-environment">Environment</Label>
              <Select value={newKeyEnvironment} onValueChange={(v) => setNewKeyEnvironment(v as "test" | "live")}>
                <SelectTrigger data-testid="select-key-environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test (hm_test_...)</SelectItem>
                  <SelectItem value="live">Live (hm_live_...)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Test keys are for development, live keys are for production
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateKeyDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateKey} 
              disabled={!newKeyName || createKeyMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
              data-testid="button-confirm-create-key"
            >
              {createKeyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Organization Dialog */}
      <Dialog open={showAddOrgDialog} onOpenChange={setShowAddOrgDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Create a new client organization to track their assessment usage separately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name *</Label>
              <Input
                id="org-name"
                placeholder="Acme Corp"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                data-testid="input-org-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">URL Identifier *</Label>
              <Input
                id="org-slug"
                placeholder="acme-corp"
                value={newOrgSlug}
                onChange={(e) => setNewOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                data-testid="input-org-slug"
              />
              <p className="text-xs text-muted-foreground">A short, unique ID for this organization (e.g., "acme-corp"). Used in URLs and API calls. Lowercase letters, numbers, and hyphens only.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-admin-name">Admin Name</Label>
              <Input
                id="org-admin-name"
                placeholder="John Smith"
                value={newOrgAdminName}
                onChange={(e) => setNewOrgAdminName(e.target.value)}
                data-testid="input-org-admin-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-admin-email">Admin Email</Label>
              <Input
                id="org-admin-email"
                type="email"
                placeholder="john@acme.com"
                value={newOrgAdminEmail}
                onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                data-testid="input-org-admin-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddOrgDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrg}
              disabled={!newOrgName || !newOrgSlug || createOrgMutation.isPending}
              data-testid="button-create-org"
            >
              {createOrgMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotate API Key Confirmation */}
      <AlertDialog open={!!confirmRotateKeyId} onOpenChange={(open) => !open && setConfirmRotateKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new API key and invalidate the current one. Any applications using the old key will stop working immediately. You'll need to update your integrations with the new key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-rotate">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRotate} 
              className="bg-amber-600 hover:bg-amber-700"
              data-testid="button-confirm-rotate"
            >
              {rotatingKeyId === confirmRotateKeyId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Rotate Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke API Key Confirmation */}
      <AlertDialog open={!!confirmRevokeKeyId} onOpenChange={(open) => !open && setConfirmRevokeKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate this API key. Any applications using this key will immediately lose access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-revoke">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmRevoke} 
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-revoke"
            >
              {revokingKeyId === confirmRevokeKeyId && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Team Member Confirmation */}
      <AlertDialog open={!!confirmRemoveMemberId} onOpenChange={(open) => !open && setConfirmRemoveMemberId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? They will lose access to your partner account immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-member">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (confirmRemoveMemberId) {
                  removeMemberMutation.mutate(confirmRemoveMemberId);
                  setConfirmRemoveMemberId(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-remove-member"
            >
              {removeMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enterprise Billing Setup Dialog */}
      <Dialog open={showBillingSetupDialog} onOpenChange={(open) => {
        setShowBillingSetupDialog(open);
        if (!open) {
          setBillingSetupForm({
            billingAddressLine1: "",
            billingAddressLine2: "",
            billingCity: "",
            billingPostcode: "",
            billingCountry: "",
            vatNumber: "",
            companyRegistrationNumber: "",
            invoiceContact: "",
            billingEmail: "",
            purchaseOrderRequired: false,
            defaultPurchaseOrderNumber: "",
          });
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Billing Information</DialogTitle>
            <DialogDescription>
              Enter your company's billing details for invoicing purposes. This information will appear on your invoices.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            setIsSubmittingBillingSetup(true);
            try {
              const response = await apiRequest("POST", "/api/partner/me/billing-info", billingSetupForm);
              if (response.ok) {
                toast({
                  title: "Billing information saved",
                  description: "Your billing details have been saved successfully.",
                });
                queryClient.invalidateQueries({ queryKey: ["/api/partner/account"] });
                setShowBillingSetupDialog(false);
              } else {
                const error = await response.json();
                toast({
                  title: "Error",
                  description: error.error || "Failed to save billing information",
                  variant: "destructive",
                });
              }
            } catch (error: any) {
              toast({
                title: "Error",
                description: error.message || "Failed to save billing information",
                variant: "destructive",
              });
            } finally {
              setIsSubmittingBillingSetup(false);
            }
          }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceContact">Invoice Contact Name *</Label>
                <Input
                  id="invoiceContact"
                  placeholder="Accounts Payable / Finance Manager"
                  value={billingSetupForm.invoiceContact}
                  onChange={(e) => setBillingSetupForm(f => ({ ...f, invoiceContact: e.target.value }))}
                  required
                  data-testid="input-invoice-contact"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingEmail">Billing Email *</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  placeholder="accounts@company.com"
                  value={billingSetupForm.billingEmail}
                  onChange={(e) => setBillingSetupForm(f => ({ ...f, billingEmail: e.target.value }))}
                  required
                  data-testid="input-billing-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingAddressLine1">Address Line 1 *</Label>
                <Input
                  id="billingAddressLine1"
                  placeholder="123 Business Street"
                  value={billingSetupForm.billingAddressLine1}
                  onChange={(e) => setBillingSetupForm(f => ({ ...f, billingAddressLine1: e.target.value }))}
                  required
                  data-testid="input-billing-address1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingAddressLine2">Address Line 2</Label>
                <Input
                  id="billingAddressLine2"
                  placeholder="Suite 100"
                  value={billingSetupForm.billingAddressLine2}
                  onChange={(e) => setBillingSetupForm(f => ({ ...f, billingAddressLine2: e.target.value }))}
                  data-testid="input-billing-address2"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="billingCity">City *</Label>
                  <Input
                    id="billingCity"
                    placeholder="London"
                    value={billingSetupForm.billingCity}
                    onChange={(e) => setBillingSetupForm(f => ({ ...f, billingCity: e.target.value }))}
                    required
                    data-testid="input-billing-city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingPostcode">Postcode *</Label>
                  <Input
                    id="billingPostcode"
                    placeholder="SW1A 1AA"
                    value={billingSetupForm.billingPostcode}
                    onChange={(e) => setBillingSetupForm(f => ({ ...f, billingPostcode: e.target.value }))}
                    required
                    data-testid="input-billing-postcode"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingCountry">Country *</Label>
                <Input
                  id="billingCountry"
                  placeholder="United Kingdom"
                  value={billingSetupForm.billingCountry}
                  onChange={(e) => setBillingSetupForm(f => ({ ...f, billingCountry: e.target.value }))}
                  required
                  data-testid="input-billing-country"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">VAT Number</Label>
                  <Input
                    id="vatNumber"
                    placeholder="GB123456789"
                    value={billingSetupForm.vatNumber}
                    onChange={(e) => setBillingSetupForm(f => ({ ...f, vatNumber: e.target.value }))}
                    data-testid="input-vat-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyRegistrationNumber">Company Reg Number</Label>
                  <Input
                    id="companyRegistrationNumber"
                    placeholder="12345678"
                    value={billingSetupForm.companyRegistrationNumber}
                    onChange={(e) => setBillingSetupForm(f => ({ ...f, companyRegistrationNumber: e.target.value }))}
                    data-testid="input-company-reg"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="purchaseOrderRequired"
                  checked={billingSetupForm.purchaseOrderRequired}
                  onCheckedChange={(checked) => setBillingSetupForm(f => ({ ...f, purchaseOrderRequired: checked }))}
                  data-testid="switch-po-required"
                />
                <Label htmlFor="purchaseOrderRequired" className="font-normal">
                  Require Purchase Order number on invoices
                </Label>
              </div>
              {billingSetupForm.purchaseOrderRequired && (
                <div className="space-y-2">
                  <Label htmlFor="defaultPurchaseOrderNumber">Default PO Number</Label>
                  <Input
                    id="defaultPurchaseOrderNumber"
                    placeholder="PO-2024-001"
                    value={billingSetupForm.defaultPurchaseOrderNumber}
                    onChange={(e) => setBillingSetupForm(f => ({ ...f, defaultPurchaseOrderNumber: e.target.value }))}
                    data-testid="input-default-po"
                  />
                  <p className="text-xs text-muted-foreground">
                    This PO number will be used for all invoices unless specified otherwise.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBillingSetupDialog(false)}
                data-testid="button-cancel-billing-setup"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingBillingSetup}
                data-testid="button-save-billing-info"
              >
                {isSubmittingBillingSetup && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Billing Information
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Billing Change Request Dialog */}
      <Dialog open={showBillingChangeDialog} onOpenChange={(open) => {
        setShowBillingChangeDialog(open);
        if (!open) {
          setSelectedBillingType(null);
          setBillingChangeReason("");
          setCardError(null);
          setCardComplete(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Billing Change</DialogTitle>
            <DialogDescription>
              Submit a request to change your billing model. Our team will review and respond within 1-2 business days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg border bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current billing type</p>
                  <p className="font-medium">
                    {account?.partner?.billingType === 'payg' && 'Pay As You Go'}
                    {account?.partner?.billingType === 'subscription' && 'Subscription'}
                    {account?.partner?.billingType === 'enterprise' && 'Enterprise'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Requested billing type</p>
                  {selectedBillingType ? (
                    <p className="font-medium text-primary">
                      {selectedBillingType === 'payg' && 'Pay As You Go'}
                      {selectedBillingType === 'subscription' && 'Subscription'}
                      {selectedBillingType === 'enterprise' && 'Enterprise'}
                    </p>
                  ) : (
                    <Select 
                      value={selectedBillingType || ""} 
                      onValueChange={(value) => setSelectedBillingType(value as 'payg' | 'subscription' | 'enterprise')}
                    >
                      <SelectTrigger className="w-[180px] h-8" data-testid="select-billing-type">
                        <SelectValue placeholder="Select billing type" />
                      </SelectTrigger>
                      <SelectContent>
                        {account?.partner?.billingType !== 'payg' && (
                          <SelectItem value="payg">Pay As You Go</SelectItem>
                        )}
                        {account?.partner?.billingType !== 'subscription' && (
                          <SelectItem value="subscription">Subscription</SelectItem>
                        )}
                        {account?.partner?.billingType !== 'enterprise' && (
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-reason">Reason for change (optional)</Label>
              <textarea
                id="billing-reason"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell us why you'd like to change your billing model..."
                value={billingChangeReason}
                onChange={(e) => setBillingChangeReason(e.target.value)}
                data-testid="textarea-billing-reason"
              />
              <p className="text-xs text-muted-foreground">
                This helps our team understand your needs and process your request faster.
              </p>
            </div>

            {/* Card Details Section - Only shown when requesting Auto-Bill */}
            {selectedBillingType === 'subscription' && (
              <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Card Details</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-billing requires a card on file. Your card will only be charged based on actual usage at the end of each billing cycle.
                </p>
                <Elements stripe={stripePromise}>
                  <div className="space-y-3">
                    <div className="p-3 rounded-md border bg-background">
                      <CardElement 
                        options={{
                          style: {
                            base: {
                              fontSize: '14px',
                              color: '#424770',
                              '::placeholder': {
                                color: '#aab7c4',
                              },
                            },
                            invalid: {
                              color: '#9e2146',
                            },
                          },
                        }}
                        onChange={(event) => {
                          setCardComplete(event.complete);
                          setCardError(event.error ? event.error.message : null);
                        }}
                      />
                    </div>
                    {cardError && (
                      <p className="text-xs text-destructive">{cardError}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3" />
                      <span>Your card details are securely processed by Stripe</span>
                    </div>
                  </div>
                </Elements>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBillingChangeDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitBillingChange}
              disabled={isSubmittingBillingChange || !selectedBillingType || (selectedBillingType === 'subscription' && !cardComplete)}
              data-testid="button-submit-billing-change"
            >
              {isSubmittingBillingChange && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terms Acceptance Dialog - blocks dashboard access until accepted */}
      <PartnerTermsAcceptanceDialog
        open={showTermsDialog}
        onAccepted={() => {
          setShowTermsDialog(false);
          // After accepting terms, check if tutorial should be shown
          if (account?.partner && !account.partner.tourCompleted) {
            setTimeout(() => setShowTutorial(true), 500);
          }
        }}
      />

      {/* PDF Import Modal */}
      <PdfImportModal
        open={showPdfImportModal}
        onOpenChange={setShowPdfImportModal}
        endpoint="/api/partner/import-pdf"
      />

      {/* Interactive Spotlight Tour */}
      <PartnerTour
        isOpen={showTutorial}
        onClose={handleTourClose}
        onComplete={handleTourComplete}
        onTabChange={setActiveTab}
      />

      <Footer />
    </div>
  );
}

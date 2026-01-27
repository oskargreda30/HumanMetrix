import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EMAIL_REGEX, isValidName } from "@/lib/validation";
import {
  Upload,
  Plus,
  Trash2,
  Send,
  FileText,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  Mail,
  ClipboardPaste,
  Link2,
  Building2,
  Copy,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BulkInvitationsTabProps {
  partnerId: string;
  billingType: string;
}

interface CandidateEntry {
  id: string;
  externalUserId: string;
  email: string;
  name: string;
}

interface ValidationError {
  row: number;
  externalUserId: string;
  field: string;
  error: string;
}

interface QuotaData {
  billingType: string;
  testsPurchased: number;
  testsConsumed: number;
  testsRemaining: number;
  freeTestsRemaining: number;
  prepaidBalance: number;
}

const ASSESSMENT_TYPES = [
  { id: 'fit', label: 'FIT Assessment', description: 'Behavioral and cultural fit' },
  { id: 'ai_readiness', label: 'AI Readiness', description: 'AI adoption readiness' },
  { id: 'prompt_architecture', label: 'Prompt Architecture', description: 'AI prompt engineering skills' },
  { id: 'aiq', label: 'AIQ', description: 'AI ethics and integrity' },
];

export function BulkInvitationsTab({ partnerId, billingType }: BulkInvitationsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [candidates, setCandidates] = useState<CandidateEntry[]>([
    { id: crypto.randomUUID(), externalUserId: '', email: '', name: '' },
  ]);
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>(['fit']);
  const [sendEmails, setSendEmails] = useState(true);
  const [csvData, setCsvData] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [lastImportErrors, setLastImportErrors] = useState<Array<{ row: number; externalUserId: string; error: string }>>([]);

  const { data: quota, isLoading: quotaLoading } = useQuery<QuotaData>({
    queryKey: ['/api/partner/me/quota'],
    enabled: !!partnerId,
  });

  const { data: invitationsData, isLoading: invitationsLoading } = useQuery<{
    invitations: any[];
    pagination: { total: number; limit: number; offset: number };
  }>({
    queryKey: ['/api/partner/me/invitations'],
    enabled: !!partnerId,
  });

  const { data: importsData, isLoading: importsLoading } = useQuery<{
    imports: any[];
  }>({
    queryKey: ['/api/partner/me/invitations/imports'],
    enabled: !!partnerId,
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await apiRequest('POST', `/api/partner/me/invitations/${invitationId}/send-email`);
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.message || "Email sent",
        description: "The invitation email has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "Could not send the invitation email.",
        variant: "destructive",
      });
    },
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async (payload: {
      candidates: Array<{ externalUserId: string; email?: string; name?: string }>;
      assessmentTypes: string[];
      sendEmails: boolean;
    }) => {
      // Use longer timeout for bulk operations (2 minutes)
      const response = await apiRequest('POST', '/api/partner/me/invitations/bulk', payload, { timeoutMs: 120000 });
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.errors?.length > 0) {
        setLastImportErrors(data.errors);
        toast({
          title: "Invitations created with issues",
          description: `${data.summary.successCount} created, ${data.summary.failedCount} failed. Download the error report for details.`,
          variant: data.summary.successCount > 0 ? "default" : "destructive",
        });
      } else {
        toast({
          title: "Invitations created",
          description: `${data.summary.successCount} invitations created successfully.`,
        });
        setLastImportErrors([]);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/invitations/imports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/me/quota'] });
      setCandidates([{ id: crypto.randomUUID(), externalUserId: '', email: '', name: '' }]);
      setCsvData(null);
      setValidationErrors([]);
    },
    onError: (error: any) => {
      // Try to parse structured error response from server
      if (error.errors && Array.isArray(error.errors)) {
        setLastImportErrors(error.errors.map((e: any) => ({
          row: e.row || 0,
          externalUserId: e.externalUserId || '',
          error: e.error || e.message || 'Unknown error',
        })));
        
        const summary = error.summary || { successCount: 0, failedCount: error.errors.length };
        toast({
          title: "Validation failed",
          description: `${summary.failedCount} error(s) found. Please fix them and try again.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error creating invitations",
          description: error.message || "Failed to create invitations",
          variant: "destructive",
        });
      }
    },
  });

  const validateCandidates = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    const seenEmails = new Set<string>();
    const emailRegex = EMAIL_REGEX;
    
    candidates.forEach((candidate, index) => {
      const row = index + 1;
      const identifier = candidate.email || candidate.externalUserId || `row-${row}`;
      
      // External ID is now optional - if provided, just validate uniqueness
      if (candidate.externalUserId.trim()) {
        // No duplicate check needed - server allows re-inviting
      }
      
      // Email is mandatory
      if (!candidate.email.trim()) {
        errors.push({
          row,
          externalUserId: identifier,
          field: 'email',
          error: 'Email is required',
        });
      } else if (!emailRegex.test(candidate.email.trim())) {
        errors.push({
          row,
          externalUserId: identifier,
          field: 'email',
          error: 'Invalid email format',
        });
      } else if (seenEmails.has(candidate.email.trim().toLowerCase())) {
        errors.push({
          row,
          externalUserId: identifier,
          field: 'email',
          error: 'Duplicate email in batch',
        });
      } else {
        seenEmails.add(candidate.email.trim().toLowerCase());
      }
      
      // Name is mandatory
      if (!candidate.name.trim()) {
        errors.push({
          row,
          externalUserId: identifier,
          field: 'name',
          error: 'Name is required',
        });
      }
    });
    
    return errors;
  };

  const downloadErrorReport = () => {
    const allErrors = [...validationErrors.map(e => ({
      row: e.row,
      externalUserId: e.externalUserId,
      error: `${e.field}: ${e.error}`,
    })), ...lastImportErrors];
    
    if (allErrors.length === 0) return;
    
    const csvContent = [
      'Row,External ID,Error',
      ...allErrors.map(e => `${e.row},"${e.externalUserId}","${e.error}"`),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation_errors_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const addCandidate = () => {
    setCandidates([
      ...candidates,
      { id: crypto.randomUUID(), externalUserId: '', email: '', name: '' },
    ]);
  };

  const removeCandidate = (id: string) => {
    if (candidates.length > 1) {
      setCandidates(candidates.filter(c => c.id !== id));
    }
  };

  const updateCandidate = (id: string, field: keyof CandidateEntry, value: string) => {
    setCandidates(candidates.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const toggleAssessment = (assessmentId: string) => {
    setSelectedAssessments(prev =>
      prev.includes(assessmentId)
        ? prev.filter(id => id !== assessmentId)
        : [...prev, assessmentId]
    );
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      parseCSV(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload a CSV file.",
        variant: "destructive",
      });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseCSV(file);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
      
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        toast({
          title: "Invalid CSV",
          description: "CSV must have a header row and at least one data row.",
          variant: "destructive",
        });
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const nameIdx = headers.findIndex(h => h.includes('name'));
      // External ID column is optional - look for 'external' or standalone 'id' (not part of 'email')
      const externalIdIdx = headers.findIndex(h => 
        h.includes('external') || (h === 'id' && !h.includes('email'))
      );
      
      // Email column is required
      if (emailIdx === -1) {
        toast({
          title: "Missing required column",
          description: "CSV must have an 'email' column.",
          variant: "destructive",
        });
        return;
      }
      
      const parsedCandidates: CandidateEntry[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const email = values[emailIdx] || '';
        // Accept rows that have email (required) - external ID is optional
        if (email) {
          parsedCandidates.push({
            id: crypto.randomUUID(),
            externalUserId: externalIdIdx !== -1 ? values[externalIdIdx] || '' : '',
            email,
            name: nameIdx !== -1 ? values[nameIdx] || '' : '',
          });
        }
      }
      
      if (parsedCandidates.length > 0) {
        setCandidates(parsedCandidates);
        toast({
          title: "CSV parsed",
          description: `${parsedCandidates.length} candidates loaded from CSV.`,
        });
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = "email,name,externalUserId\njohn@example.com,John Smith,CAND001\njane@example.com,Jane Doe,";
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'candidate_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    const errors = validateCandidates();
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      toast({
        title: "Validation errors",
        description: `Found ${errors.length} validation error(s). Please fix them before submitting.`,
        variant: "destructive",
      });
      return;
    }
    
    // Filter candidates that have email (which is required)
    const validCandidates = candidates.filter(c => c.email.trim());
    
    if (validCandidates.length === 0) {
      toast({
        title: "No candidates",
        description: "Please add at least one candidate with an email address.",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedAssessments.length === 0) {
      toast({
        title: "No assessments selected",
        description: "Please select at least one assessment type.",
        variant: "destructive",
      });
      return;
    }
    
    bulkInviteMutation.mutate({
      candidates: validCandidates.map(c => ({
        // Use email as externalUserId if not provided
        externalUserId: c.externalUserId.trim() || c.email.trim(),
        email: c.email.trim(),
        name: c.name.trim() || undefined,
      })),
      assessmentTypes: selectedAssessments,
      sendEmails,
    });
  };

  // Valid candidates are those with email (required field)
  const validCandidates = candidates.filter(c => c.email.trim());
  const tokensRequired = validCandidates.length * selectedAssessments.length;
  const isPrepaid = billingType === 'prepaid';
  const hasInsufficientTokens = isPrepaid && quota && tokensRequired > quota.testsRemaining;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-amber-500 border-amber-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="text-blue-500 border-blue-500"><Mail className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-500 border-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-red-500 border-red-500"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Bulk Invite Candidates
          </CardTitle>
          <CardDescription>
            Import candidates via CSV or add them manually to send assessment invitations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="csv-dropzone"
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop a CSV file here, or click to browse
            </p>
            <div className="flex items-center justify-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-upload"
              />
              <Label htmlFor="csv-upload">
                <Button variant="outline" size="sm" asChild>
                  <span><FileText className="h-4 w-4 mr-2" />Upload CSV</span>
                </Button>
              </Label>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} data-testid="button-download-template">
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </div>

          {/* Coming Soon: Alternative Import Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Copy-Paste from Spreadsheet */}
            <div className="border border-dashed border-muted-foreground/20 rounded-lg p-3 opacity-50">
              <div className="flex items-center gap-3">
                <ClipboardPaste className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Paste from Spreadsheet</span>
                    <span className="text-[10px] text-muted-foreground/70 border border-muted-foreground/30 rounded px-1">Soon</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ATS Integrations */}
            <div className="border border-dashed border-muted-foreground/20 rounded-lg p-3 opacity-50">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">ATS Integrations</span>
                    <span className="text-[10px] text-muted-foreground/70 border border-muted-foreground/30 rounded px-1">Soon</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Candidates ({validCandidates.length})</Label>
              <Button variant="outline" size="sm" onClick={addCandidate} data-testid="button-add-candidate">
                <Plus className="h-4 w-4 mr-2" />
                Add Candidate
              </Button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {candidates.map((candidate, index) => {
                const rowErrors = validationErrors.filter(e => e.row === index + 1);
                const hasErrors = rowErrors.length > 0;
                
                return (
                  <div key={candidate.id} className={`flex items-center gap-2 p-2 border rounded-lg ${hasErrors ? 'border-red-500 bg-red-500/5' : ''}`} data-testid={`candidate-row-${index}`}>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div className="relative">
                        <Input
                          placeholder="External ID (optional)"
                          value={candidate.externalUserId}
                          onChange={(e) => updateCandidate(candidate.id, 'externalUserId', e.target.value)}
                          className="text-sm"
                          data-testid={`input-external-id-${index}`}
                        />
                        {rowErrors.some(e => e.field === 'externalUserId') && (
                          <AlertCircle className="h-4 w-4 text-red-500 absolute right-2 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="Email (required)"
                          type="email"
                          value={candidate.email}
                          onChange={(e) => updateCandidate(candidate.id, 'email', e.target.value)}
                          className={`text-sm ${rowErrors.some(e => e.field === 'email') ? 'border-red-500' : ''}`}
                          data-testid={`input-email-${index}`}
                        />
                        {rowErrors.some(e => e.field === 'email') && (
                          <AlertCircle className="h-4 w-4 text-red-500 absolute right-2 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <Input
                        placeholder="Name (required)"
                        value={candidate.name}
                        onChange={(e) => updateCandidate(candidate.id, 'name', e.target.value)}
                        className="text-sm"
                        data-testid={`input-name-${index}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCandidate(candidate.id)}
                      disabled={candidates.length === 1}
                      data-testid={`button-remove-candidate-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                );
              })}
            </div>
            
            {(validationErrors.length > 0 || lastImportErrors.length > 0) && (
              <Card className="border-red-500 bg-red-500/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium text-red-700">
                          {validationErrors.length + lastImportErrors.length} Error(s) Found
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Fix the errors below or download the error report
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadErrorReport}
                      data-testid="button-download-errors"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Error Report
                    </Button>
                  </div>
                  <div className="mt-3 max-h-32 overflow-y-auto text-sm">
                    {validationErrors.map((error, idx) => (
                      <div key={idx} className="text-red-600 py-1">
                        Row {error.row}: {error.field} - {error.error}
                      </div>
                    ))}
                    {lastImportErrors.map((error, idx) => (
                      <div key={`import-${idx}`} className="text-red-600 py-1">
                        Row {error.row} ({error.externalUserId}): {error.error}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Assessment Types</Label>
            <div className="grid grid-cols-2 gap-3">
              {ASSESSMENT_TYPES.map((assessment) => (
                <div
                  key={assessment.id}
                  className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAssessments.includes(assessment.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                  onClick={() => toggleAssessment(assessment.id)}
                  data-testid={`checkbox-assessment-${assessment.id}`}
                >
                  <Checkbox
                    checked={selectedAssessments.includes(assessment.id)}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => toggleAssessment(assessment.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{assessment.label}</p>
                    <p className="text-xs text-muted-foreground">{assessment.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendEmails"
              checked={sendEmails}
              onCheckedChange={(checked) => setSendEmails(!!checked)}
            />
            <Label htmlFor="sendEmails" className="text-sm flex items-center gap-1">
              Send invitation emails to candidates with email addresses
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>When unchecked, invitations are created but no emails are sent. You can copy the unique invitation links from Recent Invitations below to share them manually via your own email system or ATS.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
          </div>

          {isPrepaid && (
            <Card className={`${hasInsufficientTokens ? 'border-red-500 bg-red-500/5' : 'border-primary/20 bg-primary/5'}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium">Token Usage Preview</p>
                      <p className="text-xs text-muted-foreground">
                        {validCandidates.length} candidates x {selectedAssessments.length} assessments
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${hasInsufficientTokens ? 'text-red-500' : 'text-primary'}`}>
                      {tokensRequired}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      tokens required
                    </p>
                  </div>
                  <div className="text-right border-l pl-4">
                    <p className="text-2xl font-bold">
                      {quota?.testsRemaining || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      tokens available
                    </p>
                  </div>
                  <div className="text-right border-l pl-4">
                    <p className={`text-2xl font-bold ${hasInsufficientTokens ? 'text-red-500' : 'text-green-500'}`}>
                      {(quota?.testsRemaining || 0) - tokensRequired}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      remaining after
                    </p>
                  </div>
                </div>
                {hasInsufficientTokens && (
                  <div className="flex items-center gap-2 mt-3 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>Insufficient tokens. Please purchase more credits.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={
              bulkInviteMutation.isPending ||
              validCandidates.length === 0 ||
              selectedAssessments.length === 0 ||
              hasInsufficientTokens
            }
            data-testid="button-send-invitations"
          >
            {bulkInviteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Invitations...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send {validCandidates.length} Invitation{validCandidates.length !== 1 ? 's' : ''} ({selectedAssessments.length} assessment{selectedAssessments.length !== 1 ? 's' : ''})
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Invitations</CardTitle>
          <CardDescription>
            View and manage candidate invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitationsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : invitationsData?.invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No invitations yet</p>
              <p className="text-sm mt-1">Create your first bulk invitation above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invitationsData?.invitations.slice(0, 10).map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`invitation-${invitation.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-md bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {invitation.email || invitation.externalUserId}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{invitation.assessmentTypes?.length || 0} assessment(s)</span>
                        <span>ID: {invitation.externalUserId}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {getStatusBadge(invitation.status)}
                    <div className="text-xs text-muted-foreground">
                      {invitation.createdAt ? new Date(invitation.createdAt).toLocaleDateString() : ''}
                    </div>
                    {invitation.email && invitation.status !== 'completed' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => sendEmailMutation.mutate(invitation.id)}
                            disabled={sendEmailMutation.isPending}
                            data-testid={`send-email-${invitation.id}`}
                          >
                            {sendEmailMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{invitation.emailSentAt ? 'Resend email' : 'Send email'}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const inviteUrl = invitation.inviteUrl || `${window.location.origin}/invite/${invitation.inviteToken}`;
                            navigator.clipboard.writeText(inviteUrl);
                            toast({
                              title: "Link copied",
                              description: "Invitation link copied to clipboard",
                            });
                          }}
                          data-testid={`copy-invite-link-${invitation.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Copy invitation link</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import History</CardTitle>
          <CardDescription>
            Previous bulk import batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {importsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : importsData?.imports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No imports yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {importsData?.imports.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`import-${imp.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-md bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {imp.candidateCount} candidates
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {imp.assessmentTypes?.join(', ') || 'No assessments'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <Badge variant={imp.status === 'completed' ? 'default' : imp.status === 'partial' ? 'secondary' : 'destructive'}>
                      {imp.successCount}/{imp.candidateCount} successful
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {imp.createdAt ? new Date(imp.createdAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

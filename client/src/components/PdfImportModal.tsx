import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X, Eye, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function getCsrfToken(): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const name = trimmed.substring(0, eqIndex);
    const value = trimmed.substring(eqIndex + 1);
    if (name === "csrf_token") {
      return value;
    }
  }
  return null;
}

interface ParsedAssessment {
  type: string;
  scores: Record<string, number>;
  totalScore: number;
}

interface ParsedData {
  candidateName: string;
  candidateEmail: string | null;
  assessments: ParsedAssessment[];
  confidence: string;
  notes: string | null;
}

interface ImportResult {
  success: boolean;
  message: string;
  candidate?: {
    id: string;
    name: string;
    email: string;
  };
  sessions?: Array<{
    id: string;
    type: string;
    totalScore: number;
  }>;
  confidence?: string;
  notes?: string;
}

interface PdfImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint?: string;
}

type ModalStep = 'upload' | 'preview' | 'success';

export function PdfImportModal({ open, onOpenChange, endpoint = "/api/admin/import-pdf" }: PdfImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState<ModalStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const parseEndpoint = endpoint.replace('/import-pdf', '/parse-pdf');
  
  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const headers: Record<string, string> = {};
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      
      const response = await fetch(parseEndpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to parse PDF';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch {
            // Ignore
          }
        }
        throw new Error(errorMessage);
      }
      
      return response.json() as Promise<ParsedData>;
    },
    onSuccess: (data) => {
      setParsedData(data);
      setStep('preview');
    },
    onError: (error: Error) => {
      toast({
        title: "Parse Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (data: ParsedData) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
      
      const confirmEndpoint = endpoint.replace('/import-pdf', '/confirm-import');
      
      const response = await fetch(confirmEndpoint, {
        method: 'POST',
        body: JSON.stringify({ parsedData: data, fileName: selectedFile?.name }),
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to import candidate';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          } catch {
            // Ignore
          }
        }
        throw new Error(errorMessage);
      }
      
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/results'] });
      queryClient.invalidateQueries({ queryKey: ['/api/partner/sessions'] });
      toast({
        title: "Import Successful",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files?.[0]) {
      if (files[0].type === "application/pdf") {
        setSelectedFile(files[0]);
        setParsedData(null);
        setStep('upload');
      } else {
        toast({
          title: "Invalid File",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      setSelectedFile(files[0]);
      setParsedData(null);
      setStep('upload');
    }
  };

  const handleParse = () => {
    if (selectedFile) {
      parseMutation.mutate(selectedFile);
    }
  };

  const handleConfirm = () => {
    if (parsedData) {
      confirmMutation.mutate(parsedData);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setParsedData(null);
    setResult(null);
    setStep('upload');
    parseMutation.reset();
    confirmMutation.reset();
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  const formatAssessmentType = (type: string) => {
    const typeMap: Record<string, string> = {
      fit: 'FIT Assessment',
      ai_readiness: 'AI Readiness',
      prompt_architecture: 'Prompt Architecture',
      aiq: 'AIQ',
    };
    return typeMap[type] || type;
  };

  const getConfidenceBadgeVariant = (confidence: string) => {
    switch (confidence?.toLowerCase()) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'upload' && <Upload className="h-5 w-5 text-primary" />}
            {step === 'preview' && <Eye className="h-5 w-5 text-primary" />}
            {step === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {step === 'upload' && 'Import Candidate from PDF'}
            {step === 'preview' && 'Review Parsed Data'}
            {step === 'success' && 'Import Complete'}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a HumanMetrix assessment report PDF to import candidate scores.'}
            {step === 'preview' && 'Review the extracted information before creating the candidate profile.'}
            {step === 'success' && 'The candidate has been successfully added to your dashboard.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'upload' && (
            <>
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? "border-primary bg-primary/5" 
                    : selectedFile 
                    ? "border-green-500 bg-green-500/5" 
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                data-testid="pdf-drop-zone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="input-pdf-file"
                />
                
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div className="text-left">
                      <p className="font-medium text-sm">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Drag and drop your PDF here</p>
                      <p className="text-xs text-muted-foreground">or click to browse</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-browse-files"
                    >
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>

              {parseMutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Parsing PDF with AI...</span>
                </div>
              )}
            </>
          )}

          {step === 'preview' && parsedData && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Candidate Information</CardTitle>
                    <Badge variant={getConfidenceBadgeVariant(parsedData.confidence)}>
                      {parsedData.confidence} confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{parsedData.candidateName}</span>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{parsedData.candidateEmail || 'Not found'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Assessment Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsedData.assessments.map((assessment, idx) => (
                    <div key={idx} className="space-y-2">
                      {idx > 0 && <Separator />}
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{formatAssessmentType(assessment.type)}</span>
                        <Badge variant="outline">{Math.round(assessment.totalScore)}%</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {Object.entries(assessment.scores).map(([skill, score]) => (
                          <div key={skill} className="flex justify-between">
                            <span className="text-muted-foreground truncate pr-2">{skill}:</span>
                            <span className="font-medium">{Math.round(score as number)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {parsedData.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{parsedData.notes}</p>
                  </CardContent>
                </Card>
              )}

              {confirmMutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Creating candidate profile...</span>
                </div>
              )}
            </div>
          )}

          {step === 'success' && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-4">
                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center space-y-2">
                    <p className="font-medium">{result.candidate?.name}</p>
                    <p className="text-sm text-muted-foreground">{result.candidate?.email}</p>
                    <div className="flex justify-center gap-2 mt-3">
                      {result.sessions?.map((session) => (
                        <Badge key={session.id} variant="secondary">
                          {formatAssessmentType(session.type)} - {Math.round(session.totalScore)}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button 
                onClick={handleParse} 
                disabled={!selectedFile || parseMutation.isPending}
                data-testid="button-parse-pdf"
              >
                {parseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Parse & Preview
                  </>
                )}
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')} data-testid="button-back">
                Back
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={confirmMutation.isPending}
                data-testid="button-confirm-import"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Confirm Import
                  </>
                )}
              </Button>
            </>
          )}
          
          {step === 'success' && (
            <Button onClick={() => handleClose(false)} data-testid="button-close">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

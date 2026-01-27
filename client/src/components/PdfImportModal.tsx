import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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

export function PdfImportModal({ open, onOpenChange, endpoint = "/api/admin/import-pdf" }: PdfImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import PDF');
      }
      
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setResult(data);
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
        setResult(null);
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
      setResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setResult(null);
    importMutation.reset();
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetModal();
    }
    onOpenChange(open);
  };

  const formatAssessmentType = (type: string) => {
    const typeMap: Record<string, string> = {
      fit: 'FIT',
      ai_readiness: 'AI Readiness',
      prompt_architecture: 'Prompt Architecture',
      aiq: 'AIQ',
    };
    return typeMap[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Candidate from PDF
          </DialogTitle>
          <DialogDescription>
            Upload a HumanMetrix assessment report PDF to import candidate scores into the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!result ? (
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
                  <div
                    className="cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium">
                      Drop PDF here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum file size: 10MB
                    </p>
                  </div>
                )}
              </div>

              {importMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Parsing PDF with AI...</span>
                  </div>
                  <Progress value={undefined} className="h-2" />
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {result.success ? (
                <>
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Import Successful</span>
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Candidate</p>
                      <p className="font-medium">{result.candidate?.name}</p>
                      <p className="text-sm text-muted-foreground">{result.candidate?.email}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Imported Assessments</p>
                      <div className="flex flex-wrap gap-2">
                        {result.sessions?.map((session) => (
                          <Badge key={session.id} variant="secondary">
                            {formatAssessmentType(session.type)}: {session.totalScore}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {result.confidence && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">Confidence:</p>
                        <Badge 
                          variant={result.confidence === 'high' ? 'default' : result.confidence === 'medium' ? 'secondary' : 'outline'}
                        >
                          {result.confidence}
                        </Badge>
                      </div>
                    )}
                    
                    {result.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{result.notes}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{result.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {result ? (
            <>
              <Button variant="outline" onClick={resetModal} data-testid="button-import-another">
                Import Another
              </Button>
              <Button onClick={() => handleClose(false)} data-testid="button-done">
                Done
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} data-testid="button-cancel-import">
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!selectedFile || importMutation.isPending}
                data-testid="button-import-pdf"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import PDF
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

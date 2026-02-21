import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { SEO } from "@/lib/seo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, X, CheckCircle2, Send, Loader2 } from "lucide-react";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function SendCV() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or Word document.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }
    setFile(f);
  }, [toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file || !name || !email) throw new Error("Missing required fields");
      const formData = new FormData();
      formData.append("cv", file);
      formData.append("name", name);
      formData.append("email", email);
      formData.append("message", message);

      const res = await fetch("/api/send-cv", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: "Failed to send CV" }));
        throw new Error(data.message || "Failed to send CV");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <SEO
          title="Careers - Send Your CV"
          description="Join the HumanMetrix team. Upload your CV and we'll be in touch if there's a role that fits your skills and experience."
          canonical="/careers/send-cv"
          noindex
        />
        <Navigation />
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3" data-testid="text-cv-success-title">CV Sent Successfully</h1>
          <p className="text-muted-foreground mb-6" data-testid="text-cv-success-message">
            Thank you, {name}. Your CV has been received. Our team will review it and be in touch if there's a match.
          </p>
          <Button asChild>
            <a href="/" data-testid="link-back-home">Back to Home</a>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Careers - Send Your CV"
        description="Join the HumanMetrix team. Upload your CV and we'll be in touch if there's a role that fits your skills and experience."
        canonical="/careers/send-cv"
        noindex
      />
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-send-cv-title">Send Us Your CV</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            We're always looking for talented people. Upload your CV below and we'll be in touch if there's a role that fits.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cv-name">Full Name *</Label>
                <Input
                  id="cv-name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-cv-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cv-email">Email Address *</Label>
                <Input
                  id="cv-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-cv-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cv-message">Cover Note (optional)</Label>
              <Textarea
                id="cv-message"
                placeholder="Tell us a bit about yourself and what kind of role you're looking for..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                data-testid="input-cv-message"
              />
            </div>

            <div className="space-y-2">
              <Label>Your CV *</Label>
              <div
                className={`relative border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : file
                      ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/20"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                data-testid="dropzone-cv"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS}
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  data-testid="input-cv-file"
                />

                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-medium text-sm" data-testid="text-cv-filename">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-2"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      data-testid="button-remove-cv"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm font-medium">Drag and drop your CV here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse — PDF, DOC, DOCX (max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!file || !name || !email || mutation.isPending}
              onClick={() => mutation.mutate()}
              data-testid="button-send-cv"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send CV
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}

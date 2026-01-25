import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EnquiryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: string;
}

export function EnquiryModal({ open, onOpenChange, context }: EnquiryModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const submitEnquiry = useMutation({
    mutationFn: async (data: typeof formData & { context?: string }) => {
      const response = await apiRequest("POST", "/api/enterprise-enquiry", data);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to send enquiry");
      }
      return result;
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Enquiry Sent",
        description: "Thank you for your interest. Our team will be in touch shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send enquiry. Please try again or email us directly.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    submitEnquiry.mutate({ ...formData, context });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", company: "", message: "" });
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-enquiry">
        <DialogHeader>
          <DialogTitle data-testid="heading-enquiry-modal">Contact Our Team</DialogTitle>
          <DialogDescription>
            Tell us about your enterprise requirements and we'll get back to you within 24 hours.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center" data-testid="container-enquiry-success">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
            <p className="text-muted-foreground mb-4">
              Your enquiry has been received. Our team will be in touch shortly.
            </p>
            <Button onClick={handleClose} data-testid="button-close-success">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-enquiry-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-enquiry-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                placeholder="Your company name"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                data-testid="input-enquiry-company"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Tell us about your requirements..."
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                data-testid="input-enquiry-message"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel-enquiry">
                Cancel
              </Button>
              <Button type="submit" disabled={submitEnquiry.isPending} data-testid="button-submit-enquiry">
                {submitEnquiry.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Enquiry
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

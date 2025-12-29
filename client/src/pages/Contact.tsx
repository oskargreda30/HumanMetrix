import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, Building2, User, Send, CheckCircle, Loader2 } from "lucide-react";
import dashboardBg from "@assets/network-tech-background.png";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  company: z.string().optional(),
  intent: z.enum(["general", "employer", "candidate", "partner", "support"]),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export default function Contact() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      intent: "general",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    contactMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      <Helmet>
        <title>Contact Us | HumanMetrix</title>
        <meta name="description" content="Get in touch with HumanMetrix. We're here to help with your AI assessment needs." />
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
          background: 'linear-gradient(to bottom, rgba(13, 29, 51, 0.9), rgba(13, 29, 51, 0.85), rgba(13, 29, 51, 0.9))'
        }} />
      </div>

      <Navigation />

      <main className="flex-grow py-16 relative z-10">
        <div className="mx-auto max-w-2xl px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Contact Us
            </h1>
            <p className="text-lg text-blue-100/80">
              Have a question or need assistance? We'd love to hear from you.
            </p>
          </div>

          {submitted ? (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardContent className="pt-12 pb-12 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Message Sent!</h2>
                <p className="text-blue-100/80 mb-6">
                  Thank you for reaching out. Our team will get back to you within 24-48 hours.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmitted(false);
                    form.reset();
                  }}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  data-testid="button-send-another"
                >
                  Send Another Message
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                  Send us a message
                </CardTitle>
                <CardDescription className="text-blue-100/70">
                  Fill out the form below and we'll respond as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-100/90">
                              <User className="h-4 w-4 inline mr-1.5" />
                              Your Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="John Smith"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                data-testid="input-contact-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-100/90">
                              <Mail className="h-4 w-4 inline mr-1.5" />
                              Email Address
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="john@company.com"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                data-testid="input-contact-email"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-100/90">
                              <Building2 className="h-4 w-4 inline mr-1.5" />
                              Company (Optional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Your Company"
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                                data-testid="input-contact-company"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="intent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-blue-100/90">What can we help with?</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger 
                                  className="bg-white/10 border-white/20 text-white"
                                  data-testid="select-contact-intent"
                                >
                                  <SelectValue placeholder="Select a topic" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="general">General Inquiry</SelectItem>
                                <SelectItem value="employer">I'm an Employer</SelectItem>
                                <SelectItem value="candidate">I'm a Candidate</SelectItem>
                                <SelectItem value="partner">Partnership Opportunity</SelectItem>
                                <SelectItem value="support">Technical Support</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-blue-100/90">Your Message</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="How can we help you?"
                              rows={5}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 resize-none"
                              data-testid="input-contact-message"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={contactMutation.isPending}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                      data-testid="button-contact-submit"
                    >
                      {contactMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 text-center">
            <p className="text-blue-100/60 text-sm">
              Or email us directly at{" "}
              <a 
                href="mailto:hello@humanmetrix.co.uk" 
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
                data-testid="link-email-direct"
              >
                hello@humanmetrix.co.uk
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

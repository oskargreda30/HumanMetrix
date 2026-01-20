import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EcosystemProjectSelector } from "@/components/ecosystem/EcosystemProjectSelector";
import { EcosystemWorkflow } from "@/components/ecosystem/EcosystemWorkflow";
import { useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export default function EcosystemStart() {
  const { user, isLoading } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Users className="h-16 w-16 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Team Diagnostic Tool</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Discover how capabilities are distributed across your team and get AI-powered recommendations 
            for your next hire. Sign in to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" data-testid="button-login">
                Sign In to Continue
              </Button>
            </Link>
            <Link href="/ecosystem-index">
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <Link href="/ecosystem-index">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Ecosystem Index
            </Button>
          </Link>
          
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
            Team Diagnostic
          </h1>
          <p className="text-muted-foreground">
            Analyze your team's capability distribution and get AI-powered hiring recommendations.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select or Create a Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EcosystemProjectSelector
              onSelectProject={setSelectedProjectId}
            />
          </CardContent>
        </Card>

        {selectedProjectId && (
          <div className="mt-6">
            <EcosystemWorkflow 
              projectId={selectedProjectId}
              isPartnerDashboard={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

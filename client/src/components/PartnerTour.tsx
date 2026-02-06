import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, X, Sparkles, Home, Building2, ClipboardList, BarChart3, CreditCard, Key, Users, CheckCircle, Bell, Settings, Activity } from "lucide-react";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  tab: string | null;
  targetSelector?: string;
  highlightPadding?: number;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Partner Dashboard!',
    description: 'This interactive tour will guide you through the key features. We\'ll highlight each section as we go. Click Next to begin!',
    icon: Sparkles,
    tab: null,
    position: 'center',
  },
  {
    id: 'tabs-overview',
    title: 'Navigation Tabs',
    description: 'Use these tabs to navigate between different sections of your dashboard. Each tab has specific tools for managing your partner account.',
    icon: Home,
    tab: 'home',
    targetSelector: '[role="tablist"]',
    highlightPadding: 8,
    position: 'bottom',
  },
  // Overview
  {
    id: 'home-content',
    title: 'Overview - Your Dashboard at a Glance',
    description: 'The Overview tab shows your account status: remaining test credits, monthly usage, billing summary, and a Getting Started checklist to help new partners complete essential setup.',
    icon: Home,
    tab: 'home',
    targetSelector: '[data-testid="panel-home"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  // Core Business
  {
    id: 'results-content',
    title: 'Results - View Assessment Outcomes',
    description: 'Access all completed assessment results here. Filter by organization, assessment type, or date range. Export results as CSV for your own analysis and reporting.',
    icon: ClipboardList,
    tab: 'results',
    targetSelector: '[data-testid="panel-results"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  {
    id: 'analytics-content',
    title: 'Analytics - Insights & Trends',
    description: 'Visualize your assessment data with charts and graphs. See usage trends over time, breakdowns by assessment type, and performance metrics by organization.',
    icon: BarChart3,
    tab: 'analytics',
    targetSelector: '[data-testid="panel-analytics"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  // Account & Operations
  {
    id: 'usage-content',
    title: 'Usage - Track Your Consumption',
    description: 'Monitor your assessment usage over time. View trends by day/week/month, see breakdowns by assessment type, and forecast when you\'ll need more credits.',
    icon: BarChart3,
    tab: 'usage',
    targetSelector: '[data-testid="panel-usage"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  {
    id: 'billing-content',
    title: 'Billing - Manage Payments & Credits',
    description: 'View billing history, purchase additional test credits, and manage payment preferences. Content adapts based on your billing model (Prepaid, Auto-Bill, or Invoice).',
    icon: CreditCard,
    tab: 'billing',
    targetSelector: '[data-testid="panel-billing"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  {
    id: 'notifications-content',
    title: 'Notifications - Stay Informed',
    description: 'View important alerts and updates. Quota warnings, billing notices, and system announcements appear here. The badge shows your unread count.',
    icon: Bell,
    tab: 'notifications',
    targetSelector: '[data-testid="panel-notifications"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  // Developer Hub (consolidated)
  {
    id: 'developer-content',
    title: 'Developer Hub - All-in-One',
    description: 'Your central hub for API integration. Manage API keys, preview assessments in the sandbox, and access upcoming integrations (webhooks, ATS, exports) - all in one place.',
    icon: Key,
    tab: 'developer',
    targetSelector: '[data-testid="panel-developer"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  // Administration
  {
    id: 'team-content',
    title: 'Team - Collaborate with Colleagues',
    description: 'Invite team members to access the dashboard. Assign roles (Viewer, Member, Admin) to control what each person can do. Team invitations expire after 7 days.',
    icon: Users,
    tab: 'team',
    targetSelector: '[data-testid="panel-team"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  {
    id: 'settings-content',
    title: 'Settings - Configure Your Account',
    description: 'Set up quota alerts to be notified before credits run low, configure auto-top-up to never run out, and customize white-label branding for your assessment experience.',
    icon: Settings,
    tab: 'settings',
    targetSelector: '[data-testid="panel-settings"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  {
    id: 'activity-content',
    title: 'Activity Log - Audit Trail',
    description: 'View a complete chronological log of all actions in your account: API calls, assessment completions, billing events, team changes, and more.',
    icon: Activity,
    tab: 'activity',
    targetSelector: '[data-testid="panel-activity"][data-state="active"]',
    highlightPadding: 8,
    position: 'top',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'That covers all the features! Explore each tab to discover more. You can restart this tour anytime using the "Take a Tour" button in the header.',
    icon: CheckCircle,
    tab: 'home',
    position: 'center',
  },
];

interface PartnerTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onTabChange: (tab: string) => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function PartnerTour({ isOpen, onClose, onComplete, onTabChange }: PartnerTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const attemptsRef = useRef(0);

  const step = TOUR_STEPS[currentStep];

  const calculatePositions = useCallback((element?: Element | null) => {
    if (!step) return false;

    if (!step.targetSelector || step.position === 'center') {
      setSpotlightRect(null);
      setTooltipPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 200,
      });
      return true;
    }

    const targetElement = element || document.querySelector(step.targetSelector);
    if (!targetElement) {
      setSpotlightRect(null);
      setTooltipPosition({
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - 200,
      });
      return false;
    }

    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const rect = targetElement.getBoundingClientRect();
    const padding = step.highlightPadding || 8;

    const spotlight: SpotlightRect = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
    setSpotlightRect(spotlight);

    const tooltipWidth = 360;
    const tooltipHeight = 200;
    const margin = 16;

    let tooltipTop = 0;
    let tooltipLeft = 0;

    switch (step.position) {
      case 'bottom':
        tooltipTop = spotlight.top + spotlight.height + margin;
        tooltipLeft = spotlight.left + spotlight.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        tooltipTop = spotlight.top - tooltipHeight - margin;
        tooltipLeft = spotlight.left + spotlight.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        tooltipTop = spotlight.top + spotlight.height / 2 - tooltipHeight / 2;
        tooltipLeft = spotlight.left - tooltipWidth - margin;
        break;
      case 'right':
        tooltipTop = spotlight.top + spotlight.height / 2 - tooltipHeight / 2;
        tooltipLeft = spotlight.left + spotlight.width + margin;
        break;
      default:
        tooltipTop = spotlight.top + spotlight.height + margin;
        tooltipLeft = spotlight.left;
    }

    tooltipLeft = Math.max(margin, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - margin));
    tooltipTop = Math.max(margin, Math.min(tooltipTop, window.innerHeight - tooltipHeight - margin));

    setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
    return true;
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    attemptsRef.current = 0;

    const maxAttempts = 30;
    const pollInterval = 100;

    const poll = () => {
      if (!step?.targetSelector || step.position === 'center') {
        calculatePositions();
        return;
      }

      const element = document.querySelector(step.targetSelector);
      if (element) {
        calculatePositions(element);
        setTimeout(() => calculatePositions(element), 400);
      } else if (attemptsRef.current < maxAttempts) {
        attemptsRef.current++;
        pollTimeoutRef.current = setTimeout(poll, pollInterval);
      } else {
        calculatePositions();
      }
    };

    const initTimer = setTimeout(poll, 150);

    const handleResize = () => calculatePositions();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      clearTimeout(initTimer);
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isOpen, currentStep, step, calculatePositions]);

  useEffect(() => {
    if (!isOpen || !step?.tab) return;
    onTabChange(step.tab);
  }, [isOpen, currentStep, step?.tab, onTabChange]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
    setCurrentStep(0);
  };

  if (!isOpen) return null;

  const IconComponent = step?.icon || Sparkles;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" data-testid="partner-tour-overlay">
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 9998 }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                ry="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {spotlightRect && (
        <div
          className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
            zIndex: 9999,
            boxShadow: '0 0 0 4px rgba(6, 182, 212, 0.3), 0 0 20px rgba(6, 182, 212, 0.4)',
          }}
        />
      )}

      <div
        className="absolute bg-card border rounded-xl shadow-2xl p-5 w-[360px] max-w-[calc(100vw-32px)]"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          zIndex: 10000,
        }}
        data-testid="tour-tooltip"
      >
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
          data-testid="button-tour-close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-base leading-tight pr-6">
              {step?.title}
            </h3>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              <Progress
                value={((currentStep + 1) / TOUR_STEPS.length) * 100}
                className="h-1 w-16"
              />
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          {step?.description}
        </p>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
            data-testid="button-tour-skip"
          >
            Skip Tour
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                data-testid="button-tour-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
              data-testid="button-tour-next"
            >
              {currentStep === TOUR_STEPS.length - 1 ? (
                <>
                  Finish
                  <CheckCircle className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export { TOUR_STEPS };

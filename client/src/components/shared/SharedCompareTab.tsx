import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, BarChart3, AlertCircle, Download, Award, Brain, Target, Sparkles, TrendingUp, TrendingDown, Trophy, AlertTriangle, Minus, ChevronUp, ChevronDown, Scale, FileText, Camera, MessageSquare, Clock, ShieldAlert, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { exportComparisonPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym } from "@/lib/assessmentSkills";
import logoUrl from "@assets/logo_HumanMetrix_big_1766783080540.png";
import SkillsLegend from "@/components/SkillsLegend";
import { EnquiryModal } from "@/components/EnquiryModal";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
];

// Concrete colors for PDF export (CSS variables don't work in html2canvas)
const PDF_CHART_COLORS = [
  "#4A7FA8", // Steel blue
  "#6A9BC5", // Medium blue
  "#8AB5D5", // Light blue
];

const MULTI_CANDIDATE_COLORS = ['#4A7FA8', '#6A9BC5', '#8AB5D5', '#3D6F96', '#7BAAD0'];

// Role definitions with skill weightings for suitability scoring
// Uses the same keys as FIT_SKILLS and AI_READINESS_SKILLS
// Database roles are now used instead of static ROLE_DEFINITIONS

// Map skill keys to display names for lookups (handles both legacy and current keys)
const SKILL_KEY_TO_DISPLAY: Record<string, string> = {
  // FIT skills (key === displayName)
  'High Agency': 'High Agency',
  'Intellectual Curiosity': 'Intellectual Curiosity',
  'Resilience': 'Resilience',
  'Empathy & Ethics': 'Empathy & Ethics',
  'Growth Mindset': 'Growth Mindset',
  'Interpersonal Agility': 'Interpersonal Agility',
  // AI Readiness skills (key === displayName)
  'AI Literacy & Prompt Engineering': 'AI Literacy & Prompt Engineering',
  'Technical Fundamentals': 'Technical Fundamentals',
  'Data Fluency': 'Data Fluency',
  'Critical Thinking & Problem-Solving': 'Critical Thinking & Problem-Solving',
  'Adaptability & Continuous Learning': 'Adaptability & Continuous Learning',
  'Collaboration & Communication': 'Collaboration & Communication',
  'Responsible AI & Ethical Awareness': 'Responsible AI & Ethical Awareness',
  'Creativity & Innovation': 'Creativity & Innovation',
  'Domain Expertise': 'Domain Expertise',
};


// Helper: Count unique assessment types (max 4: FIT, AI_READINESS, PROMPT_ARCHITECTURE, AIQ)
const countUniqueAssessmentTypes = (results: Array<{ assessmentType?: string }> | undefined): number => {
  if (!results || results.length === 0) return 0;
  // Normalize assessment types to canonical form (max 4 types: fit, ai_readiness, prompt_architecture, aiq)
  const normalizeType = (type: string): string => {
    const normalized = type.toLowerCase().replace(/[\s-]+/g, '_');
    if (normalized === 'fit' || normalized === 'fit_assessment') return 'fit';
    if (normalized === 'ai_readiness' || normalized === 'ai-readiness' || normalized === 'aireadiness') return 'ai_readiness';
    if (normalized === 'prompt_architecture' || normalized === 'prompt-architecture' || normalized === 'promptarchitecture') return 'prompt_architecture';
    if (normalized === 'aiq' || normalized === 'ai_q' || normalized === 'ai-q') return 'aiq';
    return normalized;
  };
  const uniqueTypes = new Set(
    results.map(r => r.assessmentType).filter(Boolean).map(t => normalizeType(t!))
  );
  // Cap at 4 since there are only 4 assessment types
  return Math.min(uniqueTypes.size, 4);
};

interface ComparisonData {
  radarData: Array<any>;
  skillComparison: Array<{ skillName: string; scores: Array<number | null> }>;
  averageScores: Array<number>;
  hasSkillData: boolean;
  fitAssessments: Array<{ scores: Record<string, number>; completedAt: Date } | null>;
  aiReadinessAssessments: Array<{ scores: Record<string, number>; completedAt: Date } | null>;
  promptArchitectureAssessments: Array<{
    levels: Array<{
      level: number;
      scores: { clarity: number; structure: number; contextRelevance: number; creativity: number; iterativeImprovement: number };
      totalScore: number;
      feedback: string;
    }>;
    totalScore: number;
    percentile: number;
    completedAt: Date;
  } | null>;
  aiqAssessments: Array<{ totalScore: number; scores: Record<string, number>; completedAt: Date } | null>;
  aiInsights?: string | null;
}

export interface SharedCompareTabConfig {
  candidatesEndpoint: string;
  rolesEndpoint: string;
  compareEndpoint: string;
  insightsEndpoint?: string;
  contextType: 'admin' | 'partner';
}

interface SharedCompareTabProps {
  config: SharedCompareTabConfig;
}

export function SharedCompareTab({ config }: SharedCompareTabProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [assessmentWeights, setAssessmentWeights] = useState({
    fit: 25,
    aiReadiness: 25,
    promptArchitecture: 25,
    aiq: 25,
  });
  const [isCapturingPDF, setIsCapturingPDF] = useState(false);
  const [comparisonTriggered, setComparisonTriggered] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);
  const handleMouseMove = useCallback((state: any) => {
    if (state && state.activeLabel) {
      setHoveredSkill(state.activeLabel);
    }
  }, []);
  const handleMouseLeave = useCallback(() => {
    setHoveredSkill(null);
  }, []);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<any[]>({
    queryKey: [config.candidatesEndpoint],
  });

  const { data: dbRoles } = useQuery<any[]>({
    queryKey: [config.rolesEndpoint],
  });

  const { data: comparison, isLoading: isComparing, refetch: runComparison } = useQuery<ComparisonData>({
    queryKey: ['compare', config.contextType, selectedCandidates],
    queryFn: async () => {
      const params = new URLSearchParams();
      selectedCandidates.forEach(id => params.append('userIds', id));
      const response = await fetch(`${config.compareEndpoint}?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch comparison');
      return response.json();
    },
    enabled: selectedCandidates.length >= 2 && comparisonTriggered,
  });

  const handleRunComparison = () => {
    if (selectedCandidates.length >= 2) {
      setComparisonTriggered(true);
    }
  };

  // AI insights now come directly from comparison response (server-side generation)
  // No separate mutation needed - insights are included in the main compare API response

  // Reset comparison when candidates change
  const handleToggleCandidate = (userId: string) => {
    setComparisonTriggered(false);
    toggleCandidate(userId);
  };

  const toggleCandidate = (userId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : prev.length < 3
        ? [...prev, userId]
        : prev
    );
  };

  // Sort selected candidates to match the order of selectedCandidates array
  // This ensures frontend and backend data alignment by index
  const selectedCandidateData = selectedCandidates
    .map(id => candidates?.find((c) => c.user.id === id))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  const handleExportPDF = async () => {
    if (!comparison || !selectedCandidateData) return;
    
    try {
      toast({
        title: "Generating PDF...",
        description: "Capturing charts and preparing your report...",
      });

      // Wait for charts to render and fonts to load
      await new Promise(resolve => setTimeout(resolve, 300));
      await document.fonts.ready;

      // Capture radar chart images
      const fitChartImages: (string | null)[] = [];
      const aiChartImages: (string | null)[] = [];

      for (let i = 0; i < selectedCandidateData.length; i++) {
        // Capture FIT radar chart
        if (comparison.fitAssessments?.[i]) {
          try {
            const element = document.getElementById(`pdf-comparison-fit-${i}`);
            if (element) {
              const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 3,
                useCORS: true,
                logging: false,
              });
              fitChartImages.push(canvas.toDataURL('image/png'));
            } else {
              fitChartImages.push(null);
            }
          } catch (err) {
            console.error('Error capturing FIT chart:', err);
            fitChartImages.push(null);
          }
        } else {
          fitChartImages.push(null);
        }

        // Capture AI Readiness radar chart
        if (comparison.aiReadinessAssessments?.[i]) {
          try {
            const element = document.getElementById(`pdf-comparison-ai-${i}`);
            if (element) {
              const canvas = await html2canvas(element, {
                backgroundColor: '#ffffff',
                scale: 3,
                useCORS: true,
                logging: false,
              });
              aiChartImages.push(canvas.toDataURL('image/png'));
            } else {
              aiChartImages.push(null);
            }
          } catch (err) {
            console.error('Error capturing AI chart:', err);
            aiChartImages.push(null);
          }
        } else {
          aiChartImages.push(null);
        }
      }
      
      // Capture combined radar charts
      let fitCombinedChartImage: string | null = null;
      let aiCombinedChartImage: string | null = null;
      
      // Capture overlapping FIT chart if any candidates have it
      if (comparison.fitAssessments?.some(a => a !== null)) {
        try {
          const element = document.getElementById('pdf-comparison-fit-overlapping');
          if (element) {
            const canvas = await html2canvas(element, {
              backgroundColor: '#ffffff',
              scale: 3,
              useCORS: true,
              logging: false,
            });
            fitCombinedChartImage = canvas.toDataURL('image/png');
          }
        } catch (err) {
          console.error('Error capturing overlapping FIT chart:', err);
        }
      }
      
      // Capture overlapping AI Readiness chart if any candidates have it
      if (comparison.aiReadinessAssessments?.some(a => a !== null)) {
        try {
          const element = document.getElementById('pdf-comparison-ai-overlapping');
          if (element) {
            const canvas = await html2canvas(element, {
              backgroundColor: '#ffffff',
              scale: 3,
              useCORS: true,
              logging: false,
            });
            aiCombinedChartImage = canvas.toDataURL('image/png');
          }
        } catch (err) {
          console.error('Error capturing overlapping AI chart:', err);
        }
      }

      // Capture Overall Skills chart from hidden container
      let overallSkillsChartImage: string | null = null;
      if (comparison.hasSkillData) {
        try {
          // Use the hidden container with proper dimensions and padding
          const element = document.getElementById('pdf-comparison-overall-skills-hidden');
          if (element) {
            const canvas = await html2canvas(element, {
              backgroundColor: '#ffffff',
              scale: 3,
              useCORS: true,
              logging: false,
            });
            overallSkillsChartImage = canvas.toDataURL('image/png');
          }
        } catch (err) {
          console.error('Error capturing Overall Skills chart:', err);
        }
      }

      // Generate employer recommendation and next steps for PDF using shared helper
      const recommendations = generateComparisonRecommendations();
      const employerRecommendation = recommendations?.employerRecommendation;
      const comparisonNextSteps = recommendations?.nextSteps;

      await exportComparisonPDF({
        candidates: selectedCandidateData,
        skillComparison: comparison.skillComparison,
        averageScores: comparison.averageScores,
        fitAssessments: comparison.fitAssessments || [],
        aiReadinessAssessments: comparison.aiReadinessAssessments || [],
        promptArchitectureAssessments: comparison.promptArchitectureAssessments || [],
        aiqAssessments: comparison.aiqAssessments || [],
        fitChartImages,
        aiChartImages,
        fitCombinedChartImage,
        aiCombinedChartImage,
        overallSkillsChartImage,
        selectedRole: selectedRole || null,
        roleData: selectedRole ? getSelectedRoleData() : null,
        assessmentWeights,
        employerRecommendation,
        comparisonNextSteps,
      });
      
      toast({
        title: "PDF exported successfully",
        description: "Your comparison report has been downloaded.",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Export failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScreenCapturePDF = async () => {
    if (!comparison || !selectedCandidateData || !reportContainerRef.current) {
      console.log("Screen capture PDF: Missing required data", { 
        comparison: !!comparison, 
        selectedCandidateData: !!selectedCandidateData, 
        reportContainerRef: !!reportContainerRef.current 
      });
      return;
    }
    
    // Helper to wait for animation frames (ensures DOM is fully painted)
    const waitForFrames = (count: number) => new Promise<void>(resolve => {
      let remaining = count;
      const tick = () => {
        remaining--;
        if (remaining <= 0) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    
    // Helper to enable report mode on real DOM (removes clipping, sticky, etc.)
    const enableReportMode = (container: HTMLElement) => {
      // Add report-mode class to container
      container.classList.add('pdf-report-mode');
      
      // Remove overflow-hidden from all descendants
      container.querySelectorAll('.overflow-hidden, .overflow-x-auto, .overflow-y-auto').forEach(el => {
        (el as HTMLElement).dataset.originalOverflow = (el as HTMLElement).style.overflow;
        (el as HTMLElement).style.overflow = 'visible';
      });
      
      // Remove truncate from text elements
      container.querySelectorAll('.truncate').forEach(el => {
        (el as HTMLElement).dataset.originalTruncate = 'true';
        (el as HTMLElement).style.overflow = 'visible';
        (el as HTMLElement).style.textOverflow = 'clip';
        (el as HTMLElement).style.whiteSpace = 'normal';
      });
      
      // Remove sticky positioning
      container.querySelectorAll('.sticky').forEach(el => {
        (el as HTMLElement).dataset.originalPosition = (el as HTMLElement).style.position;
        (el as HTMLElement).style.position = 'relative';
      });
      
      // Fix max-height constraints
      container.querySelectorAll('[class*="max-h-"]').forEach(el => {
        (el as HTMLElement).dataset.originalMaxHeight = (el as HTMLElement).style.maxHeight;
        (el as HTMLElement).style.maxHeight = 'none';
      });
    };
    
    // Helper to disable report mode (restore original styles)
    const disableReportMode = (container: HTMLElement) => {
      container.classList.remove('pdf-report-mode');
      
      container.querySelectorAll('[data-original-overflow]').forEach(el => {
        (el as HTMLElement).style.overflow = (el as HTMLElement).dataset.originalOverflow || '';
        delete (el as HTMLElement).dataset.originalOverflow;
      });
      
      container.querySelectorAll('[data-original-truncate]').forEach(el => {
        (el as HTMLElement).style.overflow = '';
        (el as HTMLElement).style.textOverflow = '';
        (el as HTMLElement).style.whiteSpace = '';
        delete (el as HTMLElement).dataset.originalTruncate;
      });
      
      container.querySelectorAll('[data-original-position]').forEach(el => {
        (el as HTMLElement).style.position = (el as HTMLElement).dataset.originalPosition || '';
        delete (el as HTMLElement).dataset.originalPosition;
      });
      
      container.querySelectorAll('[data-original-max-height]').forEach(el => {
        (el as HTMLElement).style.maxHeight = (el as HTMLElement).dataset.originalMaxHeight || '';
        delete (el as HTMLElement).dataset.originalMaxHeight;
      });
    };
    
    // Track the report element for cleanup in finally block
    let reportElement: HTMLElement | null = null;
    let reportModeEnabled = false;
    
    try {
      setIsCapturingPDF(true);
      
      toast({
        title: "Generating Visual PDF...",
        description: "Capturing the comparison view...",
      });

      // Wait for state change to render charts without animations
      await new Promise(resolve => setTimeout(resolve, 300));
      await document.fonts.ready;
      
      // Wait for two animation frames to ensure charts are fully rendered
      await waitForFrames(2);
      
      // Wait for any images to load
      const images = reportContainerRef.current.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      reportElement = reportContainerRef.current;
      
      // Enable report mode on the REAL DOM before measuring
      enableReportMode(reportElement);
      reportModeEnabled = true;
      
      // Wait for layout to stabilize after style changes
      await waitForFrames(2);
      
      // Now measure section boundaries with proper styles applied
      const containerRect = reportElement.getBoundingClientRect();
      const sectionBoundaries: number[] = [0];
      
      // Get major sections - Cards with data-report-section or standard Card components
      const reportSections = Array.from(reportElement.querySelectorAll('[data-report-section], [class*="rounded-xl"], [class*="rounded-lg"]'));
      
      // Only use top-level sections (filter out nested elements)
      const topLevelSections = reportSections.filter(section => {
        const parent = section.parentElement;
        // Skip if parent is also a section (nested)
        return !parent?.closest('[data-report-section]') || section.hasAttribute('data-report-section');
      });
      
      console.log("Screen capture: Found", topLevelSections.length, "top-level sections");
      
      topLevelSections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top + (reportElement?.scrollTop || 0);
        const relativeBottom = rect.bottom - containerRect.top + (reportElement?.scrollTop || 0);
        sectionBoundaries.push(relativeTop);
        sectionBoundaries.push(relativeBottom);
      });
      
      // Sort and dedupe boundaries
      const uniqueBoundaries = Array.from(new Set(sectionBoundaries)).sort((a, b) => a - b);
      
      const elementHeight = reportElement.scrollHeight;
      const scale = Math.min(2, 16000 / elementHeight);
      
      console.log("Screen capture: Element height", elementHeight, "scale", scale);
      
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#ffffff',
        scale: scale,
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: reportElement.scrollWidth,
        windowHeight: elementHeight,
        onclone: (clonedDoc: Document) => {
          // Fix CSS color functions that html2canvas doesn't support
          const style = clonedDoc.createElement('style');
          style.textContent = `
            :root, .dark {
              --sidebar-primary-border: hsl(217 91% 27%) !important;
              --sidebar-accent-border: hsl(210 8% 80%) !important;
              --primary-border: hsl(217 91% 27%) !important;
              --secondary-border: hsl(210 8% 78%) !important;
              --muted-border: hsl(210 10% 82%) !important;
              --accent-border: hsl(210 12% 80%) !important;
              --destructive-border: hsl(0 84% 24%) !important;
            }
            /* Ensure all chart animations are disabled */
            .recharts-wrapper, .recharts-wrapper * {
              animation: none !important;
              transition: none !important;
            }
            /* Force visible overflow in clone too */
            .overflow-hidden, .overflow-x-auto, .overflow-y-auto {
              overflow: visible !important;
            }
            .truncate {
              overflow: visible !important;
              text-overflow: clip !important;
              white-space: normal !important;
            }
            .sticky {
              position: relative !important;
            }
            [class*="max-h-"] {
              max-height: none !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
      });
      
      // Restore original styles immediately after capture
      disableReportMode(reportElement);
      reportModeEnabled = false; // Mark as restored so finally doesn't double-call

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      const availableHeight = pageHeight - (margin * 2);
      
      // Calculate scaling factors
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const scaleFactor = imgHeight / elementHeight;
      
      let currentSourceY = 0;
      let pageNum = 1;
      
      // Find the best slice points that don't cut through sections
      const findBestBreakPoint = (startPx: number): number => {
        const maxSourceHeight = availableHeight / scaleFactor;
        const targetEndPx = startPx + maxSourceHeight;
        
        if (targetEndPx >= elementHeight) {
          return elementHeight;
        }
        
        // Find the largest section boundary that fits within the page
        let bestBreak = targetEndPx;
        for (let i = uniqueBoundaries.length - 1; i >= 0; i--) {
          const boundary = uniqueBoundaries[i];
          if (boundary > startPx + 50 && boundary <= targetEndPx) {
            // Ensure we're making progress (at least 50px)
            bestBreak = boundary;
            break;
          }
        }
        
        // If best break is too close to start (less than 10% of page), use full page
        if (bestBreak - startPx < maxSourceHeight * 0.1) {
          bestBreak = targetEndPx;
        }
        
        return Math.min(bestBreak, elementHeight);
      };
      
      while (currentSourceY < elementHeight) {
        const endSourceY = findBestBreakPoint(currentSourceY);
        const sliceHeightPx = endSourceY - currentSourceY;
        const sliceHeightMm = sliceHeightPx * scaleFactor;
        
        const canvasStartY = currentSourceY * scale;
        const canvasSliceHeight = sliceHeightPx * scale;
        
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.ceil(canvasSliceHeight);
        const sliceCtx = sliceCanvas.getContext('2d');
        
        if (sliceCtx && canvasSliceHeight > 0) {
          sliceCtx.drawImage(
            canvas, 
            0, canvasStartY, canvas.width, canvasSliceHeight,
            0, 0, canvas.width, canvasSliceHeight
          );
          
          const sliceImgData = sliceCanvas.toDataURL('image/png');
          
          if (pageNum > 1) {
            pdf.addPage();
          }
          
          pdf.addImage(sliceImgData, 'PNG', margin, margin, imgWidth, sliceHeightMm);
          pageNum++;
        }
        
        currentSourceY = endSourceY;
        
        if (sliceHeightPx <= 0) {
          console.warn("Screen capture: Zero height slice, breaking");
          break;
        }
      }

      const candidateNames = selectedCandidateData.map((c: any) => 
        getCandidateName(c)
      ).join('_vs_').substring(0, 50);
      
      pdf.save(`comparison-visual-${candidateNames}-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Visual PDF exported successfully",
        description: "Your visual comparison report has been downloaded.",
      });
    } catch (error: any) {
      console.error("Error exporting visual PDF:", error?.message || error?.name || String(error));
      console.error("Error stack:", error?.stack);
      
      toast({
        title: "Export failed",
        description: error?.message || "There was an error generating the visual PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Always restore DOM state, even on error
      if (reportModeEnabled && reportElement) {
        disableReportMode(reportElement);
      }
      setIsCapturingPDF(false);
    }
  };

  const getCandidateName = (candidate: any) => {
    return candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : candidate.user.email;
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 60) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 40) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Developing', variant: 'outline' as const };
  };

  // Helper: Get all skills for a candidate across all assessments
  const getAllCandidateSkills = (candidateIndex: number): Record<string, number> => {
    if (!comparison) return {};
    const skills: Record<string, number> = {};
    
    // FIT skills
    const fitData = comparison.fitAssessments?.[candidateIndex];
    if (fitData) {
      Object.entries(fitData.scores).forEach(([key, value]) => {
        skills[key] = value;
      });
    }
    
    // AI Readiness skills
    const aiData = comparison.aiReadinessAssessments?.[candidateIndex];
    if (aiData) {
      Object.entries(aiData.scores).forEach(([key, value]) => {
        skills[key] = value;
      });
    }
    
    // Note: Prompt Architecture and AIQ are NOT included as skills
    // They are total scores without individual skill breakdowns
    
    return skills;
  };

  // Helper: Calculate average score across candidates for a skill
  const calculateSkillAverage = (skillName: string): number => {
    if (!comparison || !selectedCandidateData) return 0;
    
    let total = 0;
    let count = 0;
    
    selectedCandidateData.forEach((_: any, index: number) => {
      const skills = getAllCandidateSkills(index);
      if (skills[skillName] !== undefined) {
        total += skills[skillName];
        count++;
      }
    });
    
    return count > 0 ? Math.round(total / count) : 0;
  };

  // Helper: Get skill gap (deviation from average)
  const getSkillGap = (candidateIndex: number, skillName: string): number => {
    const skills = getAllCandidateSkills(candidateIndex);
    const score = skills[skillName];
    if (score === undefined) return 0;
    return score - calculateSkillAverage(skillName);
  };

  // Helper: Get strengths and weaknesses for a candidate
  const getStrengthsAndWeaknesses = (candidateIndex: number) => {
    const skills = getAllCandidateSkills(candidateIndex);
    const skillEntries = Object.entries(skills).map(([name, score]) => ({ name, score }));
    
    // Sort by score
    const sorted = skillEntries.sort((a, b) => b.score - a.score);
    
    return {
      strengths: sorted.slice(0, 3),
      weaknesses: sorted.slice(-3).reverse(),
    };
  };

  // Helper: Get selected role data (from database roles)
  const getSelectedRoleData = () => {
    if (!selectedRole || !dbRoles) return null;
    return dbRoles.find((r: any) => r.id === selectedRole);
  };

  // Helper: Calculate role suitability score using database role's requiredSkillScores
  // Helper: Extract flat skill requirements from nested requiredSkillScores structure
  const extractSkillRequirements = (requiredSkillScores: any): Record<string, number> => {
    if (!requiredSkillScores) return {};
    
    const skills: Record<string, number> = {};
    
    // Extract FIT skills
    if (requiredSkillScores.fitSkills && typeof requiredSkillScores.fitSkills === 'object') {
      Object.entries(requiredSkillScores.fitSkills).forEach(([skillName, score]) => {
        if (typeof score === 'number') {
          skills[skillName] = score;
        }
      });
    }
    
    // Extract AI Readiness skills
    if (requiredSkillScores.aiReadinessSkills && typeof requiredSkillScores.aiReadinessSkills === 'object') {
      Object.entries(requiredSkillScores.aiReadinessSkills).forEach(([skillName, score]) => {
        if (typeof score === 'number') {
          skills[skillName] = score;
        }
      });
    }
    
    return skills;
  };

  // Calculate role suitability with coverage awareness and critical skill weighting
  // Critical skills are weighted 2x and deficits in critical skills incur penalties
  const calculateRoleSuitabilityWithCoverage = (candidateIndex: number, roleId: string): { 
    score: number; 
    coverage: number; 
    matchedSkills: number; 
    totalRequiredSkills: number;
    missingSkills: string[];
    criticalGaps: number;
    totalCriticalSkills: number;
  } => {
    const role = dbRoles?.find((r: any) => r.id === roleId);
    if (!role || !role.requiredSkillScores) {
      return { score: 0, coverage: 0, matchedSkills: 0, totalRequiredSkills: 0, missingSkills: [], criticalGaps: 0, totalCriticalSkills: 0 };
    }
    
    const skills = getAllCandidateSkills(candidateIndex);
    const requiredScores = extractSkillRequirements(role.requiredSkillScores);
    const skillCriticality = (role.requiredSkillScores.skillCriticality || {}) as Record<string, string>;
    const requiredSkillEntries = Object.entries(requiredScores).filter(([_, score]) => score > 0);
    
    let weightedTotal = 0;
    let weightSum = 0;
    let matchCount = 0;
    let criticalGaps = 0;
    let totalCriticalSkills = 0;
    const missingSkills: string[] = [];
    
    // Define weights: critical = 2x, important = 1.5x, nice-to-have = 1x
    const getWeight = (skillName: string): number => {
      const criticality = skillCriticality[skillName] || 'important';
      if (criticality === 'critical') return 2.0;
      if (criticality === 'important') return 1.5;
      return 1.0;
    };
    
    requiredSkillEntries.forEach(([skillName, requiredScore]) => {
      const candidateScore = skills[skillName];
      const weight = getWeight(skillName);
      const isCritical = skillCriticality[skillName] === 'critical';
      
      if (isCritical) totalCriticalSkills++;
      
      if (candidateScore !== undefined) {
        // Calculate how well candidate meets the requirement (capped at 100%)
        const matchPercent = Math.min(100, (candidateScore / requiredScore) * 100);
        weightedTotal += matchPercent * weight;
        weightSum += weight;
        matchCount++;
        
        // Track critical gaps (when candidate is below requirement)
        if (isCritical && candidateScore < requiredScore) {
          criticalGaps++;
        }
      } else {
        // Track missing skills for display
        missingSkills.push(skillName);
        // Missing critical skills count as critical gaps
        if (isCritical) {
          criticalGaps++;
        }
      }
    });
    
    const totalRequiredSkills = requiredSkillEntries.length;
    const coverage = totalRequiredSkills > 0 ? matchCount / totalRequiredSkills : 0;
    
    // Calculate weighted average match (matches backend formula)
    let adjustedScore = weightSum > 0 ? weightedTotal / weightSum : 0;
    
    // Apply critical gap penalty: 10% per gap, capped at 50% (matches backend formula)
    // IMPORTANT: Only apply if we actually assessed critical skills
    if (criticalGaps > 0 && totalCriticalSkills > 0) {
      const criticalPenalty = criticalGaps * 0.10;
      adjustedScore = adjustedScore * (1 - Math.min(criticalPenalty, 0.50));
    }
    
    return { 
      score: Math.round(adjustedScore), 
      coverage: Math.round(coverage * 100), 
      matchedSkills: matchCount, 
      totalRequiredSkills,
      missingSkills,
      criticalGaps,
      totalCriticalSkills
    };
  };

  // Backward-compatible wrapper that returns just the score
  const calculateRoleSuitability = (candidateIndex: number, roleId: string): number => {
    return calculateRoleSuitabilityWithCoverage(candidateIndex, roleId).score;
  };

  // Helper: Generate comparison recommendations (single source of truth for dashboard and PDF)
  // Works with or without role selection - uses role fit when available, otherwise uses composite scores
  const generateComparisonRecommendations = (): { employerRecommendation: string; nextSteps: string[] } | null => {
    if (!selectedCandidateData || selectedCandidateData.length === 0) return null;
    
    // Use role fit scores if a role is selected, otherwise use composite scores
    const hasRoleSelected = !!selectedRole;
    
    const candidateScores = selectedCandidateData.map((candidate: any, index: number) => ({
      name: getCandidateName(candidate),
      score: hasRoleSelected 
        ? calculateRoleSuitability(index, selectedRole) 
        : calculateCompositeScore(index),
      compositeScore: calculateCompositeScore(index),
    })).sort((a, b) => b.score - a.score);
    
    if (candidateScores.length === 0) return null;
    
    const topCandidate = candidateScores[0];
    const currentRoleName = hasRoleSelected 
      ? (dbRoles?.find(r => r.id === selectedRole)?.name || 'selected role')
      : 'your target position';
    const otherStrongCandidates = candidateScores.filter((c, i) => i > 0 && c.score >= 70);
    
    let employerRecommendation = '';
    
    if (hasRoleSelected) {
      // Role-specific recommendation
      if (topCandidate.score >= 75) {
        employerRecommendation = `Based on comprehensive skill assessment data across all four evaluation dimensions, ${topCandidate.name} emerges as the strongest candidate for the ${currentRoleName} position with an overall fit score of ${topCandidate.score}%. This candidate demonstrates excellent alignment with role requirements and would likely contribute effectively from day one with minimal ramp-up time.`;
      } else if (topCandidate.score >= 60) {
        employerRecommendation = `After reviewing all assessment data, ${topCandidate.name} presents the strongest alignment with the ${currentRoleName} role at ${topCandidate.score}% overall fit. While showing solid potential, targeted development in identified gap areas would accelerate their effectiveness in this position.`;
      } else {
        employerRecommendation = `The assessment comparison indicates that ${topCandidate.name} has the highest alignment score at ${topCandidate.score}% for the ${currentRoleName} role. However, all candidates would benefit from additional development to fully meet role requirements. Consider this as part of a longer-term talent development strategy.`;
      }
    } else {
      // General recommendation based on composite scores
      if (topCandidate.score >= 75) {
        employerRecommendation = `Based on comprehensive assessment data across all four evaluation dimensions (FIT Assessment, AI Readiness, Prompt Architecture, and AIQ), ${topCandidate.name} emerges as the leading candidate with a composite score of ${topCandidate.score}%. This candidate demonstrates strong capabilities and would be a valuable addition to the team.`;
      } else if (topCandidate.score >= 60) {
        employerRecommendation = `After analyzing results from FIT Assessment, AI Readiness, Prompt Architecture, and AIQ, ${topCandidate.name} shows the highest overall performance with a composite score of ${topCandidate.score}%. While showing solid potential across multiple competencies, targeted development in lower-scoring areas would further strengthen their effectiveness.`;
      } else {
        employerRecommendation = `The assessment comparison across FIT, AI Readiness, Prompt Architecture, and AIQ indicates that ${topCandidate.name} has the highest composite score at ${topCandidate.score}%. All candidates would benefit from additional development in certain areas. Consider this comparison as part of a comprehensive talent evaluation strategy.`;
      }
    }
    
    if (otherStrongCandidates.length > 0) {
      employerRecommendation += ` ${otherStrongCandidates.map(c => c.name).join(' and ')} ${otherStrongCandidates.length > 1 ? 'also show' : 'also shows'} strong potential as ${otherStrongCandidates.length > 1 ? 'alternatives' : 'an alternative'}.`;
    }
    
    // Check for candidates with missing assessments
    const candidatesWithMissingAssessments: Array<{ name: string; missing: string[] }> = [];
    selectedCandidateData?.forEach((candidate: any, index: number) => {
      const missing: string[] = [];
      if (!comparison?.fitAssessments?.[index]) missing.push('FIT');
      if (!comparison?.aiReadinessAssessments?.[index]) missing.push('AI Readiness');
      if (!comparison?.promptArchitectureAssessments?.[index]) missing.push('Prompt Architecture');
      if (!comparison?.aiqAssessments?.[index]) missing.push('AIQ');
      if (missing.length > 0) {
        candidatesWithMissingAssessments.push({ name: getCandidateName(candidate), missing });
      }
    });
    
    const nextSteps: string[] = [];
    
    // Add missing assessment recommendations first (priority)
    if (candidatesWithMissingAssessments.length > 0) {
      candidatesWithMissingAssessments.forEach(({ name, missing }) => {
        if (missing.length === 1) {
          nextSteps.push(`Have ${name} complete the ${missing[0]} assessment for a complete skills picture`);
        } else if (missing.length <= 3) {
          nextSteps.push(`Have ${name} complete ${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]} assessments`);
        } else {
          nextSteps.push(`Have ${name} complete all outstanding assessments (${missing.length} remaining)`);
        }
      });
    }
    
    // Add hiring-focused steps
    if (topCandidate.score >= 70) {
      nextSteps.push(
        `Conduct final-round interviews with ${topCandidate.name} focusing on team dynamics and cultural alignment`,
        'Perform reference checks emphasizing leadership and collaboration competencies',
        'Prepare competitive offer package based on candidate expectations',
        'Design 90-day onboarding plan targeting identified development areas'
      );
    } else {
      nextSteps.push(
        'Schedule in-depth technical interviews with top candidates to validate assessment findings',
        'Assess development potential and learning agility through case-based scenarios',
        'Consider rotational or project-based trial periods to evaluate practical performance',
        'Explore alternative role placements that may better match current skill profiles'
      );
    }
    
    return { employerRecommendation, nextSteps };
  };

  // Helper: Calculate composite score across all assessments
  // Respects user-set zero weights (excludes those assessments). Returns 0 when all weights are zero.
  const calculateCompositeScore = (candidateIndex: number): number => {
    if (!comparison) return 0;
    
    const assessmentData: Array<{ score: number; weight: number }> = [];
    
    // FIT average
    const fitData = comparison.fitAssessments?.[candidateIndex];
    if (fitData) {
      const fitScores = Object.values(fitData.scores);
      if (fitScores.length > 0) {
        const fitAvg = fitScores.reduce((a, b) => a + b, 0) / fitScores.length;
        assessmentData.push({ score: fitAvg, weight: assessmentWeights.fit });
      }
    }
    
    // AI Readiness average
    const aiData = comparison.aiReadinessAssessments?.[candidateIndex];
    if (aiData) {
      const aiScores = Object.values(aiData.scores);
      if (aiScores.length > 0) {
        const aiAvg = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
        assessmentData.push({ score: aiAvg, weight: assessmentWeights.aiReadiness });
      }
    }
    
    // Prompt Architecture
    const promptData = comparison.promptArchitectureAssessments?.[candidateIndex];
    if (promptData) {
      assessmentData.push({ score: promptData.totalScore, weight: assessmentWeights.promptArchitecture });
    }
    
    // AIQ
    const aiqData = comparison.aiqAssessments?.[candidateIndex];
    if (aiqData) {
      assessmentData.push({ score: aiqData.totalScore, weight: assessmentWeights.aiq });
    }
    
    if (assessmentData.length === 0) return 0;
    
    // Calculate total weight (respecting zeros - they exclude the assessment)
    const totalWeight = assessmentData.reduce((sum, d) => sum + d.weight, 0);
    
    // If all weights are zero, return 0 (no valid composite can be calculated)
    if (totalWeight === 0) return 0;
    
    // Normal weighted calculation (assessments with weight=0 contribute 0 to the sum)
    const weightedSum = assessmentData.reduce((sum, d) => sum + d.score * d.weight, 0);
    
    return Math.round(weightedSum / totalWeight);
  };

  // Helper: Get color class for score comparison
  const getScoreColorClass = (score: number, allScores: number[]): string => {
    const validScores = allScores.filter(s => s !== null && s !== undefined);
    if (validScores.length <= 1) return 'bg-muted';
    
    const max = Math.max(...validScores);
    const min = Math.min(...validScores);
    
    if (score === max) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
    if (score === min) return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200';
  };

  // Helper: Calculate average of scores (handles null/undefined correctly)
  const calculateAverage = (scores: (number | null)[]): string => {
    const validScores = scores.filter((s): s is number => s !== null && s !== undefined);
    if (validScores.length === 0) return '—';
    const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    return String(Math.round(avg));
  };

  // Calculate rankings based on composite scores
  const getRankings = (): Array<{ candidateIndex: number; score: number; rank: number }> => {
    if (!selectedCandidateData) return [];
    
    const scores = selectedCandidateData.map((_: any, index: number) => ({
      candidateIndex: index,
      score: calculateCompositeScore(index),
      rank: 0,
    }));
    
    scores.sort((a, b) => b.score - a.score);
    scores.forEach((item, idx) => {
      item.rank = idx + 1;
    });
    
    return scores;
  };

  return (
    <div className="h-full overflow-auto space-y-4 md:space-y-6">
      {/* Credit usage notice for partners */}
      {config.contextType === 'partner' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs md:text-sm font-medium text-blue-800 dark:text-blue-200">
                Credit Usage for Analysis
              </p>
              <p className="text-[11px] md:text-xs text-blue-700 dark:text-blue-300 mt-0.5 md:mt-1">
                Credits are only consumed when generating new analysis – saved results are always free. Comparison: 1 credit per candidate.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">Select Candidates to Compare</CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground">
            Select 2-3 candidates to view side-by-side comparison
          </p>
        </CardHeader>
        <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
          {isLoading ? (
            <div className="flex justify-center py-6 md:py-8">
              <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
            </div>
          ) : candidates && candidates.length > 0 ? (
            <div className="grid gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate: any) => (
                <div
                  key={candidate.user.id}
                  className={`p-2.5 md:p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCandidates.includes(candidate.user.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover-elevate'
                  }`}
                  onClick={() => handleToggleCandidate(candidate.user.id)}
                  data-testid={`checkbox-candidate-${candidate.user.id}`}
                >
                  <div className="flex items-start gap-2 md:gap-3">
                    <Checkbox
                      checked={selectedCandidates.includes(candidate.user.id)}
                      disabled={
                        !selectedCandidates.includes(candidate.user.id) &&
                        selectedCandidates.length >= 3
                      }
                      className="mt-0.5 md:mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-base font-medium truncate">
                        {candidate.user.firstName || candidate.user.lastName
                          ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                          : 'No Name'}
                      </p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {candidate.user.email}
                      </p>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1">
                        {countUniqueAssessmentTypes(candidate.results)} assessment{countUniqueAssessmentTypes(candidate.results) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 md:py-8 text-xs md:text-sm text-muted-foreground">No candidates available</p>
          )}
        </CardContent>
      </Card>

      {selectedCandidates.length >= 2 && !comparisonTriggered && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 p-3 md:p-6">
            <Users className="h-8 w-8 md:h-12 md:w-12 mb-3 md:mb-4 text-primary/50" />
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 text-center">
              {selectedCandidates.length} candidates selected. Click below to run the comparison.
            </p>
            <Button 
              onClick={handleRunComparison}
              data-testid="button-run-comparison"
              className="text-xs md:text-sm"
              size="sm"
            >
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
              Run Comparison
            </Button>
          </CardContent>
        </Card>
      )}

      {selectedCandidates.length >= 2 && comparisonTriggered && (
        <>
          {isComparing ? (
            <Card>
              <CardContent className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : comparison ? (
            <>
              {/* Report Container for Screen Capture PDF */}
              <div 
                ref={reportContainerRef} 
                className={`space-y-6 ${isCapturingPDF ? 'bg-white p-6' : ''}`}
              >
                {/* Report Header - Only visible during PDF capture */}
                {isCapturingPDF && (
                  <div className="border-b pb-6 mb-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <img src={logoUrl} alt="HumanMetrix" className="h-12" />
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900">Candidate Comparison Report</h1>
                          <p className="text-sm text-gray-600">Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {selectedCandidateData?.map((candidate: any, index: number) => (
                        <div key={candidate.user.id} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex items-center gap-2 mb-1">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: PDF_CHART_COLORS[index] || '#666' }}
                            />
                            <span className="font-semibold text-gray-900">{getCandidateName(candidate)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{candidate.user.email}</p>
                          <p className="text-sm font-medium mt-1">
                            Composite Score: <span style={{ color: '#0ea5e9' }}>{Math.round(comparison.averageScores[index])}%</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Executive Summary - Guide for Hiring Managers */}
              {!isCapturingPDF && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    How to Use This Comparison
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    A guide to comparing {selectedCandidates.length} candidates side-by-side
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Step 1 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="font-medium text-sm">Candidate Overview</p>
                        <p className="text-xs text-muted-foreground">Quick view of each candidate's assessment completion. All 4 assessments should be completed for a complete picture.</p>
                      </div>
                    </div>
                    {/* Step 2 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="font-medium text-sm">Composite Score</p>
                        <p className="text-xs text-muted-foreground">Weighted average across all assessments. Use the sliders to adjust weights based on role priorities (e.g., higher AI Readiness for tech roles).</p>
                      </div>
                    </div>
                    {/* Step 3 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="font-medium text-sm">Skill-by-Skill Breakdown</p>
                        <p className="text-xs text-muted-foreground">Radar charts and tables show each candidate's strengths. Look for the highest scores in skills critical to your role.</p>
                      </div>
                    </div>
                    {/* Step 4 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">4</div>
                      <div>
                        <p className="font-medium text-sm">Role Fit Analysis (Separate Tool)</p>
                        <p className="text-xs text-muted-foreground">For detailed role-specific analysis including cohort benchmarking and hiring recommendations, use the Role Fit tab with individual candidates.</p>
                      </div>
                    </div>
                    {/* Step 5 */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">5</div>
                      <div>
                        <p className="font-medium text-sm">Read the Recommendations</p>
                        <p className="text-xs text-muted-foreground">Review strengths, development areas, and AI-generated insights for each candidate to inform your final decision.</p>
                      </div>
                    </div>
                    {/* What assessments mean */}
                    <div className="flex gap-3 md:col-span-2">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">?</div>
                      <div>
                        <p className="font-medium text-sm">What Each Assessment Measures</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">FIT:</span> Behavioral traits like resilience, curiosity, ethics (predictors of cultural fit). 
                          <span className="font-medium ml-2">AI Readiness:</span> Technical AI skills including prompt engineering and data fluency. 
                          <span className="font-medium ml-2">Prompt Architecture:</span> Real-world prompt writing ability across difficulty levels. 
                          <span className="font-medium ml-2">AIQ:</span> AI ethics, judgment, and responsible AI awareness.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              )}

              {/* Summary Cards - Candidate Details & Assessment Status */}
              <Card data-testid="card-candidate-summary">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Candidate Overview & Assessment Status
                    </CardTitle>
                    <Button 
                      size="sm"
                      onClick={handleExportPDF}
                      data-testid="button-export-comparison-top"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export as PDF
                    </Button>
                  </div>
                  <CardDescription>
                    Contact details, application date, and completion status for each assessment type (FIT, AI Readiness, Prompt Architecture, AIQ)
                  </CardDescription>
                </CardHeader>
                <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedCandidateData?.map((candidate: any, index: number) => {
                  const fitCompleted = comparison.fitAssessments?.[index] !== null;
                  const aiReadinessCompleted = comparison.aiReadinessAssessments?.[index] !== null;
                  const promptCompleted = comparison.promptArchitectureAssessments?.[index] !== null;
                  const aiqCompleted = comparison.aiqAssessments?.[index] !== null;
                  const totalCompleted = [fitCompleted, aiReadinessCompleted, promptCompleted, aiqCompleted].filter(Boolean).length;

                  return (
                    <Card key={candidate.user.id} data-testid={`summary-card-${index}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{getCandidateName(candidate)}</CardTitle>
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">{candidate.user.email}</p>
                          {candidate.user.createdAt && (
                            <p className="text-xs text-muted-foreground">Applied: {new Date(candidate.user.createdAt).toLocaleDateString()}</p>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Assessments Completed</span>
                            <Badge variant="outline">{totalCompleted} / 4</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${fitCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={fitCompleted ? 'text-foreground' : 'text-muted-foreground'}>FIT Assessment</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${aiReadinessCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={aiReadinessCompleted ? 'text-foreground' : 'text-muted-foreground'}>AI Readiness</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${promptCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={promptCompleted ? 'text-foreground' : 'text-muted-foreground'}>Prompt Architecture</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <div className={`h-2 w-2 rounded-full ${aiqCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className={aiqCompleted ? 'text-foreground' : 'text-muted-foreground'}>AIQ</span>
                            </div>
                          </div>
                          
                          {/* Recommended Next Steps for incomplete assessments */}
                          {totalCompleted < 4 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Recommended Next Steps
                              </p>
                              <div className="space-y-1">
                                {!fitCompleted && (
                                  <p className="text-xs text-muted-foreground">• Complete FIT Assessment for behavioral insights</p>
                                )}
                                {!aiReadinessCompleted && (
                                  <p className="text-xs text-muted-foreground">• Complete AI Readiness for technical skills evaluation</p>
                                )}
                                {!promptCompleted && (
                                  <p className="text-xs text-muted-foreground">• Complete Prompt Architecture for real-world AI skills</p>
                                )}
                                {!aiqCompleted && (
                                  <p className="text-xs text-muted-foreground">• Complete AIQ for ethics & judgment assessment</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
                </CardContent>
              </Card>

              {/* ========== ENHANCED ANALYSIS SECTION ========== */}
              
              {/* 1. Composite Score & Ranking */}
              {comparison.hasSkillData && (
                <Card data-testid="card-composite-ranking">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Overall Ranking & Composite Score
                    </CardTitle>
                    <CardDescription>
                      Weighted composite score across all completed assessments with configurable weights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Weight Adjustment */}
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <h4 className="text-sm font-medium mb-3">Assessment Weight Distribution</h4>
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                          <div>
                            <label className="text-xs text-muted-foreground">FIT ({assessmentWeights.fit}%)</label>
                            <Slider
                              value={[assessmentWeights.fit]}
                              onValueChange={(val) => setAssessmentWeights(prev => ({ ...prev, fit: val[0] }))}
                              max={100}
                              step={5}
                              className="mt-2"
                              data-testid="slider-weight-fit"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">AI Readiness ({assessmentWeights.aiReadiness}%)</label>
                            <Slider
                              value={[assessmentWeights.aiReadiness]}
                              onValueChange={(val) => setAssessmentWeights(prev => ({ ...prev, aiReadiness: val[0] }))}
                              max={100}
                              step={5}
                              className="mt-2"
                              data-testid="slider-weight-ai"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Prompt Arch ({assessmentWeights.promptArchitecture}%)</label>
                            <Slider
                              value={[assessmentWeights.promptArchitecture]}
                              onValueChange={(val) => setAssessmentWeights(prev => ({ ...prev, promptArchitecture: val[0] }))}
                              max={100}
                              step={5}
                              className="mt-2"
                              data-testid="slider-weight-prompt"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">AIQ ({assessmentWeights.aiq}%)</label>
                            <Slider
                              value={[assessmentWeights.aiq]}
                              onValueChange={(val) => setAssessmentWeights(prev => ({ ...prev, aiq: val[0] }))}
                              max={100}
                              step={5}
                              className="mt-2"
                              data-testid="slider-weight-aiq"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Rankings */}
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                        {getRankings().map((ranking) => {
                          const candidate = selectedCandidateData?.[ranking.candidateIndex];
                          if (!candidate) return null;
                          
                          return (
                            <Card key={candidate.user.id} className={`relative overflow-visible ${ranking.rank === 1 ? 'border-2 border-primary' : ''}`}>
                              {ranking.rank === 1 && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                  <Badge className="bg-primary">Top Candidate</Badge>
                                </div>
                              )}
                              <CardContent className="pt-6 text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  {ranking.rank === 1 && <Trophy className="h-6 w-6 text-amber-500" />}
                                  {ranking.rank === 2 && <ChevronUp className="h-6 w-6 text-gray-400" />}
                                  {ranking.rank === 3 && <ChevronDown className="h-6 w-6 text-gray-500" />}
                                  <span className="text-2xl font-bold">#{ranking.rank}</span>
                                </div>
                                <p className="font-medium" style={{ color: CHART_COLORS[ranking.candidateIndex] }}>
                                  {getCandidateName(candidate)}
                                </p>
                                <div className="text-4xl font-bold mt-2" style={{ color: CHART_COLORS[ranking.candidateIndex] }}>
                                  {ranking.score}
                                </div>
                                <p className="text-sm text-muted-foreground">Composite Score</p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      {/* Score Explanation */}
                      <div className="p-4 bg-muted/30 rounded-lg border">
                        <p className="text-base font-semibold text-foreground mb-2">Understanding the Scores</p>
                        <div className="space-y-3">
                          <div>
                            <p className="text-base text-muted-foreground leading-relaxed">
                              <strong className="text-foreground">Composite Score</strong> is a weighted average across all four assessment types 
                              (FIT, AI Readiness, Prompt Architecture, and AIQ). Use the sliders above to adjust how much each assessment 
                              contributes to the final score. This allows you to prioritize assessments that matter most for your specific role requirements.
                            </p>
                          </div>
                          <div className="border-t pt-3">
                            <p className="text-base text-muted-foreground leading-relaxed">
                              <strong className="text-foreground">Why weighted scoring matters:</strong> Different roles require different skill profiles. 
                              For technical AI roles, you might weight AI Readiness and Prompt Architecture higher. For leadership positions, 
                              FIT (behavioral traits) and AIQ (ethical awareness) may be more important. The composite score lets you tailor 
                              candidate evaluation to match your organization's priorities.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 2. Role Suitability Scoring - TEMPORARILY DISABLED */}
              {false && comparison?.hasSkillData && (
                <Card data-testid="card-role-suitability" data-report-section="role-suitability">
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Role Suitability Analysis
                        </CardTitle>
                        <CardDescription>
                          See how candidates match specific AI-related roles based on weighted skill requirements
                        </CardDescription>
                      </div>
                      <Select value={selectedRole} onValueChange={setSelectedRole} data-testid="select-role">
                        <SelectTrigger className="w-full md:w-[220px]">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {dbRoles?.map((role: any) => (
                            <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {!selectedRole || !getSelectedRoleData() ? (
                        <div className="text-center py-8">
                          <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-2">No Role Selected</p>
                          <p className="text-sm text-muted-foreground">
                            Select a role from the dropdown above to see how candidates align with specific job requirements.
                          </p>
                        </div>
                      ) : !getSelectedRoleData()?.requiredSkillScores ? (
                        <div className="text-center py-8">
                          <Target className="h-12 w-12 mx-auto text-amber-500/50 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-2">Required Scores Not Generated</p>
                          <p className="text-sm text-muted-foreground">
                            This role needs required skill scores before you can analyze candidates. Go to the Role Fit tab to generate them using AI.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {getSelectedRoleData()?.description || 'Select a role to see candidate alignment'}
                          </p>
                          
                          {/* Role fit scores */}
                          <div className="grid gap-4 md:grid-cols-3">
                            {selectedCandidateData?.map((candidate: any, index: number) => {
                              const suitability = calculateRoleSuitabilityWithCoverage(index, selectedRole);
                              const performance = getPerformanceLevel(suitability.score);
                              const hasPartialData = suitability.coverage < 100;
                              
                              return (
                                <Card key={candidate.user.id} className="border" style={{ borderColor: CHART_COLORS[index] }}>
                                  <CardContent className="pt-4 text-center">
                                    <p className="font-medium mb-2" style={{ color: CHART_COLORS[index] }}>
                                      {getCandidateName(candidate)}
                                    </p>
                                    <div className="text-5xl font-bold mb-2" style={{ color: CHART_COLORS[index] }}>
                                      {suitability.score}%
                                    </div>
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                      <Badge variant={performance.variant}>{performance.label} Fit</Badge>
                                      {hasPartialData && (
                                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                                          {suitability.coverage}% Coverage
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Critical gaps warning */}
                                    {suitability.criticalGaps > 0 && (
                                      <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-left border border-red-200 dark:border-red-800">
                                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                          <AlertCircle className="inline h-3 w-3 mr-1" />
                                          {suitability.criticalGaps} of {suitability.totalCriticalSkills} critical skills below requirement
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Coverage warning */}
                                    {hasPartialData && suitability.missingSkills.length > 0 && (
                                      <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-left">
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                          <AlertCircle className="inline h-3 w-3 mr-1" />
                                          Missing: {suitability.missingSkills.slice(0, 2).join(', ')}
                                          {suitability.missingSkills.length > 2 && ` +${suitability.missingSkills.length - 2} more`}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Skill match breakdown */}
                                    <div className="mt-4 text-left">
                                      <p className="text-xs font-medium mb-2">Key Skill Match:</p>
                                      <div className="space-y-1">
                                        {Object.entries(extractSkillRequirements(getSelectedRoleData()?.requiredSkillScores)).slice(0, 4).map(([skillName, requiredScore]) => {
                                          const skills = getAllCandidateSkills(index);
                                          const score = skills[skillName];
                                          return (
                                            <div key={skillName} className="flex items-center justify-between text-xs">
                                              <span className="text-muted-foreground truncate flex-1">{skillName}</span>
                                              <span className={`ml-2 font-medium ${score !== undefined ? (score >= 70 ? 'text-green-600 dark:text-green-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400') : 'text-muted-foreground'}`}>
                                                {score !== undefined ? `${score}` : 'N/A'}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                          
                          {/* Role Suitability Explanation */}
                          {(() => {
                        const roleData = getSelectedRoleData();
                        const roleScores = selectedCandidateData?.map((candidate: any, index: number) => ({
                          name: getCandidateName(candidate),
                          score: calculateRoleSuitability(index, selectedRole),
                          index,
                          skills: getAllCandidateSkills(index),
                        })).sort((a: any, b: any) => b.score - a.score);
                        
                        if (!roleScores || roleScores.length < 2 || !roleData) return null;
                        
                        const top = roleScores[0];
                        const second = roleScores[1];
                        const roleName = roleData.name || selectedRole;
                        const roleRequirements = Object.entries(extractSkillRequirements(roleData.requiredSkillScores));
                        const topSkills = roleRequirements.slice(0, 2).map(([name]) => name);
                        
                        // Find where top candidate excels
                        const advantageSkills = roleRequirements.filter(([skillName]) => {
                          const topScore = top.skills[skillName] ?? 0;
                          const secondScore = second.skills[skillName] ?? 0;
                          return topScore > secondScore;
                        }).slice(0, 2).map(([name]) => name);
                        
                        // Get skill benefit descriptions for the role
                        const getSkillBenefit = (skillName: string): string => {
                          const benefits: Record<string, string> = {
                            'Domain Expertise': 'enables strategic guidance on industry-specific AI applications',
                            'Collaboration & Communication': 'facilitates stakeholder alignment and cross-functional team coordination',
                            'High Agency': 'drives proactive problem-solving and initiative in complex projects',
                            'AI Literacy & Prompt Engineering': 'ensures effective implementation and optimization of AI systems',
                            'Critical Thinking & Problem-Solving': 'supports analytical decision-making in ambiguous situations',
                            'Interpersonal Agility': 'enables effective navigation of diverse team dynamics',
                            'Responsible AI & Ethical Awareness': 'ensures compliance with AI governance frameworks',
                            'Growth Mindset': 'supports continuous adaptation to emerging AI technologies',
                            'Resilience': 'maintains performance under pressure and through setbacks',
                          };
                          return benefits[skillName] || 'contributes to role effectiveness';
                        };
                        
                        return (
                          <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <p className="text-base font-semibold text-foreground mb-2">
                                  Recommendation: <span style={{ color: CHART_COLORS[top.index] }}>{top.name}</span>
                                </p>
                                <p className="text-base text-muted-foreground leading-relaxed">
                                  For the <strong className="text-foreground">{roleName}</strong> role, scoring prioritizes{' '}
                                  <strong className="text-foreground">{topSkills[0]}</strong> (which {getSkillBenefit(topSkills[0])}) 
                                  and <strong className="text-foreground">{topSkills[1]}</strong> (which {getSkillBenefit(topSkills[1])}).
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-2xl font-bold" style={{ color: CHART_COLORS[top.index] }}>{top.score}%</div>
                                <div className="text-sm text-muted-foreground">vs {second.score}%</div>
                              </div>
                            </div>
                            
                            {advantageSkills.length > 0 && (
                              <p className="text-base text-muted-foreground border-t pt-3 leading-relaxed">
                                <strong className="text-foreground">Key differentiator:</strong>{' '}
                                <span style={{ color: CHART_COLORS[top.index] }} className="font-medium">{top.name}</span> demonstrates 
                                stronger performance in {advantageSkills.map((skill, i) => (
                                  <span key={skill}>
                                    <strong className="text-foreground">{skill}</strong>
                                    {i < advantageSkills.length - 1 ? ' and ' : ''}
                                  </span>
                                ))}, which {advantageSkills.length === 1 ? getSkillBenefit(advantageSkills[0]) : 'are critical competencies for this role'}.
                                This advantage translates to a {top.score - second.score} percentage point lead in overall role fit.
                              </p>
                            )}
                          </div>
                        );
                      })()}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 3. Head-to-Head Skill Breakdown Table */}
              {comparison.hasSkillData && (
                <Card data-testid="card-head-to-head" data-report-section="head-to-head">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <Scale className="h-4 w-4 md:h-5 md:w-5" />
                      Head-to-Head Comparison
                    </CardTitle>
                    <CardDescription className="text-xs md:text-sm">
                      Color-coded comparison (green = highest, red = lowest)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 md:p-6">
                    <div className="overflow-x-auto -mx-2 md:mx-0">
                      <table className="w-full border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 md:p-3 font-medium min-w-[100px] md:min-w-[150px]">Skill</th>
                            {selectedCandidateData?.map((candidate: any, index: number) => (
                              <th key={candidate.user.id} className="text-center p-2 md:p-3 font-medium min-w-[60px] md:min-w-[100px]">
                                <span style={{ color: CHART_COLORS[index] }} className="text-xs md:text-sm truncate block max-w-[60px] md:max-w-none">
                                  {getCandidateName(candidate).split(' ')[0]}
                                </span>
                              </th>
                            ))}
                            <th className="text-center p-2 md:p-3 font-medium min-w-[50px]">Avg</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* FIT Skills */}
                          {FIT_SKILLS.map((skill) => {
                            const scores = selectedCandidateData?.map((_: any, index: number) => {
                              const fitData = comparison.fitAssessments?.[index];
                              return fitData?.scores[skill.key] ?? null;
                            }) || [];
                            
                            return (
                              <tr key={skill.key} className="border-b">
                                <td className="p-2 md:p-3 font-medium">
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      <span className="text-xs md:text-sm">{skill.displayName}</span>
                                      <Badge variant="outline" className="ml-1 md:ml-2 text-[10px] md:text-xs px-1">FIT</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>{skill.description}</TooltipContent>
                                  </Tooltip>
                                </td>
                                {scores.map((score: number | null, index: number) => (
                                  <td key={index} className="p-2 md:p-3 text-center">
                                    {score !== null ? (
                                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md font-semibold text-xs md:text-sm ${getScoreColorClass(score, scores.filter((s): s is number => s !== null))}`}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="p-2 md:p-3 text-center text-xs md:text-sm">
                                  <span className="text-muted-foreground">
                                    {calculateAverage(scores)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {/* AI Readiness Skills */}
                          {AI_READINESS_SKILLS.map((skill) => {
                            const scores = selectedCandidateData?.map((_: any, index: number) => {
                              const aiData = comparison.aiReadinessAssessments?.[index];
                              return aiData?.scores[skill.key] ?? null;
                            }) || [];
                            
                            return (
                              <tr key={skill.key} className="border-b">
                                <td className="p-2 md:p-3 font-medium">
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      <span className="text-xs md:text-sm">{skill.displayName}</span>
                                      <Badge variant="outline" className="ml-1 md:ml-2 text-[10px] md:text-xs px-1">AI</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>{skill.description}</TooltipContent>
                                  </Tooltip>
                                </td>
                                {scores.map((score: number | null, index: number) => (
                                  <td key={index} className="p-2 md:p-3 text-center">
                                    {score !== null ? (
                                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md font-semibold text-xs md:text-sm ${getScoreColorClass(score, scores.filter((s): s is number => s !== null))}`}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="p-2 md:p-3 text-center text-xs md:text-sm">
                                  <span className="text-muted-foreground">
                                    {calculateAverage(scores)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {/* Prompt Architecture Total */}
                          {comparison.promptArchitectureAssessments?.some(a => a !== null) && (() => {
                            const scores = selectedCandidateData?.map((_: any, index: number) => {
                              const promptData = comparison.promptArchitectureAssessments?.[index];
                              return promptData?.totalScore ?? null;
                            }) || [];
                            
                            return (
                              <tr key="prompt-arch" className="border-b bg-muted/20">
                                <td className="p-2 md:p-3 font-medium">
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      <span className="text-xs md:text-sm">Prompt Arch</span>
                                      <Badge variant="outline" className="ml-1 md:ml-2 text-[10px] md:text-xs px-1">PA</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Total score across all prompt engineering dimensions and levels</TooltipContent>
                                  </Tooltip>
                                </td>
                                {scores.map((score: number | null, index: number) => (
                                  <td key={index} className="p-2 md:p-3 text-center">
                                    {score !== null ? (
                                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md font-semibold text-xs md:text-sm ${getScoreColorClass(score, scores.filter((s): s is number => s !== null))}`}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="p-2 md:p-3 text-center text-xs md:text-sm">
                                  <span className="text-muted-foreground">
                                    {calculateAverage(scores)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })()}
                          {/* AIQ Total */}
                          {comparison.aiqAssessments?.some(a => a !== null) && (() => {
                            const scores = selectedCandidateData?.map((_: any, index: number) => {
                              const aiqData = comparison.aiqAssessments?.[index];
                              return aiqData?.totalScore ?? null;
                            }) || [];
                            
                            return (
                              <tr key="aiq" className="border-b bg-muted/20">
                                <td className="p-2 md:p-3 font-medium">
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      <span className="text-xs md:text-sm">AIQ</span>
                                      <Badge variant="outline" className="ml-1 md:ml-2 text-[10px] md:text-xs px-1">AIQ</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Single integrated score measuring ethical reasoning in AI-related scenarios</TooltipContent>
                                  </Tooltip>
                                </td>
                                {scores.map((score: number | null, index: number) => (
                                  <td key={index} className="p-2 md:p-3 text-center">
                                    {score !== null ? (
                                      <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-md font-semibold text-xs md:text-sm ${getScoreColorClass(score, scores.filter((s): s is number => s !== null))}`}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="p-2 md:p-3 text-center text-xs md:text-sm">
                                  <span className="text-muted-foreground">
                                    {calculateAverage(scores)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 4. Strengths & Weaknesses Summary - Clean horizontal bar design */}
              {comparison.hasSkillData && (
                <Card data-testid="card-strengths-weaknesses" data-report-section="strengths-weaknesses">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Strengths & Development Areas
                    </CardTitle>
                    <CardDescription>
                      Top 3 strongest skills and areas needing development for each candidate
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                      {selectedCandidateData?.map((candidate: any, index: number) => {
                        const { strengths, weaknesses } = getStrengthsAndWeaknesses(index);
                        
                        return (
                          <div key={candidate.user.id} className="space-y-6">
                            {/* Candidate Name Header */}
                            <h3 className="text-lg font-semibold pb-2 border-b-2" style={{ color: CHART_COLORS[index], borderColor: CHART_COLORS[index] }}>
                              {getCandidateName(candidate)}
                            </h3>
                            
                            {/* Strengths Section */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Top Strengths</span>
                              </div>
                              <div className="space-y-4">
                                {strengths.map((s) => (
                                  <div key={s.name} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm text-foreground truncate flex-1">{s.name}</span>
                                      <span className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">{s.score}%</span>
                                    </div>
                                    <div className="h-3 bg-green-100 dark:bg-green-900/30 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500" 
                                        style={{ width: `${s.score}%` }} 
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Development Areas Section */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Development Areas</span>
                              </div>
                              <div className="space-y-4">
                                {weaknesses.map((w) => (
                                  <div key={w.name} className="space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-sm text-foreground truncate flex-1">{w.name}</span>
                                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">{w.score}%</span>
                                    </div>
                                    <div className="h-3 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500" 
                                        style={{ width: `${w.score}%` }} 
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ========== END ENHANCED ANALYSIS SECTION ========== */}

              {/* FIT Assessment Comparison */}
              {comparison.fitAssessments?.some(a => a !== null) && (
                <Card data-report-section="fit-assessment">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      FIT Assessment Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Behavioral skills assessment (6 core competencies)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {/* Overlapping Radar Chart */}
                      <div>
                        <h3 className="font-semibold mb-4">Combined Comparison</h3>
                        <div id="pdf-comparison-fit-overlapping" className="bg-white p-4 rounded-lg">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart layout="vertical" margin={{ top: 5, right: 55, left: 10, bottom: 5 }} barCategoryGap="30%" barGap={2} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} data={(() => {
                              return FIT_SKILLS.map(skill => {
                                const dataPoint: any = { skill: getSkillAcronym(skill.displayName) };
                                selectedCandidateData?.forEach((candidate: any, index: number) => {
                                  const fitData = comparison.fitAssessments?.[index];
                                  if (fitData) {
                                    dataPoint[candidate.user.id] = fitData.scores[skill.key] || 0;
                                  }
                                });
                                return dataPoint;
                              });
                            })()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                              <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                              <RechartsTooltip />
                              {selectedCandidateData?.map((candidate: any, index: number) => {
                                if (!comparison.fitAssessments?.[index]) return null;
                                return (
                                  <Bar
                                    key={candidate.user.id}
                                    name={getCandidateName(candidate)}
                                    dataKey={candidate.user.id}
                                    radius={[0, 4, 4, 0]}
                                    barSize={12}
                                    isAnimationActive={!isCapturingPDF}
                                  >
                                    {FIT_SKILLS.map((skill, i) => (
                                      <Cell
                                        key={`cell-${i}`}
                                        fill={hoveredSkill === getSkillAcronym(skill.displayName) ? (isCapturingPDF ? PDF_CHART_COLORS[index] : MULTI_CANDIDATE_COLORS[index % MULTI_CANDIDATE_COLORS.length]) : '#C8CDD3'}
                                        style={{ transition: 'fill 0.2s ease' }}
                                      />
                                    ))}
                                  </Bar>
                                );
                              })}
                              <Legend
                                formatter={(value: string, entry: any, index: number) => (
                                  <span style={{ color: MULTI_CANDIDATE_COLORS[index % MULTI_CANDIDATE_COLORS.length] }}>{value}</span>
                                )}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-muted-foreground text-center mt-1">Hover over a skill to highlight comparison</p>
                        </div>
                      </div>

                      {/* Individual Charts */}
                      <div>
                        <h3 className="font-semibold mb-4">Individual Assessments</h3>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {selectedCandidateData?.map((candidate: any, index: number) => {
                            const fitData = comparison.fitAssessments?.[index];
                            
                            if (!fitData) {
                              return (
                                <div key={candidate.user.id} className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
                                  <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
                                  <p className="text-sm font-medium">{getCandidateName(candidate)}</p>
                                  <Badge variant="outline" className="mt-2">Not Completed</Badge>
                                </div>
                              );
                            }

                            const radarData = FIT_SKILLS.map(skill => ({
                              skill: getSkillAcronym(skill.displayName),
                              score: fitData.scores[skill.key] || 0,
                            }));

                            return (
                              <div key={candidate.user.id} className="space-y-4">
                                <div className="text-center">
                                  <p className="font-medium" style={{ color: CHART_COLORS[index] }}>
                                    {getCandidateName(candidate)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Completed {new Date(fitData.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div id={`pdf-comparison-fit-${index}`} className="bg-white p-4 rounded-lg">
                                  <ResponsiveContainer width="100%" height={220}>
                                    <BarChart layout="vertical" margin={{ top: 5, right: 55, left: 10, bottom: 5 }} barCategoryGap="28%" data={radarData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                      <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                      <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                                      <RechartsTooltip />
                                      <Bar
                                        dataKey="score"
                                        fill="#5B8DB8"
                                        radius={[0, 4, 4, 0]}
                                        barSize={18}
                                        isAnimationActive={!isCapturingPDF}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Readiness Comparison */}
              {comparison.aiReadinessAssessments?.some(a => a !== null) && (
                <Card data-report-section="ai-readiness">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Readiness Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Technical AI capabilities assessment (9 skills)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {/* Overlapping Radar Chart */}
                      <div>
                        <h3 className="font-semibold mb-4">Combined Comparison</h3>
                        <div id="pdf-comparison-ai-overlapping" className="bg-white p-4 rounded-lg">
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart layout="vertical" margin={{ top: 5, right: 55, left: 10, bottom: 5 }} barCategoryGap="30%" barGap={2} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} data={(() => {
                              return AI_READINESS_SKILLS.map(skill => {
                                const dataPoint: any = { skill: getSkillAcronym(skill.displayName) };
                                selectedCandidateData?.forEach((candidate: any, index: number) => {
                                  const aiData = comparison.aiReadinessAssessments?.[index];
                                  if (aiData) {
                                    dataPoint[candidate.user.id] = aiData.scores[skill.key] || 0;
                                  }
                                });
                                return dataPoint;
                              });
                            })()}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                              <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                              <RechartsTooltip />
                              {selectedCandidateData?.map((candidate: any, index: number) => {
                                if (!comparison.aiReadinessAssessments?.[index]) return null;
                                return (
                                  <Bar
                                    key={candidate.user.id}
                                    name={getCandidateName(candidate)}
                                    dataKey={candidate.user.id}
                                    radius={[0, 4, 4, 0]}
                                    barSize={12}
                                    isAnimationActive={!isCapturingPDF}
                                  >
                                    {AI_READINESS_SKILLS.map((skill, i) => (
                                      <Cell
                                        key={`cell-${i}`}
                                        fill={hoveredSkill === getSkillAcronym(skill.displayName) ? (isCapturingPDF ? PDF_CHART_COLORS[index] : MULTI_CANDIDATE_COLORS[index % MULTI_CANDIDATE_COLORS.length]) : '#C8CDD3'}
                                        style={{ transition: 'fill 0.2s ease' }}
                                      />
                                    ))}
                                  </Bar>
                                );
                              })}
                              <Legend
                                formatter={(value: string, entry: any, index: number) => (
                                  <span style={{ color: MULTI_CANDIDATE_COLORS[index % MULTI_CANDIDATE_COLORS.length] }}>{value}</span>
                                )}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-muted-foreground text-center mt-1">Hover over a skill to highlight comparison</p>
                        </div>
                      </div>

                      {/* Individual Charts */}
                      <div>
                        <h3 className="font-semibold mb-4">Individual Assessments</h3>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {selectedCandidateData?.map((candidate: any, index: number) => {
                            const aiReadinessData = comparison.aiReadinessAssessments?.[index];
                            
                            if (!aiReadinessData) {
                              return (
                                <div key={candidate.user.id} className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
                                  <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
                                  <p className="text-sm font-medium">{getCandidateName(candidate)}</p>
                                  <Badge variant="outline" className="mt-2">Not Completed</Badge>
                                </div>
                              );
                            }

                            const radarData = AI_READINESS_SKILLS.map(skill => ({
                              skill: getSkillAcronym(skill.displayName),
                              score: aiReadinessData.scores[skill.key] || 0,
                            }));

                            return (
                              <div key={candidate.user.id} className="space-y-4">
                                <div className="text-center">
                                  <p className="font-medium" style={{ color: CHART_COLORS[index] }}>
                                    {getCandidateName(candidate)}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Completed {new Date(aiReadinessData.completedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div id={`pdf-comparison-ai-${index}`} className="bg-white p-4 rounded-lg">
                                  <ResponsiveContainer width="100%" height={220}>
                                    <BarChart layout="vertical" margin={{ top: 5, right: 55, left: 10, bottom: 5 }} barCategoryGap="28%" data={radarData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                      <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                                      <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                                      <RechartsTooltip />
                                      <Bar
                                        dataKey="score"
                                        fill="#5B8DB8"
                                        radius={[0, 4, 4, 0]}
                                        barSize={18}
                                        isAnimationActive={!isCapturingPDF}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prompt Architecture Comparison */}
              {comparison.promptArchitectureAssessments?.some(a => a !== null) && (
                <Card data-report-section="prompt-architecture">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Prompt Architecture Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Progressive difficulty levels (1-7) with dimensional scoring
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Level</th>
                            <th className="text-left p-3 font-medium">Dimension</th>
                            {selectedCandidateData?.map((candidate: any, index: number) => (
                              <th key={candidate.user.id} className="text-left p-3 font-medium">
                                <span style={{ color: CHART_COLORS[index] }}>
                                  {getCandidateName(candidate)}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 2, 3, 4, 5, 6, 7].map((level) => {
                            const dimensions = ['clarity', 'structure', 'contextRelevance', 'creativity', 'iterativeImprovement'];
                            const dimensionLabels = {
                              clarity: 'Clarity',
                              structure: 'Structure',
                              contextRelevance: 'Context Relevance',
                              creativity: 'Creativity',
                              iterativeImprovement: 'Iterative Improvement',
                            };

                            return dimensions.map((dimension, dimIndex) => (
                              <tr key={`${level}-${dimension}`} className={dimIndex === 0 ? 'border-t-2' : 'border-t'}>
                                {dimIndex === 0 && (
                                  <td className="p-3 font-semibold align-top" rowSpan={5}>
                                    Level {level}
                                  </td>
                                )}
                                <td className="p-3 text-sm">{dimensionLabels[dimension as keyof typeof dimensionLabels]}</td>
                                {selectedCandidateData?.map((candidate: any, candIndex: number) => {
                                  const promptData = comparison.promptArchitectureAssessments?.[candIndex];
                                  
                                  if (!promptData) {
                                    return (
                                      <td key={candidate.user.id} className="p-3">
                                        {dimIndex === 2 && <Badge variant="outline">Not Completed</Badge>}
                                      </td>
                                    );
                                  }

                                  const levelData = promptData.levels.find(l => l.level === level);
                                  const score = levelData?.scores?.[dimension as keyof typeof levelData.scores];

                                  return (
                                    <td key={candidate.user.id} className="p-3">
                                      {score !== undefined ? (
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold">{score}/20</span>
                                          <div 
                                            className="h-2 rounded-full bg-primary/20"
                                            style={{ width: '60px' }}
                                          >
                                            <div
                                              className="h-full rounded-full bg-primary"
                                              style={{ width: `${(score / 20) * 100}%` }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })}
                          <tr className="border-t-2 font-semibold bg-muted/30">
                            <td className="p-3" colSpan={2}>Total Score</td>
                            {selectedCandidateData?.map((candidate: any, index: number) => {
                              const promptData = comparison.promptArchitectureAssessments?.[index];
                              return (
                                <td key={candidate.user.id} className="p-3">
                                  {promptData ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg text-primary">{promptData.totalScore}/100</span>
                                      {promptData.percentile && (
                                        <Badge variant="secondary">{promptData.percentile}th percentile</Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AIQ Comparison */}
              {comparison.aiqAssessments?.some(a => a !== null) && (
                <Card data-report-section="aiq-assessment">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Algorithmic Integrity Quotient (AIQ) Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Comprehensive AI ethics, bias, fairness, and responsibility assessment
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {selectedCandidateData?.map((candidate: any, index: number) => {
                        const aiqData = comparison.aiqAssessments?.[index];
                        
                        if (!aiqData) {
                          return (
                            <div key={candidate.user.id} className="flex flex-col items-center justify-center p-8 border rounded-lg bg-muted/20">
                              <AlertCircle className="h-8 w-8 mb-2 text-muted-foreground opacity-50" />
                              <p className="text-sm font-medium">{getCandidateName(candidate)}</p>
                              <Badge variant="outline" className="mt-2">Not Completed</Badge>
                            </div>
                          );
                        }

                        const performance = getPerformanceLevel(aiqData.totalScore);

                        return (
                          <Card key={candidate.user.id} className="border-2" style={{ borderColor: CHART_COLORS[index] }}>
                            <CardHeader className="text-center pb-2">
                              <p className="font-medium" style={{ color: CHART_COLORS[index] }}>
                                {getCandidateName(candidate)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Completed {new Date(aiqData.completedAt).toLocaleDateString()}
                              </p>
                            </CardHeader>
                            <CardContent className="text-center">
                              <div className="py-6">
                                <div className="text-6xl font-bold mb-2" style={{ color: CHART_COLORS[index] }}>
                                  {aiqData.totalScore}
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">out of 100</p>
                                <Badge variant={performance.variant} className="text-sm px-4 py-1">
                                  {performance.label}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    
                    {/* AIQ Comparison Explanation */}
                    {(() => {
                      const aiqScores = selectedCandidateData?.map((candidate: any, index: number) => ({
                        name: getCandidateName(candidate),
                        score: comparison.aiqAssessments?.[index]?.totalScore ?? null,
                        index,
                      })).filter((c: any) => c.score !== null).sort((a: any, b: any) => b.score - a.score) as Array<{name: string; score: number; index: number}>;
                      
                      if (!aiqScores || aiqScores.length < 2) return null;
                      
                      const top = aiqScores[0];
                      const second = aiqScores[1];
                      const diff = top.score - second.score;
                      
                      return (
                        <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                          <p className="text-base text-muted-foreground leading-relaxed">
                            <strong className="text-foreground">AIQ Analysis:</strong>{' '}
                            <span style={{ color: CHART_COLORS[top.index] }} className="font-medium">{top.name}</span> demonstrates 
                            {top.score >= 80 ? ' exceptional' : top.score >= 70 ? ' strong' : top.score >= 60 ? ' adequate' : ' developing'} 
                            {' '}understanding of AI ethics and algorithmic fairness with a score of {top.score}/100.
                            {diff > 0 && (
                              <> This is {diff} points higher than{' '}
                              <span style={{ color: CHART_COLORS[second.index] }} className="font-medium">{second.name}</span> ({second.score}/100).
                              </>
                            )}
                            {diff === 0 && (
                              <> Both candidates scored equally at {top.score}/100, showing comparable ethical AI understanding.</>
                            )}
                            {' '}Higher AIQ scores indicate better preparedness for responsible AI governance and decision-making in AI-driven environments.
                          </p>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Overall Skill Comparison */}
              {comparison.hasSkillData && (
                <Card data-report-section="overall-skills">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Overall Skills Comparison
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Combined view of all skill-based assessments
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-8">
                      {/* Skills Radar Chart */}
                      {comparison.radarData && comparison.radarData.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-4">All Skills Combined</h3>
                          <div id="pdf-comparison-overall-skills" className="bg-white p-4 md:p-6 rounded-lg overflow-visible">
                          <ResponsiveContainer width="100%" height={400} className="min-h-[320px] md:min-h-[400px]">
                            <BarChart layout="vertical" margin={{ top: 5, right: 55, left: 10, bottom: 5 }} barCategoryGap="30%" barGap={2} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} data={comparison.radarData.map(item => ({
                              ...item,
                              skill: getSkillAcronym(item.skill)
                            }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                              <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                              <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                              <RechartsTooltip />
                              {selectedCandidateData?.map((candidate: any, index: number) => (
                                <Bar
                                  key={candidate.user.id}
                                  name={getCandidateName(candidate)}
                                  dataKey={`candidate${index}`}
                                  radius={[0, 4, 4, 0]}
                                  barSize={12}
                                  isAnimationActive={!isCapturingPDF}
                                >
                                  {comparison.radarData.map((item: any, i: number) => (
                                    <Cell
                                      key={`cell-${i}`}
                                      fill={hoveredSkill === getSkillAcronym(item.skill) ? (isCapturingPDF ? PDF_CHART_COLORS[index] : MULTI_CANDIDATE_COLORS[index % MULTI_CANDIDATE_COLORS.length]) : '#C8CDD3'}
                                      style={{ transition: 'fill 0.2s ease' }}
                                    />
                                  ))}
                                </Bar>
                              ))}
                              <Legend
                                formatter={(value: string, entry: any, index: number) => (
                                  <span style={{ color: MULTI_CANDIDATE_COLORS[index % MULTI_CANDIDATE_COLORS.length] }}>{value}</span>
                                )}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-xs text-muted-foreground text-center mt-1">Hover over a skill to highlight comparison</p>
                          </div>
                        </div>
                      )}

                      {/* AI-Generated Comparison Write-up - only show when a role is selected */}
                      {selectedRole && getSelectedRoleData() && (
                      <div className="bg-muted/30 p-6 rounded-lg border" data-testid="comparison-writeup">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">Comparison Summary for {getSelectedRoleData()?.name}</h3>
                        </div>
                        
                        <div className="space-y-4 text-sm text-muted-foreground">
                          {selectedCandidateData && (() => {
                            // Fixed 25% equal weights for consistency with PDF export
                            const calculateFixedComposite = (candIndex: number): number => {
                              if (!comparison) return 0;
                              const assessmentData: Array<{ score: number; weight: number }> = [];
                              const equalWeight = 25;
                              
                              const fitData = comparison.fitAssessments?.[candIndex];
                              if (fitData) {
                                const fitScores = Object.values(fitData.scores);
                                if (fitScores.length > 0) {
                                  const fitAvg = fitScores.reduce((a, b) => a + b, 0) / fitScores.length;
                                  assessmentData.push({ score: fitAvg, weight: equalWeight });
                                }
                              }
                              
                              const aiData = comparison.aiReadinessAssessments?.[candIndex];
                              if (aiData) {
                                const aiScores = Object.values(aiData.scores);
                                if (aiScores.length > 0) {
                                  const aiAvg = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
                                  assessmentData.push({ score: aiAvg, weight: equalWeight });
                                }
                              }
                              
                              const promptData = comparison.promptArchitectureAssessments?.[candIndex];
                              if (promptData) assessmentData.push({ score: promptData.totalScore, weight: equalWeight });
                              
                              const aiqData = comparison.aiqAssessments?.[candIndex];
                              if (aiqData) assessmentData.push({ score: aiqData.totalScore, weight: equalWeight });
                              
                              if (assessmentData.length === 0) return 0;
                              const totalWeight = assessmentData.reduce((sum, d) => sum + d.weight, 0);
                              if (totalWeight === 0) return 0;
                              const weightedSum = assessmentData.reduce((sum, d) => sum + d.score * d.weight, 0);
                              return Math.round(weightedSum / totalWeight);
                            };
                            
                            const currentRole = selectedRole;
                            const currentRoleData = getSelectedRoleData();
                            const currentRoleName = currentRoleData?.name || 'Selected Role';
                            
                            const rankedCandidates = selectedCandidateData.map((candidate: any, index: number) => ({
                              name: getCandidateName(candidate),
                              index,
                              compositeScore: calculateFixedComposite(index),
                              roleFit: calculateRoleSuitability(index, currentRole),
                              strengths: getStrengthsAndWeaknesses(index).strengths,
                              weaknesses: getStrengthsAndWeaknesses(index).weaknesses,
                            })).sort((a, b) => b.roleFit - a.roleFit);
                            
                            const topCandidate = rankedCandidates[0];
                            const otherCandidates = rankedCandidates.slice(1);
                            
                            return (
                              <>
                                <p>
                                  <strong>Overview:</strong> For the {currentRoleName} role, 
                                  <span className="text-foreground font-medium"> {topCandidate.name}</span> emerges as the 
                                  strongest candidate with a role fit score of <span className="text-primary font-semibold">{topCandidate.roleFit}%</span>. 
                                  This assessment is based on weighted skill alignment to the role requirements.
                                </p>
                                
                                <p>
                                  <strong>Top Candidate Analysis - {topCandidate.name}:</strong> Excels in{' '}
                                  {topCandidate.strengths.slice(0, 2).map(s => s.name).join(' and ')}, 
                                  which are critical for advising organizations on AI adoption. 
                                  {topCandidate.weaknesses.length > 0 && (
                                    <> Development areas include {topCandidate.weaknesses[0].name} ({topCandidate.weaknesses[0].score}/100), 
                                    which may require mentoring or targeted training.</>
                                  )}
                                </p>
                                
                                {otherCandidates.map((candidate) => (
                                  <p key={candidate.index}>
                                    <strong>{candidate.name}:</strong> Achieved a role fit of{' '}
                                    <span className="font-medium">{candidate.roleFit}%</span>.
                                    {candidate.roleFit >= 70 ? (
                                      <> Shows solid alignment with the {currentRoleName} requirements, 
                                      particularly in {candidate.strengths[0]?.name || 'key competencies'}.</>
                                    ) : candidate.roleFit >= 60 ? (
                                      <> Demonstrates potential but may need development in key areas 
                                      such as {candidate.weaknesses[0]?.name || 'certain competencies'} to fully meet role requirements.</>
                                    ) : (
                                      <> May require additional training or experience to align with role expectations. 
                                      Consider for junior or supporting roles initially.</>
                                    )}
                                  </p>
                                ))}
                                
                                <p className="pt-2 border-t">
                                  <strong>Recommendation:</strong> Based on the comprehensive analysis,{' '}
                                  <span className="text-foreground font-medium">{topCandidate.name}</span> is 
                                  recommended as the primary candidate for the {currentRoleName} role.
                                  {otherCandidates.filter(c => c.roleFit >= 70).length > 0 && (
                                    <> {otherCandidates.filter(c => c.roleFit >= 70).map(c => c.name).join(' and ')} would 
                                    also be suitable {otherCandidates.filter(c => c.roleFit >= 70).length > 1 ? 'alternatives' : 'alternative'} 
                                    depending on team dynamics and specific project needs.</>
                                  )}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      )}

                    </div>
                  </CardContent>
                </Card>
              )}
              </div>
              {/* End of Report Container */}

              {/* Comparison Insights and Hiring Recommendation - AI-powered section */}
              {config.insightsEndpoint && (
              <Card className="bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20" data-testid="card-ai-insights">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Comparison Insights and Hiring Recommendation
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-generated analysis and recommendations based on comprehensive assessment data
                  </p>
                </CardHeader>
                <CardContent>
                  {!comparison?.aiInsights && !comparison?.hasSkillData && 
                   !comparison?.fitAssessments?.some(a => a !== null) &&
                   !comparison?.aiReadinessAssessments?.some(a => a !== null) &&
                   !comparison?.promptArchitectureAssessments?.some(a => a !== null) &&
                   !comparison?.aiqAssessments?.some(a => a !== null) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                      <p className="text-sm">No assessment data available for insights generation.</p>
                      <p className="text-xs mt-2">Complete assessments to enable AI-powered analysis.</p>
                    </div>
                  ) : comparison?.aiInsights ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-ai-insights">
                      {comparison.aiInsights.split('\n\n').map((paragraph, idx) => {
                        const headingMatch = paragraph.match(/^\*\*(.+?)\*\*/);
                        if (headingMatch) {
                          const heading = headingMatch[1];
                          const content = paragraph.replace(/^\*\*.+?\*\*\n?/, '').trim();
                          return (
                            <div key={idx} className="mb-4">
                              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-purple-500" />
                                {heading}
                              </h4>
                              {content && <p className="text-muted-foreground text-sm leading-relaxed">{content}</p>}
                            </div>
                          );
                        }
                        return (
                          <p key={idx} className="text-muted-foreground text-sm leading-relaxed mb-3">{paragraph}</p>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-purple-500/30" />
                      <p className="text-sm">AI insights could not be generated for this comparison.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              )}

              {/* Additional Services On Request */}
              <Card className="border-primary/20 bg-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5 text-white" />
                    Additional Services on Request
                  </CardTitle>
                  <p className="text-sm text-white/80">
                    Contact our team to unlock these premium insights for your hiring decisions
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                        <MessageSquare className="h-4 w-4 text-white" />
                        Suggested Interview Questions
                      </h4>
                      <p className="text-sm text-white/70">
                        AI-generated questions based on candidates' assessment results and skill gaps
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                        <Users className="h-4 w-4 text-white" />
                        Team Composition Fit
                      </h4>
                      <p className="text-sm text-white/70">
                        Analysis of how candidates would complement your existing team dynamics
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                        <Clock className="h-4 w-4 text-white" />
                        Time to Productivity Estimate
                      </h4>
                      <p className="text-sm text-white/70">
                        Projected onboarding timeline based on skill readiness and learning agility
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                        <ShieldAlert className="h-4 w-4 text-white" />
                        Hiring Risk Analysis
                      </h4>
                      <p className="text-sm text-white/70">
                        Comprehensive risk assessment highlighting potential challenges and mitigations
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                        <DollarSign className="h-4 w-4 text-white" />
                        Development Investment Cost
                      </h4>
                      <p className="text-sm text-white/70">
                        Estimated training and development investment to close identified skill gaps
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-white/10 border border-white/20">
                      <Badge className="bg-amber-500 text-white border-amber-600 text-xs mb-2">Coming Soon</Badge>
                      <h4 className="font-medium flex items-center gap-2 mb-2 text-white">
                        <TrendingUp className="h-4 w-4 text-white" />
                        Cohort Benchmarking
                      </h4>
                      <p className="text-sm text-white/70">
                        Compare candidate performance against industry benchmarks and similar cohorts
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <Button 
                      variant="outline" 
                      className="border-white text-white hover:bg-white/20"
                      onClick={() => setShowEnquiryModal(true)}
                      data-testid="button-contact-team-comparison"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Speak to the Team
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Legend */}
              <SkillsLegend />


              {!comparison.hasSkillData && (
                <Card>
                  <CardContent className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Skill-Based Assessments</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      The selected candidates have not completed any skill-based assessments (FIT, AI Readiness, or AIQ). 
                      Skill comparisons require at least one candidate to have completed a skill-based assessment.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </>
      )}

      {selectedCandidates.length === 1 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Select at least one more candidate to compare
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bottom Export and Back to Top buttons */}
      {comparison && selectedCandidates.length >= 2 && comparisonTriggered && (
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="default"
            size="lg"
            onClick={handleExportPDF}
            disabled={isComparing}
            className="gap-2"
            data-testid="button-export-comparison-bottom"
          >
            {isComparing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Please Wait...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Export as PDF
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="gap-2 text-white border-white/50 hover:bg-white/10"
            data-testid="button-back-to-top-compare-bottom"
          >
            <ChevronUp className="h-5 w-5" />
            Back to Top
          </Button>
        </div>
      )}

      {/* Hidden radar charts for PDF export */}
      {comparison && selectedCandidates.length >= 2 && comparisonTriggered && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          {/* FIT radar charts */}
          {comparison.fitAssessments?.map((fitData, index) => {
            if (!fitData) return null;
            
            const radarData = FIT_SKILLS.map(skill => ({
              skill: getSkillAcronym(skill.displayName),
              score: fitData.scores[skill.key] || 0,
            }));

            return (
              <div 
                key={`fit-${index}`}
                id={`pdf-comparison-fit-${index}`}
                style={{ width: '560px', height: '420px', backgroundColor: 'white', padding: '32px' }}
              >
                <h3 style={{ textAlign: 'center', marginBottom: '10px', color: CHART_COLORS[index] }}>
                  {getCandidateName(selectedCandidateData?.[index])} - FIT
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart layout="vertical" margin={{ top: 5, right: 55, left: 10, bottom: 5 }} data={radarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                    <RechartsTooltip />
                    <Bar
                      dataKey="score"
                      fill="#5B8DB8"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })}

          {/* AI Readiness radar charts */}
          {comparison.aiReadinessAssessments?.map((aiData, index) => {
            if (!aiData) return null;
            
            const radarData = AI_READINESS_SKILLS.map(skill => ({
              skill: getSkillAcronym(skill.displayName),
              score: aiData.scores[skill.key] || 0,
            }));

            return (
              <div 
                key={`ai-${index}`}
                id={`pdf-comparison-ai-${index}`}
                style={{ width: '560px', height: '420px', backgroundColor: 'white', padding: '32px' }}
              >
                <h3 style={{ textAlign: 'center', marginBottom: '10px', color: CHART_COLORS[index] }}>
                  {getCandidateName(selectedCandidateData?.[index])} - AI Readiness
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart layout="vertical" margin={{ top: 5, right: 55, left: 10, bottom: 5 }} data={radarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                    <RechartsTooltip />
                    <Bar
                      dataKey="score"
                      fill="#5B8DB8"
                      radius={[0, 4, 4, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            );
          })}

          {/* Overall Skills Comparison chart - hidden for PDF capture */}
          {comparison.radarData && comparison.radarData.length > 0 && (
            <div 
              id="pdf-comparison-overall-skills-hidden"
              style={{ width: '1000px', height: '750px', backgroundColor: 'white', padding: '20px 40px 40px 40px' }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical"
                  data={comparison.radarData} 
                  margin={{ top: 5, right: 55, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <YAxis type="category" dataKey="skill" width={120} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                  <RechartsTooltip />
                  {selectedCandidateData?.map((candidate: any, index: number) => (
                    <Bar
                      key={candidate.user.id}
                      name={getCandidateName(candidate)}
                      dataKey={`candidate${index}`}
                      fill={MULTI_CANDIDATE_COLORS[index % MULTI_CANDIDATE_COLORS.length]}
                      radius={[0, 4, 4, 0]}
                      barSize={12}
                    />
                  ))}
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <EnquiryModal 
        open={showEnquiryModal} 
        onOpenChange={setShowEnquiryModal}
        context="Comparison Report - Enterprise Services"
      />
    </div>
  );
}

import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Users, BarChart3, AlertCircle, Download, Award, Brain, Target, Sparkles, TrendingUp, TrendingDown, Trophy, AlertTriangle, Minus, ChevronUp, ChevronDown, Scale, FileText, Camera } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { exportComparisonPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { FIT_SKILLS, AI_READINESS_SKILLS, getSkillAcronym } from "@/lib/assessmentSkills";
import logoUrl from "@assets/logo_HumanMetrix_big_1766783080540.png";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))",
];

// Concrete colors for PDF export (CSS variables don't work in html2canvas)
const PDF_CHART_COLORS = [
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#f59e0b", // Amber
];

// Role definitions with skill weightings for suitability scoring
// Uses the same keys as FIT_SKILLS and AI_READINESS_SKILLS
import { ROLE_DEFINITIONS } from '@/lib/assessmentSkills';

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

// Custom label renderer to position scores inside the radar shape
const renderInsideLabel = (props: any) => {
  const { cx, cy, x, y, value } = props;
  // Calculate position 80% from center to edge (inside the shape)
  const insideX = cx + (x - cx) * 0.8;
  const insideY = cy + (y - cy) * 0.8;
  
  return (
    <text
      x={insideX}
      y={insideY}
      fill="#374151"
      fontSize={10}
      fontWeight="bold"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
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
}

export default function CompareTab() {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [assessmentWeights, setAssessmentWeights] = useState({
    fit: 25,
    aiReadiness: 25,
    promptArchitecture: 25,
    aiq: 25,
  });
  const [isCapturingPDF, setIsCapturingPDF] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: candidates, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/candidates'],
  });

  const { data: comparison, isLoading: isComparing } = useQuery<ComparisonData>({
    queryKey: ['compare', selectedCandidates],
    queryFn: async () => {
      const params = new URLSearchParams();
      selectedCandidates.forEach(id => params.append('userIds', id));
      const response = await fetch(`/api/admin/compare?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch comparison');
      return response.json();
    },
    enabled: selectedCandidates.length >= 2,
  });

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

      // Capture Overall Skills chart
      let overallSkillsChartImage: string | null = null;
      if (comparison.hasSkillData) {
        try {
          const element = document.getElementById('pdf-comparison-overall-skills');
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
        const relativeTop = rect.top - containerRect.top + reportElement.scrollTop;
        const relativeBottom = rect.bottom - containerRect.top + reportElement.scrollTop;
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
    
    // Add Prompt Architecture total score as a single skill
    const promptData = comparison.promptArchitectureAssessments?.[candidateIndex];
    if (promptData) {
      skills['Prompt Architecture'] = promptData.totalScore;
    }
    
    // Add AIQ total score as a single skill
    const aiqData = comparison.aiqAssessments?.[candidateIndex];
    if (aiqData) {
      skills['AIQ (Ethics & Fairness)'] = aiqData.totalScore;
    }
    
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

  // Helper: Calculate role suitability score
  const calculateRoleSuitability = (candidateIndex: number, roleKey: string): number => {
    const role = ROLE_DEFINITIONS[roleKey];
    if (!role) return 0;
    
    const skills = getAllCandidateSkills(candidateIndex);
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(role.weights).forEach(([skillName, weight]) => {
      const score = skills[skillName];
      if (score !== undefined) {
        weightedSum += score * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
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

  // Helper: Get risk indicators for a candidate
  const getRiskIndicators = (candidateIndex: number): Array<{ type: 'low_score' | 'high_variance' | 'missing_assessment'; message: string; severity: 'warning' | 'error' }> => {
    const risks: Array<{ type: 'low_score' | 'high_variance' | 'missing_assessment'; message: string; severity: 'warning' | 'error' }> = [];
    
    if (!comparison) return risks;
    
    // Check for low scores
    const skills = getAllCandidateSkills(candidateIndex);
    Object.entries(skills).forEach(([name, score]) => {
      if (score < 50) {
        risks.push({
          type: 'low_score',
          message: `${name}: ${score}/100 (below threshold)`,
          severity: score < 40 ? 'error' : 'warning',
        });
      }
    });
    
    // Check for high variance (unusual patterns)
    const skillScores = Object.values(skills);
    if (skillScores.length > 1) {
      const avg = skillScores.reduce((a, b) => a + b, 0) / skillScores.length;
      const variance = skillScores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / skillScores.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev > 20) {
        risks.push({
          type: 'high_variance',
          message: `High skill variance (±${Math.round(stdDev)} points) - inconsistent profile`,
          severity: 'warning',
        });
      }
    }
    
    // Check for missing assessments
    const fitCompleted = comparison.fitAssessments?.[candidateIndex] !== null;
    const aiCompleted = comparison.aiReadinessAssessments?.[candidateIndex] !== null;
    const promptCompleted = comparison.promptArchitectureAssessments?.[candidateIndex] !== null;
    const aiqCompleted = comparison.aiqAssessments?.[candidateIndex] !== null;
    
    if (!fitCompleted) risks.push({ type: 'missing_assessment', message: 'FIT Assessment not completed', severity: 'warning' });
    if (!aiCompleted) risks.push({ type: 'missing_assessment', message: 'AI Readiness not completed', severity: 'warning' });
    if (!promptCompleted) risks.push({ type: 'missing_assessment', message: 'Prompt Architecture not completed', severity: 'warning' });
    if (!aiqCompleted) risks.push({ type: 'missing_assessment', message: 'AIQ Assessment not completed', severity: 'warning' });
    
    return risks;
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
    <div className="h-full overflow-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Candidates to Compare</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select 2-3 candidates to view side-by-side comparison
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : candidates && candidates.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {candidates.map((candidate: any) => (
                <div
                  key={candidate.user.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCandidates.includes(candidate.user.id)
                      ? 'border-primary bg-primary/5'
                      : 'hover-elevate'
                  }`}
                  onClick={() => toggleCandidate(candidate.user.id)}
                  data-testid={`checkbox-candidate-${candidate.user.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedCandidates.includes(candidate.user.id)}
                      disabled={
                        !selectedCandidates.includes(candidate.user.id) &&
                        selectedCandidates.length >= 3
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {candidate.user.firstName || candidate.user.lastName
                          ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
                          : 'No Name'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {candidate.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {candidate.results?.length || 0} assessments
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No candidates available</p>
          )}
        </CardContent>
      </Card>

      {selectedCandidates.length >= 2 && (
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

              {/* Summary Cards */}
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
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

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
                        <div className="grid gap-4 md:grid-cols-4">
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
                      <div className="grid gap-4 md:grid-cols-3">
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

              {/* 2. Role Suitability Scoring */}
              {comparison.hasSkillData && (
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
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ROLE_DEFINITIONS).map(([key, role]) => (
                            <SelectItem key={key} value={key}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {!selectedRole ? (
                        <div className="text-center py-8">
                          <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-lg font-medium text-muted-foreground mb-2">No Role Selected</p>
                          <p className="text-sm text-muted-foreground">
                            Select a role from the dropdown above to see how candidates align with specific job requirements.
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {ROLE_DEFINITIONS[selectedRole]?.description}
                          </p>
                          
                          {/* Role fit scores */}
                          <div className="grid gap-4 md:grid-cols-3">
                            {selectedCandidateData?.map((candidate: any, index: number) => {
                              const fitScore = calculateRoleSuitability(index, selectedRole);
                              const performance = getPerformanceLevel(fitScore);
                              
                              return (
                                <Card key={candidate.user.id} className="border" style={{ borderColor: CHART_COLORS[index] }}>
                                  <CardContent className="pt-4 text-center">
                                    <p className="font-medium mb-2" style={{ color: CHART_COLORS[index] }}>
                                      {getCandidateName(candidate)}
                                    </p>
                                    <div className="text-5xl font-bold mb-2" style={{ color: CHART_COLORS[index] }}>
                                      {fitScore}%
                                    </div>
                                    <Badge variant={performance.variant}>{performance.label} Fit</Badge>
                                    
                                    {/* Skill match breakdown */}
                                    <div className="mt-4 text-left">
                                      <p className="text-xs font-medium mb-2">Key Skill Match:</p>
                                      <div className="space-y-1">
                                        {Object.entries(ROLE_DEFINITIONS[selectedRole]?.weights || {}).slice(0, 4).map(([skillName, weight]) => {
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
                        const roleScores = selectedCandidateData?.map((candidate: any, index: number) => ({
                          name: getCandidateName(candidate),
                          score: calculateRoleSuitability(index, selectedRole),
                          index,
                          skills: getAllCandidateSkills(index),
                        })).sort((a: any, b: any) => b.score - a.score);
                        
                        if (!roleScores || roleScores.length < 2) return null;
                        
                        const top = roleScores[0];
                        const second = roleScores[1];
                        const roleName = ROLE_DEFINITIONS[selectedRole]?.name || selectedRole;
                        const roleWeights = Object.entries(ROLE_DEFINITIONS[selectedRole]?.weights || {});
                        const topSkills = roleWeights.slice(0, 2).map(([name]) => name);
                        
                        // Find where top candidate excels
                        const advantageSkills = roleWeights.filter(([skillName]) => {
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
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-5 w-5" />
                      Head-to-Head Skill Comparison
                    </CardTitle>
                    <CardDescription>
                      Color-coded comparison showing who leads in each skill (green = highest, red = lowest)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Skill</th>
                            {selectedCandidateData?.map((candidate: any, index: number) => (
                              <th key={candidate.user.id} className="text-center p-3 font-medium min-w-[120px]">
                                <span style={{ color: CHART_COLORS[index] }}>
                                  {getCandidateName(candidate)}
                                </span>
                              </th>
                            ))}
                            <th className="text-center p-3 font-medium">Average</th>
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
                                <td className="p-3 font-medium">
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      {skill.displayName}
                                      <Badge variant="outline" className="ml-2 text-xs">FIT</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>{skill.description}</TooltipContent>
                                  </Tooltip>
                                </td>
                                {scores.map((score: number | null, index: number) => (
                                  <td key={index} className="p-3 text-center">
                                    {score !== null ? (
                                      <span className={`px-3 py-1 rounded-md font-semibold ${getScoreColorClass(score, scores.filter((s): s is number => s !== null))}`}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="p-3 text-center">
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
                                <td className="p-3 font-medium">
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      {skill.displayName}
                                      <Badge variant="outline" className="ml-2 text-xs">AI</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>{skill.description}</TooltipContent>
                                  </Tooltip>
                                </td>
                                {scores.map((score: number | null, index: number) => (
                                  <td key={index} className="p-3 text-center">
                                    {score !== null ? (
                                      <span className={`px-3 py-1 rounded-md font-semibold ${getScoreColorClass(score, scores.filter((s): s is number => s !== null))}`}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="p-3 text-center">
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
                                <td className="p-3 font-medium">
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      Prompt Architecture
                                      <Badge variant="outline" className="ml-2 text-xs">PROMPT</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Total score across all prompt engineering dimensions and levels</TooltipContent>
                                  </Tooltip>
                                </td>
                                {scores.map((score: number | null, index: number) => (
                                  <td key={index} className="p-3 text-center">
                                    {score !== null ? (
                                      <span className={`px-3 py-1 rounded-md font-semibold ${getScoreColorClass(score, scores.filter((s): s is number => s !== null))}`}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="p-3 text-center">
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
                                <td className="p-3 font-medium">
                                  <Tooltip>
                                    <TooltipTrigger className="text-left">
                                      AIQ (Ethics & Fairness)
                                      <Badge variant="outline" className="ml-2 text-xs">AIQ</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Algorithmic Integrity Quotient - AI ethics, bias, and responsibility assessment</TooltipContent>
                                  </Tooltip>
                                </td>
                                {scores.map((score: number | null, index: number) => (
                                  <td key={index} className="p-3 text-center">
                                    {score !== null ? (
                                      <span className={`px-3 py-1 rounded-md font-semibold ${getScoreColorClass(score, scores.filter((s): s is number => s !== null))}`}>
                                        {score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                ))}
                                <td className="p-3 text-center">
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

              {/* 4. Skill Gap Analysis */}
              {comparison.hasSkillData && (
                <Card data-testid="card-skill-gap">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Skill Gap Analysis
                    </CardTitle>
                    <CardDescription>
                      How each candidate deviates from the group average - positive means above average
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {selectedCandidateData?.map((candidate: any, index: number) => {
                        const skills = getAllCandidateSkills(index);
                        const gaps = Object.keys(skills).map(skillName => ({
                          name: skillName,
                          gap: getSkillGap(index, skillName),
                          score: skills[skillName],
                        })).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
                        
                        const biggestStrength = gaps.find(g => g.gap > 0);
                        const biggestWeakness = gaps.find(g => g.gap < 0);
                        
                        return (
                          <Card key={candidate.user.id} className="border" style={{ borderColor: CHART_COLORS[index] }}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base" style={{ color: CHART_COLORS[index] }}>
                                {getCandidateName(candidate)}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {biggestStrength && (
                                  <div className="flex items-start gap-2 p-2 rounded bg-green-50 dark:bg-green-900/20">
                                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-green-800 dark:text-green-200">Standout Skill</p>
                                      <p className="text-xs text-green-700 dark:text-green-300">{biggestStrength.name}</p>
                                      <p className="text-xs text-green-600 dark:text-green-400">+{biggestStrength.gap} above average</p>
                                    </div>
                                  </div>
                                )}
                                {biggestWeakness && (
                                  <div className="flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-900/20">
                                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-red-800 dark:text-red-200">Development Area</p>
                                      <p className="text-xs text-red-700 dark:text-red-300">{biggestWeakness.name}</p>
                                      <p className="text-xs text-red-600 dark:text-red-400">{biggestWeakness.gap} below average</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Top 5 gaps visualization */}
                                <div className="mt-4 space-y-2">
                                  {gaps.slice(0, 5).map((g) => (
                                    <div key={g.name} className="flex items-center gap-2 text-xs">
                                      <span className="truncate flex-1 text-muted-foreground">{g.name}</span>
                                      <div className="flex items-center gap-1 w-24">
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                          <div
                                            className={`h-full ${g.gap >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ 
                                              width: `${Math.min(Math.abs(g.gap) * 2, 100)}%`,
                                              marginLeft: g.gap >= 0 ? '50%' : `${50 - Math.min(Math.abs(g.gap) * 2, 50)}%`,
                                            }}
                                          />
                                        </div>
                                        <span className={`w-10 text-right font-medium ${g.gap >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                          {g.gap >= 0 ? '+' : ''}{g.gap}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 5. Strengths & Weaknesses Summary */}
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
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {selectedCandidateData?.map((candidate: any, index: number) => {
                        const { strengths, weaknesses } = getStrengthsAndWeaknesses(index);
                        
                        return (
                          <Card key={candidate.user.id} className="border" style={{ borderColor: CHART_COLORS[index] }}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base" style={{ color: CHART_COLORS[index] }}>
                                {getCandidateName(candidate)}
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Strengths */}
                                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Strengths</span>
                                  </div>
                                  <div className="space-y-2">
                                    {strengths.map((s) => (
                                      <div key={s.name} className="space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-xs truncate flex-1">{s.name}</span>
                                          <span className="text-xs font-bold text-green-600 dark:text-green-400">{s.score}</span>
                                        </div>
                                        <div className="h-1.5 bg-green-200 dark:bg-green-800 rounded-full overflow-hidden">
                                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.score}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Weaknesses */}
                                <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Development</span>
                                  </div>
                                  <div className="space-y-2">
                                    {weaknesses.map((w) => (
                                      <div key={w.name} className="space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-xs truncate flex-1">{w.name}</span>
                                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{w.score}</span>
                                        </div>
                                        <div className="h-1.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${w.score}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 6. Risk Indicators */}
              {comparison.hasSkillData && (
                <Card data-testid="card-risk-indicators" data-report-section="risk-indicators">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Risk Indicators
                    </CardTitle>
                    <CardDescription>
                      Flags for low scores, incomplete assessments, and unusual skill patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {selectedCandidateData?.map((candidate: any, index: number) => {
                        const risks = getRiskIndicators(index);
                        const errorCount = risks.filter(r => r.severity === 'error').length;
                        const warningCount = risks.filter(r => r.severity === 'warning').length;
                        
                        return (
                          <Card key={candidate.user.id} className="border" style={{ borderColor: CHART_COLORS[index] }}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-base" style={{ color: CHART_COLORS[index] }}>
                                  {getCandidateName(candidate)}
                                </CardTitle>
                                <div className="flex gap-1">
                                  {errorCount > 0 && (
                                    <Badge variant="destructive" className="text-xs">{errorCount} critical</Badge>
                                  )}
                                  {warningCount > 0 && (
                                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 dark:text-amber-400">{warningCount} risks</Badge>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                              {risks.length === 0 ? (
                                <div className="flex items-center gap-3 py-2">
                                  <div className="h-3 w-3 rounded-full bg-green-500 shrink-0" />
                                  <span className="text-lg font-medium text-foreground">No significant risks detected</span>
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {risks.slice(0, 6).map((risk, i) => (
                                    <div 
                                      key={i}
                                      className={`flex items-start gap-2 p-2 rounded text-xs ${
                                        risk.severity === 'error' 
                                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                                      }`}
                                    >
                                      {risk.severity === 'error' ? (
                                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                                      ) : (
                                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                                      )}
                                      <span>{risk.message}</span>
                                    </div>
                                  ))}
                                  {risks.length > 6 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                      +{risks.length - 6} more indicators
                                    </p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
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
                            <RadarChart data={(() => {
                              // Merge all candidate FIT data into one dataset using user IDs as keys
                              return FIT_SKILLS.map(skill => {
                                const dataPoint: any = { skill: getSkillAcronym(skill.displayName) };
                                selectedCandidateData?.forEach((candidate: any, index: number) => {
                                  const fitData = comparison.fitAssessments?.[index];
                                  if (fitData) {
                                    // Use user.id as key to avoid collisions with duplicate names
                                    dataPoint[candidate.user.id] = fitData.scores[skill.key] || 0;
                                  }
                                });
                                return dataPoint;
                              });
                            })()}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                              {selectedCandidateData?.map((candidate: any, index: number) => {
                                if (!comparison.fitAssessments?.[index]) return null;
                                return (
                                  <Radar
                                    key={candidate.user.id}
                                    name={getCandidateName(candidate)}
                                    dataKey={candidate.user.id}
                                    stroke={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                    fill={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                    label={index === 0 ? renderInsideLabel : false}
                                    isAnimationActive={!isCapturingPDF}
                                  />
                                );
                              })}
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
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
                                    <RadarChart data={radarData}>
                                      <PolarGrid />
                                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                                      <Radar
                                        dataKey="score"
                                        stroke={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                        fill={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                        fillOpacity={0.5}
                                        label={renderInsideLabel}
                                        isAnimationActive={!isCapturingPDF}
                                      />
                                    </RadarChart>
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
                            <RadarChart data={(() => {
                              // Merge all candidate AI Readiness data into one dataset using user IDs as keys
                              return AI_READINESS_SKILLS.map(skill => {
                                const dataPoint: any = { skill: getSkillAcronym(skill.displayName) };
                                selectedCandidateData?.forEach((candidate: any, index: number) => {
                                  const aiData = comparison.aiReadinessAssessments?.[index];
                                  if (aiData) {
                                    // Use user.id as key to avoid collisions with duplicate names
                                    dataPoint[candidate.user.id] = aiData.scores[skill.key] || 0;
                                  }
                                });
                                return dataPoint;
                              });
                            })()}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                              {selectedCandidateData?.map((candidate: any, index: number) => {
                                if (!comparison.aiReadinessAssessments?.[index]) return null;
                                return (
                                  <Radar
                                    key={candidate.user.id}
                                    name={getCandidateName(candidate)}
                                    dataKey={candidate.user.id}
                                    stroke={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                    fill={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                    fillOpacity={0.3}
                                    strokeWidth={2}
                                    label={index === 0 ? renderInsideLabel : false}
                                    isAnimationActive={!isCapturingPDF}
                                  />
                                );
                              })}
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
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
                                    <RadarChart data={radarData}>
                                      <PolarGrid />
                                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9 }} />
                                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                                      <Radar
                                        dataKey="score"
                                        stroke={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                        fill={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                        fillOpacity={0.5}
                                        label={renderInsideLabel}
                                        isAnimationActive={!isCapturingPDF}
                                      />
                                    </RadarChart>
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
                          <div id="pdf-comparison-overall-skills" className="bg-white p-4 rounded-lg">
                          <ResponsiveContainer width="100%" height={400}>
                            <RadarChart data={comparison.radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="skill" />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                              {selectedCandidateData?.map((candidate: any, index: number) => (
                                <Radar
                                  key={candidate.user.id}
                                  name={getCandidateName(candidate)}
                                  dataKey={`candidate${index}`}
                                  stroke={isCapturingPDF ? PDF_CHART_COLORS[index] : CHART_COLORS[index]}
                                  strokeWidth={3}
                                  strokeDasharray="8 4"
                                  fill="transparent"
                                  fillOpacity={0}
                                  isAnimationActive={!isCapturingPDF}
                                />
                              ))}
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* AI-Generated Comparison Write-up */}
                      <div className="bg-muted/30 p-6 rounded-lg border" data-testid="comparison-writeup">
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">Comparison Summary for {selectedRole ? ROLE_DEFINITIONS[selectedRole]?.name : 'Selected Role'}</h3>
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
                            
                            const currentRole = selectedRole || 'ai_consultant';
                            const currentRoleName = ROLE_DEFINITIONS[currentRole]?.name || 'Selected Role';
                            
                            const rankedCandidates = selectedCandidateData.map((candidate: any, index: number) => ({
                              name: getCandidateName(candidate),
                              index,
                              compositeScore: calculateFixedComposite(index),
                              roleFit: calculateRoleSuitability(index, currentRole),
                              strengths: getStrengthsAndWeaknesses(index).strengths,
                              weaknesses: getStrengthsAndWeaknesses(index).weaknesses,
                              risks: getRiskIndicators(index),
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
                                  {topCandidate.risks.filter(r => r.severity === 'error').length > 0 && (
                                    <span className="text-red-600 dark:text-red-400"> Note: Some critical skill gaps identified.</span>
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

                      {/* Export Button */}
                      <div className="flex justify-end">
                        <Button 
                          onClick={handleExportPDF}
                          data-testid="button-export-comparison"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Export PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              </div>
              {/* End of Report Container */}

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
              Select at least one more candidate to view comparison
            </p>
          </CardContent>
        </Card>
      )}

      {/* Hidden radar charts for PDF export */}
      {comparison && selectedCandidates.length >= 2 && (
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
                style={{ width: '500px', height: '400px', backgroundColor: 'white', padding: '20px' }}
              >
                <h3 style={{ textAlign: 'center', marginBottom: '10px', color: CHART_COLORS[index] }}>
                  {getCandidateName(selectedCandidateData?.[index])} - FIT
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                    <Radar
                      dataKey="score"
                      stroke={CHART_COLORS[index]}
                      fill={CHART_COLORS[index]}
                      fillOpacity={0.5}
                      label={renderInsideLabel}
                    />
                  </RadarChart>
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
                style={{ width: '500px', height: '400px', backgroundColor: 'white', padding: '20px' }}
              >
                <h3 style={{ textAlign: 'center', marginBottom: '10px', color: CHART_COLORS[index] }}>
                  {getCandidateName(selectedCandidateData?.[index])} - AI Readiness
                </h3>
                <ResponsiveContainer width="100%" height="90%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                    <Radar
                      dataKey="score"
                      stroke={CHART_COLORS[index]}
                      fill={CHART_COLORS[index]}
                      fillOpacity={0.5}
                      label={renderInsideLabel}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

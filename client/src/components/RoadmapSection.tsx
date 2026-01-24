import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Code2, Shield, Compass, Languages, Users2, Rocket, UsersRound, Handshake, Wrench, Lightbulb, ShieldAlert, TrendingUp } from "lucide-react";

interface RoadmapItem {
  date: string;
  status: "launched" | "upcoming" | "planned";
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  assessments?: string[];
}

const roadmapItems: RoadmapItem[] = [
  {
    date: "December 2025",
    status: "launched",
    title: "Platform Launch",
    description: "Core AI assessment suite for behavioral skills and AI literacy evaluation",
    icon: Rocket,
    assessments: [
      "FIT Assessment (15Q)",
      "AI Readiness (21Q)",
      "Prompt Architecture (7Q)",
      "Algorithmic Integrity Quotient (8Q)"
    ],
  },
  {
    date: "February 2026",
    status: "upcoming",
    title: "Cohort Benchmarking",
    description: "Compare assessment results against industry benchmarks and peer cohorts to understand relative strengths and areas for development",
    icon: Compass,
  },
  {
    date: "March 2026",
    status: "upcoming",
    title: "AI Output Translator",
    description: "Test your ability to interpret, refine, and communicate AI-generated content effectively to stakeholders",
    icon: Languages,
  },
  {
    date: "May 2026",
    status: "upcoming",
    title: "Team Analysis & Building Tool",
    description: "Powerful analytics for employers to analyze team dynamics, identify skill gaps, and build high-performing teams that maximize productivity",
    icon: UsersRound,
  },
  {
    date: "TBC 2026",
    status: "planned",
    title: "Social Influence Assessment",
    description: "Measure workplace influence, persuasion skills, and ability to drive consensus in team environments",
    icon: Users2,
  },
  {
    date: "Q3 2026",
    status: "planned",
    title: "Human-AI Collaboration Style",
    description: "Evaluate how effectively you partner with AI systems - knowing when to trust AI, when to override it, and how to iterate effectively",
    icon: Handshake,
  },
  {
    date: "Q3 2026",
    status: "planned",
    title: "AI Tool Fluency",
    description: "Practical assessment of navigating common AI tools (ChatGPT, Claude, Copilot) - workflow integration, multi-tool orchestration, and output optimisation",
    icon: Wrench,
  },
  {
    date: "Q4 2026",
    status: "planned",
    title: "AI-Assisted Problem Solving",
    description: "Cognitive assessment where candidates solve complex problems with AI assistance available - measuring how well you leverage AI as a thinking partner",
    icon: Lightbulb,
  },
  {
    date: "Q4 2026",
    status: "planned",
    title: "AI Risk Awareness",
    description: "Identify security vulnerabilities, data leakage risks, compliance issues, and reputational hazards in real-world AI implementations",
    icon: ShieldAlert,
  },
  {
    date: "2027",
    status: "planned",
    title: "Adaptability Quotient (AQ)",
    description: "Measure capacity to learn and adapt as AI tools rapidly evolve - predicting who will thrive as technology changes",
    icon: TrendingUp,
  },
];

export default function RoadmapSection() {
  return (
    <section id="product-roadmap" className="py-12 md:py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-lg md:text-3xl lg:text-4xl font-bold mb-2 md:mb-4 text-white px-2">
            What's next for us?
          </h2>
          <p className="text-xs md:text-base lg:text-xl text-blue-100/70 mb-3 md:mb-6 px-2">
            Our journey to comprehensive AI-era talent assessment
          </p>
        </div>

        <div className="relative">
          {/* Timeline connector line - hidden on mobile, visible on md+ */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400/50 via-cyan-400/20 to-transparent -translate-x-1/2" 
               aria-hidden="true" />

          <div className="space-y-8 md:space-y-12">
            {roadmapItems.map((item, index) => {
              const isLeft = index % 2 === 0;
              const Icon = item.icon;

              return (
                <div
                  key={index}
                  className={`relative flex flex-col md:flex-row items-center gap-4 md:gap-8 ${
                    isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-cyan-400 border-4 border-[#0a1628] z-10 shadow-lg shadow-cyan-400/50" />

                  {/* Spacer for opposite side */}
                  <div className="hidden md:block md:w-1/2" />

                  {/* Content Card */}
                  <Card className="w-full md:w-1/2 p-4 md:p-6 bg-[#1a2744]/50 border-cyan-400/20 hover-elevate transition-all">
                    <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 md:h-6 md:w-6 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm md:text-lg font-semibold text-white">
                            {item.title}
                          </h3>
                          {item.status === "launched" && (
                            <Badge 
                              variant="default" 
                              className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-[10px] md:text-xs"
                              data-testid={`badge-status-${index}`}
                            >
                              ✓ Launched
                            </Badge>
                          )}
                          {item.status === "upcoming" && (
                            <Badge 
                              variant="secondary" 
                              className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-[10px] md:text-xs"
                              data-testid={`badge-status-${index}`}
                            >
                              Upcoming
                            </Badge>
                          )}
                          {item.status === "planned" && (
                            <Badge 
                              variant="outline" 
                              className="border-cyan-400/20 text-blue-100/50 text-[10px] md:text-xs"
                              data-testid={`badge-status-${index}`}
                            >
                              Planned
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] md:text-sm text-cyan-400 font-medium mb-2">
                          {item.date}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs md:text-sm text-blue-100/70 leading-relaxed mb-3">
                      {item.description}
                    </p>

                    {item.assessments && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] md:text-xs text-blue-100/50 font-medium uppercase tracking-wide">
                          Included Assessments:
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {item.assessments.map((assessment, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-[10px] md:text-xs text-blue-100/70"
                            >
                              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400/50" />
                              {assessment}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-8 md:mt-12 text-center">
          <p className="text-[10px] md:text-xs text-blue-100/50 italic">
            Timeline subject to change. Follow us for updates on new releases.
          </p>
        </div>
      </div>
    </section>
  );
}

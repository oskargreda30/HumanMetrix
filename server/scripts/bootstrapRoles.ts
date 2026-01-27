import { storage } from "../storage";
import { AI_READINESS_SKILL_NAMES, FIT_SKILL_NAMES } from '@shared/skillNames';

const PREDEFINED_ROLES = [
  {
    name: "AI/ML Engineer",
    description: "Designs and implements machine learning systems",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 5, minimumScore: 85 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 80 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 75 },
      { skillName: "Prompting Effectiveness", importance: 5, minimumScore: 80 },
      { skillName: "Responsible AI Integration", importance: 4, minimumScore: 70 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 70,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 80,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 65,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 60,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 85
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 80,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 70,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 75,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 80,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 70,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 85,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 75,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 80
      }
    }
  },
  {
    name: "Account Executive",
    description: "Manages client relationships and drives revenue growth",
    competencies: [
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 80 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 70,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 80,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 75,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 85,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 65
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 75,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 65,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 70,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 60,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 65
      }
    }
  },
  {
    name: "Business Analyst",
    description: "Analyzes business processes and recommends improvements",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 60 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 70,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 65,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 70,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 80
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 65,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 70,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 75,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 75
      }
    }
  },
  {
    name: "Chief Technology Officer",
    description: "Sets technology strategy and oversees technical operations",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 85 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 80 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 80 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 70 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 75,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 85,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 80,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 70,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 75,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 80
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 80,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 75,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 80,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 75,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 85,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 75,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 85,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 90,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 80
      }
    }
  },
  {
    name: "Content Writer",
    description: "Creates engaging written content for various platforms and audiences",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 5, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 4, minimumScore: 60 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 65,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 70,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 65,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 60,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 80
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 65,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 65,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 70,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 65,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 55,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 80
      }
    }
  },
  {
    name: "Customer Success Manager",
    description: "Ensures customer satisfaction and retention",
    competencies: [
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 80 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 3, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 75,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 70,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 85,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 80,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 65
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 80,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 65,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 65,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 60,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 75,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 65,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 60,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 65
      }
    }
  },
  {
    name: "Cybersecurity Analyst",
    description: "Protects systems and networks from security threats",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 80 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 75,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 70,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 70,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 65,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 60,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 80
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 65,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 65,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 75,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 75,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 80,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 85,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 65
      }
    }
  },
  {
    name: "Data Analyst",
    description: "Analyzes data to extract insights and inform business decisions",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 70,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 70,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 65,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 65,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 80
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 75,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 70,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 75,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 65,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 70,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 75,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 75,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 70
      }
    }
  },
  {
    name: "DevOps Engineer",
    description: "Manages infrastructure, deployment pipelines, and system reliability",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 80 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 80,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 70,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 60,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 65,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 70
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 75,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 75,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 65,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 80,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 75,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 75,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 85,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 65
      }
    }
  },
  {
    name: "Financial Analyst",
    description: "Analyzes financial data to support business decision-making",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 80 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 3, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 70,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 70,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 65,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 60,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 75
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 65,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 65,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 75,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 60
      }
    }
  },
  {
    name: "Graphic Designer",
    description: "Creates visual content for digital and print media",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 85 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 4, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 60 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 65,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 70,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 60,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 65,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 75
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 65,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 70,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 65,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 65,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 75,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 65,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 70,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 90
      }
    }
  },
  {
    name: "HR Manager",
    description: "Oversees recruitment, employee relations, and organizational development",
    competencies: [
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 80 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 4, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.GROWTH_MINDSET, importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 80,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 85,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 90,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 85,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 70
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 65,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 80,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 60,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 75,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 55,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 60,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 65
      }
    }
  },
  {
    name: "Legal Counsel",
    description: "Provides legal advice and ensures regulatory compliance",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 85 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 80 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 75,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 70,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 85,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 70,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 80
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 70,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 85,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 80,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 90,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 90,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 60,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 65
      }
    }
  },
  {
    name: "Marketing Manager",
    description: "Develops and executes marketing strategies to promote products/services",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 60 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 80,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 85,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 80,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 75,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 85,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 75
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 65,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 80,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 75,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 85,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 80
      }
    }
  },
  {
    name: "Operations Manager",
    description: "Optimizes business operations and ensures efficient processes",
    competencies: [
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 85,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 80,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 70,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 80,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 70
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 85,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 65,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 80,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 75,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 85,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 70,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 65
      }
    }
  },
  {
    name: "Product Manager",
    description: "Oversees product development from conception to launch",
    competencies: [
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 70 },
      { skillName: "AI Readiness", importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 75,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 85,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 80,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 80,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 85,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 70
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 65,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 80,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 75,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 75
      }
    }
  },
  {
    name: "Project Manager",
    description: "Plans, executes, and oversees projects from initiation to completion",
    competencies: [
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 75,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 80,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 70,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 85,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 80,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 65
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 85,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 65,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 70,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 75,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 60,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 75
      }
    }
  },
  {
    name: "Quality Assurance Engineer",
    description: "Tests software to ensure quality and reliability",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 60 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 75,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 70,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 65,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 60,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 60,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 65
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 55,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 70,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 75,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 80,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 75,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 60
      }
    }
  },
  {
    name: "Research Scientist",
    description: "Conducts research to advance knowledge in a specific field",
    competencies: [
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 5, minimumScore: 85 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 80 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 75,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 80,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 65,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 60,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 90
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 75,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 70,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 85,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 70,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 90,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 80,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 85,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 80,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 75
      }
    }
  },
  {
    name: "Sales Representative",
    description: "Builds relationships and closes deals with potential customers",
    competencies: [
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 80 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 4, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 3, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 80,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 70,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 85,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 90,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 65
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 80,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 50,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 55,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 50,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 60,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 70,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 60
      }
    }
  },
  {
    name: "Social Media Manager",
    description: "Develops and executes social media strategies to build brand presence",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 5, minimumScore: 70 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 70,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 70,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 75,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 70
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 75,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 75,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 65,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 70,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 80,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 70,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 85
      }
    }
  },
  {
    name: "Software Engineer",
    description: "Develops, tests, and maintains software applications",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 60 },
      { skillName: FIT_SKILL_NAMES.GROWTH_MINDSET, importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 70,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 70,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 80,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 60,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 65,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 75
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 65,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 75,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 70,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 65,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 75,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 80,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 75,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 80,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 70
      }
    }
  },
  {
    name: "Supply Chain Manager",
    description: "Oversees logistics and ensures efficient supply chain operations",
    competencies: [
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 70 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 80,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 80,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 70,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 65,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 70,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 65
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 75,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 75,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 80,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 75,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 70,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 60
      }
    }
  },
  {
    name: "Training & Development Specialist",
    description: "Designs and delivers training programs for employee development",
    competencies: [
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 75 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 4, minimumScore: 65 },
      { skillName: FIT_SKILL_NAMES.GROWTH_MINDSET, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 70,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 75,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 80,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 85,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 80,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 75
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 60,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 75,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 65,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 60,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 70,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 75,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 70
      }
    }
  },
  {
    name: "UX/UI Designer",
    description: "Creates intuitive and engaging user experiences and interfaces",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 80 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 75 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 4, minimumScore: 65 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 60 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 65,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 70,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 75,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 80,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 70,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 75
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 55,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 75,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 60,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 70,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 55,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 70,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 75,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 65,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 80
      }
    }
  }
];

async function bootstrapRoles() {
  console.log("🎯 Bootstrap Job Roles Script");
  console.log("==============================\n");

  try {
    let created = 0;
    let skipped = 0;

    for (const roleData of PREDEFINED_ROLES) {
      const allRoles = await storage.getAllJobRoles();
      const existingRole = allRoles.find(
        (r: any) => r.name.toLowerCase() === roleData.name.toLowerCase()
      );

      if (existingRole) {
        console.log(`⏭️  Skipping: ${roleData.name} (already exists)`);
        skipped++;
        continue;
      }

      await storage.createJobRole({
        name: roleData.name,
        description: roleData.description || null,
        competencies: roleData.competencies,
        requiredSkillScores: roleData.requiredSkillScores || null,
        isCustom: false,
        createdBy: null,
      });

      console.log(`✅ Created: ${roleData.name}`);
      created++;
    }

    console.log("\n" + "=".repeat(50));
    console.log("🎉 Bootstrap Complete!");
    console.log(`   Created: ${created} roles`);
    console.log(`   Skipped: ${skipped} roles (already exist)`);
    console.log(`   Total: ${PREDEFINED_ROLES.length} predefined roles`);
    console.log("=".repeat(50));

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Failed to bootstrap roles:");
    console.error(error);
    process.exit(1);
  }
}

bootstrapRoles();

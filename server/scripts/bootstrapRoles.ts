import { storage } from "../storage";
import { AI_READINESS_SKILL_NAMES, FIT_SKILL_NAMES } from '@shared/skillNames';

const PREDEFINED_ROLES = [
  {
    name: "AI/ML Engineer",
    description: "Designs and implements machine learning systems",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 5, minimumScore: 78 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 73 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 68 },
      { skillName: "Prompting Effectiveness", importance: 5, minimumScore: 73 },
      { skillName: "Responsible AI Integration", importance: 4, minimumScore: 63 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 63,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 73,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 58,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 53,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 78
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 73,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 63,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 68,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 73,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 63,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 78,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 68,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 73
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'critical',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard'
      }
    }
  },
  {
    name: "Account Executive",
    description: "Manages client relationships and drives revenue growth",
    competencies: [
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 73 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 4, minimumScore: 58 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 63,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 73,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 68,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 78,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 58
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 68,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 58,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 63,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 53,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 58
      }
    ,
      skillCriticality: {
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard'
      }
    }
  },
  {
    name: "Business Analyst",
    description: "Analyzes business processes and recommends improvements",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 53 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 4, minimumScore: 58 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 63,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 58,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 63,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 73
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 58,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 63,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 68,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 58,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 68
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard'
      }
    }
  },
  {
    name: "Chief Technology Officer",
    description: "Sets technology strategy and oversees technical operations",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 78 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 73 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 73 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 63 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 68,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 78,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 73,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 63,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 68,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 73
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 73,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 68,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 73,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 68,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 78,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 68,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 78,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 83,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 73
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'critical',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard'
      }
    }
  },
  {
    name: "Content Writer",
    description: "Creates engaging written content for various platforms and audiences",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 5, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 4, minimumScore: 53 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 4, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 58,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 63,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 58,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 53,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 73
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 58,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 58,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 63,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 58,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 48,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 73
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard'
      }
    }
  },
  {
    name: "Customer Success Manager",
    description: "Ensures customer satisfaction and retention",
    competencies: [
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 73 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 3, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 68,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 63,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 78,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 73,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 58
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 73,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 58,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 58,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 53,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 68,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 58,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 53,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 58
      }
    ,
      skillCriticality: {
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard'
      }
    }
  },
  {
    name: "Cybersecurity Analyst",
    description: "Protects systems and networks from security threats",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 73 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 68,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 63,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 63,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 58,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 53,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 73
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 58,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 58,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 68,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 68,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 73,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 78,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 58
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'critical',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard'
      }
    }
  },
  {
    name: "Data Analyst",
    description: "Analyzes data to extract insights and inform business decisions",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 63,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 63,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 58,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 58,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 73
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 68,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 63,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 68,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 58,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 63,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 68,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 68,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 63
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard'
      }
    }
  },
  {
    name: "DevOps Engineer",
    description: "Manages infrastructure, deployment pipelines, and system reliability",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 73 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 3, minimumScore: 48 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 73,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 63,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 53,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 58,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 63
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 68,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 68,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 58,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 73,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 68,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 68,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 78,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 58
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard'
      }
    }
  },
  {
    name: "Financial Analyst",
    description: "Analyzes financial data to support business decision-making",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 73 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 3, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 63,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 63,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 58,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 53,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 68
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 58,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 58,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 68,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 58,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 53
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard'
      }
    }
  },
  {
    name: "Graphic Designer",
    description: "Creates visual content for digital and print media",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 78 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 4, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 53 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 3, minimumScore: 48 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 58,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 63,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 53,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 58,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 68
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 58,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 63,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 58,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 58,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 68,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 58,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 63,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 83
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard'
      }
    }
  },
  {
    name: "HR Manager",
    description: "Oversees recruitment, employee relations, and organizational development",
    competencies: [
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 73 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 4, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.GROWTH_MINDSET, importance: 4, minimumScore: 58 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 73,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 78,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 83,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 78,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 63
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 58,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 73,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 53,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 68,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 48,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 53,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 58
      }
    ,
      skillCriticality: {
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard'
      }
    }
  },
  {
    name: "Legal Counsel",
    description: "Provides legal advice and ensures regulatory compliance",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 78 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 73 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 3, minimumScore: 48 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 68,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 63,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 78,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 63,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 73
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 63,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 78,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 73,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 83,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 83,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 53,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 58
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'critical',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard'
      }
    }
  },
  {
    name: "Marketing Manager",
    description: "Develops and executes marketing strategies to promote products/services",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 53 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 4, minimumScore: 58 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 73,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 78,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 73,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 68,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 78,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 68
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 58,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 73,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 68,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 78,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 58,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 73
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard'
      }
    }
  },
  {
    name: "Operations Manager",
    description: "Optimizes business operations and ensures efficient processes",
    competencies: [
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 78,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 73,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 63,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 73,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 63
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 78,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 58,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 73,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 68,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 78,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 63,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 58
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard'
      }
    }
  },
  {
    name: "Product Manager",
    description: "Oversees product development from conception to launch",
    competencies: [
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 63 },
      { skillName: "AI Readiness", importance: 3, minimumScore: 48 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 68,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 78,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 73,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 73,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 78,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 63
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 58,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 73,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 68,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 58,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 68
      }
    ,
      skillCriticality: {
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard'
      }
    }
  },
  {
    name: "Project Manager",
    description: "Plans, executes, and oversees projects from initiation to completion",
    competencies: [
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 68,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 73,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 63,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 78,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 73,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 58
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 78,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 58,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 63,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 68,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 53,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 68
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard'
      }
    }
  },
  {
    name: "Quality Assurance Engineer",
    description: "Tests software to ensure quality and reliability",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 53 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 3, minimumScore: 48 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 68,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 63,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 58,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 53,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 53,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 58
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 48,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 63,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 68,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 73,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 68,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 53
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'critical',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard'
      }
    }
  },
  {
    name: "Research Scientist",
    description: "Conducts research to advance knowledge in a specific field",
    competencies: [
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 5, minimumScore: 78 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 73 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 58 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 68,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 73,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 58,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 53,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 83
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 68,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 63,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 78,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 63,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 83,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 73,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 78,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 73,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 68
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard'
      }
    }
  },
  {
    name: "Sales Representative",
    description: "Builds relationships and closes deals with potential customers",
    competencies: [
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 73 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 4, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 3, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 73,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 63,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 78,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 83,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 58
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 73,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 43,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 48,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 43,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 53,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 63,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 58,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 53
      }
    ,
      skillCriticality: {
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard'
      }
    }
  },
  {
    name: "Social Media Manager",
    description: "Develops and executes social media strategies to build brand presence",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 5, minimumScore: 63 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 63,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 63,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 68,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 63
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 68,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 68,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 58,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 63,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 73,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 63,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 58,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 78
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard'
      }
    }
  },
  {
    name: "Software Engineer",
    description: "Develops, tests, and maintains software applications",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.ADAPTABILITY, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 53 },
      { skillName: FIT_SKILL_NAMES.GROWTH_MINDSET, importance: 4, minimumScore: 58 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 63,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 63,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 73,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 53,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 58,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 68
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 58,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 68,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 63,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 58,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 68,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 73,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 68,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 73,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 63
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard'
      }
    }
  },
  {
    name: "Supply Chain Manager",
    description: "Oversees logistics and ensures efficient supply chain operations",
    competencies: [
      { skillName: FIT_SKILL_NAMES.HIGH_AGENCY, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.CRITICAL_THINKING, importance: 5, minimumScore: 63 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.RESILIENCE, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 3, minimumScore: 48 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 73,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 73,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 63,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 58,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 63,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 58
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 68,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 68,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 73,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 68,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 63,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 53
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.RESILIENCE]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'standard',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard'
      }
    }
  },
  {
    name: "Training & Development Specialist",
    description: "Designs and delivers training programs for employee development",
    competencies: [
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 68 },
      { skillName: FIT_SKILL_NAMES.INTERPERSONAL_AGILITY, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 4, minimumScore: 58 },
      { skillName: FIT_SKILL_NAMES.GROWTH_MINDSET, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 53 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 63,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 68,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 73,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 78,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 73,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 68
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 53,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 68,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 58,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 53,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 63,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 68,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 58,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 63
      }
    ,
      skillCriticality: {
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard'
      }
    }
  },
  {
    name: "UX/UI Designer",
    description: "Creates intuitive and engaging user experiences and interfaces",
    competencies: [
      { skillName: AI_READINESS_SKILL_NAMES.CREATIVITY, importance: 5, minimumScore: 73 },
      { skillName: FIT_SKILL_NAMES.EMPATHY_ETHICS, importance: 5, minimumScore: 68 },
      { skillName: AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS, importance: 4, minimumScore: 58 },
      { skillName: AI_READINESS_SKILL_NAMES.AI_LITERACY, importance: 4, minimumScore: 53 },
      { skillName: FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY, importance: 4, minimumScore: 58 }
    ],
    requiredSkillScores: {
      fitSkills: {
        [FIT_SKILL_NAMES.RESILIENCE]: 58,
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 63,
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 68,
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 73,
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 63,
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 68
      },
      aiReadinessSkills: {
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 48,
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 68,
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 53,
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 63,
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 48,
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 63,
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 68,
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 58,
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 73
      }
    ,
      skillCriticality: {
        [AI_READINESS_SKILL_NAMES.CREATIVITY]: 'critical',
        [FIT_SKILL_NAMES.EMPATHY_ETHICS]: 'critical',
        [AI_READINESS_SKILL_NAMES.COLLABORATION]: 'critical',
        [AI_READINESS_SKILL_NAMES.CRITICAL_THINKING]: 'critical',
        [FIT_SKILL_NAMES.GROWTH_MINDSET]: 'critical',
        [FIT_SKILL_NAMES.INTELLECTUAL_CURIOSITY]: 'critical',
        [AI_READINESS_SKILL_NAMES.ADAPTABILITY]: 'standard',
        [FIT_SKILL_NAMES.HIGH_AGENCY]: 'standard',
        [FIT_SKILL_NAMES.INTERPERSONAL_AGILITY]: 'standard',
        [AI_READINESS_SKILL_NAMES.RESPONSIBLE_AI]: 'standard',
        [FIT_SKILL_NAMES.RESILIENCE]: 'standard',
        [AI_READINESS_SKILL_NAMES.TECHNICAL_FUNDAMENTALS]: 'standard',
        [AI_READINESS_SKILL_NAMES.DATA_FLUENCY]: 'standard',
        [AI_READINESS_SKILL_NAMES.AI_LITERACY]: 'standard',
        [AI_READINESS_SKILL_NAMES.DOMAIN_EXPERTISE]: 'standard'
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

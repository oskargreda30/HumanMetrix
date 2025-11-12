import { storage } from "../storage";

const PREDEFINED_ROLES = [
  {
    name: "AI/ML Engineer",
    description: "Designs and implements machine learning systems",
    competencies: [
      { skillName: "AI Literacy", importance: 5, minimumScore: 85 },
      { skillName: "Technical Fluency", importance: 5, minimumScore: 80 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 75 },
      { skillName: "Prompting Effectiveness", importance: 5, minimumScore: 80 },
      { skillName: "Responsible AI Integration", importance: 4, minimumScore: 70 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 70,
        "High Agency": 75,
        "Growth Mindset": 80,
        "Empathy & Ethics": 65,
        "Interpersonal Agility": 60,
        "Intellectual Curiosity": 85
      },
      aiReadinessSkills: {
        "AI Literacy": 80,
        Collaboration: 70,
        "Domain Fluency": 75,
        "Responsible AI": 80,
        "Domain Expertise": 70,
        "Adaptive Learning": 85,
        "Critical Thinking": 80,
        "Technical Fluency": 75,
        "Creative Innovation": 80
      }
    }
  },
  {
    name: "Account Executive",
    description: "Manages client relationships and drives revenue growth",
    competencies: [
      { skillName: "Interpersonal Agility", importance: 5, minimumScore: 80 },
      { skillName: "High Agency", importance: 5, minimumScore: 75 },
      { skillName: "Empathy & Ethics", importance: 5, minimumScore: 70 },
      { skillName: "Resilience", importance: 4, minimumScore: 70 },
      { skillName: "Critical Thinking", importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 70,
        "High Agency": 80,
        "Growth Mindset": 75,
        "Empathy & Ethics": 75,
        "Interpersonal Agility": 85,
        "Intellectual Curiosity": 65
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 75,
        "Domain Fluency": 70,
        "Responsible AI": 60,
        "Domain Expertise": 65,
        "Adaptive Learning": 70,
        "Critical Thinking": 70,
        "Technical Fluency": 60,
        "Creative Innovation": 65
      }
    }
  },
  {
    name: "Business Analyst",
    description: "Analyzes business processes and recommends improvements",
    competencies: [
      { skillName: "Critical Thinking", importance: 5, minimumScore: 75 },
      { skillName: "Technical Fluency", importance: 4, minimumScore: 65 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 65 },
      { skillName: "Intellectual Curiosity", importance: 4, minimumScore: 60 },
      { skillName: "High Agency", importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 70,
        "High Agency": 75,
        "Growth Mindset": 75,
        "Empathy & Ethics": 65,
        "Interpersonal Agility": 70,
        "Intellectual Curiosity": 80
      },
      aiReadinessSkills: {
        "AI Literacy": 65,
        Collaboration: 70,
        "Domain Fluency": 70,
        "Responsible AI": 60,
        "Domain Expertise": 75,
        "Adaptive Learning": 70,
        "Critical Thinking": 80,
        "Technical Fluency": 65,
        "Creative Innovation": 75
      }
    }
  },
  {
    name: "Chief Technology Officer",
    description: "Sets technology strategy and oversees technical operations",
    competencies: [
      { skillName: "Technical Fluency", importance: 5, minimumScore: 85 },
      { skillName: "High Agency", importance: 5, minimumScore: 80 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 80 },
      { skillName: "AI Literacy", importance: 5, minimumScore: 75 },
      { skillName: "Interpersonal Agility", importance: 5, minimumScore: 70 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 75,
        "High Agency": 85,
        "Growth Mindset": 80,
        "Empathy & Ethics": 70,
        "Interpersonal Agility": 75,
        "Intellectual Curiosity": 80
      },
      aiReadinessSkills: {
        "AI Literacy": 80,
        Collaboration: 75,
        "Domain Fluency": 80,
        "Responsible AI": 75,
        "Domain Expertise": 85,
        "Adaptive Learning": 75,
        "Critical Thinking": 85,
        "Technical Fluency": 90,
        "Creative Innovation": 80
      }
    }
  },
  {
    name: "Content Writer",
    description: "Creates engaging written content for various platforms and audiences",
    competencies: [
      { skillName: "Creative Innovation", importance: 5, minimumScore: 75 },
      { skillName: "Intellectual Curiosity", importance: 5, minimumScore: 70 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 65 },
      { skillName: "Empathy & Ethics", importance: 4, minimumScore: 60 },
      { skillName: "Critical Thinking", importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 65,
        "High Agency": 70,
        "Growth Mindset": 75,
        "Empathy & Ethics": 65,
        "Interpersonal Agility": 60,
        "Intellectual Curiosity": 80
      },
      aiReadinessSkills: {
        "AI Literacy": 65,
        Collaboration: 65,
        "Domain Fluency": 70,
        "Responsible AI": 60,
        "Domain Expertise": 70,
        "Adaptive Learning": 70,
        "Critical Thinking": 65,
        "Technical Fluency": 55,
        "Creative Innovation": 80
      }
    }
  },
  {
    name: "Customer Success Manager",
    description: "Ensures customer satisfaction and retention",
    competencies: [
      { skillName: "Empathy & Ethics", importance: 5, minimumScore: 80 },
      { skillName: "Interpersonal Agility", importance: 5, minimumScore: 75 },
      { skillName: "Resilience", importance: 4, minimumScore: 70 },
      { skillName: "High Agency", importance: 4, minimumScore: 65 },
      { skillName: "Critical Thinking", importance: 3, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 75,
        "High Agency": 70,
        "Growth Mindset": 75,
        "Empathy & Ethics": 85,
        "Interpersonal Agility": 80,
        "Intellectual Curiosity": 65
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 80,
        "Domain Fluency": 65,
        "Responsible AI": 65,
        "Domain Expertise": 60,
        "Adaptive Learning": 75,
        "Critical Thinking": 65,
        "Technical Fluency": 60,
        "Creative Innovation": 65
      }
    }
  },
  {
    name: "Cybersecurity Analyst",
    description: "Protects systems and networks from security threats",
    competencies: [
      { skillName: "Technical Fluency", importance: 5, minimumScore: 80 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 75 },
      { skillName: "Intellectual Curiosity", importance: 5, minimumScore: 70 },
      { skillName: "Resilience", importance: 4, minimumScore: 65 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 75,
        "High Agency": 70,
        "Growth Mindset": 70,
        "Empathy & Ethics": 65,
        "Interpersonal Agility": 60,
        "Intellectual Curiosity": 80
      },
      aiReadinessSkills: {
        "AI Literacy": 65,
        Collaboration: 65,
        "Domain Fluency": 75,
        "Responsible AI": 75,
        "Domain Expertise": 80,
        "Adaptive Learning": 70,
        "Critical Thinking": 80,
        "Technical Fluency": 85,
        "Creative Innovation": 65
      }
    }
  },
  {
    name: "Data Analyst",
    description: "Analyzes data to extract insights and inform business decisions",
    competencies: [
      { skillName: "Technical Fluency", importance: 5, minimumScore: 70 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 75 },
      { skillName: "AI Literacy", importance: 5, minimumScore: 70 },
      { skillName: "Intellectual Curiosity", importance: 4, minimumScore: 65 },
      { skillName: "Adaptive & Collaborative Learning", importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 70,
        "High Agency": 70,
        "Growth Mindset": 75,
        "Empathy & Ethics": 65,
        "Interpersonal Agility": 65,
        "Intellectual Curiosity": 80
      },
      aiReadinessSkills: {
        "AI Literacy": 75,
        Collaboration: 70,
        "Domain Fluency": 75,
        "Responsible AI": 65,
        "Domain Expertise": 70,
        "Adaptive Learning": 75,
        "Critical Thinking": 80,
        "Technical Fluency": 75,
        "Creative Innovation": 70
      }
    }
  },
  {
    name: "DevOps Engineer",
    description: "Manages infrastructure, deployment pipelines, and system reliability",
    competencies: [
      { skillName: "Technical Fluency", importance: 5, minimumScore: 80 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 70 },
      { skillName: "Resilience", importance: 4, minimumScore: 70 },
      { skillName: "Adaptive & Collaborative Learning", importance: 4, minimumScore: 65 },
      { skillName: "AI Literacy", importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 80,
        "High Agency": 75,
        "Growth Mindset": 70,
        "Empathy & Ethics": 60,
        "Interpersonal Agility": 65,
        "Intellectual Curiosity": 70
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 75,
        "Domain Fluency": 75,
        "Responsible AI": 65,
        "Domain Expertise": 80,
        "Adaptive Learning": 75,
        "Critical Thinking": 75,
        "Technical Fluency": 85,
        "Creative Innovation": 65
      }
    }
  },
  {
    name: "Financial Analyst",
    description: "Analyzes financial data to support business decision-making",
    competencies: [
      { skillName: "Critical Thinking", importance: 5, minimumScore: 80 },
      { skillName: "Technical Fluency", importance: 5, minimumScore: 70 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 65 },
      { skillName: "Intellectual Curiosity", importance: 4, minimumScore: 65 },
      { skillName: "High Agency", importance: 3, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 70,
        "High Agency": 75,
        "Growth Mindset": 70,
        "Empathy & Ethics": 65,
        "Interpersonal Agility": 60,
        "Intellectual Curiosity": 75
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 65,
        "Domain Fluency": 70,
        "Responsible AI": 65,
        "Domain Expertise": 75,
        "Adaptive Learning": 70,
        "Critical Thinking": 80,
        "Technical Fluency": 65,
        "Creative Innovation": 60
      }
    }
  },
  {
    name: "Graphic Designer",
    description: "Creates visual content for digital and print media",
    competencies: [
      { skillName: "Creative Innovation", importance: 5, minimumScore: 85 },
      { skillName: "Technical Fluency", importance: 4, minimumScore: 70 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 65 },
      { skillName: "Intellectual Curiosity", importance: 4, minimumScore: 60 },
      { skillName: "Empathy & Ethics", importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 65,
        "High Agency": 70,
        "Growth Mindset": 75,
        "Empathy & Ethics": 60,
        "Interpersonal Agility": 65,
        "Intellectual Curiosity": 75
      },
      aiReadinessSkills: {
        "AI Literacy": 65,
        Collaboration: 70,
        "Domain Fluency": 65,
        "Responsible AI": 60,
        "Domain Expertise": 65,
        "Adaptive Learning": 75,
        "Critical Thinking": 65,
        "Technical Fluency": 70,
        "Creative Innovation": 90
      }
    }
  },
  {
    name: "HR Manager",
    description: "Oversees recruitment, employee relations, and organizational development",
    competencies: [
      { skillName: "Empathy & Ethics", importance: 5, minimumScore: 80 },
      { skillName: "Interpersonal Agility", importance: 5, minimumScore: 75 },
      { skillName: "High Agency", importance: 4, minimumScore: 70 },
      { skillName: "Critical Thinking", importance: 4, minimumScore: 65 },
      { skillName: "Growth Mindset", importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 80,
        "High Agency": 85,
        "Growth Mindset": 75,
        "Empathy & Ethics": 90,
        "Interpersonal Agility": 85,
        "Intellectual Curiosity": 70
      },
      aiReadinessSkills: {
        "AI Literacy": 65,
        Collaboration: 80,
        "Domain Fluency": 60,
        "Responsible AI": 75,
        "Domain Expertise": 55,
        "Adaptive Learning": 70,
        "Critical Thinking": 80,
        "Technical Fluency": 60,
        "Creative Innovation": 65
      }
    }
  },
  {
    name: "Legal Counsel",
    description: "Provides legal advice and ensures regulatory compliance",
    competencies: [
      { skillName: "Critical Thinking", importance: 5, minimumScore: 85 },
      { skillName: "Empathy & Ethics", importance: 5, minimumScore: 80 },
      { skillName: "Intellectual Curiosity", importance: 5, minimumScore: 70 },
      { skillName: "Resilience", importance: 4, minimumScore: 70 },
      { skillName: "Technical Fluency", importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 75,
        "High Agency": 75,
        "Growth Mindset": 70,
        "Empathy & Ethics": 85,
        "Interpersonal Agility": 70,
        "Intellectual Curiosity": 80
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 70,
        "Domain Fluency": 85,
        "Responsible AI": 80,
        "Domain Expertise": 90,
        "Adaptive Learning": 70,
        "Critical Thinking": 90,
        "Technical Fluency": 60,
        "Creative Innovation": 65
      }
    }
  },
  {
    name: "Marketing Manager",
    description: "Develops and executes marketing strategies to promote products/services",
    competencies: [
      { skillName: "Creative Innovation", importance: 5, minimumScore: 75 },
      { skillName: "High Agency", importance: 5, minimumScore: 70 },
      { skillName: "Interpersonal Agility", importance: 4, minimumScore: 65 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 60 },
      { skillName: "Critical Thinking", importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 80,
        "High Agency": 85,
        "Growth Mindset": 80,
        "Empathy & Ethics": 75,
        "Interpersonal Agility": 85,
        "Intellectual Curiosity": 75
      },
      aiReadinessSkills: {
        "AI Literacy": 65,
        Collaboration: 80,
        "Domain Fluency": 70,
        "Responsible AI": 60,
        "Domain Expertise": 75,
        "Adaptive Learning": 70,
        "Critical Thinking": 85,
        "Technical Fluency": 65,
        "Creative Innovation": 80
      }
    }
  },
  {
    name: "Operations Manager",
    description: "Optimizes business operations and ensures efficient processes",
    competencies: [
      { skillName: "High Agency", importance: 5, minimumScore: 75 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 70 },
      { skillName: "Interpersonal Agility", importance: 4, minimumScore: 65 },
      { skillName: "Resilience", importance: 4, minimumScore: 65 },
      { skillName: "Adaptive & Collaborative Learning", importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 85,
        "High Agency": 80,
        "Growth Mindset": 75,
        "Empathy & Ethics": 70,
        "Interpersonal Agility": 80,
        "Intellectual Curiosity": 70
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 85,
        "Domain Fluency": 70,
        "Responsible AI": 65,
        "Domain Expertise": 80,
        "Adaptive Learning": 75,
        "Critical Thinking": 85,
        "Technical Fluency": 70,
        "Creative Innovation": 65
      }
    }
  },
  {
    name: "Product Manager",
    description: "Oversees product development from conception to launch",
    competencies: [
      { skillName: "High Agency", importance: 5, minimumScore: 75 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 75 },
      { skillName: "Empathy & Ethics", importance: 5, minimumScore: 70 },
      { skillName: "Interpersonal Agility", importance: 5, minimumScore: 70 },
      { skillName: "AI Readiness", importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 75,
        "High Agency": 85,
        "Growth Mindset": 80,
        "Empathy & Ethics": 80,
        "Interpersonal Agility": 85,
        "Intellectual Curiosity": 70
      },
      aiReadinessSkills: {
        "AI Literacy": 65,
        Collaboration: 80,
        "Domain Fluency": 70,
        "Responsible AI": 60,
        "Domain Expertise": 75,
        "Adaptive Learning": 70,
        "Critical Thinking": 80,
        "Technical Fluency": 65,
        "Creative Innovation": 75
      }
    }
  },
  {
    name: "Project Manager",
    description: "Plans, executes, and oversees projects from initiation to completion",
    competencies: [
      { skillName: "High Agency", importance: 5, minimumScore: 75 },
      { skillName: "Interpersonal Agility", importance: 5, minimumScore: 70 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 70 },
      { skillName: "Resilience", importance: 4, minimumScore: 65 },
      { skillName: "Adaptive & Collaborative Learning", importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 75,
        "High Agency": 80,
        "Growth Mindset": 70,
        "Empathy & Ethics": 85,
        "Interpersonal Agility": 80,
        "Intellectual Curiosity": 65
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 85,
        "Domain Fluency": 65,
        "Responsible AI": 70,
        "Domain Expertise": 75,
        "Adaptive Learning": 70,
        "Critical Thinking": 80,
        "Technical Fluency": 60,
        "Creative Innovation": 75
      }
    }
  },
  {
    name: "Quality Assurance Engineer",
    description: "Tests software to ensure quality and reliability",
    competencies: [
      { skillName: "Technical Fluency", importance: 5, minimumScore: 75 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 75 },
      { skillName: "Resilience", importance: 4, minimumScore: 65 },
      { skillName: "Intellectual Curiosity", importance: 4, minimumScore: 60 },
      { skillName: "AI Literacy", importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 75,
        "High Agency": 70,
        "Growth Mindset": 65,
        "Empathy & Ethics": 60,
        "Interpersonal Agility": 60,
        "Intellectual Curiosity": 65
      },
      aiReadinessSkills: {
        "AI Literacy": 55,
        Collaboration: 70,
        "Domain Fluency": 70,
        "Responsible AI": 60,
        "Domain Expertise": 75,
        "Adaptive Learning": 70,
        "Critical Thinking": 80,
        "Technical Fluency": 75,
        "Creative Innovation": 60
      }
    }
  },
  {
    name: "Research Scientist",
    description: "Conducts research to advance knowledge in a specific field",
    competencies: [
      { skillName: "Intellectual Curiosity", importance: 5, minimumScore: 85 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 80 },
      { skillName: "Technical Fluency", importance: 5, minimumScore: 75 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 70 },
      { skillName: "Resilience", importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 75,
        "High Agency": 75,
        "Growth Mindset": 80,
        "Empathy & Ethics": 65,
        "Interpersonal Agility": 60,
        "Intellectual Curiosity": 90
      },
      aiReadinessSkills: {
        "AI Literacy": 75,
        Collaboration: 70,
        "Domain Fluency": 85,
        "Responsible AI": 70,
        "Domain Expertise": 90,
        "Adaptive Learning": 80,
        "Critical Thinking": 85,
        "Technical Fluency": 80,
        "Creative Innovation": 75
      }
    }
  },
  {
    name: "Sales Representative",
    description: "Builds relationships and closes deals with potential customers",
    competencies: [
      { skillName: "Interpersonal Agility", importance: 5, minimumScore: 80 },
      { skillName: "Resilience", importance: 5, minimumScore: 75 },
      { skillName: "High Agency", importance: 5, minimumScore: 75 },
      { skillName: "Empathy & Ethics", importance: 4, minimumScore: 70 },
      { skillName: "Critical Thinking", importance: 3, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 80,
        "High Agency": 75,
        "Growth Mindset": 70,
        "Empathy & Ethics": 85,
        "Interpersonal Agility": 90,
        "Intellectual Curiosity": 65
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 80,
        "Domain Fluency": 50,
        "Responsible AI": 55,
        "Domain Expertise": 50,
        "Adaptive Learning": 60,
        "Critical Thinking": 70,
        "Technical Fluency": 65,
        "Creative Innovation": 60
      }
    }
  },
  {
    name: "Social Media Manager",
    description: "Develops and executes social media strategies to build brand presence",
    competencies: [
      { skillName: "Creative Innovation", importance: 5, minimumScore: 75 },
      { skillName: "AI Literacy", importance: 5, minimumScore: 70 },
      { skillName: "Interpersonal Agility", importance: 4, minimumScore: 65 },
      { skillName: "High Agency", importance: 4, minimumScore: 65 },
      { skillName: "Adaptive & Collaborative Learning", importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 70,
        "High Agency": 75,
        "Growth Mindset": 75,
        "Empathy & Ethics": 70,
        "Interpersonal Agility": 75,
        "Intellectual Curiosity": 70
      },
      aiReadinessSkills: {
        "AI Literacy": 75,
        Collaboration: 75,
        "Domain Fluency": 70,
        "Responsible AI": 65,
        "Domain Expertise": 70,
        "Adaptive Learning": 80,
        "Critical Thinking": 70,
        "Technical Fluency": 65,
        "Creative Innovation": 85
      }
    }
  },
  {
    name: "Software Engineer",
    description: "Develops, tests, and maintains software applications",
    competencies: [
      { skillName: "Technical Fluency", importance: 5, minimumScore: 75 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 70 },
      { skillName: "Adaptive & Collaborative Learning", importance: 4, minimumScore: 65 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 60 },
      { skillName: "Growth Mindset", importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 70,
        "High Agency": 70,
        "Growth Mindset": 80,
        "Empathy & Ethics": 60,
        "Interpersonal Agility": 65,
        "Intellectual Curiosity": 75
      },
      aiReadinessSkills: {
        "AI Literacy": 65,
        Collaboration: 75,
        "Domain Fluency": 70,
        "Responsible AI": 65,
        "Domain Expertise": 75,
        "Adaptive Learning": 80,
        "Critical Thinking": 75,
        "Technical Fluency": 80,
        "Creative Innovation": 70
      }
    }
  },
  {
    name: "Supply Chain Manager",
    description: "Oversees logistics and ensures efficient supply chain operations",
    competencies: [
      { skillName: "High Agency", importance: 5, minimumScore: 75 },
      { skillName: "Critical Thinking", importance: 5, minimumScore: 70 },
      { skillName: "Technical Fluency", importance: 4, minimumScore: 65 },
      { skillName: "Resilience", importance: 4, minimumScore: 65 },
      { skillName: "AI Literacy", importance: 3, minimumScore: 55 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 80,
        "High Agency": 80,
        "Growth Mindset": 70,
        "Empathy & Ethics": 65,
        "Interpersonal Agility": 70,
        "Intellectual Curiosity": 65
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 75,
        "Domain Fluency": 75,
        "Responsible AI": 60,
        "Domain Expertise": 80,
        "Adaptive Learning": 70,
        "Critical Thinking": 75,
        "Technical Fluency": 70,
        "Creative Innovation": 60
      }
    }
  },
  {
    name: "Training & Development Specialist",
    description: "Designs and delivers training programs for employee development",
    competencies: [
      { skillName: "Empathy & Ethics", importance: 5, minimumScore: 75 },
      { skillName: "Interpersonal Agility", importance: 5, minimumScore: 75 },
      { skillName: "Creative Innovation", importance: 4, minimumScore: 65 },
      { skillName: "Growth Mindset", importance: 4, minimumScore: 65 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 60 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 70,
        "High Agency": 75,
        "Growth Mindset": 80,
        "Empathy & Ethics": 85,
        "Interpersonal Agility": 80,
        "Intellectual Curiosity": 75
      },
      aiReadinessSkills: {
        "AI Literacy": 60,
        Collaboration: 75,
        "Domain Fluency": 65,
        "Responsible AI": 60,
        "Domain Expertise": 70,
        "Adaptive Learning": 70,
        "Critical Thinking": 75,
        "Technical Fluency": 65,
        "Creative Innovation": 70
      }
    }
  },
  {
    name: "UX/UI Designer",
    description: "Creates intuitive and engaging user experiences and interfaces",
    competencies: [
      { skillName: "Creative Innovation", importance: 5, minimumScore: 80 },
      { skillName: "Empathy & Ethics", importance: 5, minimumScore: 75 },
      { skillName: "Technical Fluency", importance: 4, minimumScore: 65 },
      { skillName: "AI Literacy", importance: 4, minimumScore: 60 },
      { skillName: "Intellectual Curiosity", importance: 4, minimumScore: 65 }
    ],
    requiredSkillScores: {
      fitSkills: {
        Resilience: 65,
        "High Agency": 70,
        "Growth Mindset": 75,
        "Empathy & Ethics": 80,
        "Interpersonal Agility": 70,
        "Intellectual Curiosity": 75
      },
      aiReadinessSkills: {
        "AI Literacy": 55,
        Collaboration: 75,
        "Domain Fluency": 60,
        "Responsible AI": 70,
        "Domain Expertise": 55,
        "Adaptive Learning": 70,
        "Critical Thinking": 75,
        "Technical Fluency": 65,
        "Creative Innovation": 80
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
      // Check if role already exists (by name)
      const allRoles = await storage.getAllJobRoles();
      const existingRole = allRoles.find(
        (r: any) => r.name.toLowerCase() === roleData.name.toLowerCase()
      );

      if (existingRole) {
        console.log(`⏭️  Skipping: ${roleData.name} (already exists)`);
        skipped++;
        continue;
      }

      // Create the role
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

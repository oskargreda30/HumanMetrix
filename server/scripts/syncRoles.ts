import { storage } from "../storage";

const CANONICAL_ROLES: Array<{
  name: string;
  description: string;
  domain: string;
  requiredSkillScores: any;
}> = [
  {
    name: "AI/ML Engineer",
    description: "Designs and implements machine learning systems",
    domain: "technology",
    requiredSkillScores: {"aiqScore":69,"fitSkills":{"Resilience":57,"High Agency":62,"Growth Mindset":59,"Empathy & Ethics":56,"Interpersonal Agility":58,"Intellectual Curiosity":66},"generatedAt":"2026-02-05T15:36:23.147Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":67,"Domain Expertise":68,"Technical Fundamentals":72,"Creativity & Innovation":61,"Collaboration & Communication":63,"AI Literacy & Prompt Engineering":69,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":64,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":66}
  },
  {
    name: "Account Executive",
    description: "Manages client relationships and drives revenue growth",
    domain: "sales",
    requiredSkillScores: {"aiqScore":63,"fitSkills":{"Resilience":64,"High Agency":67,"Growth Mindset":56,"Empathy & Ethics":66,"Interpersonal Agility":61,"Intellectual Curiosity":59},"generatedAt":"2026-02-05T15:27:27.524Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":57,"Domain Expertise":66,"Technical Fundamentals":62,"Creativity & Innovation":61,"Collaboration & Communication":72,"AI Literacy & Prompt Engineering":58,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":63,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":62}
  },
  {
    name: "Backend Developer",
    description: "Builds server-side logic, APIs, and database integrations",
    domain: "technology",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":62,"High Agency":61,"Growth Mindset":59,"Empathy & Ethics":56,"Interpersonal Agility":57,"Intellectual Curiosity":58},"generatedAt":"2026-02-05T15:25:19.441Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":66,"Domain Expertise":69,"Technical Fundamentals":72,"Creativity & Innovation":64,"Collaboration & Communication":63,"AI Literacy & Prompt Engineering":67,"Adaptability & Continuous Learning":68,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":73},"promptArchitectureScore":69}
  },
  {
    name: "Brand Manager",
    description: "Develops and maintains brand identity and positioning",
    domain: "operations",
    requiredSkillScores: {"aiqScore":77,"fitSkills":{"Resilience":67,"High Agency":73,"Growth Mindset":68,"Empathy & Ethics":71,"Interpersonal Agility":69,"Intellectual Curiosity":66},"generatedAt":"2026-02-05T15:37:58.376Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":71,"Domain Expertise":78,"Technical Fundamentals":63,"Creativity & Innovation":74,"Collaboration & Communication":76,"AI Literacy & Prompt Engineering":72,"Adaptability & Continuous Learning":64,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":77},"promptArchitectureScore":74}
  },
  {
    name: "Business Analyst",
    description: "Analyzes business processes and recommends improvements",
    domain: "business",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":62,"High Agency":63,"Growth Mindset":59,"Empathy & Ethics":58,"Interpersonal Agility":56,"Intellectual Curiosity":57},"generatedAt":"2026-02-05T15:27:13.857Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":69,"Domain Expertise":61,"Technical Fundamentals":64,"Creativity & Innovation":66,"Collaboration & Communication":67,"AI Literacy & Prompt Engineering":61,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":72},"promptArchitectureScore":61}
  },
  {
    name: "Business Development Manager",
    description: "Identifies growth opportunities and builds strategic partnerships",
    domain: "business",
    requiredSkillScores: {"aiqScore":74,"fitSkills":{"Resilience":74,"High Agency":77,"Growth Mindset":72,"Empathy & Ethics":71,"Interpersonal Agility":76,"Intellectual Curiosity":68},"generatedAt":"2026-02-05T15:27:36.106Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":63,"Domain Expertise":73,"Technical Fundamentals":69,"Creativity & Innovation":66,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":76,"Adaptability & Continuous Learning":67,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":76},"promptArchitectureScore":72}
  },
  {
    name: "Chief Executive Officer",
    description: "Leads overall company strategy and operations",
    domain: "business",
    requiredSkillScores: {"aiqScore":84,"fitSkills":{"Resilience":84,"High Agency":88,"Growth Mindset":79,"Empathy & Ethics":83,"Interpersonal Agility":78,"Intellectual Curiosity":76},"generatedAt":"2026-02-05T15:27:08.377Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":77,"Domain Expertise":89,"Technical Fundamentals":81,"Creativity & Innovation":82,"Collaboration & Communication":86,"AI Literacy & Prompt Engineering":86,"Adaptability & Continuous Learning":81,"Responsible AI & Ethical Awareness":86,"Critical Thinking & Problem-Solving":92},"promptArchitectureScore":81}
  },
  {
    name: "Chief Financial Officer",
    description: "Oversees financial strategy, planning, and risk management",
    domain: "finance",
    requiredSkillScores: {"aiqScore":86,"fitSkills":{"Resilience":82,"High Agency":86,"Growth Mindset":77,"Empathy & Ethics":87,"Interpersonal Agility":81,"Intellectual Curiosity":78},"generatedAt":"2026-02-05T15:37:03.239Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":88,"Domain Expertise":92,"Technical Fundamentals":76,"Creativity & Innovation":79,"Collaboration & Communication":83,"AI Literacy & Prompt Engineering":81,"Adaptability & Continuous Learning":84,"Responsible AI & Ethical Awareness":86,"Critical Thinking & Problem-Solving":89},"promptArchitectureScore":81}
  },
  {
    name: "Chief Marketing Officer",
    description: "Leads marketing strategy and brand development",
    domain: "operations",
    requiredSkillScores: {"aiqScore":84,"fitSkills":{"Resilience":84,"High Agency":87,"Growth Mindset":82,"Empathy & Ethics":83,"Interpersonal Agility":86,"Intellectual Curiosity":76},"generatedAt":"2026-02-05T15:38:34.671Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":78,"Domain Expertise":88,"Technical Fundamentals":77,"Creativity & Innovation":92,"Collaboration & Communication":89,"AI Literacy & Prompt Engineering":79,"Adaptability & Continuous Learning":81,"Responsible AI & Ethical Awareness":91,"Critical Thinking & Problem-Solving":91},"promptArchitectureScore":83}
  },
  {
    name: "Chief Operating Officer",
    description: "Manages daily operations and business processes",
    domain: "business",
    requiredSkillScores: {"aiqScore":87,"fitSkills":{"Resilience":86,"High Agency":88,"Growth Mindset":76,"Empathy & Ethics":79,"Interpersonal Agility":81,"Intellectual Curiosity":77},"generatedAt":"2026-02-05T15:26:51.058Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":83,"Domain Expertise":92,"Technical Fundamentals":82,"Creativity & Innovation":87,"Collaboration & Communication":89,"AI Literacy & Prompt Engineering":78,"Adaptability & Continuous Learning":81,"Responsible AI & Ethical Awareness":81,"Critical Thinking & Problem-Solving":91},"promptArchitectureScore":83}
  },
  {
    name: "Chief Technology Officer",
    description: "Leads technology strategy and innovation",
    domain: "technology",
    requiredSkillScores: {"aiqScore":86,"fitSkills":{"Resilience":88,"High Agency":89,"Growth Mindset":82,"Empathy & Ethics":87,"Interpersonal Agility":84,"Intellectual Curiosity":83},"generatedAt":"2026-02-05T15:36:07.161Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"standard"},"aiReadinessSkills":{"Data Fluency":79,"Domain Expertise":78,"Technical Fundamentals":76,"Creativity & Innovation":86,"Collaboration & Communication":91,"AI Literacy & Prompt Engineering":91,"Adaptability & Continuous Learning":86,"Responsible AI & Ethical Awareness":92,"Critical Thinking & Problem-Solving":86},"promptArchitectureScore":84}
  },
  {
    name: "Cloud Architect",
    description: "Designs and manages cloud infrastructure solutions",
    domain: "technology",
    requiredSkillScores: {"aiqScore":78,"fitSkills":{"Resilience":67,"High Agency":69,"Growth Mindset":63,"Empathy & Ethics":64,"Interpersonal Agility":66,"Intellectual Curiosity":68},"generatedAt":"2026-02-05T15:26:31.345Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"critical","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":73,"Domain Expertise":78,"Technical Fundamentals":74,"Creativity & Innovation":77,"Collaboration & Communication":71,"AI Literacy & Prompt Engineering":76,"Adaptability & Continuous Learning":72,"Responsible AI & Ethical Awareness":76,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":78}
  },
  {
    name: "Compliance Officer",
    description: "Ensures regulatory compliance and manages risk",
    domain: "business",
    requiredSkillScores: {"aiqScore":63,"fitSkills":{"Resilience":66,"High Agency":63,"Growth Mindset":59,"Empathy & Ethics":68,"Interpersonal Agility":61,"Intellectual Curiosity":62},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":67,"Domain Expertise":72,"Technical Fundamentals":57,"Creativity & Innovation":56,"Collaboration & Communication":64,"AI Literacy & Prompt Engineering":58,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":73,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":62}
  },
  {
    name: "Content Writer",
    description: "Creates engaging written content for various platforms",
    domain: "operations",
    requiredSkillScores: {"aiqScore":63,"fitSkills":{"Resilience":62,"High Agency":56,"Growth Mindset":59,"Empathy & Ethics":67,"Interpersonal Agility":63,"Intellectual Curiosity":64},"generatedAt":"2026-02-05T15:35:15.636Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":57,"Domain Expertise":69,"Technical Fundamentals":58,"Creativity & Innovation":72,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":61,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":63}
  },
  {
    name: "Customer Success Manager",
    description: "Ensures customer satisfaction and retention",
    domain: "operations",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":74,"High Agency":69,"Growth Mindset":68,"Empathy & Ethics":78,"Interpersonal Agility":76,"Intellectual Curiosity":67},"generatedAt":"2026-02-05T15:27:43.460Z","skillCriticality":{"Resilience":"critical","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":63,"Domain Expertise":73,"Technical Fundamentals":64,"Creativity & Innovation":66,"Collaboration & Communication":79,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":72,"Responsible AI & Ethical Awareness":76,"Critical Thinking & Problem-Solving":77},"promptArchitectureScore":67}
  },
  {
    name: "Cybersecurity Analyst",
    description: "Protects systems and data from security threats",
    domain: "technology",
    requiredSkillScores: {"aiqScore":69,"fitSkills":{"Resilience":62,"High Agency":63,"Growth Mindset":58,"Empathy & Ethics":56,"Interpersonal Agility":59,"Intellectual Curiosity":64},"generatedAt":"2026-02-05T15:35:38.401Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":68,"Domain Expertise":67,"Technical Fundamentals":66,"Creativity & Innovation":61,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":69,"Critical Thinking & Problem-Solving":72},"promptArchitectureScore":66}
  },
  {
    name: "Data Analyst",
    description: "Analyzes data to drive business decisions",
    domain: "technology",
    requiredSkillScores: {"aiqScore":68,"fitSkills":{"Resilience":63,"High Agency":62,"Growth Mindset":64,"Empathy & Ethics":66,"Interpersonal Agility":58,"Intellectual Curiosity":66},"generatedAt":"2026-02-05T15:27:46.250Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":56,"Technical Fundamentals":59,"Creativity & Innovation":57,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":67,"Adaptability & Continuous Learning":68,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":62}
  },
  {
    name: "Data Scientist",
    description: "Applies statistical and ML methods to extract insights from data",
    domain: "technology",
    requiredSkillScores: {"aiqScore":67,"fitSkills":{"Resilience":59,"High Agency":63,"Growth Mindset":58,"Empathy & Ethics":56,"Interpersonal Agility":57,"Intellectual Curiosity":62},"generatedAt":"2026-02-05T15:24:20.639Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":68,"Technical Fundamentals":64,"Creativity & Innovation":66,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":67,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":73},"promptArchitectureScore":66}
  },
  {
    name: "Database Administrator",
    description: "Manages and optimizes database systems",
    domain: "technology",
    requiredSkillScores: {"aiqScore":64,"fitSkills":{"Resilience":62,"High Agency":61,"Growth Mindset":57,"Empathy & Ethics":59,"Interpersonal Agility":56,"Intellectual Curiosity":58},"generatedAt":"2026-02-05T15:38:47.127Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":69,"Domain Expertise":72,"Technical Fundamentals":71,"Creativity & Innovation":61,"Collaboration & Communication":63,"AI Literacy & Prompt Engineering":64,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":67},"promptArchitectureScore":67}
  },
  {
    name: "DevOps Engineer",
    description: "Bridges development and operations for continuous delivery",
    domain: "technology",
    requiredSkillScores: {"aiqScore":68,"fitSkills":{"Resilience":62,"High Agency":64,"Growth Mindset":59,"Empathy & Ethics":57,"Interpersonal Agility":56,"Intellectual Curiosity":58},"generatedAt":"2026-02-05T15:26:26.043Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":61,"Domain Expertise":72,"Technical Fundamentals":67,"Creativity & Innovation":66,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":69,"Adaptability & Continuous Learning":63,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":66}
  },
  {
    name: "Digital Marketing Specialist",
    description: "Manages digital marketing campaigns and analytics",
    domain: "operations",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":62,"High Agency":69,"Growth Mindset":56,"Empathy & Ethics":63,"Interpersonal Agility":64,"Intellectual Curiosity":57},"generatedAt":"2026-02-05T15:36:42.160Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":66,"Domain Expertise":72,"Technical Fundamentals":58,"Creativity & Innovation":67,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":59,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":73},"promptArchitectureScore":66}
  },
  {
    name: "Engineering Manager",
    description: "Leads engineering teams and drives technical excellence",
    domain: "technology",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":73,"High Agency":77,"Growth Mindset":68,"Empathy & Ethics":72,"Interpersonal Agility":69,"Intellectual Curiosity":66},"generatedAt":"2026-02-05T15:26:38.633Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":63,"Domain Expertise":76,"Technical Fundamentals":71,"Creativity & Innovation":67,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":74,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":73}
  },
  {
    name: "Executive Assistant",
    description: "Provides high-level administrative support to executives",
    domain: "operations",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":66,"High Agency":64,"Growth Mindset":57,"Empathy & Ethics":67,"Interpersonal Agility":72,"Intellectual Curiosity":62},"generatedAt":"2026-02-05T15:38:15.318Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":56,"Domain Expertise":63,"Technical Fundamentals":58,"Creativity & Innovation":66,"Collaboration & Communication":69,"AI Literacy & Prompt Engineering":59,"Adaptability & Continuous Learning":68,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":66}
  },
  {
    name: "Financial Analyst",
    description: "Analyzes financial data and provides investment recommendations",
    domain: "finance",
    requiredSkillScores: {"aiqScore":69,"fitSkills":{"Resilience":66,"High Agency":61,"Growth Mindset":63,"Empathy & Ethics":58,"Interpersonal Agility":59,"Intellectual Curiosity":62},"generatedAt":"2026-02-05T15:27:39.709Z","skillCriticality":{"Resilience":"critical","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":67,"Technical Fundamentals":56,"Creativity & Innovation":61,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":64,"Adaptability & Continuous Learning":69,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":63}
  },
  {
    name: "Frontend Developer",
    description: "Builds user interfaces and client-side applications",
    domain: "technology",
    requiredSkillScores: {"aiqScore":64,"fitSkills":{"Resilience":59,"High Agency":62,"Growth Mindset":61,"Empathy & Ethics":56,"Interpersonal Agility":58,"Intellectual Curiosity":57},"generatedAt":"2026-02-05T15:36:28.504Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":63,"Domain Expertise":66,"Technical Fundamentals":72,"Creativity & Innovation":61,"Collaboration & Communication":67,"AI Literacy & Prompt Engineering":64,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":68},"promptArchitectureScore":61}
  },
  {
    name: "Full Stack Developer",
    description: "Develops both frontend and backend applications",
    domain: "technology",
    requiredSkillScores: {"aiqScore":64,"fitSkills":{"Resilience":62,"High Agency":66,"Growth Mindset":61,"Empathy & Ethics":63,"Interpersonal Agility":56,"Intellectual Curiosity":58},"generatedAt":"2026-02-05T15:38:27.138Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":67,"Domain Expertise":68,"Technical Fundamentals":72,"Creativity & Innovation":64,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":59,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":57,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":66}
  },
  {
    name: "Graphic Designer",
    description: "Creates visual content and design materials",
    domain: "operations",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":64,"High Agency":67,"Growth Mindset":61,"Empathy & Ethics":63,"Interpersonal Agility":68,"Intellectual Curiosity":69},"generatedAt":"2026-02-05T15:35:48.683Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":56,"Domain Expertise":66,"Technical Fundamentals":57,"Creativity & Innovation":72,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":58,"Adaptability & Continuous Learning":62,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":63}
  },
  {
    name: "HR Manager",
    description: "Manages human resources functions and employee relations",
    domain: "operations",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":74,"High Agency":72,"Growth Mindset":71,"Empathy & Ethics":77,"Interpersonal Agility":69,"Intellectual Curiosity":66},"generatedAt":"2026-02-05T15:39:11.122Z","skillCriticality":{"Resilience":"critical","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":67,"Domain Expertise":73,"Technical Fundamentals":63,"Creativity & Innovation":68,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":79,"Critical Thinking & Problem-Solving":81},"promptArchitectureScore":67}
  },
  {
    name: "IT Support Specialist",
    description: "Provides technical support and troubleshooting",
    domain: "technology",
    requiredSkillScores: {"aiqScore":64,"fitSkills":{"Resilience":63,"High Agency":58,"Growth Mindset":57,"Empathy & Ethics":66,"Interpersonal Agility":64,"Intellectual Curiosity":62},"generatedAt":"2026-02-05T15:37:31.337Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":56,"Domain Expertise":67,"Technical Fundamentals":72,"Creativity & Innovation":59,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":61,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":63}
  },
  {
    name: "Legal Counsel",
    description: "Provides legal advice and ensures regulatory compliance",
    domain: "business",
    requiredSkillScores: {"aiqScore":68,"fitSkills":{"Resilience":63,"High Agency":68,"Growth Mindset":59,"Empathy & Ethics":72,"Interpersonal Agility":64,"Intellectual Curiosity":66},"generatedAt":"2026-02-05T15:39:04.487Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":58,"Domain Expertise":67,"Technical Fundamentals":61,"Creativity & Innovation":56,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":57,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":69,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":66}
  },
  {
    name: "Marketing Manager",
    description: "Plans and executes marketing strategies",
    domain: "operations",
    requiredSkillScores: {"aiqScore":77,"fitSkills":{"Resilience":72,"High Agency":76,"Growth Mindset":69,"Empathy & Ethics":68,"Interpersonal Agility":73,"Intellectual Curiosity":67},"generatedAt":"2026-02-05T15:38:20.893Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":71,"Domain Expertise":74,"Technical Fundamentals":63,"Creativity & Innovation":71,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":76,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":76,"Critical Thinking & Problem-Solving":77},"promptArchitectureScore":73}
  },
  {
    name: "Mobile App Developer",
    description: "Develops mobile applications for iOS and Android",
    domain: "technology",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":56,"High Agency":62,"Growth Mindset":66,"Empathy & Ethics":57,"Interpersonal Agility":59,"Intellectual Curiosity":63},"generatedAt":"2026-02-05T15:26:58.035Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":58,"Domain Expertise":67,"Technical Fundamentals":69,"Creativity & Innovation":68,"Collaboration & Communication":71,"AI Literacy & Prompt Engineering":61,"Adaptability & Continuous Learning":72,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":73},"promptArchitectureScore":66}
  },
  {
    name: "Network Engineer",
    description: "Designs and maintains network infrastructure",
    domain: "technology",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":62,"High Agency":64,"Growth Mindset":56,"Empathy & Ethics":57,"Interpersonal Agility":59,"Intellectual Curiosity":58},"generatedAt":"2026-02-05T15:27:20.014Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":68,"Domain Expertise":72,"Technical Fundamentals":67,"Creativity & Innovation":61,"Collaboration & Communication":63,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":69,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":66}
  },
  {
    name: "Office Manager",
    description: "Oversees daily office operations and administration",
    domain: "operations",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":71,"High Agency":76,"Growth Mindset":68,"Empathy & Ethics":67,"Interpersonal Agility":74,"Intellectual Curiosity":63},"generatedAt":"2026-02-05T15:35:31.551Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":66,"Domain Expertise":64,"Technical Fundamentals":66,"Creativity & Innovation":72,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":69,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":76,"Critical Thinking & Problem-Solving":77},"promptArchitectureScore":72}
  },
  {
    name: "Operations Manager",
    description: "Oversees daily operations and process improvement",
    domain: "business",
    requiredSkillScores: {"aiqScore":77,"fitSkills":{"Resilience":74,"High Agency":76,"Growth Mindset":69,"Empathy & Ethics":71,"Interpersonal Agility":71,"Intellectual Curiosity":71},"generatedAt":"2026-02-05T15:38:40.744Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":77,"Technical Fundamentals":66,"Creativity & Innovation":63,"Collaboration & Communication":73,"AI Literacy & Prompt Engineering":76,"Adaptability & Continuous Learning":67,"Responsible AI & Ethical Awareness":78,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":74}
  },
  {
    name: "Product Manager",
    description: "Drives product strategy and roadmap",
    domain: "technology",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":72,"High Agency":76,"Growth Mindset":68,"Empathy & Ethics":67,"Interpersonal Agility":73,"Intellectual Curiosity":69},"generatedAt":"2026-02-05T15:24:52.809Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":74,"Domain Expertise":76,"Technical Fundamentals":63,"Creativity & Innovation":76,"Collaboration & Communication":71,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":77,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":78},"promptArchitectureScore":73}
  },
  {
    name: "Project Manager",
    description: "Plans and executes projects to meet business objectives",
    domain: "business",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":73,"High Agency":78,"Growth Mindset":69,"Empathy & Ethics":66,"Interpersonal Agility":68,"Intellectual Curiosity":63},"generatedAt":"2026-02-05T15:25:08.103Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":74,"Technical Fundamentals":67,"Creativity & Innovation":76,"Collaboration & Communication":77,"AI Literacy & Prompt Engineering":64,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":74}
  },
  {
    name: "Public Relations Manager",
    description: "Manages media relations and corporate communications",
    domain: "operations",
    requiredSkillScores: {"aiqScore":71,"fitSkills":{"Resilience":73,"High Agency":72,"Growth Mindset":69,"Empathy & Ethics":74,"Interpersonal Agility":78,"Intellectual Curiosity":76},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":68,"Domain Expertise":76,"Technical Fundamentals":63,"Creativity & Innovation":76,"Collaboration & Communication":77,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":76},"promptArchitectureScore":72}
  },
  {
    name: "Quality Assurance Engineer",
    description: "Ensures software quality through testing and automation",
    domain: "technology",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":63,"High Agency":62,"Growth Mindset":58,"Empathy & Ethics":64,"Interpersonal Agility":56,"Intellectual Curiosity":57},"generatedAt":"2026-02-05T15:36:15.090Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":67,"Domain Expertise":72,"Technical Fundamentals":66,"Creativity & Innovation":59,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":68,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":66}
  },
  {
    name: "Recruiter",
    description: "Sources and recruits talent for the organization",
    domain: "operations",
    requiredSkillScores: {"aiqScore":57,"fitSkills":{"Resilience":62,"High Agency":67,"Growth Mindset":59,"Empathy & Ethics":66,"Interpersonal Agility":61,"Intellectual Curiosity":56},"generatedAt":"2026-02-05T15:38:52.827Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":58,"Domain Expertise":68,"Technical Fundamentals":61,"Creativity & Innovation":57,"Collaboration & Communication":72,"AI Literacy & Prompt Engineering":63,"Adaptability & Continuous Learning":64,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":56}
  },
  {
    name: "Research Scientist",
    description: "Conducts scientific research and develops new methodologies",
    domain: "technology",
    requiredSkillScores: {"aiqScore":69,"fitSkills":{"Resilience":62,"High Agency":59,"Growth Mindset":61,"Empathy & Ethics":56,"Interpersonal Agility":57,"Intellectual Curiosity":66},"generatedAt":"2026-02-05T15:35:43.985Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":67,"Domain Expertise":72,"Technical Fundamentals":63,"Creativity & Innovation":64,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":58,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":68},"promptArchitectureScore":66}
  },
  {
    name: "SEO Specialist",
    description: "Optimizes websites for search engine visibility",
    domain: "operations",
    requiredSkillScores: {"aiqScore":67,"fitSkills":{"Resilience":62,"High Agency":66,"Growth Mindset":63,"Empathy & Ethics":56,"Interpersonal Agility":61,"Intellectual Curiosity":64},"generatedAt":"2026-02-05T15:36:58.466Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":69,"Domain Expertise":72,"Technical Fundamentals":66,"Creativity & Innovation":66,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":67,"Responsible AI & Ethical Awareness":57,"Critical Thinking & Problem-Solving":68},"promptArchitectureScore":63}
  },
  {
    name: "Sales Representative",
    description: "Generates leads and closes sales deals",
    domain: "sales",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":66,"High Agency":63,"Growth Mindset":59,"Empathy & Ethics":62,"Interpersonal Agility":72,"Intellectual Curiosity":56},"generatedAt":"2026-02-05T15:27:33.183Z","skillCriticality":{"Resilience":"critical","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":57,"Domain Expertise":67,"Technical Fundamentals":58,"Creativity & Innovation":68,"Collaboration & Communication":64,"AI Literacy & Prompt Engineering":61,"Adaptability & Continuous Learning":69,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":61}
  },
  {
    name: "Scrum Master",
    description: "Facilitates agile processes and team collaboration",
    domain: "technology",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":71,"High Agency":68,"Growth Mindset":67,"Empathy & Ethics":74,"Interpersonal Agility":76,"Intellectual Curiosity":72},"generatedAt":"2026-02-05T15:26:45.055Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":66,"Domain Expertise":77,"Technical Fundamentals":63,"Creativity & Innovation":73,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":64,"Adaptability & Continuous Learning":69,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":72}
  },
  {
    name: "Social Media Manager",
    description: "Manages social media presence and engagement",
    domain: "operations",
    requiredSkillScores: {"aiqScore":78,"fitSkills":{"Resilience":72,"High Agency":76,"Growth Mindset":66,"Empathy & Ethics":67,"Interpersonal Agility":73,"Intellectual Curiosity":71},"generatedAt":"2026-02-05T15:37:38.264Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":63,"Domain Expertise":74,"Technical Fundamentals":68,"Creativity & Innovation":77,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":69,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":74}
  },
  {
    name: "Software Engineer",
    description: "Designs and develops software applications",
    domain: "technology",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":62,"High Agency":58,"Growth Mindset":61,"Empathy & Ethics":56,"Interpersonal Agility":57,"Intellectual Curiosity":63},"generatedAt":"2026-02-05T15:23:51.462Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":64,"Domain Expertise":66,"Technical Fundamentals":72,"Creativity & Innovation":66,"Collaboration & Communication":67,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":68,"Responsible AI & Ethical Awareness":59,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":63}
  },
  {
    name: "Solutions Architect",
    description: "Designs comprehensive technical solutions for complex problems",
    domain: "technology",
    requiredSkillScores: {"aiqScore":78,"fitSkills":{"Resilience":72,"High Agency":76,"Growth Mindset":66,"Empathy & Ethics":63,"Interpersonal Agility":69,"Intellectual Curiosity":67},"generatedAt":"2026-02-05T15:36:46.131Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":73,"Domain Expertise":77,"Technical Fundamentals":74,"Creativity & Innovation":68,"Collaboration & Communication":76,"AI Literacy & Prompt Engineering":78,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":79,"Critical Thinking & Problem-Solving":81},"promptArchitectureScore":77}
  },
  {
    name: "Supply Chain Manager",
    description: "Manages supply chain operations and logistics",
    domain: "operations",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":72,"High Agency":73,"Growth Mindset":63,"Empathy & Ethics":66,"Interpersonal Agility":67,"Intellectual Curiosity":64},"generatedAt":"2026-02-05T15:38:09.281Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":71,"Domain Expertise":78,"Technical Fundamentals":69,"Creativity & Innovation":74,"Collaboration & Communication":77,"AI Literacy & Prompt Engineering":68,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":72}
  },
  {
    name: "Technical Lead",
    description: "Leads technical direction and mentors development teams",
    domain: "technology",
    requiredSkillScores: {"aiqScore":77,"fitSkills":{"Resilience":71,"High Agency":78,"Growth Mindset":64,"Empathy & Ethics":66,"Interpersonal Agility":69,"Intellectual Curiosity":63},"generatedAt":"2026-02-05T15:36:51.832Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":77,"Technical Fundamentals":73,"Creativity & Innovation":67,"Collaboration & Communication":76,"AI Literacy & Prompt Engineering":68,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":74,"Critical Thinking & Problem-Solving":76},"promptArchitectureScore":73}
  },
  {
    name: "Technical Program Manager",
    description: "Coordinates complex technical projects across teams",
    domain: "technology",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":72,"High Agency":76,"Growth Mindset":68,"Empathy & Ethics":66,"Interpersonal Agility":77,"Intellectual Curiosity":67},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":69,"Domain Expertise":73,"Technical Fundamentals":71,"Creativity & Innovation":71,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":64,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":63,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":69}
  },
  {
    name: "Technical Writer",
    description: "Creates technical documentation and user guides",
    domain: "technology",
    requiredSkillScores: {"aiqScore":63,"fitSkills":{"Resilience":59,"High Agency":61,"Growth Mindset":63,"Empathy & Ethics":62,"Interpersonal Agility":56,"Intellectual Curiosity":68},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":67,"Technical Fundamentals":66,"Creativity & Innovation":64,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":57,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":68}
  },
  {
    name: "Training & Development Specialist",
    description: "Designs and delivers employee training programs",
    domain: "operations",
    requiredSkillScores: {"aiqScore":64,"fitSkills":{"Resilience":58,"High Agency":63,"Growth Mindset":66,"Empathy & Ethics":72,"Interpersonal Agility":61,"Intellectual Curiosity":56},"generatedAt":"2026-02-05T15:38:58.031Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"critical","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":59,"Domain Expertise":61,"Technical Fundamentals":57,"Creativity & Innovation":64,"Collaboration & Communication":69,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":62,"Responsible AI & Ethical Awareness":67,"Critical Thinking & Problem-Solving":68},"promptArchitectureScore":59}
  },
  {
    name: "UI/UX Designer",
    description: "Designs user interfaces and user experiences",
    domain: "technology",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":61,"High Agency":63,"Growth Mindset":59,"Empathy & Ethics":69,"Interpersonal Agility":66,"Intellectual Curiosity":58},"generatedAt":"2026-02-05T15:25:55.909Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":56,"Domain Expertise":67,"Technical Fundamentals":57,"Creativity & Innovation":72,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":62,"Adaptability & Continuous Learning":64,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":62}
  },
  {
    name: "User Researcher",
    description: "Studies user behavior to inform product design",
    domain: "technology",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":59,"High Agency":62,"Growth Mindset":66,"Empathy & Ethics":72,"Interpersonal Agility":67,"Intellectual Curiosity":69},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":61,"Domain Expertise":63,"Technical Fundamentals":56,"Creativity & Innovation":68,"Collaboration & Communication":71,"AI Literacy & Prompt Engineering":58,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":64,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":61}
  },
  {
    name: "VP of Engineering",
    description: "Leads engineering teams and drives technical strategy",
    domain: "technology",
    requiredSkillScores: {"aiqScore":82,"fitSkills":{"Resilience":86,"High Agency":92,"Growth Mindset":87,"Empathy & Ethics":76,"Interpersonal Agility":88,"Intellectual Curiosity":82},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":79,"Domain Expertise":89,"Technical Fundamentals":91,"Creativity & Innovation":81,"Collaboration & Communication":91,"AI Literacy & Prompt Engineering":77,"Adaptability & Continuous Learning":83,"Responsible AI & Ethical Awareness":78,"Critical Thinking & Problem-Solving":93},"promptArchitectureScore":79}
  },
  {
    name: "VP of Sales",
    description: "Leads sales strategy and manages sales teams",
    domain: "sales",
    requiredSkillScores: {"aiqScore":83,"fitSkills":{"Resilience":87,"High Agency":89,"Growth Mindset":86,"Empathy & Ethics":83,"Interpersonal Agility":92,"Intellectual Curiosity":82},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":84,"Domain Expertise":88,"Technical Fundamentals":76,"Creativity & Innovation":86,"Collaboration & Communication":91,"AI Literacy & Prompt Engineering":77,"Adaptability & Continuous Learning":86,"Responsible AI & Ethical Awareness":78,"Critical Thinking & Problem-Solving":91},"promptArchitectureScore":81}
  },
  {
    name: "Video Producer",
    description: "Produces video content for marketing and communications",
    domain: "operations",
    requiredSkillScores: {"aiqScore":67,"fitSkills":{"Resilience":66,"High Agency":63,"Growth Mindset":62,"Empathy & Ethics":56,"Interpersonal Agility":64,"Intellectual Curiosity":59},"generatedAt":"2026-02-05T15:35:57.805Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":57,"Domain Expertise":68,"Technical Fundamentals":58,"Creativity & Innovation":72,"Collaboration & Communication":69,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":67},"promptArchitectureScore":66}
  },
  {
    name: "Junior Software Developer",
    description: "Writes and maintains code under senior guidance",
    domain: "technology",
    requiredSkillScores: {"aiqScore":58,"fitSkills":{"Resilience":52,"High Agency":53,"Growth Mindset":62,"Empathy & Ethics":48,"Interpersonal Agility":49,"Intellectual Curiosity":61},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"critical","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":54,"Domain Expertise":56,"Technical Fundamentals":63,"Creativity & Innovation":57,"Collaboration & Communication":58,"AI Literacy & Prompt Engineering":59,"Adaptability & Continuous Learning":64,"Responsible AI & Ethical Awareness":56,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":56}
  },
  {
    name: "Junior Data Analyst",
    description: "Assists with data collection, cleaning, and basic analysis",
    domain: "technology",
    requiredSkillScores: {"aiqScore":56,"fitSkills":{"Resilience":52,"High Agency":53,"Growth Mindset":59,"Empathy & Ethics":49,"Interpersonal Agility":48,"Intellectual Curiosity":61},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"critical","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":62,"Domain Expertise":54,"Technical Fundamentals":56,"Creativity & Innovation":56,"Collaboration & Communication":56,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":56,"Critical Thinking & Problem-Solving":63},"promptArchitectureScore":53}
  },
  {
    name: "Marketing Coordinator",
    description: "Supports marketing campaigns and coordinates promotional activities",
    domain: "operations",
    requiredSkillScores: {"aiqScore":61,"fitSkills":{"Resilience":58,"High Agency":61,"Growth Mindset":64,"Empathy & Ethics":66,"Interpersonal Agility":67,"Intellectual Curiosity":62},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":63,"Domain Expertise":66,"Technical Fundamentals":56,"Creativity & Innovation":69,"Collaboration & Communication":72,"AI Literacy & Prompt Engineering":59,"Adaptability & Continuous Learning":68,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":59}
  },
  {
    name: "Sales Development Representative",
    description: "Generates and qualifies leads for the sales team",
    domain: "sales",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":67,"High Agency":69,"Growth Mindset":63,"Empathy & Ethics":66,"Interpersonal Agility":72,"Intellectual Curiosity":59},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":57,"Domain Expertise":62,"Technical Fundamentals":56,"Creativity & Innovation":64,"Collaboration & Communication":71,"AI Literacy & Prompt Engineering":58,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":57}
  },
  {
    name: "Customer Service Representative",
    description: "Handles customer inquiries and resolves issues",
    domain: "operations",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":66,"High Agency":63,"Growth Mindset":61,"Empathy & Ethics":72,"Interpersonal Agility":69,"Intellectual Curiosity":58},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":57,"Domain Expertise":62,"Technical Fundamentals":56,"Creativity & Innovation":59,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":61,"Adaptability & Continuous Learning":64,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":57}
  },
  {
    name: "HR Coordinator",
    description: "Supports HR operations including onboarding and employee records",
    domain: "operations",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":63,"High Agency":64,"Growth Mindset":66,"Empathy & Ethics":72,"Interpersonal Agility":69,"Intellectual Curiosity":59},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":61,"Domain Expertise":66,"Technical Fundamentals":56,"Creativity & Innovation":57,"Collaboration & Communication":71,"AI Literacy & Prompt Engineering":58,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":62,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":57}
  },
  {
    name: "Administrative Assistant",
    description: "Provides clerical and organizational support",
    domain: "operations",
    requiredSkillScores: {"aiqScore":52,"fitSkills":{"Resilience":58,"High Agency":59,"Growth Mindset":56,"Empathy & Ethics":61,"Interpersonal Agility":62,"Intellectual Curiosity":52},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":51,"Domain Expertise":54,"Technical Fundamentals":48,"Creativity & Innovation":53,"Collaboration & Communication":63,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":57,"Responsible AI & Ethical Awareness":56,"Critical Thinking & Problem-Solving":61},"promptArchitectureScore":52}
  },
  {
    name: "Junior Graphic Designer",
    description: "Creates visual assets under creative direction",
    domain: "operations",
    requiredSkillScores: {"aiqScore":52,"fitSkills":{"Resilience":49,"High Agency":51,"Growth Mindset":56,"Empathy & Ethics":52,"Interpersonal Agility":53,"Intellectual Curiosity":57},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":48,"Domain Expertise":54,"Technical Fundamentals":56,"Creativity & Innovation":62,"Collaboration & Communication":56,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":58,"Responsible AI & Ethical Awareness":51,"Critical Thinking & Problem-Solving":56},"promptArchitectureScore":52}
  },
  {
    name: "Accounting Clerk",
    description: "Processes financial transactions and maintains accounting records",
    domain: "finance",
    requiredSkillScores: {"aiqScore":54,"fitSkills":{"Resilience":56,"High Agency":57,"Growth Mindset":54,"Empathy & Ethics":59,"Interpersonal Agility":58,"Intellectual Curiosity":52},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":62,"Domain Expertise":61,"Technical Fundamentals":53,"Creativity & Innovation":48,"Collaboration & Communication":61,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":63},"promptArchitectureScore":51}
  },
  {
    name: "Junior QA Tester",
    description: "Executes test cases and reports software defects",
    domain: "technology",
    requiredSkillScores: {"aiqScore":54,"fitSkills":{"Resilience":52,"High Agency":51,"Growth Mindset":59,"Empathy & Ethics":49,"Interpersonal Agility":48,"Intellectual Curiosity":58},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"critical","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":53,"Domain Expertise":54,"Technical Fundamentals":61,"Creativity & Innovation":51,"Collaboration & Communication":56,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":51,"Critical Thinking & Problem-Solving":62},"promptArchitectureScore":52}
  },
  {
    name: "Content Marketing Associate",
    description: "Creates and distributes content to attract and engage audiences",
    domain: "operations",
    requiredSkillScores: {"aiqScore":61,"fitSkills":{"Resilience":57,"High Agency":62,"Growth Mindset":64,"Empathy & Ethics":63,"Interpersonal Agility":61,"Intellectual Curiosity":66},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":59,"Domain Expertise":66,"Technical Fundamentals":56,"Creativity & Innovation":72,"Collaboration & Communication":67,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":68,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":61}
  },
  {
    name: "Logistics Coordinator",
    description: "Coordinates shipping, inventory, and supply chain activities",
    domain: "operations",
    requiredSkillScores: {"aiqScore":61,"fitSkills":{"Resilience":68,"High Agency":72,"Growth Mindset":62,"Empathy & Ethics":66,"Interpersonal Agility":67,"Intellectual Curiosity":58},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":63,"Domain Expertise":69,"Technical Fundamentals":57,"Creativity & Innovation":56,"Collaboration & Communication":73,"AI Literacy & Prompt Engineering":59,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":71},"promptArchitectureScore":58}
  },
  {
    name: "Helpdesk Technician",
    description: "Provides first-level technical support to end users",
    domain: "technology",
    requiredSkillScores: {"aiqScore":53,"fitSkills":{"Resilience":59,"High Agency":56,"Growth Mindset":57,"Empathy & Ethics":62,"Interpersonal Agility":63,"Intellectual Curiosity":58},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":52,"Domain Expertise":61,"Technical Fundamentals":64,"Creativity & Innovation":48,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":53,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":51,"Critical Thinking & Problem-Solving":61},"promptArchitectureScore":53}
  },
  {
    name: "Procurement Assistant",
    description: "Assists with purchasing processes and vendor management",
    domain: "operations",
    requiredSkillScores: {"aiqScore":54,"fitSkills":{"Resilience":58,"High Agency":62,"Growth Mindset":56,"Empathy & Ethics":61,"Interpersonal Agility":63,"Intellectual Curiosity":53},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":57,"Domain Expertise":59,"Technical Fundamentals":48,"Creativity & Innovation":49,"Collaboration & Communication":64,"AI Literacy & Prompt Engineering":52,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":51}
  },
  {
    name: "Junior Accountant",
    description: "Prepares financial statements and assists with audits",
    domain: "finance",
    requiredSkillScores: {"aiqScore":54,"fitSkills":{"Resilience":53,"High Agency":54,"Growth Mindset":56,"Empathy & Ethics":57,"Interpersonal Agility":52,"Intellectual Curiosity":56},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":62,"Domain Expertise":58,"Technical Fundamentals":56,"Creativity & Innovation":48,"Collaboration & Communication":56,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":56,"Responsible AI & Ethical Awareness":59,"Critical Thinking & Problem-Solving":61},"promptArchitectureScore":52}
  },
  {
    name: "Research Assistant",
    description: "Supports research projects with data gathering and analysis",
    domain: "technology",
    requiredSkillScores: {"aiqScore":54,"fitSkills":{"Resilience":52,"High Agency":51,"Growth Mindset":58,"Empathy & Ethics":53,"Interpersonal Agility":48,"Intellectual Curiosity":62},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"critical","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":59,"Domain Expertise":54,"Technical Fundamentals":56,"Creativity & Innovation":56,"Collaboration & Communication":56,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":56,"Critical Thinking & Problem-Solving":63},"promptArchitectureScore":52}
  },
  {
    name: "Event Coordinator",
    description: "Plans and coordinates corporate events and conferences",
    domain: "operations",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":66,"High Agency":68,"Growth Mindset":63,"Empathy & Ethics":67,"Interpersonal Agility":72,"Intellectual Curiosity":62},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"standard"},"aiReadinessSkills":{"Data Fluency":58,"Domain Expertise":64,"Technical Fundamentals":56,"Creativity & Innovation":66,"Collaboration & Communication":73,"AI Literacy & Prompt Engineering":59,"Adaptability & Continuous Learning":69,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":58}
  },
  {
    name: "Copywriter",
    description: "Writes persuasive marketing and advertising copy",
    domain: "operations",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":58,"High Agency":62,"Growth Mindset":63,"Empathy & Ethics":64,"Interpersonal Agility":66,"Intellectual Curiosity":67},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":57,"Domain Expertise":66,"Technical Fundamentals":56,"Creativity & Innovation":72,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":59,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":62}
  },
  {
    name: "Junior DevOps Engineer",
    description: "Assists with CI/CD pipelines and infrastructure automation",
    domain: "technology",
    requiredSkillScores: {"aiqScore":57,"fitSkills":{"Resilience":53,"High Agency":54,"Growth Mindset":61,"Empathy & Ethics":48,"Interpersonal Agility":49,"Intellectual Curiosity":59},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"critical","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":56,"Domain Expertise":56,"Technical Fundamentals":62,"Creativity & Innovation":51,"Collaboration & Communication":57,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":63,"Responsible AI & Ethical Awareness":52,"Critical Thinking & Problem-Solving":64},"promptArchitectureScore":56}
  },
  {
    name: "Paralegal",
    description: "Assists lawyers with legal research and document preparation",
    domain: "business",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":66,"High Agency":64,"Growth Mindset":62,"Empathy & Ethics":72,"Interpersonal Agility":67,"Intellectual Curiosity":66},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":61,"Domain Expertise":68,"Technical Fundamentals":56,"Creativity & Innovation":57,"Collaboration & Communication":69,"AI Literacy & Prompt Engineering":58,"Adaptability & Continuous Learning":63,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":73},"promptArchitectureScore":59}
  },
  {
    name: "Warehouse Associate",
    description: "Manages inventory storage, packing, and shipping operations",
    domain: "operations",
    requiredSkillScores: {"aiqScore":52,"fitSkills":{"Resilience":62,"High Agency":59,"Growth Mindset":56,"Empathy & Ethics":57,"Interpersonal Agility":58,"Intellectual Curiosity":52},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":49,"Domain Expertise":54,"Technical Fundamentals":53,"Creativity & Innovation":48,"Collaboration & Communication":61,"AI Literacy & Prompt Engineering":51,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":56,"Critical Thinking & Problem-Solving":61},"promptArchitectureScore":49}
  },
  {
    name: "Junior UX Designer",
    description: "Creates wireframes and prototypes under senior design guidance",
    domain: "technology",
    requiredSkillScores: {"aiqScore":54,"fitSkills":{"Resilience":48,"High Agency":52,"Growth Mindset":58,"Empathy & Ethics":59,"Interpersonal Agility":54,"Intellectual Curiosity":56},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"critical","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":49,"Domain Expertise":53,"Technical Fundamentals":56,"Creativity & Innovation":62,"Collaboration & Communication":57,"AI Literacy & Prompt Engineering":56,"Adaptability & Continuous Learning":61,"Responsible AI & Ethical Awareness":51,"Critical Thinking & Problem-Solving":61},"promptArchitectureScore":51}
  },
  {
    name: "Payroll Specialist",
    description: "Processes employee payroll and manages compensation records",
    domain: "finance",
    requiredSkillScores: {"aiqScore":54,"fitSkills":{"Resilience":59,"High Agency":62,"Growth Mindset":56,"Empathy & Ethics":63,"Interpersonal Agility":58,"Intellectual Curiosity":53},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":64,"Domain Expertise":66,"Technical Fundamentals":54,"Creativity & Innovation":48,"Collaboration & Communication":61,"AI Literacy & Prompt Engineering":51,"Adaptability & Continuous Learning":57,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":53}
  },
  {
    name: "Social Media Coordinator",
    description: "Creates and schedules social media content across platforms",
    domain: "operations",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":59,"High Agency":63,"Growth Mindset":66,"Empathy & Ethics":64,"Interpersonal Agility":67,"Intellectual Curiosity":61},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":61,"Domain Expertise":62,"Technical Fundamentals":56,"Creativity & Innovation":72,"Collaboration & Communication":68,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":69,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":66},"promptArchitectureScore":62}
  },
  {
    name: "Junior Project Coordinator",
    description: "Assists project managers with scheduling, tracking, and documentation",
    domain: "business",
    requiredSkillScores: {"aiqScore":52,"fitSkills":{"Resilience":54,"High Agency":56,"Growth Mindset":57,"Empathy & Ethics":58,"Interpersonal Agility":62,"Intellectual Curiosity":51},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"critical","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":52,"Domain Expertise":53,"Technical Fundamentals":48,"Creativity & Innovation":49,"Collaboration & Communication":63,"AI Literacy & Prompt Engineering":51,"Adaptability & Continuous Learning":59,"Responsible AI & Ethical Awareness":51,"Critical Thinking & Problem-Solving":61},"promptArchitectureScore":49}
  },
  {
    name: "Receptionist",
    description: "Manages front desk operations and visitor management",
    domain: "operations",
    requiredSkillScores: {"aiqScore":52,"fitSkills":{"Resilience":57,"High Agency":56,"Growth Mindset":53,"Empathy & Ethics":62,"Interpersonal Agility":63,"Intellectual Curiosity":51},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":49,"Domain Expertise":52,"Technical Fundamentals":48,"Creativity & Innovation":51,"Collaboration & Communication":64,"AI Literacy & Prompt Engineering":51,"Adaptability & Continuous Learning":54,"Responsible AI & Ethical Awareness":56,"Critical Thinking & Problem-Solving":56},"promptArchitectureScore":49}
  },
  {
    name: "Lab Technician",
    description: "Conducts laboratory tests and maintains lab equipment",
    domain: "technology",
    requiredSkillScores: {"aiqScore":53,"fitSkills":{"Resilience":53,"High Agency":51,"Growth Mindset":57,"Empathy & Ethics":52,"Interpersonal Agility":48,"Intellectual Curiosity":61},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"critical","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":58,"Domain Expertise":59,"Technical Fundamentals":62,"Creativity & Innovation":49,"Collaboration & Communication":54,"AI Literacy & Prompt Engineering":51,"Adaptability & Continuous Learning":56,"Responsible AI & Ethical Awareness":56,"Critical Thinking & Problem-Solving":63},"promptArchitectureScore":52}
  },
  {
    name: "Talent Acquisition Specialist",
    description: "Sources and recruits candidates through modern hiring practices",
    domain: "operations",
    requiredSkillScores: {"aiqScore":62,"fitSkills":{"Resilience":62,"High Agency":66,"Growth Mindset":63,"Empathy & Ethics":68,"Interpersonal Agility":72,"Intellectual Curiosity":64},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":58,"Domain Expertise":66,"Technical Fundamentals":56,"Creativity & Innovation":66,"Collaboration & Communication":69,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":67},"promptArchitectureScore":62}
  },
  {
    name: "Program Manager",
    description: "Oversees multiple related projects to achieve strategic objectives",
    domain: "business",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":71,"High Agency":74,"Growth Mindset":66,"Empathy & Ethics":68,"Interpersonal Agility":76,"Intellectual Curiosity":63},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":67,"Domain Expertise":72,"Technical Fundamentals":64,"Creativity & Innovation":66,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":69,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":77},"promptArchitectureScore":66}
  },
  {
    name: "Senior Software Engineer",
    description: "Leads complex software development and mentors junior engineers",
    domain: "technology",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":66,"High Agency":72,"Growth Mindset":67,"Empathy & Ethics":63,"Interpersonal Agility":68,"Intellectual Curiosity":71},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":73,"Domain Expertise":74,"Technical Fundamentals":77,"Creativity & Innovation":76,"Collaboration & Communication":76,"AI Literacy & Prompt Engineering":76,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":69,"Critical Thinking & Problem-Solving":78},"promptArchitectureScore":74}
  },
  {
    name: "Senior Data Scientist",
    description: "Leads advanced analytics and builds production ML models",
    domain: "technology",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":64,"High Agency":68,"Growth Mindset":72,"Empathy & Ethics":63,"Interpersonal Agility":66,"Intellectual Curiosity":74},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":78,"Domain Expertise":76,"Technical Fundamentals":77,"Creativity & Innovation":73,"Collaboration & Communication":69,"AI Literacy & Prompt Engineering":76,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":76,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":73}
  },
  {
    name: "Senior Product Manager",
    description: "Drives product strategy for major product lines or portfolios",
    domain: "technology",
    requiredSkillScores: {"aiqScore":71,"fitSkills":{"Resilience":66,"High Agency":71,"Growth Mindset":63,"Empathy & Ethics":67,"Interpersonal Agility":72,"Intellectual Curiosity":68},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":69,"Domain Expertise":73,"Technical Fundamentals":64,"Creativity & Innovation":74,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":68}
  },
  {
    name: "Director of Engineering",
    description: "Directs engineering departments and drives organizational strategy",
    domain: "technology",
    requiredSkillScores: {"aiqScore":86,"fitSkills":{"Resilience":83,"High Agency":89,"Growth Mindset":78,"Empathy & Ethics":76,"Interpersonal Agility":84,"Intellectual Curiosity":81},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":79,"Domain Expertise":91,"Technical Fundamentals":86,"Creativity & Innovation":82,"Collaboration & Communication":92,"AI Literacy & Prompt Engineering":86,"Adaptability & Continuous Learning":86,"Responsible AI & Ethical Awareness":77,"Critical Thinking & Problem-Solving":93},"promptArchitectureScore":83}
  },
  {
    name: "Director of Marketing",
    description: "Directs marketing strategy and manages marketing teams",
    domain: "operations",
    requiredSkillScores: {"aiqScore":86,"fitSkills":{"Resilience":86,"High Agency":89,"Growth Mindset":82,"Empathy & Ethics":83,"Interpersonal Agility":87,"Intellectual Curiosity":78},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":84,"Domain Expertise":88,"Technical Fundamentals":76,"Creativity & Innovation":92,"Collaboration & Communication":91,"AI Literacy & Prompt Engineering":79,"Adaptability & Continuous Learning":86,"Responsible AI & Ethical Awareness":81,"Critical Thinking & Problem-Solving":91},"promptArchitectureScore":83}
  },
  {
    name: "Director of Sales",
    description: "Directs sales operations and revenue strategy",
    domain: "sales",
    requiredSkillScores: {"aiqScore":83,"fitSkills":{"Resilience":87,"High Agency":89,"Growth Mindset":83,"Empathy & Ethics":84,"Interpersonal Agility":91,"Intellectual Curiosity":82},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"critical","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":86,"Domain Expertise":88,"Technical Fundamentals":76,"Creativity & Innovation":86,"Collaboration & Communication":92,"AI Literacy & Prompt Engineering":77,"Adaptability & Continuous Learning":86,"Responsible AI & Ethical Awareness":78,"Critical Thinking & Problem-Solving":91},"promptArchitectureScore":82}
  },
  {
    name: "Director of Finance",
    description: "Directs financial planning, budgeting, and reporting",
    domain: "finance",
    requiredSkillScores: {"aiqScore":86,"fitSkills":{"Resilience":82,"High Agency":86,"Growth Mindset":78,"Empathy & Ethics":84,"Interpersonal Agility":83,"Intellectual Curiosity":79},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":87,"Domain Expertise":92,"Technical Fundamentals":81,"Creativity & Innovation":76,"Collaboration & Communication":86,"AI Literacy & Prompt Engineering":77,"Adaptability & Continuous Learning":81,"Responsible AI & Ethical Awareness":86,"Critical Thinking & Problem-Solving":93},"promptArchitectureScore":79}
  },
  {
    name: "Senior UX Designer",
    description: "Leads user experience design for products and platforms",
    domain: "technology",
    requiredSkillScores: {"aiqScore":71,"fitSkills":{"Resilience":63,"High Agency":66,"Growth Mindset":68,"Empathy & Ethics":73,"Interpersonal Agility":72,"Intellectual Curiosity":74},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"critical","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":64,"Domain Expertise":76,"Technical Fundamentals":69,"Creativity & Innovation":78,"Collaboration & Communication":76,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":66,"Critical Thinking & Problem-Solving":76},"promptArchitectureScore":72}
  },
  {
    name: "Data Engineer",
    description: "Builds and maintains data pipelines and infrastructure",
    domain: "technology",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":58,"High Agency":59,"Growth Mindset":62,"Empathy & Ethics":56,"Interpersonal Agility":57,"Intellectual Curiosity":63},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"standard","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":66,"Technical Fundamentals":68,"Creativity & Innovation":61,"Collaboration & Communication":64,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":64}
  },
  {
    name: "Information Security Manager",
    description: "Manages security programs and incident response teams",
    domain: "technology",
    requiredSkillScores: {"aiqScore":73,"fitSkills":{"Resilience":72,"High Agency":69,"Growth Mindset":66,"Empathy & Ethics":67,"Interpersonal Agility":68,"Intellectual Curiosity":73},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":71,"Domain Expertise":77,"Technical Fundamentals":76,"Creativity & Innovation":63,"Collaboration & Communication":74,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":78,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":72}
  },
  {
    name: "Revenue Operations Manager",
    description: "Aligns sales, marketing, and customer success for revenue growth",
    domain: "business",
    requiredSkillScores: {"aiqScore":73,"fitSkills":{"Resilience":68,"High Agency":74,"Growth Mindset":66,"Empathy & Ethics":67,"Interpersonal Agility":72,"Intellectual Curiosity":69},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":76,"Domain Expertise":76,"Technical Fundamentals":71,"Creativity & Innovation":63,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":64,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":68}
  },
  {
    name: "Customer Experience Manager",
    description: "Designs and improves end-to-end customer journeys",
    domain: "operations",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":69,"High Agency":71,"Growth Mindset":67,"Empathy & Ethics":76,"Interpersonal Agility":74,"Intellectual Curiosity":66},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":68,"Domain Expertise":72,"Technical Fundamentals":63,"Creativity & Innovation":73,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":76},"promptArchitectureScore":67}
  },
  {
    name: "Learning & Development Manager",
    description: "Designs organizational learning programs and career development paths",
    domain: "operations",
    requiredSkillScores: {"aiqScore":72,"fitSkills":{"Resilience":68,"High Agency":72,"Growth Mindset":76,"Empathy & Ethics":77,"Interpersonal Agility":78,"Intellectual Curiosity":73},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":66,"Domain Expertise":74,"Technical Fundamentals":63,"Creativity & Innovation":76,"Collaboration & Communication":79,"AI Literacy & Prompt Engineering":69,"Adaptability & Continuous Learning":81,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":76},"promptArchitectureScore":68}
  },
  {
    name: "Strategic Account Manager",
    description: "Manages high-value enterprise accounts and strategic partnerships",
    domain: "sales",
    requiredSkillScores: {"aiqScore":71,"fitSkills":{"Resilience":72,"High Agency":76,"Growth Mindset":67,"Empathy & Ethics":73,"Interpersonal Agility":77,"Intellectual Curiosity":68},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"critical","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":69,"Domain Expertise":74,"Technical Fundamentals":63,"Creativity & Innovation":71,"Collaboration & Communication":78,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":68}
  },
  {
    name: "Head of People Operations",
    description: "Leads people strategy including culture, engagement, and retention",
    domain: "operations",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":76,"High Agency":78,"Growth Mindset":77,"Empathy & Ethics":81,"Interpersonal Agility":82,"Intellectual Curiosity":74},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":73,"Domain Expertise":79,"Technical Fundamentals":72,"Creativity & Innovation":81,"Collaboration & Communication":83,"AI Literacy & Prompt Engineering":76,"Adaptability & Continuous Learning":81,"Responsible AI & Ethical Awareness":81,"Critical Thinking & Problem-Solving":81},"promptArchitectureScore":73}
  },
  {
    name: "Site Reliability Engineer",
    description: "Ensures system reliability, uptime, and performance at scale",
    domain: "technology",
    requiredSkillScores: {"aiqScore":67,"fitSkills":{"Resilience":62,"High Agency":61,"Growth Mindset":63,"Empathy & Ethics":56,"Interpersonal Agility":58,"Intellectual Curiosity":64},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":66,"Domain Expertise":67,"Technical Fundamentals":72,"Creativity & Innovation":59,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":68,"Responsible AI & Ethical Awareness":61,"Critical Thinking & Problem-Solving":69},"promptArchitectureScore":66}
  },
  {
    name: "AI Ethics Officer",
    description: "Ensures responsible AI governance and ethical AI practices",
    domain: "business",
    requiredSkillScores: {"aiqScore":66,"fitSkills":{"Resilience":56,"High Agency":57,"Growth Mindset":62,"Empathy & Ethics":69,"Interpersonal Agility":63,"Intellectual Curiosity":64},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":58,"Domain Expertise":66,"Technical Fundamentals":59,"Creativity & Innovation":61,"Collaboration & Communication":66,"AI Literacy & Prompt Engineering":66,"Adaptability & Continuous Learning":66,"Responsible AI & Ethical Awareness":72,"Critical Thinking & Problem-Solving":67},"promptArchitectureScore":63}
  },
  {
    name: "Growth Marketing Manager",
    description: "Drives user acquisition and retention through data-driven strategies",
    domain: "operations",
    requiredSkillScores: {"aiqScore":76,"fitSkills":{"Resilience":67,"High Agency":74,"Growth Mindset":71,"Empathy & Ethics":66,"Interpersonal Agility":68,"Intellectual Curiosity":69},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":76,"Domain Expertise":76,"Technical Fundamentals":71,"Creativity & Innovation":78,"Collaboration & Communication":77,"AI Literacy & Prompt Engineering":72,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":63,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":71}
  },
  {
    name: "Enterprise Architect",
    description: "Designs enterprise-wide technology architecture and standards",
    domain: "technology",
    requiredSkillScores: {"aiqScore":74,"fitSkills":{"Resilience":66,"High Agency":69,"Growth Mindset":67,"Empathy & Ethics":63,"Interpersonal Agility":68,"Intellectual Curiosity":71},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"standard","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"critical","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"critical","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"standard","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":72,"Domain Expertise":77,"Technical Fundamentals":78,"Creativity & Innovation":73,"Collaboration & Communication":74,"AI Literacy & Prompt Engineering":76,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":71,"Critical Thinking & Problem-Solving":79},"promptArchitectureScore":74}
  },
  {
    name: "Risk Manager",
    description: "Identifies, assesses, and mitigates organizational risks",
    domain: "business",
    requiredSkillScores: {"aiqScore":71,"fitSkills":{"Resilience":71,"High Agency":72,"Growth Mindset":66,"Empathy & Ethics":73,"Interpersonal Agility":68,"Intellectual Curiosity":69},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"critical","Growth Mindset":"standard","Domain Expertise":"critical","Empathy & Ethics":"critical","Interpersonal Agility":"standard","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"standard","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"standard","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"critical"},"aiReadinessSkills":{"Data Fluency":74,"Domain Expertise":76,"Technical Fundamentals":67,"Creativity & Innovation":63,"Collaboration & Communication":76,"AI Literacy & Prompt Engineering":71,"Adaptability & Continuous Learning":71,"Responsible AI & Ethical Awareness":77,"Critical Thinking & Problem-Solving":78},"promptArchitectureScore":68}
  },
  {
    name: "Diversity & Inclusion Manager",
    description: "Develops and implements diversity, equity, and inclusion programs",
    domain: "operations",
    requiredSkillScores: {"aiqScore":69,"fitSkills":{"Resilience":72,"High Agency":73,"Growth Mindset":74,"Empathy & Ethics":78,"Interpersonal Agility":77,"Intellectual Curiosity":76},"generatedAt":"2026-02-06T10:00:00.000Z","skillCriticality":{"Resilience":"standard","High Agency":"standard","Data Fluency":"standard","Growth Mindset":"standard","Domain Expertise":"standard","Empathy & Ethics":"critical","Interpersonal Agility":"critical","Intellectual Curiosity":"standard","Technical Fundamentals":"standard","Creativity & Innovation":"critical","Collaboration & Communication":"critical","AI Literacy & Prompt Engineering":"standard","Adaptability & Continuous Learning":"critical","Responsible AI & Ethical Awareness":"critical","Critical Thinking & Problem-Solving":"standard"},"aiReadinessSkills":{"Data Fluency":66,"Domain Expertise":76,"Technical Fundamentals":63,"Creativity & Innovation":76,"Collaboration & Communication":79,"AI Literacy & Prompt Engineering":67,"Adaptability & Continuous Learning":76,"Responsible AI & Ethical Awareness":81,"Critical Thinking & Problem-Solving":76},"promptArchitectureScore":67}
  }
];

const NAME_ALIASES: Record<string, string> = {
  "UX/UI Designer": "UI/UX Designer",
  "Training Specialist": "Training & Development Specialist",
};

function isRoleDataComplete(rss: any): boolean {
  if (!rss) return false;
  if (!rss.aiqScore || !rss.promptArchitectureScore) return false;
  if (!rss.skillCriticality) return false;
  if (!rss.fitSkills || Object.keys(rss.fitSkills).length < 6) return false;
  if (!rss.aiReadinessSkills || Object.keys(rss.aiReadinessSkills).length < 9) return false;
  const critKeys = Object.keys(rss.skillCriticality);
  if (critKeys.length < 15) return false;
  const hasFullNames = critKeys.some(k => k.includes('&'));
  if (!hasFullNames) return false;
  return true;
}

export async function syncCanonicalRoles(): Promise<void> {
  try {
    const existingRoles = await storage.getAllJobRoles();
    const existingByName: Record<string, any> = {};
    for (const role of existingRoles) {
      existingByName[role.name] = role;
    }

    let updated = 0;
    let inserted = 0;
    let renamed = 0;

    for (const [oldName, newName] of Object.entries(NAME_ALIASES)) {
      if (existingByName[oldName] && !existingByName[newName]) {
        await storage.updateJobRole(existingByName[oldName].id, { name: newName });
        existingByName[newName] = { ...existingByName[oldName], name: newName };
        delete existingByName[oldName];
        renamed++;
      }
    }

    for (const canonical of CANONICAL_ROLES) {
      const existing = existingByName[canonical.name];
      if (existing) {
        if (!isRoleDataComplete(existing.requiredSkillScores)) {
          await storage.updateJobRole(existing.id, {
            requiredSkillScores: canonical.requiredSkillScores,
            description: canonical.description,
            domain: canonical.domain,
          });
          updated++;
        }
      } else {
        await storage.createJobRole({
          name: canonical.name,
          description: canonical.description,
          competencies: [],
          domain: canonical.domain,
          requiredSkillScores: canonical.requiredSkillScores,
        });
        inserted++;
      }
    }

    if (renamed > 0 || updated > 0 || inserted > 0) {
      console.log(`[Role Sync] Completed: ${renamed} renamed, ${updated} updated, ${inserted} inserted`);
    } else {
      console.log('[Role Sync] All roles already in sync');
    }
  } catch (error) {
    console.error('[Role Sync] Error syncing roles:', error);
  }
}

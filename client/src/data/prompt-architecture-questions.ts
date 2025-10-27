export interface PromptArchitectureLevel {
  level: number;
  title: string;
  description: string;
  scenario: string;
  taskInstructions: string;
  evaluationCriteria: {
    clarity: string;
    structure: string;
    contextRelevance: string;
    creativity: string;
    iterativeImprovement: string;
  };
}

export const PROMPT_ARCHITECTURE_LEVELS: PromptArchitectureLevel[] = [
  {
    level: 1,
    title: "Basic Task Prompt",
    description: "Create a simple, clear prompt for a basic AI task",
    scenario: "You need an AI to summarize a research article about climate change for a general audience.",
    taskInstructions: "Write a prompt that would instruct an AI (like GPT-5) to create a concise, accessible summary of a climate change research article. Your prompt should be clear and specific.",
    evaluationCriteria: {
      clarity: "Is the instruction clear and unambiguous?",
      structure: "Does the prompt have a logical structure?",
      contextRelevance: "Does it specify the target audience?",
      creativity: "Does it encourage the AI to make the summary engaging?",
      iterativeImprovement: "N/A for Level 1",
    },
  },
  {
    level: 2,
    title: "Context-Rich Prompt",
    description: "Enhance your prompt with relevant context and constraints",
    scenario: "You're designing a chatbot for a healthcare app that helps users understand their medication instructions.",
    taskInstructions: "Write a prompt for an AI that will generate patient-friendly explanations of medication instructions. Include context about the audience, tone, and important safety considerations.",
    evaluationCriteria: {
      clarity: "Are the instructions and expectations crystal clear?",
      structure: "Is the prompt well-organized with distinct sections?",
      contextRelevance: "Does it provide essential context about healthcare communication?",
      creativity: "Does it guide the AI to be empathetic and reassuring?",
      iterativeImprovement: "Does it build upon basic prompting principles?",
    },
  },
  {
    level: 3,
    title: "Multi-Step Prompt Engineering",
    description: "Design a complex, multi-step prompt with role-playing and output formatting",
    scenario: "You're building an AI system to help junior developers debug code by thinking through problems systematically.",
    taskInstructions: "Create a sophisticated prompt that uses role-playing, step-by-step reasoning, and structured output formatting to guide an AI in helping developers debug their code. The AI should act as a senior developer mentor.",
    evaluationCriteria: {
      clarity: "Are all steps and requirements explicitly defined?",
      structure: "Does it use advanced techniques like role-playing and chain-of-thought?",
      contextRelevance: "Does it understand the mentoring relationship and educational goals?",
      creativity: "Does it employ innovative prompting techniques?",
      iterativeImprovement: "Does it show mastery by combining multiple advanced techniques?",
    },
  },
];

export function getPromptArchitectureInstructions(): string {
  return `
# Prompt Architecture Assessment

This assessment evaluates your ability to design effective prompts for advanced AI systems like GPT-5.

## Instructions

You will complete 3 progressively challenging levels:

1. **Level 1**: Create a basic, clear prompt
2. **Level 2**: Add context, constraints, and audience awareness
3. **Level 3**: Design a sophisticated multi-step prompt with advanced techniques

For each level:
- Read the scenario and task instructions carefully
- Write your prompt in the text area provided
- Your prompt will be evaluated by GPT-5 itself on multiple criteria
- You can submit when ready

## Evaluation Criteria

Each prompt is scored on:
- **Clarity** (20 points): Clear, unambiguous instructions
- **Structure** (20 points): Logical organization and formatting
- **Context Relevance** (20 points): Appropriate context and audience awareness
- **Creativity** (20 points): Innovative and engaging approach
- **Iterative Improvement** (20 points): Building upon prompting principles

**Total**: 100 points per level (300 points maximum)

## Tips for Success

- Be specific and detailed in your instructions
- Consider the AI's perspective and capabilities
- Use examples when helpful
- Think about edge cases and potential misunderstandings
- Build upon techniques from previous levels

Good luck!
  `.trim();
}

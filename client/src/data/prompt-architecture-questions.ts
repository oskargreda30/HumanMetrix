export interface PromptArchitectureLevel {
  level: number;
  title: string;
  description: string;
  scenario: string;
  taskInstructions: string;
}

export const PROMPT_ARCHITECTURE_LEVELS: PromptArchitectureLevel[] = [
  {
    level: 1,
    title: "Basic Information Retrieval",
    description: "Create a simple, clear prompt for basic information",
    scenario: "You need to get a simple fact from an AI assistant.",
    taskInstructions: "Write a prompt to ask for the capital city of France and 3 interesting facts about it.",
  },
  {
    level: 2,
    title: "Structured Output Request",
    description: "Request information in a specific format",
    scenario: "You need the AI to provide information in a structured way.",
    taskInstructions: "Write a prompt asking the AI to list the top 5 programming languages for web development in 2026, formatted as a numbered list with a brief one-sentence description for each.",
  },
  {
    level: 3,
    title: "Role-Based Instruction",
    description: "Guide the AI to adopt a specific persona or expertise level",
    scenario: "You want the AI to explain a complex topic accessibly.",
    taskInstructions: "Write a prompt asking the AI to explain quantum computing as if it were a senior physics professor teaching undergraduate students. The explanation should be accessible but accurate.",
  },
  {
    level: 4,
    title: "Multi-Step Problem Solving",
    description: "Design a prompt that guides through multiple steps",
    scenario: "You need the AI to solve a complex problem systematically.",
    taskInstructions: "Write a prompt asking the AI to help debug a Python function that's supposed to find duplicates in a list but isn't working correctly. Include instructions for: (1) analyzing the code, (2) identifying the bug, (3) explaining why it's wrong, and (4) providing a corrected version.",
  },
  {
    level: 5,
    title: "Constrained Creative Generation",
    description: "Request creative content with specific constraints",
    scenario: "You need creative content that follows multiple specific requirements.",
    taskInstructions: "Write a prompt asking the AI to generate a product description for a new eco-friendly water bottle. The description must: be exactly 100 words, include 3 key benefits, use persuasive language, mention sustainability, and target health-conscious millennials.",
  },
  {
    level: 6,
    title: "Iterative Refinement Strategy",
    description: "Design a prompt that encourages self-improvement",
    scenario: "You need the AI to create and improve its own work.",
    taskInstructions: "Write a prompt asking the AI to draft a professional email declining a job offer, then critically evaluate its own draft for tone, professionalism, and clarity, and finally provide an improved version based on that self-evaluation.",
  },
  {
    level: 7,
    title: "Complex System Design",
    description: "Guide the AI through complex multi-domain analysis",
    scenario: "You need comprehensive system architecture with multiple considerations.",
    taskInstructions: "Write a prompt asking the AI to design a comprehensive content moderation system for a social media platform. The prompt should guide the AI to consider: technical architecture, ethical implications, scalability, false positive handling, appeals process, and provide a decision tree for different content types. Request a structured response with sections for each consideration.",
  },
];

export const PROMPT_EVALUATION_CRITERIA = {
  clarity: {
    weight: 0.25,
    description: "Is the prompt clear, unambiguous, and easy to understand?",
    maxPoints: 25,
  },
  structure: {
    weight: 0.20,
    description: "Is the prompt well-organized with logical flow?",
    maxPoints: 20,
  },
  contextRelevance: {
    weight: 0.20,
    description: "Does the prompt provide necessary context and constraints?",
    maxPoints: 20,
  },
  creativity: {
    weight: 0.20,
    description: "Does the prompt encourage thoughtful, creative responses?",
    maxPoints: 20,
  },
  iterativeImprovement: {
    weight: 0.15,
    description: "Does the prompt include mechanisms for refinement or building upon concepts?",
    maxPoints: 15,
  },
};

export function getPromptArchitectureInstructions(): string {
  return `
# Prompt Architecture Assessment

This assessment evaluates your ability to design effective prompts for advanced AI systems.

## Instructions

You will complete 7 progressively challenging levels:

1. **Level 1**: Basic information retrieval
2. **Level 2**: Structured output formatting
3. **Level 3**: Role-based instruction
4. **Level 4**: Multi-step problem solving
5. **Level 5**: Constrained creative generation
6. **Level 6**: Iterative refinement strategy
7. **Level 7**: Complex system design

For each level:
- Read the scenario and task instructions carefully
- Write your prompt in the text area provided
- Your prompt will be evaluated by an AI model on 5 criteria
- Move to the next level when ready

## Evaluation Criteria

Each prompt is scored on:
- **Clarity** (25 points): Clear, unambiguous instructions
- **Structure** (20 points): Logical organization and formatting
- **Context Relevance** (20 points): Appropriate context and constraints
- **Creativity** (20 points): Innovative and engaging approach
- **Iterative Improvement** (15 points): Building upon prompting principles

**Total**: 100 points per level (700 points maximum, averaged to 100)

## Tips for Success

- Be specific and detailed in your instructions
- Consider the AI's perspective and capabilities
- Use examples when helpful
- Think about edge cases and potential misunderstandings
- Build upon techniques from previous levels
- Include role-playing, constraints, and output formatting where appropriate

Good luck!
  `.trim();
}

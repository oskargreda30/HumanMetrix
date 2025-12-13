export interface AIQOption {
  value: string;
  text: string;
  score: number;
}

export interface AIQQuestion {
  id: string;
  text: string;
  options: AIQOption[];
}

export const AIQ_QUESTIONS: AIQQuestion[] = [
  {
    id: "1",
    text: "A company develops an AI model for predicting retail trends using anonymized customer purchase data. An analysis reveals that by combining the purchase history with public demographic data, it is possible to re-identify up to 15% of the customers. The AI's accuracy is highest when this combined, non-anonymized data is used. What is the most ethically responsible course of action?",
    options: [
      { value: "A", text: "Immediately delete the combined dataset and retrain the model only on the initially anonymized data.", score: 100 },
      { value: "B", text: "Continue using the combined data but require all internal users to sign an NDA before accessing the model output.", score: 0 },
      { value: "C", text: "Archive the combined dataset in secure cold storage with strict access controls, while deploying only the anonymized model for production use.", score: 65 },
      { value: "D", text: "Use the combined data and disclose the 15% re-identification possibility in the next public terms and conditions update.", score: 30 },
    ],
  },
  {
    id: "2",
    text: "An AI-powered CV screening tool, designed to filter candidates for a prestigious scholarship, shows a significantly higher rejection rate (20% higher) for candidates who attended vocational schools compared to those who attended traditional universities. The overall scholarship objective is to find high-potential students regardless of background. What is the most appropriate action to address this bias?",
    options: [
      { value: "A", text: "Re-engineer the model to exclude the 'school name' feature and any proxy features (e.g., specific GPA scales common to vocational schools).", score: 100 },
      { value: "B", text: "Implement a post-screening human review that automatically flags and overrides any rejection of a vocational school candidate.", score: 70 },
      { value: "C", text: "Publish a report stating the tool's performance and notify vocational schools that they should encourage students to standardize their CV formatting.", score: 25 },
      { value: "D", text: "Accept the outcome, arguing that the model is merely reflecting the historical hiring bias found in its training data.", score: 0 },
    ],
  },
  {
    id: "3",
    text: "A company uses a complex deep learning model (a 'black box') to automate approval decisions for small business loans. A governing regulation requires that any rejected applicant must be provided with a specific, written reason for the decision that can be understood by the average business owner. What is the best way to achieve regulatory compliance and ethical transparency?",
    options: [
      { value: "A", text: "Replace the black-box model entirely with a simpler, rules-based system (e.g., a decision tree) that can easily generate explanations.", score: 70 },
      { value: "B", text: "Hire a team of loan officers to manually review every rejection and generate a human-written explanation based on their professional judgment.", score: 55 },
      { value: "C", text: "Deploy an Explainable AI (XAI) technique (like SHAP or LIME) alongside the model to generate feature importance scores, which are then translated into simple, narrative reasons.", score: 100 },
      { value: "D", text: "Tell rejected applicants the model is proprietary and offer them a generic list of the top five common reasons for loan rejection.", score: 0 },
    ],
  },
  {
    id: "4",
    text: "A city plans to deploy an AI-driven traffic management system that dramatically reduces congestion but occasionally forces emergency vehicles to wait longer at certain intersections to maintain overall traffic flow efficiency. Which action best prioritizes safety and ethical responsibility before deployment?",
    options: [
      { value: "A", text: "Deploy the system immediately and assess the economic benefits of reduced congestion, monitoring emergency vehicle response times afterward.", score: 0 },
      { value: "B", text: "Redesign the system's core objective function to include hard-coded, non-negotiable weight for emergency vehicle priority at all intersections.", score: 100 },
      { value: "C", text: "Issue a press release detailing the small potential for delay for emergency vehicles, placing the responsibility on their dispatchers, to redirect emergency vehicles when needed.", score: 20 },
      { value: "D", text: "Limit the system's use to non-peak hours only until the AI can learn better patterns for emergency vehicle prioritization.", score: 60 },
    ],
  },
  {
    id: "5",
    text: "A city deploys AI-powered facial recognition cameras in public spaces to enhance security. The system flags individuals with outstanding warrants and alerts nearby officers. However, it also misidentifies individuals from minority groups at a significantly higher rate. What is the most ethically responsible course of action?",
    options: [
      { value: "A", text: "Continue using the system with mandatory human verification before any police action, while actively working to resolve the underlying bias.", score: 75 },
      { value: "B", text: "Disable the system entirely until the bias is resolved, regardless of its current effectiveness.", score: 100 },
      { value: "C", text: "Publish the error rates and allow citizens to opt out of facial recognition tracking.", score: 15 },
      { value: "D", text: "Increase training data from minority groups to reduce bias while continuing deployment.", score: 40 },
    ],
  },
  {
    id: "6",
    text: "A mental health chatbot uses sentiment analysis to tailor responses. It's found to subtly nudge users toward longer conversations, increasing engagement metrics but delaying referrals to human therapists. What is the most ethical redesign?",
    options: [
      { value: "A", text: "Introduce a time limit per session and prompt users to seek human support.", score: 100 },
      { value: "B", text: "Add disclaimers about the chatbot's limitations at the start of each session.", score: 60 },
      { value: "C", text: "Continue current design but monitor for signs of emotional distress.", score: 20 },
      { value: "D", text: "Allow users to rate their emotional state after each session to guide future responses.", score: 45 },
    ],
  },
  {
    id: "7",
    text: "An AI tutoring system adapts to student performance. However, students from under-resourced schools receive less challenging content due to lower initial scores, reinforcing achievement gaps. What is the most ethical redesign?",
    options: [
      { value: "A", text: "Introduce a baseline curriculum that all students must complete before adaptation begins.", score: 100 },
      { value: "B", text: "Adjust the algorithm to challenge all students equally, regardless of performance.", score: 50 },
      { value: "C", text: "Provide teachers with override capabilities to manually adjust difficulty.", score: 75 },
      { value: "D", text: "Continue using the system but offer extra credit opportunities to underperforming students.", score: 20 },
    ],
  },
  {
    id: "8",
    text: "A hospital uses AI to predict patient deterioration. The system uses historical data, including sensitive mental health records, without explicit patient consent. What is the most ethically sound approach?",
    options: [
      { value: "A", text: "Continue using the system but anonymize all mental health data.", score: 50 },
      { value: "B", text: "Seek retroactive consent from all patients whose data was used.", score: 70 },
      { value: "C", text: "Pause use of mental health data until explicit consent is obtained.", score: 100 },
      { value: "D", text: "Publish a notice in the hospital lobby informing patients of data use.", score: 0 },
    ],
  },
];

export const AIQ_BAND_INTERPRETATIONS = {
  exemplary: {
    range: "80-100%",
    title: "Exemplary Ethical Alignment",
    description: "Demonstrates exceptional understanding of AI ethics principles. Consistently prioritizes optimal ethical outcomes and shows sophisticated reasoning about complex trade-offs in algorithmic decision-making.",
  },
  strong: {
    range: "60-79%",
    title: "Strong Ethical Foundation",
    description: "Shows sound ethical judgment with practical considerations. Understands core principles of responsible AI and can balance ethical imperatives with operational realities.",
  },
  developing: {
    range: "40-59%",
    title: "Developing Awareness",
    description: "Basic ethical understanding with room for growth. Recognizes some ethical considerations but may prioritize convenience or efficiency over optimal ethical outcomes in certain scenarios.",
  },
  gaps: {
    range: "20-39%",
    title: "Significant Gaps",
    description: "Needs substantial development in ethical reasoning. May underestimate the importance of consent, transparency, or bias mitigation in AI systems.",
  },
  critical: {
    range: "0-19%",
    title: "Critical Concerns",
    description: "Fundamental misalignment with ethical AI principles. Responses suggest prioritization of outcomes over ethical process, requiring significant training and awareness development.",
  },
};

export function getAIQBandInterpretation(score: number): typeof AIQ_BAND_INTERPRETATIONS.exemplary {
  if (score >= 80) return AIQ_BAND_INTERPRETATIONS.exemplary;
  if (score >= 60) return AIQ_BAND_INTERPRETATIONS.strong;
  if (score >= 40) return AIQ_BAND_INTERPRETATIONS.developing;
  if (score >= 20) return AIQ_BAND_INTERPRETATIONS.gaps;
  return AIQ_BAND_INTERPRETATIONS.critical;
}

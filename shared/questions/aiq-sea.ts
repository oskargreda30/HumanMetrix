import type { AIQQuestion } from './types';

export const AIQ_QUESTIONS_SEA: AIQQuestion[] = [
  {
    id: "1",
    text: "A company develops an AI model for predicting shopping trends using customer purchase data that was supposed to be anonymous. Analysis shows that by combining this data with publicly available information, up to 15% of customers can be identified. The AI works best when using this combined, identifiable data. What is the most responsible action to take?",
    options: [
      { value: "A", text: "Immediately delete the combined dataset and retrain the model only on the originally anonymous data.", score: 100 },
      { value: "B", text: "Continue using the combined data but require all staff to sign a confidentiality agreement before seeing the results.", score: 0 },
      { value: "C", text: "Store the combined dataset securely with strict access rules, while using only the anonymous model for actual business use.", score: 65 },
      { value: "D", text: "Use the combined data and mention the 15% identification possibility in the next update to terms and conditions.", score: 30 },
    ],
  },
  {
    id: "2",
    text: "An AI-powered resume screening tool, designed to select candidates for a scholarship, rejects candidates from technical schools at a 20% higher rate compared to those from traditional universities. The scholarship aims to find high-potential students regardless of their background. What is the best action to address this unfairness?",
    options: [
      { value: "A", text: "Rebuild the model to remove the 'school name' information and any related features (like grading systems specific to technical schools).", score: 100 },
      { value: "B", text: "Add a human review step that automatically checks and can override any rejection of a technical school candidate.", score: 70 },
      { value: "C", text: "Publish a report about the tool's performance and tell technical schools to advise students to format their resumes differently.", score: 25 },
      { value: "D", text: "Accept the outcome, arguing that the model is simply reflecting existing patterns from past decisions.", score: 0 },
    ],
  },
  {
    id: "3",
    text: "A company uses a complex AI model (that is hard to understand) to automatically decide whether to approve small business loans. Regulations require that any rejected applicant must receive a specific, written reason for the decision that an average business owner can understand. What is the best way to follow the rules and be fair?",
    options: [
      { value: "A", text: "Replace the complex model entirely with a simpler system (like a decision tree) that can easily explain its decisions.", score: 70 },
      { value: "B", text: "Hire a team of loan officers to manually review every rejection and write an explanation based on their professional judgment.", score: 55 },
      { value: "C", text: "Use an Explainable AI technique (like SHAP or LIME) alongside the model to identify the main factors, then translate these into simple, clear reasons.", score: 100 },
      { value: "D", text: "Tell rejected applicants that the model is confidential and give them a general list of the top five common reasons for loan rejection.", score: 0 },
    ],
  },
  {
    id: "4",
    text: "A city plans to use an AI traffic management system that greatly reduces traffic jams but sometimes makes emergency vehicles wait longer at certain intersections to keep overall traffic moving smoothly. Which action best puts safety and responsibility first before using the system?",
    options: [
      { value: "A", text: "Start using the system immediately and measure the economic benefits of reduced traffic, monitoring emergency vehicle times afterward.", score: 0 },
      { value: "B", text: "Redesign the system to always give emergency vehicles the highest priority at all intersections, with no exceptions.", score: 100 },
      { value: "C", text: "Issue a public statement about the small possibility of delays for emergency vehicles, placing the responsibility on their dispatchers to find alternative routes.", score: 20 },
      { value: "D", text: "Only use the system during non-busy hours until the AI learns better patterns for emergency vehicle priority.", score: 60 },
    ],
  },
  {
    id: "5",
    text: "A city uses AI-powered cameras with facial recognition in public areas to improve security. The system identifies people with outstanding legal issues and alerts nearby officers. However, it also incorrectly identifies people from minority groups at a much higher rate. What is the most responsible action to take?",
    options: [
      { value: "A", text: "Continue using the system but require human verification before any police action, while actively working to fix the unfairness.", score: 75 },
      { value: "B", text: "Turn off the system completely until the unfairness is fixed, regardless of how well it currently works.", score: 100 },
      { value: "C", text: "Publish the error rates and let citizens choose not to be tracked by facial recognition.", score: 15 },
      { value: "D", text: "Add more training data from minority groups to reduce unfairness while continuing to use the system.", score: 40 },
    ],
  },
  {
    id: "6",
    text: "A mental health chatbot uses mood analysis to customize its responses. It is found to subtly encourage users toward longer conversations, increasing usage numbers but delaying referrals to human counselors. What is the most responsible redesign?",
    options: [
      { value: "A", text: "Set a time limit for each session and prompt users to seek help from a human counselor.", score: 100 },
      { value: "B", text: "Add warnings about the chatbot's limitations at the start of each session.", score: 60 },
      { value: "C", text: "Continue the current design but watch for signs of emotional distress.", score: 20 },
      { value: "D", text: "Let users rate how they feel after each session to guide future responses.", score: 45 },
    ],
  },
  {
    id: "7",
    text: "An AI tutoring system adjusts to how well students do. However, students from schools with fewer resources receive easier content because of their lower starting scores, which makes the gap between students worse. What is the most responsible redesign?",
    options: [
      { value: "A", text: "Create a basic curriculum that all students must complete before the system starts adjusting to them.", score: 100 },
      { value: "B", text: "Change the system to challenge all students equally, regardless of how they perform.", score: 50 },
      { value: "C", text: "Give teachers the ability to manually change the difficulty level.", score: 75 },
      { value: "D", text: "Continue using the system but offer extra opportunities to students who are not doing as well.", score: 20 },
    ],
  },
  {
    id: "8",
    text: "A hospital uses AI to predict when patients might get worse. The system uses historical data, including sensitive mental health records, without asking patients for permission. What is the most responsible approach?",
    options: [
      { value: "A", text: "Continue using the system but remove any identifying information from all mental health data.", score: 50 },
      { value: "B", text: "Ask permission from all patients whose data has already been used.", score: 70 },
      { value: "C", text: "Stop using mental health data until clear permission is obtained from patients.", score: 100 },
      { value: "D", text: "Put up a notice in the hospital lobby telling patients about how their data is used.", score: 0 },
    ],
  },
];

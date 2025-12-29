import type { AIQQuestion } from './types';

export const AIQ_QUESTIONS_SEA: AIQQuestion[] = [
  {
    id: "1",
    text: "A company builds an AI system to predict shopping trends using customer purchase data that was meant to be anonymous. Later, it is found that when this data is combined with public information, about 15% of customers can be identified. The AI works best when this combined data is used. What is the most ethical action?",
    options: [
      { value: "A", text: "Delete the combined data and retrain the AI using only the anonymous data.", score: 100 },
      { value: "B", text: "Keep using the combined data but make staff sign confidentiality agreements.", score: 0 },
      { value: "C", text: "Store the combined data securely, but only use the anonymous model in real use.", score: 65 },
      { value: "D", text: "Keep using the data and mention the risk in an updated public policy.", score: 30 },
    ],
  },
  {
    id: "2",
    text: "An AI system is used to select students for a competitive scholarship. It rejects applicants from vocational schools much more often than applicants from universities. The goal is to find talented students from all backgrounds. What is the best way to fix this problem?",
    options: [
      { value: "A", text: "Remove school names and related information from the model.", score: 100 },
      { value: "B", text: "Add a human review step for rejected vocational school applicants.", score: 70 },
      { value: "C", text: "Publish the results and advise vocational schools to change how students apply.", score: 25 },
      { value: "D", text: "Accept the results as a reflection of past data.", score: 0 },
    ],
  },
  {
    id: "3",
    text: "A company uses AI to approve or reject small business loans. The law requires rejected applicants to receive a clear written reason they can understand. What is the best ethical solution?",
    options: [
      { value: "A", text: "Replace the AI with a simple rules-based system.", score: 70 },
      { value: "B", text: "Have staff manually explain every rejection.", score: 55 },
      { value: "C", text: "Use explainable AI tools to create clear reasons for decisions.", score: 100 },
      { value: "D", text: "Give applicants a general list of common rejection reasons.", score: 0 },
    ],
  },
  {
    id: "4",
    text: "A city plans to use AI to manage traffic and reduce congestion. The system sometimes delays emergency vehicles to keep traffic flowing. What is the most ethical action before using the system?",
    options: [
      { value: "A", text: "Launch the system and review emergency delays later.", score: 0 },
      { value: "B", text: "Redesign the system so emergency vehicles always have priority.", score: 100 },
      { value: "C", text: "Inform emergency services and let them adjust their routes.", score: 20 },
      { value: "D", text: "Use the system only during low-traffic hours for now.", score: 60 },
    ],
  },
  {
    id: "5",
    text: "A city uses facial recognition cameras to improve public safety. The system alerts police about wanted individuals but makes more mistakes for people from minority groups. What is the most ethical response?",
    options: [
      { value: "A", text: "Keep using the system with human checks, while fixing the bias.", score: 75 },
      { value: "B", text: "Stop using the system until the bias is fixed.", score: 100 },
      { value: "C", text: "Publish error rates and let people opt out.", score: 15 },
      { value: "D", text: "Add more data from minority groups and continue using the system.", score: 40 },
    ],
  },
  {
    id: "6",
    text: "A mental health chatbot changes its replies based on user emotions. It encourages long conversations, which delays sending users to human therapists. What is the most ethical redesign?",
    options: [
      { value: "A", text: "Limit session time and encourage users to seek human help.", score: 100 },
      { value: "B", text: "Show clear warnings about the chatbot's limits at the start.", score: 60 },
      { value: "C", text: "Keep the design and monitor users more closely.", score: 20 },
      { value: "D", text: "Ask users to rate how they feel after each session.", score: 45 },
    ],
  },
  {
    id: "7",
    text: "An AI learning system adjusts lesson difficulty based on student performance. Students from poorer schools receive easier content, which may widen learning gaps. What is the most ethical redesign?",
    options: [
      { value: "A", text: "Require all students to complete a core set of lessons first.", score: 100 },
      { value: "B", text: "Give all students the same level of difficulty.", score: 50 },
      { value: "C", text: "Allow teachers to manually change difficulty levels.", score: 75 },
      { value: "D", text: "Keep the system and offer rewards to weaker students.", score: 20 },
    ],
  },
  {
    id: "8",
    text: "A hospital uses AI to predict when patients may get worse. The system uses past records, including mental health data, without clear patient permission. What is the most ethical action?",
    options: [
      { value: "A", text: "Keep using the system but remove mental health data.", score: 50 },
      { value: "B", text: "Ask patients for permission after using their data.", score: 70 },
      { value: "C", text: "Stop using mental health data until clear consent is given.", score: 100 },
      { value: "D", text: "Put up a notice saying patient data is being used.", score: 0 },
    ],
  },
];

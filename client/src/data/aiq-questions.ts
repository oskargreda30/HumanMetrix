export const AIQ_QUESTIONS = [
  {
    id: "1",
    text: "A company develops an AI model for predicting retail trends using anonymized customer purchase data. An analysis reveals that by combining the purchase history with public demographic data, it is possible to re-identify up to 15% of the customers. The AI's accuracy is highest when this combined, non-anonymized data is used. What is the most ethically responsible course of action?",
    options: [
      { value: "A", text: "Immediately delete the combined dataset and retrain the model only on the initially anonymized data." },
      { value: "B", text: "Continue using the combined data but require all internal users to sign an NDA before accessing the model output." },
      { value: "C", text: "Keep the combined dataset, but implement a complex technical safeguard to prevent anyone from viewing the raw customer IDs." },
      { value: "D", text: "Use the combined data and disclose the 15% re-identification possibility in the next public terms and conditions update." },
    ],
  },
  {
    id: "2",
    text: "An AI-powered résumé screening tool, designed to filter candidates for a prestigious scholarship, shows a significantly higher rejection rate (20% higher) for candidates who attended vocational schools compared to those who attended traditional universities. The overall scholarship objective is to find high-potential students regardless of background. What is the most appropriate action to address this bias?",
    options: [
      { value: "A", text: "Re-engineer the model to exclude the 'school name' feature and any proxy features (e.g., specific GPA scales common to vocational schools)." },
      { value: "B", text: "Implement a post-screening human review that automatically flags and overrides any rejection of a vocational school candidate." },
      { value: "C", text: "Publish a report stating the tool's performance and notify vocational schools that they should encourage students to standardize their résumé formatting." },
      { value: "D", text: "Accept the outcome, arguing that the model is merely reflecting the historical hiring bias found in its training data." },
    ],
  },
  {
    id: "3",
    text: "A company uses a complex deep learning model (a 'black box') to automate approval decisions for small business loans. A governing regulation requires that any rejected applicant must be provided with a specific, written reason for the decision that can be understood by the average business owner. What is the best way to achieve regulatory compliance and ethical transparency?",
    options: [
      { value: "A", text: "Replace the black-box model entirely with a simpler, rules-based system (e.g., a decision tree) that can easily generate explanations." },
      { value: "B", text: "Hire a team of loan officers to manually review every rejection and generate a human-written explanation based on their professional judgment." },
      { value: "C", text: "Deploy an Explainable AI (XAI) technique (like SHAP or LIME) alongside the model to generate feature importance scores, which are then translated into simple, narrative reasons." },
      { value: "D", text: "Tell rejected applicants the model is proprietary and offer them a generic list of the top five common reasons for loan rejection." },
    ],
  },
  {
    id: "4",
    text: "A city plans to deploy an AI-driven traffic management system that dramatically reduces congestion but occasionally forces emergency vehicles to wait longer at certain intersections to maintain overall traffic flow efficiency. Which action best prioritizes safety and ethical responsibility before deployment?",
    options: [
      { value: "A", text: "Deploy the system immediately and assess the economic benefits of reduced congestion, monitoring emergency vehicle response times afterward." },
      { value: "B", text: "Redesign the system's core objective function to include hard-coded, non-negotiable weight for emergency vehicle priority at all intersections." },
      { value: "C", text: "Issue a press release detailing the small potential for delay for emergency vehicles, placing the responsibility on their dispatchers, to redirect emergency vehicles when needed." },
      { value: "D", text: "Limit the system's use to non-peak hours only until the AI can learn better patterns for emergency vehicle prioritization." },
    ],
  },
  {
    id: "5",
    text: "A city deploys AI-powered facial recognition cameras in public spaces to enhance security. The system flags individuals with outstanding warrants and alerts nearby officers. However, it also misidentifies individuals from minority groups at a significantly higher rate. What is the most ethically responsible course of action?",
    options: [
      { value: "A", text: "Continue using the system but require manual verification before any police action is taken." },
      { value: "B", text: "Disable the system entirely until the bias is resolved, regardless of its current effectiveness." },
      { value: "C", text: "Publish the error rates and allow citizens to opt out of facial recognition tracking." },
      { value: "D", text: "Increase training data from minority groups to reduce bias while continuing deployment." },
    ],
  },
  {
    id: "6",
    text: "A mental health chatbot uses sentiment analysis to tailor responses. It's found to subtly nudge users toward longer conversations, increasing engagement metrics but delaying referrals to human therapists. What is the most ethical redesign?",
    options: [
      { value: "A", text: "Introduce a time limit per session and prompt users to seek human support." },
      { value: "B", text: "Add disclaimers about the chatbot's limitations at the start of each session." },
      { value: "C", text: "Continue current design but monitor for signs of emotional distress." },
      { value: "D", text: "Allow users to rate their emotional state after each session to guide future responses." },
    ],
  },
  {
    id: "7",
    text: "An AI tutoring system adapts to student performance. However, students from under-resourced schools receive less challenging content due to lower initial scores, reinforcing achievement gaps. What is the most ethical redesign?",
    options: [
      { value: "A", text: "Introduce a baseline curriculum that all students must complete before adaptation begins." },
      { value: "B", text: "Adjust the algorithm to challenge all students equally, regardless of performance." },
      { value: "C", text: "Provide teachers with override capabilities to manually adjust difficulty." },
      { value: "D", text: "Continue using the system but offer extra credit opportunities to underperforming students." },
    ],
  },
  {
    id: "8",
    text: "A hospital uses AI to predict patient deterioration. The system uses historical data, including sensitive mental health records, without explicit patient consent. What is the most ethically sound approach?",
    options: [
      { value: "A", text: "Continue using the system but anonymize all mental health data." },
      { value: "B", text: "Seek retroactive consent from all patients whose data was used." },
      { value: "C", text: "Pause use of mental health data until explicit consent is obtained." },
      { value: "D", text: "Publish a notice in the hospital lobby informing patients of data use." },
    ],
  },
];

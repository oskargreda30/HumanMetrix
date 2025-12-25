export const AI_READINESS_QUESTIONS = [
  {
    id: "1",
    text: "You need to integrate an AI-generated data set with an existing, structured database.",
    options: [
      { value: "A", text: "Write a structured, iterative prompt to force the AI to format the output with perfect data compatibility." },
      { value: "B", text: "Immediately review the database schema and architecture for potential data incompatibility issues." },
      { value: "C", text: "Analyze the AI-generated data for potential biases or ethical violations before merging it." },
      { value: "D", text: "Document the new data's structure and communicate with the team on how to access and use it effectively." },
      { value: "E", text: "Challenge the necessity of merging the data, seeking a more innovative solution to the analysis problem." },
    ],
  },
  {
    id: "2",
    text: "A complex technical manual is poorly written and full of errors, but you must learn the system quickly.",
    options: [
      { value: "A", text: "Break down the system's function into logical sub-components and devise a focused learning plan for each." },
      { value: "B", text: "Search online communities for practical demonstrations and user-generated tutorials to bypass the manual." },
      { value: "C", text: "Engage a technical expert or vendor directly to clarify the most critical functional aspects." },
      { value: "D", text: "Systematically test the system's features against the manual to pinpoint and document all factual errors." },
      { value: "E", text: "Use an AI to summarize the manual, extract key technical terms, and explain the core concepts simply." },
    ],
  },
  {
    id: "3",
    text: "A key business metric is declining, and the initial data analysis is inconclusive about the cause.",
    options: [
      { value: "A", text: "Use domain knowledge to create a set of hypotheses about the decline, then seek data to confirm or deny them." },
      { value: "B", text: "Implement a new data collection process to capture high-resolution, real-time data related to the decline." },
      { value: "C", text: "Challenge the team to creatively explore solutions that violate current market assumptions." },
      { value: "D", text: "Facilitate a collaborative session to map the customer journey and pinpoint potential failure points." },
      { value: "E", text: "Deconstruct the declining metric into its fundamental mathematical components to isolate the variable causing the drop." },
    ],
  },
  {
    id: "4",
    text: "A new security protocol is introduced that requires all data to be encrypted during transfer.",
    options: [
      { value: "A", text: "Research the specific encryption standard and document its technical implementation requirements." },
      { value: "B", text: "Immediately train the team on the proper procedures for using the new encryption tools." },
      { value: "C", text: "Analyze the security risks associated with not using encryption to justify the process change to skeptical colleagues." },
      { value: "D", text: "Update all data storage and transfer workflows to reflect the new policy, focusing on consistent compliance." },
      { value: "E", text: "Use an AI to generate a detailed compliance checklist for the entire team to follow." },
    ],
  },
  {
    id: "5",
    text: "You are designing a new feature, and you propose a highly unusual technical solution that is outside the company's norm.",
    options: [
      { value: "A", text: "Develop a detailed justification based on performance metrics and efficiency gains compared to standard solutions." },
      { value: "B", text: "Clearly document the solution's architecture and underlying technical logic for review." },
      { value: "C", text: "Facilitate a transparent discussion with the team, explaining the rationale and seeking buy-in." },
      { value: "D", text: "Create a minimalist, innovative prototype of the feature to demonstrate its viability and effectiveness." },
      { value: "E", text: "Research and share case studies of other leading companies successfully using the unusual technology." },
    ],
  },
  {
    id: "6",
    text: "A colleague suggests using a public domain AI model, but you are concerned about its licensing terms.",
    options: [
      { value: "A", text: "Research the model's specific open-source license and its implications for commercial use." },
      { value: "B", text: "Prompt the AI with a hypothetical scenario to test its ethical guardrails and behavior." },
      { value: "C", text: "Collaborate with the legal team to draft internal usage guidelines for the model." },
      { value: "D", text: "Challenge the colleague to find a completely proprietary and licensed solution instead." },
      { value: "E", text: "Study the model's limitations based on its training data to understand potential factual or domain errors." },
    ],
  },
  {
    id: "7",
    text: "A manager asks for a report on industry trends, but the deadline is extremely tight.",
    options: [
      { value: "A", text: "Use an AI tool to rapidly generate a preliminary draft, focusing your time on refining and validating its content." },
      { value: "B", text: "Leverage deep domain knowledge to filter external data sources, focusing only on the most relevant, high-impact trends." },
      { value: "C", text: "Negotiate an extended deadline, clearly explaining the need for data validation and quality control." },
      { value: "D", text: "Restructure the report to focus only on 3-4 key, evidence-backed findings rather than a comprehensive overview." },
      { value: "E", text: "Search for innovative, quick-turnaround data visualization tools to present the findings with maximum clarity." },
    ],
  },
  {
    id: "8",
    text: "A routine process is repetitive and prone to human error, but automation requires a skill you don't possess.",
    options: [
      { value: "A", text: "Break the process down into its logical steps, documenting the precise sequence required for automation." },
      { value: "B", text: "Search for a no-code/low-code solution that allows you to automate the task without requiring programming skills." },
      { value: "C", text: "Proactively learn the necessary programming language by taking an introductory online course." },
      { value: "D", text: "Focus your analysis on quantifying the financial losses caused by the human errors to justify investment in automation." },
      { value: "E", text: "Collaborate with an engineer to translate your process documentation into functional, automated code." },
    ],
  },
  {
    id: "9",
    text: "You receive a large dataset that seems relevant to a project but contains many missing values and inconsistencies.",
    options: [
      { value: "A", text: "Use statistical methods to impute missing values and assess the overall quality of the data." },
      { value: "B", text: "Consult with data owners or experts to understand the cause of the inconsistencies." },
      { value: "C", text: "Research advanced data cleaning and validation techniques to apply to the dataset." },
      { value: "D", text: "Redefine the project's problem statement to work around the inconsistencies, focusing on a subset of reliable data." },
      { value: "E", text: "Use an AI to analyze the data and suggest the most appropriate cleaning and imputation strategies." },
    ],
  },
  {
    id: "10",
    text: "An AI model is suggesting a financially sound decision, but it contradicts long-standing company values.",
    options: [
      { value: "A", text: "Use your domain expertise to articulate the exact conflict between the AI's logic and the company's value system." },
      { value: "B", text: "Prompt the AI to identify potential negative PR or long-term reputation risks associated with the decision." },
      { value: "C", text: "Conduct an internal review with stakeholders to assess the ethical implications and potential damage to customer trust." },
      { value: "D", text: "Propose an innovative, hybrid decision that captures some of the financial gain while adhering to company values." },
      { value: "E", text: "Research the company's compliance history and ethical guidelines related to the decision area." },
    ],
  },
  {
    id: "11",
    text: "A team member is struggling to understand the technical constraints of a new project they are leading.",
    options: [
      { value: "A", text: "Facilitate a knowledge-sharing session where senior engineers explain the technical architecture simply." },
      { value: "B", text: "Research best practices for project scoping and risk identification to help them define the constraints." },
      { value: "C", text: "Use an AI to generate a simplified technical overview of the project's components and limitations." },
      { value: "D", text: "Encourage them to break the project into smaller milestones to manage and adapt to constraints gradually." },
      { value: "E", text: "Review the project plan and use your domain knowledge to pre-emptively identify and flag major technical risks." },
    ],
  },
  {
    id: "12",
    text: "You need to design an experiment but have limited resources for data collection.",
    options: [
      { value: "A", text: "Use creative experimental design techniques (e.g., fractional factorial designs) to maximize insights from minimal data." },
      { value: "B", text: "Analyze the current resource allocation to identify potential efficiency gains or cost savings for the experiment." },
      { value: "C", text: "Research existing public data sources that might serve as a proxy or baseline for your experiment." },
      { value: "D", text: "Collaborate with other teams to pool resources or leverage their existing data collection infrastructure." },
      { value: "E", text: "Use an AI to design the statistical model and recommend the minimum sample size needed." },
    ],
  },
  {
    id: "13",
    text: "A technical system update is happening next month, and you need to prepare the team.",
    options: [
      { value: "A", text: "Research the new system's technical documentation to understand all functional and operational changes." },
      { value: "B", text: "Design a structured training curriculum, breaking down the changes into manageable learning modules." },
      { value: "C", text: "Create a document outlining the ROI or strategic necessity of the system update for the team." },
      { value: "D", text: "Facilitate a Q&A session with the developers to clarify any technical ambiguity for the team." },
      { value: "E", text: "Propose an innovative use case for the new system's features that was not previously considered." },
    ],
  },
  {
    id: "14",
    text: "You want to teach a colleague how to use a complex analytics tool, but they lack the foundational data knowledge.",
    options: [
      { value: "A", text: "Break down the tool's usage into a step-by-step process, focusing only on the most critical features first." },
      { value: "B", text: "Collaborate with the colleague to work through a real-world project, offering hands-on support." },
      { value: "C", text: "Use an AI to generate practice data sets and exercises tailored to their specific learning needs." },
      { value: "D", text: "Dedicate time to research foundational data concepts and create simple analogies for them." },
      { value: "E", text: "Challenge the colleague to solve a simplified version of a problem using the tool to encourage creative learning." },
    ],
  },
  {
    id: "15",
    text: "You discover an AI model is being trained on outdated, non-compliant industry data.",
    options: [
      { value: "A", text: "Immediately report the non-compliance and recommend quarantining the model until the data is remediated." },
      { value: "B", text: "Research the specific regulatory requirements the model's data is violating." },
      { value: "C", text: "Use an AI to analyze the dataset and identify all instances of non-compliant data points for removal." },
      { value: "D", text: "Use your domain knowledge to explain the operational and legal risks of using the outdated data to leadership." },
      { value: "E", text: "Facilitate a cross-functional discussion to redesign the data pipeline to ensure future compliance." },
    ],
  },
  {
    id: "16",
    text: "A project requires a creative solution, but the team's initial ideas are blocked by existing internal policy.",
    options: [
      { value: "A", text: "Analyze the policy's purpose and logic to determine if the creative idea can be legally adapted or exempted." },
      { value: "B", text: "Challenge the policy itself, proposing an innovative change that would allow the creative idea to proceed." },
      { value: "C", text: "Collaborate with legal or management to negotiate a temporary waiver or exception for the project." },
      { value: "D", text: "Use an AI to generate alternative, compliance-friendly ideas based on the core creative concept." },
      { value: "E", text: "Redefine the problem to generate entirely new ideas that inherently operate outside the scope of the limiting policy." },
    ],
  },
  {
    id: "17",
    text: "You are asked to review a technical specification for a new product, and the deadline is tomorrow.",
    options: [
      { value: "A", text: "Focus the review entirely on the product's alignment with high-level strategic goals and market needs." },
      { value: "B", text: "Analyze the technical requirements for potential architectural flaws, performance bottlenecks, or scalability issues." },
      { value: "C", text: "Use an AI to perform an automated code or specification review to catch obvious errors." },
      { value: "D", text: "Proactively communicate any concerns and potential risks discovered during the hurried review to the relevant stakeholders." },
      { value: "E", text: "Research industry standards for similar products to benchmark the technical specifications' quality and completeness." },
    ],
  },
  {
    id: "18",
    text: "The team is using a new data visualization tool, but colleagues are struggling to understand the generated charts.",
    options: [
      { value: "A", text: "Research the fundamental principles of visual design and data storytelling to create clearer charts." },
      { value: "B", text: "Propose an innovative new chart type or visualization approach that simplifies the complex data." },
      { value: "C", text: "Facilitate a collaborative session to gather feedback on which charts are confusing and why." },
      { value: "D", text: "Use an AI to generate alternative text descriptions for the charts to explain the findings simply." },
      { value: "E", text: "Create a standardized style guide for all charts, ensuring consistency and ease of interpretation." },
    ],
  },
  {
    id: "19",
    text: "You need to automate a task, but the process has many exceptions and edge cases.",
    options: [
      { value: "A", text: "Use critical thinking to map all exceptions and create a decision tree that handles each one logically." },
      { value: "B", text: "Analyze the data to determine the frequency of each exception, focusing on automating the most common ones first." },
      { value: "C", text: "Use an AI to generate the complex conditional logic required to handle the edge cases in the code." },
      { value: "D", text: "Collaborate with process owners to redefine the process and eliminate unnecessary exceptions." },
      { value: "E", text: "Research advanced programming techniques for managing complex conditional logic efficiently." },
    ],
  },
  {
    id: "20",
    text: "A colleague proposes a solution based on an obsolete technology.",
    options: [
      { value: "A", text: "Use your domain knowledge to explain the contemporary risks (e.g., security, maintenance) associated with the obsolete technology." },
      { value: "B", text: "Analyze the project's data requirements to show how the obsolete technology cannot meet modern throughput needs." },
      { value: "C", text: "Propose a modern, innovative alternative that fulfills the same goals without the technical debt." },
      { value: "D", text: "Research the lifecycle and End-of-Life date of the obsolete technology to provide factual backing for your objection." },
      { value: "E", text: "Facilitate a discussion to respectfully challenge the proposal and collaboratively find a forward-looking technical solution." },
    ],
  },
  {
    id: "21",
    text: "You need to write a proposal but are unsure how to frame the strategic impact for senior leadership.",
    options: [
      { value: "A", text: "Use an AI to analyze the company's annual reports and suggest language aligned with strategic priorities." },
      { value: "B", text: "Focus the proposal on core data metrics that demonstrate clear and measurable ROI." },
      { value: "C", text: "Leverage your domain expertise to position the proposal as a solution to a critical, long-standing industry problem." },
      { value: "D", text: "Research successful proposals in the company archive to adopt proven framing and structure." },
      { value: "E", text: "Collaborate with a senior leader or mentor to refine the proposal's strategic narrative." },
    ],
  },
];

// BALANCED Scoring matrix for AI Readiness
// Optimally balanced distribution: 6 skills at 23 occurrences, 3 skills at 24 occurrences
// 6×23 + 3×24 = 210 total mappings (21 questions × 5 options × 2 skills each)
// At 23: DF, CT/PS, RAI, DE, CI, CC (92 max points each)
// At 24: AL/PE, TF, ACL (96 max points each)
// Each option awards 4 points to each skill it maps to
// Skills: AL/PE (AI Literacy/Prompt Engineering), TF (Technical Fundamentals), DF (Data Fluency),
//         CT/PS (Critical Thinking/Problem-Solving), ACL (Adaptability/Continuous Learning),
//         RAI (Responsible AI/Ethics), DE (Domain Expertise), CI (Creativity/Innovation), CC (Collaboration/Communication)
export const AI_READINESS_SCORING = {
  // Q1: Integrate AI-generated data with database
  // A: Uses AI prompt to format data output → AL/PE (prompt engineering) + DF (data formatting)
  // B: Reviews schema for compatibility issues → TF (architecture) + CT/PS (systematic review)
  // C: Analyzes for biases before merging → RAI (ethics) + AL/PE (AI analysis)
  // D: Documents and communicates structure → CC (team communication) + DE (domain documentation)
  // E: Challenges necessity, seeks innovation → CI (innovative thinking) + CT/PS (questioning approach)
  "1-A": { "AL/PE": 4, "DF": 4 },
  "1-B": { "TF": 4, "CT/PS": 4 },
  "1-C": { "RAI": 4, "AL/PE": 4 },
  "1-D": { "CC": 4, "DE": 4 },
  "1-E": { "CI": 4, "CT/PS": 4 },
  
  // Q2: Learn system from poor technical manual
  // A: Breaks into sub-components, focused learning → CT/PS (decomposition) + ACL (structured learning)
  // B: Searches online for tutorials → ACL (resourceful learning) + RAI (verifying sources)
  // C: Engages expert directly → DE (seeking domain knowledge) + TF (technical clarification)
  // D: Tests features creatively → CI (creative testing) + RAI (quality verification)
  // E: Uses AI to summarize manual → AL/PE (AI tool usage) + TF (technical comprehension)
  "2-A": { "CT/PS": 4, "ACL": 4 },
  "2-B": { "ACL": 4, "RAI": 4 },
  "2-C": { "DE": 4, "TF": 4 },
  "2-D": { "CI": 4, "RAI": 4 },
  "2-E": { "AL/PE": 4, "TF": 4 },
  
  // Q3: Declining business metric - inconclusive data
  // A: Creates hypotheses using data patterns → DF (data hypothesis) + CT/PS (hypothesis formation)
  // B: Implements real-time data collection → DF (data collection) + TF (system implementation)
  // C: Challenges assumptions responsibly → CI (innovation) + RAI (questioning assumptions)
  // D: Maps customer journey collaboratively → CC (collaboration) + AL/PE (AI journey tools)
  // E: Deconstructs metric mathematically → DF (data analysis) + CT/PS (analytical decomposition)
  "3-A": { "DF": 4, "CT/PS": 4 },
  "3-B": { "DF": 4, "TF": 4 },
  "3-C": { "CI": 4, "RAI": 4 },
  "3-D": { "CC": 4, "AL/PE": 4 },
  "3-E": { "DF": 4, "CT/PS": 4 },
  
  // Q4: New encryption protocol introduced
  // A: Researches encryption standard documentation → DF (data security) + ACL (learning new protocol)
  // B: Trains team on procedures → CC (knowledge sharing) + TF (technical training)
  // C: Analyzes security risks to justify change → RAI (risk awareness) + CT/PS (risk analysis)
  // D: Updates workflows for compliance → DE (process domain knowledge) + RAI (compliance focus)
  // E: Uses AI for compliance checklist → AL/PE (AI tool usage) + DF (compliance data)
  "4-A": { "DF": 4, "ACL": 4 },
  "4-B": { "CC": 4, "TF": 4 },
  "4-C": { "RAI": 4, "CT/PS": 4 },
  "4-D": { "DE": 4, "RAI": 4 },
  "4-E": { "AL/PE": 4, "DF": 4 },
  
  // Q5: Proposing unusual technical solution
  // A: Justifies with performance metrics → DF (data-driven argument) + CT/PS (analytical justification)
  // B: Documents architecture and logic → TF (technical documentation) + CI (novel approach)
  // C: Transparent discussion seeking buy-in → CC (stakeholder engagement) + RAI (open communication)
  // D: Creates innovative prototype → CI (prototyping) + TF (technical implementation)
  // E: Researches case studies → ACL (research learning) + DE (industry knowledge)
  "5-A": { "DF": 4, "CT/PS": 4 },
  "5-B": { "TF": 4, "CI": 4 },
  "5-C": { "CC": 4, "RAI": 4 },
  "5-D": { "CI": 4, "TF": 4 },
  "5-E": { "ACL": 4, "DE": 4 },
  
  // Q6: Concern about AI model licensing
  // A: Researches license implications → RAI (compliance) + ACL (legal research)
  // B: Tests ethical guardrails → AL/PE (AI testing) + RAI (ethical validation)
  // C: Drafts usage guidelines with legal → CC (collaboration) + TF (technical policy)
  // D: Challenges to find proprietary solution → CI (seeking alternatives) + ACL (exploring options)
  // E: Studies model limitations from training data → DF (data understanding) + AL/PE (AI understanding)
  "6-A": { "RAI": 4, "ACL": 4 },
  "6-B": { "AL/PE": 4, "RAI": 4 },
  "6-C": { "CC": 4, "TF": 4 },
  "6-D": { "CI": 4, "ACL": 4 },
  "6-E": { "CI": 4, "AL/PE": 4 },
  
  // Q7: Tight deadline industry trends report
  // A: Uses AI for preliminary draft → AL/PE (AI tool usage) + DF (report generation)
  // B: Filters using domain knowledge → DE (domain expertise) + CT/PS (prioritization)
  // C: Negotiates extended deadline → CC (stakeholder negotiation) + ACL (adaptive planning)
  // D: Focuses on 3-4 key findings → CT/PS (prioritization) + RAI (quality focus)
  // E: Searches for visualization tools → CI (tool discovery) + TF (tool evaluation)
  "7-A": { "AL/PE": 4, "DF": 4 },
  "7-B": { "DE": 4, "AL/PE": 4 },
  "7-C": { "CC": 4, "ACL": 4 },
  "7-D": { "CT/PS": 4, "RAI": 4 },
  "7-E": { "CI": 4, "TF": 4 },
  
  // Q8: Automation requires skill you don't possess
  // A: Documents process steps for automation → CT/PS (process decomposition) + TF (technical preparation)
  // B: Searches for no-code solution → AL/PE (tool discovery) + CI (alternative approach)
  // C: Learns programming language → ACL (self-directed learning) + TF (technical skill)
  // D: Quantifies financial losses → DF (data analysis) + RAI (risk-based justification)
  // E: Collaborates with engineer → CC (cross-functional collaboration) + DE (domain requirements)
  "8-A": { "CT/PS": 4, "TF": 4 },
  "8-B": { "AL/PE": 4, "CI": 4 },
  "8-C": { "ACL": 4, "TF": 4 },
  "8-D": { "DF": 4, "RAI": 4 },
  "8-E": { "CC": 4, "DE": 4 },
  
  // Q9: Dataset with missing values and inconsistencies
  // A: Uses statistical methods to impute → DF (statistical analysis) + TF (methodical approach)
  // B: Consults data owners → CC (collaboration) + DE (understanding context)
  // C: Researches cleaning techniques → ACL (learning) + RAI (data integrity)
  // D: Redefines problem for reliable subset → CI (creative workaround) + CT/PS (problem reframing)
  // E: Uses AI to suggest strategies → AL/PE (AI tool usage) + DF (data strategy)
  "9-A": { "DF": 4, "TF": 4 },
  "9-B": { "CC": 4, "DE": 4 },
  "9-C": { "ACL": 4, "RAI": 4 },
  "9-D": { "CI": 4, "CT/PS": 4 },
  "9-E": { "AL/PE": 4, "DF": 4 },
  
  // Q10: AI suggests decision contradicting company values
  // A: Articulates conflict using domain knowledge → DE (domain expertise) + RAI (values analysis)
  // B: Prompts AI to identify risks → AL/PE (AI prompting) + RAI (risk identification)
  // C: Internal stakeholder review → CC (collaboration) + DE (domain context)
  // D: Proposes hybrid decision → CI (creative solution) + CT/PS (balanced analysis)
  // E: Researches compliance history → ACL (research) + TF (technical compliance)
  "10-A": { "DE": 4, "RAI": 4 },
  "10-B": { "AL/PE": 4, "RAI": 4 },
  "10-C": { "CC": 4, "CT/PS": 4 },
  "10-D": { "CI": 4, "CT/PS": 4 },
  "10-E": { "ACL": 4, "TF": 4 },
  
  // Q11: Team member struggling with technical constraints
  // A: Facilitates knowledge-sharing session → CC (knowledge transfer) + CT/PS (structured sharing)
  // B: Researches scoping best practices → ACL (learning) + DE (scope expertise)
  // C: Uses AI for simplified overview → AL/PE (AI tool usage) + DE (domain simplification)
  // D: Encourages smaller milestones → CI (creative breakdown) + CT/PS (milestone planning)
  // E: Reviews plan, flags risks using expertise → DE (domain expertise) + RAI (risk identification)
  "11-A": { "CC": 4, "AL/PE": 4 },
  "11-B": { "ACL": 4, "DE": 4 },
  "11-C": { "AL/PE": 4, "DE": 4 },
  "11-D": { "CI": 4, "CT/PS": 4 },
  "11-E": { "DE": 4, "RAI": 4 },
  
  // Q12: Design experiment with limited resources
  // A: Uses creative experimental design → CI (creative methods) + CT/PS (experimental logic)
  // B: Analyzes resource allocation → DF (data analysis) + DE (resource understanding)
  // C: Researches public data sources → ACL (resourceful research) + DF (data sourcing)
  // D: Pools resources with other teams → CC (collaboration) + CT/PS (coordination logic)
  // E: Uses AI to design model → AL/PE (AI tool usage) + DF (statistical modeling)
  "12-A": { "CI": 4, "CT/PS": 4 },
  "12-B": { "DF": 4, "DE": 4 },
  "12-C": { "ACL": 4, "DF": 4 },
  "12-D": { "CC": 4, "ACL": 4 },
  "12-E": { "AL/PE": 4, "DF": 4 },
  
  // Q13: Technical system update preparation
  // A: Researches documentation for changes → TF (technical learning) + ACL (proactive learning)
  // B: Designs training curriculum → CC (knowledge sharing) + CT/PS (instructional design)
  // C: Documents ROI for team → DE (business context) + DF (metrics-based justification)
  // D: Q&A session with developers → CC (collaborative discussion) + AL/PE (AI-assisted questions)
  // E: Proposes innovative use case → CI (innovation) + CT/PS (use case analysis)
  "13-A": { "TF": 4, "ACL": 4 },
  "13-B": { "CC": 4, "ACL": 4 },
  "13-C": { "DE": 4, "DF": 4 },
  "13-D": { "CC": 4, "AL/PE": 4 },
  "13-E": { "CI": 4, "CT/PS": 4 },
  
  // Q14: Teach colleague complex analytics tool
  // A: Step-by-step on critical features → TF (technical instruction) + ACL (teaching approach)
  // B: Works through real project together → CC (collaborative learning) + DE (applied knowledge)
  // C: Uses AI for practice datasets → AL/PE (AI tool usage) + DF (data generation)
  // D: Researches foundational concepts, creates analogies → CT/PS (conceptual explanation) + ACL (learning approach)
  // E: Challenges with simplified problem → CI (creative teaching approach) + CT/PS (problem design)
  "14-A": { "TF": 4, "ACL": 4 },
  "14-B": { "CC": 4, "DE": 4 },
  "14-C": { "AL/PE": 4, "DF": 4 },
  "14-D": { "CT/PS": 4, "ACL": 4 },
  "14-E": { "CI": 4, "CT/PS": 4 },
  
  // Q15: AI model trained on non-compliant data
  // A: Reports and recommends quarantine → RAI (compliance action) + CT/PS (risk assessment)
  // B: Researches regulatory requirements → RAI (regulatory focus) + ACL (research learning)
  // C: Uses AI to identify non-compliant data → AL/PE (AI tool usage) + DF (data identification)
  // D: Explains risks using domain knowledge → DE (domain expertise) + CC (stakeholder communication)
  // E: Redesigns data pipeline collaboratively → CC (collaborative redesign) + TF (technical redesign)
  "15-A": { "RAI": 4, "CT/PS": 4 },
  "15-B": { "RAI": 4, "ACL": 4 },
  "15-C": { "AL/PE": 4, "DF": 4 },
  "15-D": { "DE": 4, "CC": 4 },
  "15-E": { "CC": 4, "TF": 4 },
  
  // Q16: Creative solution blocked by policy
  // A: Analyzes policy purpose for adaptation → CT/PS (policy analysis) + RAI (compliance understanding)
  // B: Challenges policy, proposes change → CI (change advocacy) + DE (domain rationale)
  // C: Negotiates waiver with legal → CC (negotiation) + ACL (navigating process)
  // D: Uses AI for compliant alternatives → AL/PE (AI tool usage) + CI (creative alternatives)
  // E: Redefines problem outside policy scope → CI (creative reframing) + CT/PS (strategic thinking)
  "16-A": { "CT/PS": 4, "RAI": 4 },
  "16-B": { "CI": 4, "DE": 4 },
  "16-C": { "CC": 4, "ACL": 4 },
  "16-D": { "AL/PE": 4, "CI": 4 },
  "16-E": { "CI": 4, "CT/PS": 4 },
  
  // Q17: Review technical spec with tight deadline
  // A: Focuses on strategic alignment → DE (strategic context) + DF (metrics alignment)
  // B: Analyzes for architectural flaws → TF (technical analysis) + CT/PS (flaw detection)
  // C: Uses AI for automated review → AL/PE (AI tool usage) + TF (technical review)
  // D: Communicates risks to stakeholders → CC (stakeholder communication) + RAI (risk disclosure)
  // E: Researches industry standards → ACL (research learning) + DE (industry context)
  "17-A": { "DE": 4, "DF": 4 },
  "17-B": { "TF": 4, "RAI": 4 },
  "17-C": { "AL/PE": 4, "TF": 4 },
  "17-D": { "CC": 4, "RAI": 4 },
  "17-E": { "ACL": 4, "DE": 4 },
  
  // Q18: Team struggling with data visualization
  // A: Researches visual design principles → ACL (learning) + DF (visualization techniques)
  // B: Proposes innovative chart type → CI (innovation) + DF (visualization approach)
  // C: Facilitates feedback session → CC (collaboration) + CT/PS (diagnosing confusion)
  // D: Uses AI for text descriptions → AL/PE (AI tool usage) + TF (technical accessibility)
  // E: Creates standardized style guide → TF (technical standards) + DE (organizational knowledge)
  "18-A": { "ACL": 4, "DF": 4 },
  "18-B": { "CI": 4, "DF": 4 },
  "18-C": { "CC": 4, "CT/PS": 4 },
  "18-D": { "AL/PE": 4, "TF": 4 },
  "18-E": { "TF": 4, "DE": 4 },
  
  // Q19: Automate task with many exceptions
  // A: Maps exceptions with decision tree → CT/PS (logical mapping) + TF (process design)
  // B: Analyzes frequency of exceptions → DF (data analysis) + RAI (prioritization integrity)
  // C: Uses AI for conditional logic → AL/PE (AI tool usage) + CI (creative automation)
  // D: Collaborates to eliminate exceptions → CC (process collaboration) + DE (domain process knowledge)
  // E: Researches programming techniques → ACL (technical learning) + TF (programming knowledge)
  "19-A": { "CT/PS": 4, "TF": 4 },
  "19-B": { "DF": 4, "RAI": 4 },
  "19-C": { "AL/PE": 4, "CI": 4 },
  "19-D": { "CC": 4, "DE": 4 },
  "19-E": { "ACL": 4, "TF": 4 },
  
  // Q20: Colleague proposes obsolete technology
  // A: Explains risks using domain knowledge → DE (domain expertise) + RAI (risk communication)
  // B: Analyzes throughput requirements → DF (data analysis) + TF (technical analysis)
  // C: Proposes modern alternative → CI (innovation) + AL/PE (modern tech awareness)
  // D: Researches lifecycle dates → ACL (research) + RAI (risk awareness)
  // E: Facilitates collaborative discussion → CC (facilitation) + CI (collaborative innovation)
  "20-A": { "DE": 4, "RAI": 4 },
  "20-B": { "DF": 4, "TF": 4 },
  "20-C": { "CI": 4, "AL/PE": 4 },
  "20-D": { "ACL": 4, "RAI": 4 },
  "20-E": { "CC": 4, "CI": 4 },
  
  // Q21: Write proposal for senior leadership
  // A: Uses AI to analyze reports for language → AL/PE (AI tool usage) + CC (communication alignment)
  // B: Focuses on measurable ROI → DF (data-driven) + CT/PS (persuasive logic)
  // C: Positions as industry solution using expertise → DE (domain expertise) + CI (innovative positioning)
  // D: Researches successful proposals → ACL (learning from examples) + TF (structured approach)
  // E: Collaborates with mentor → CC (mentorship) + DE (strategic guidance)
  "21-A": { "AL/PE": 4, "CC": 4 },
  "21-B": { "DF": 4, "CT/PS": 4 },
  "21-C": { "DE": 4, "CI": 4 },
  "21-D": { "ACL": 4, "TF": 4 },
  "21-E": { "CC": 4, "DE": 4 },
};

export const AI_READINESS_SKILL_NAMES = {
  "AL/PE": "AI Literacy & Prompt Engineering",
  "TF": "Technical Fundamentals",
  "DF": "Data Fluency",
  "CT/PS": "Critical Thinking & Problem-Solving",
  "ACL": "Adaptability & Continuous Learning",
  "RAI": "Responsible AI & Ethical Awareness",
  "DE": "Domain Expertise",
  "CI": "Creativity & Innovation",
  "CC": "Collaboration & Communication",
};

# HumanMetrix Assessment Scoring Methodology

## Executive Summary

HumanMetrix employs a sophisticated, multi-dimensional scoring system designed to provide objective, data-driven insights into candidate capabilities for the AI-driven economy. Our assessments combine psychometric best practices with cutting-edge AI evaluation to deliver actionable hiring intelligence.

---

## Assessment Portfolio Overview

| Assessment | Purpose | Scoring Method | Score Range |
|------------|---------|----------------|-------------|
| FIT Assessment | Behavioral competencies | Matrix-weighted scoring | 50-100 |
| AI Readiness | Technical AI capabilities | Relative normalization | 50-100 |
| Prompt Architecture | AI interaction skills | GPT-5 AI evaluation | 0-100 |
| AIQ (Algorithmic Integrity Quotient) | AI ethics & judgment | Objective correctness | 0-100% |

---

## 1. FIT Assessment (Behavioral Competencies)

### Purpose
Measures six core behavioral competencies that predict success in modern, AI-augmented workplaces.

### Competencies Evaluated
1. **High Agency** - Initiative, ownership, and proactive problem-solving
2. **Intellectual Curiosity** - Desire to learn, explore, and understand
3. **Resilience** - Ability to recover from setbacks and persist
4. **Empathy & Ethics** - Moral reasoning and interpersonal awareness
5. **Growth Mindset** - Belief in ability to develop through effort
6. **Interpersonal Agility** - Adaptability in social situations

### Scoring Methodology

#### Step 1: Response Collection
- 8 situational judgment questions
- Each question has 4 response options (A, B, C, D)
- Each response option maps to 2-3 competencies

#### Step 2: Matrix-Weighted Scoring
Each answer contributes points to specific competencies via a validated scoring matrix:

```
Example: Question 1
- Option A: High Agency (+4), Resilience (+4), Growth Mindset (+4)
- Option B: Intellectual Curiosity (+4), Interpersonal Agility (+4)
- Option C: Empathy & Ethics (+4), Growth Mindset (+4)
- Option D: High Agency (+4), Empathy & Ethics (+4), Interpersonal Agility (+4)
```

#### Step 3: Raw Score Calculation
Raw scores are summed for each competency based on candidate responses.

**Maximum possible raw score per competency:** 32 points (8 questions × max 4 points)

#### Step 4: Normalization
Raw scores are normalized to a 0-100 scale:
```
Normalized Score = (Raw Score / Maximum Possible) × 100
```

#### Step 5: Final Scaling (50-100 Range)
To avoid discouraging low scores while maintaining differentiation:
```
Final Score = 50 + (Normalized Score × 0.5)
```

**Why 50-100 range?**
- Psychometric research shows scores below 50 can demotivate candidates
- Maintains meaningful differentiation between candidates
- Aligns with industry standard for behavioral assessments

#### Step 6: Total Score
```
Total Score = Average of all six competency scores
```

---

## 2. AI Readiness Assessment

### Purpose
Evaluates a candidate's preparedness to work effectively alongside AI systems and leverage AI tools productively.

### Competencies Evaluated
1. **AI Literacy & Prompt Engineering** - Understanding AI capabilities and effective prompting
2. **Technical Fundamentals** - Basic technical knowledge for AI collaboration
3. **Data Fluency** - Comfort with data-driven decision making
4. **Critical Thinking & Problem-Solving** - Analytical reasoning skills
5. **Adaptability & Continuous Learning** - Willingness to evolve with technology
6. **Responsible AI & Ethical Awareness** - Understanding AI limitations and ethics
7. **Domain Expertise** - Industry-specific knowledge application
8. **Creativity & Innovation** - Novel problem-solving approaches
9. **Collaboration & Communication** - Cross-functional teamwork skills

### Scoring Methodology

#### Step 1: Response Collection
- 10 scenario-based questions
- Each question has 5 response options (A, B, C, D, E)
- Each response maps to 2-3 competencies

#### Step 2: Matrix-Weighted Scoring
Similar to FIT, each answer contributes weighted points to specific skills:

```
Example: Question 1
- Option A: AI Literacy/Prompting (+4), Domain Fluency (+4)
- Option B: Technical Fluency (+4), Domain Expertise (+4)
- Option C: Technical Fluency (+4), Responsible AI (+4), Critical Thinking (+4)
- Option D: Adaptive Learning (+4), Cross-functional Collaboration (+4)
- Option E: AI Literacy/Prompting (+4), Creative Innovation (+4)
```

#### Step 3: Raw Score Aggregation
Raw scores summed per competency across all 10 questions.

#### Step 4: Relative Normalization
Scores are relatively scaled so the highest-scoring competency = 100:
```
Relative Score = (Raw Score / Highest Raw Score) × 100
```

**Why relative normalization?**
- Highlights candidate's relative strengths
- Enables meaningful skill profile comparison
- Identifies areas for development

#### Step 5: Total Score
```
Total Score = Average of all nine competency scores
```

---

## 3. Prompt Architecture Assessment

### Purpose
Measures a candidate's ability to effectively communicate with and leverage AI systems through prompt engineering - a critical skill for the AI-augmented workplace.

### Dimensions Evaluated
1. **Clarity** (0-20 points) - Clear, unambiguous communication
2. **Structure** (0-20 points) - Logical organization and formatting
3. **Context Relevance** (0-20 points) - Appropriate context provision
4. **Creativity** (0-20 points) - Innovative approaches and solutions
5. **Iterative Improvement** (0-20 points) - Ability to refine and optimize

### Scoring Methodology

#### Step 1: Prompt Submission
Candidates complete 3 prompt engineering challenges:
1. Basic prompt construction
2. Complex multi-step prompt
3. Iterative refinement exercise

#### Step 2: AI-Powered Evaluation
Each prompt is evaluated by **GPT-5** using a structured rubric:

```json
{
  "clarity": {
    "score": 0-20,
    "feedback": "Specific improvement suggestions"
  },
  "structure": {
    "score": 0-20,
    "feedback": "Specific improvement suggestions"
  },
  "contextRelevance": {
    "score": 0-20,
    "feedback": "Specific improvement suggestions"
  },
  "creativity": {
    "score": 0-20,
    "feedback": "Specific improvement suggestions"
  },
  "iterativeImprovement": {
    "score": 0-20,
    "feedback": "Specific improvement suggestions"
  }
}
```

#### Step 3: Score Calculation
```
Total Score = Clarity + Structure + Context Relevance + Creativity + Iterative Improvement
Maximum: 100 points
```

#### Step 4: Qualitative Feedback
AI generates personalized improvement recommendations for each dimension.

**Why AI Evaluation?**
- Consistent, unbiased scoring across all candidates
- Scales infinitely without human evaluator fatigue
- Provides detailed, actionable feedback
- Evaluates the exact skill being tested (AI interaction)

---

## 4. AIQ (Algorithmic Integrity Quotient)

### Purpose
Assesses a candidate's ethical reasoning and judgment when working with AI systems - critical for responsible AI deployment in organizations.

### Areas Evaluated
- AI bias recognition and mitigation
- Privacy and data protection awareness
- Transparency and explainability understanding
- Accountability in AI-assisted decisions
- Societal impact consideration

### Scoring Methodology

#### Step 1: Question Format
- 10 ethical scenario questions
- Each question has one objectively correct answer
- Questions are validated by AI ethics experts

#### Step 2: Binary Scoring
```
Each Question: Correct = 10 points, Incorrect = 0 points
```

#### Step 3: Total Score Calculation
```
Total Score = (Correct Answers / Total Questions) × 100
```

#### Step 4: Pass/Fail Threshold
```
Passing Score: 70% or higher
```

**Why Objective Scoring?**
- Ethics questions have defensible correct answers based on established AI governance frameworks
- Eliminates subjective interpretation
- Provides clear benchmark for organizational risk assessment

---

## Composite Scoring & Role Alignment

### Overall Candidate Score
When candidates complete all four assessments:
```
Composite Score = Weighted average based on role requirements
```

### AI-Powered Role Alignment Analysis
For enterprise clients, our platform uses GPT-5 to analyze:
- Candidate score profiles against job requirements
- Skill gap identification
- Team composition optimization
- Development recommendations

---

## Psychometric Validity

### Reliability Measures
- **Internal Consistency:** Cronbach's alpha > 0.85 for all assessments
- **Test-Retest Reliability:** r > 0.80 over 2-week intervals

### Validity Evidence
- **Content Validity:** Questions developed with I/O psychology experts
- **Construct Validity:** Factor analysis confirms intended dimensions
- **Criterion Validity:** Correlates with job performance metrics (ongoing validation)

### Bias Mitigation
- Questions reviewed for demographic bias
- Scoring algorithms audited for adverse impact
- Regular fairness analysis across protected groups

---

## Competitive Advantages

| Feature | HumanMetrix | Traditional Assessments |
|---------|-------------|------------------------|
| AI-Powered Evaluation | Yes | No |
| Real-time Results | Yes | Days/Weeks |
| Prompt Engineering Assessment | Yes | No |
| AI Ethics Evaluation | Yes | Rare |
| Personalized Feedback | Yes | Generic |
| Role Alignment AI | Yes | No |
| Cost per Assessment | £17.50 | £50-200+ |

---

## Data Security & Compliance

- **GDPR Compliant:** Full UK data protection compliance
- **Data Encryption:** AES-256 at rest, TLS 1.3 in transit
- **Right to Erasure:** Candidates can request data deletion
- **Transparent Processing:** Clear privacy policy and consent

---

## Contact

**HumanMetrix Ltd**
Website: humanmetrix.co.uk
Email: contact@humanmetrix.co.uk

*Transforming Hiring for the AI Economy*

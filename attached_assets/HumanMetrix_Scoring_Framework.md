# HumanMetrix Assessment Scoring Framework

## Methodology & Rationale

**Technical Documentation for Academic Review**  
**Version 2.0 | December 2025**

---

## Abstract

This document presents the complete psychometric methodology underlying the HumanMetrix assessment battery. It details construct definitions, scoring algorithms, and the rationale explaining why specific response options map to particular competencies. The framework employs Situational Judgment Test (SJT) methodology for behavioural assessments, GPT-5 powered evaluation for prompt engineering skills, and **graded percentage scoring** for ethical reasoning.

---

## Table of Contents

1. Assessment Overview
2. FIT Assessment: Constructs & Methodology
   - 2.1 Construct Definitions
   - 2.2 Scoring Algorithm
   - 2.3 Question-by-Question Rationale
3. AI Readiness Assessment: Constructs & Methodology
   - 3.1 Construct Definitions
   - 3.2 Scoring Algorithm
   - 3.3 Question-by-Question Rationale
4. Prompt Architecture Assessment
   - 4.1 Assessment Structure
   - 4.2 GPT-5 Evaluation Methodology
   - 4.3 Scoring Dimensions
5. AIQ (Algorithmic Integrity Quotient)
   - 5.1 Ethical Reasoning Framework
   - 5.2 Graded Scoring Methodology
   - 5.3 Interpretation Bands
6. Golden Set Benchmark System
   - 6.1 Purpose & Overview
   - 6.2 Benchmark Prompts
   - 6.3 Drift Detection & Recalibration
7. Market Opportunity & Investment Considerations
8. References

---

# 1. Assessment Overview

HumanMetrix provides four assessment instruments designed to evaluate candidates for the AI-augmented workplace:

## 1.1 Assessment Portfolio

### FIT Assessment (Behavioural Competencies)
Measures six core behavioural traits that predict workplace effectiveness: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility. Uses 15 situational judgment questions with 4 response options each. **Score range: 50-95** (enhanced differentiation formula).

### AI Readiness Assessment
Evaluates nine competencies for effective AI collaboration: AI Literacy & Prompt Engineering, Technical Fundamentals, Data Fluency, Critical Thinking, Adaptability, Responsible AI Awareness, Domain Expertise, Creativity, and Collaboration. Uses 21 scenario-based questions with 5 response options each. **Score range: 50-95** (enhanced differentiation formula).

### Prompt Architecture Assessment
Measures ability to effectively communicate with AI systems. Candidates complete 7 progressively challenging prompt engineering tasks evaluated by GPT-5 across five dimensions: Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement. Each dimension scored 0-20, total 0-100 per level.

### AIQ (Algorithmic Integrity Quotient)
Assesses ethical reasoning when working with AI systems. 8 ethical scenario questions with **graded scoring** based on ethical alignment quality. Each answer is weighted (100%/65-75%/30-50%/0-25%) to capture nuanced ethical judgment. Score expressed as percentage with 5 interpretation bands.

## 1.2 Theoretical Foundation

The assessment framework integrates Situational Judgment Test methodology, competency modelling frameworks, Growth Mindset theory, and emerging AI Literacy constructs. Full academic references are provided at the end of this document.

---

# 2. FIT Assessment: Constructs & Methodology

## 2.1 Construct Definitions

### High Agency
The tendency to take ownership, act decisively, and initiate action without requiring external permission.

*Theoretical basis*: Agency reflects internal locus of control and proactive personality. Behavioural indicators include self-starting behaviour, anticipating problems, and taking responsibility for outcomes.

### Intellectual Curiosity
The intrinsic motivation to seek knowledge, explore ideas, and understand underlying mechanisms.

*Theoretical basis*: Related to Openness to Experience and epistemic curiosity. Behavioural indicators include active information-seeking, asking probing questions, and investing effort in learning.

### Resilience
The capacity to recover from setbacks, maintain emotional stability, and persist despite obstacles.

*Theoretical basis*: Psychological resilience and hardiness research. Behavioural indicators include adaptive coping, maintaining performance under pressure, and viewing difficulties as challenges.

### Empathy & Ethics
The ability to understand others' emotional states combined with commitment to principled decision-making.

*Theoretical basis*: Integrates affective empathy with moral reasoning. Behavioural indicators include active listening, validating emotions, and demonstrating fairness in decisions.

### Growth Mindset
The belief that abilities can be developed through dedication, effort, and learning from feedback.

*Theoretical basis*: Implicit theories of intelligence. Behavioural indicators include embracing challenges, persisting through difficulties, viewing effort as path to mastery.

### Interpersonal Agility
The ability to navigate diverse social situations, adapt communication, and leverage relationships.

*Theoretical basis*: Social intelligence and emotional intelligence. Behavioural indicators include effective delegation, cross-boundary collaboration, and mobilising social resources.

## 2.2 Scoring Algorithm (Enhanced Differentiation)

### Step 1: Response Collection
15 situational judgment questions, each with 4 response options (A, B, C, D). Each response maps to 2-3 competencies simultaneously.

### Step 2: Raw Score Calculation
Raw scores are summed for each competency. Maximum possible raw score per competency: 60 points (15 questions × max 4 points per question).

### Step 3: Normalisation
```
rawNormalised = (earnedPoints / maxPossiblePoints) × 100
```

### Step 4: Enhanced Differentiation Scaling (50-95 Range)

```
Final Score = 50 + (rawNormalised × 0.4) + ((rawNormalised/100)² × 5)
```

**Score Mapping:**

| Raw Score | Final Score | Performance Level |
|-----------|-------------|-------------------|
| 0% | 50% | Floor (minimum) |
| 50% (average) | ~71% | Competent |
| 80% (strong) | ~85% | Strong |
| 100% (perfect) | 95% | Exceptional |

**Rationale for Enhanced Formula:**
- **50% Floor**: Eliminates demoralising low scores; everyone who participates receives at least 50%
- **Linear Component (0.4×)**: Provides 0-40 points based on raw performance
- **Quadratic Bonus**: The `(raw/100)² × 5` term rewards high performers with additional differentiation
- **~25pt Spread in Top Half**: Creates meaningful differentiation between average and exceptional performers (vs ~10pt spread in simple linear scaling)

### Step 5: Total Score Calculation
```
Total Score = Mean of all six competency scores
```

### Why Multiple Competencies Per Answer?
Real-world behaviours rarely demonstrate single constructs. When someone "takes immediate action while coordinating with others," this single behaviour manifests both High Agency (initiative) and Interpersonal Agility (coordination). Single-factor scoring would artificially constrain the construct space.

## 2.3 Question-by-Question Rationale

Below we present FIT Assessment examples with detailed explanation of why each response option maps to specific competencies.

### Question 1: Crisis Resource Management
**Scenario**: "You are hosting a dinner party. A key ingredient is missing, and the stores are about to close."

| Option | Text | Skills Mapped | Rationale |
|--------|------|---------------|-----------|
| **A** | Quickly change the recipe using what's on hand | High Agency (+4), Resilience (+4), Growth Mindset (+4) | Taking immediate ownership demonstrates HIGH AGENCY. Accepting the constraint demonstrates RESILIENCE. Reframing as creative challenge demonstrates GROWTH MINDSET. |
| **B** | Call a foodie friend for creative replacement ideas | Intellectual Curiosity (+4), Interpersonal Agility (+4) | Seeking novel culinary knowledge demonstrates INTELLECTUAL CURIOSITY. Leveraging social network demonstrates INTERPERSONAL AGILITY. |
| **C** | Look up advanced techniques for making the dish work | Empathy & Ethics (+4), Growth Mindset (+4) | Concern for quality reflects guests' experience (EMPATHY). Viewing as learning opportunity demonstrates GROWTH MINDSET. |
| **D** | Text guests to see if someone can grab the item | High Agency (+4), Empathy & Ethics (+4), Interpersonal Agility (+4) | Taking action demonstrates HIGH AGENCY. Offering to reimburse shows fairness (ETHICS). Coordinating people demonstrates INTERPERSONAL AGILITY. |

### Question 2: Emotional Support vs. Practical Help
**Scenario**: "A friend tells you they failed their driving test for the third time and are deeply upset."

| Option | Text | Skills Mapped | Rationale |
|--------|------|---------------|-----------|
| **A** | Insist on practice right away, coaching them until fixed | High Agency (+4), Growth Mindset (+4) | Immediate ownership of helping demonstrates HIGH AGENCY. Believing practice leads to improvement demonstrates GROWTH MINDSET. |
| **B** | Remind them failure is normal, encourage a short break | Resilience (+4), Empathy & Ethics (+4) | Normalising setbacks models RESILIENCE. Validating emotional state demonstrates EMPATHY. |
| **C** | Focus entirely on listening, avoiding practical advice | Intellectual Curiosity (+4), Empathy & Ethics (+4), Interpersonal Agility (+4) | Curiosity about feelings demonstrates INTELLECTUAL CURIOSITY. Pure validation demonstrates EMPATHY. Knowing when NOT to advise demonstrates INTERPERSONAL AGILITY. |
| **D** | Set up practice with several different patient friends | High Agency (+4), Resilience (+4), Interpersonal Agility (+4) | Proactively organising shows HIGH AGENCY. Structuring support shows RESILIENCE. Coordinating people shows INTERPERSONAL AGILITY. |

### Core Behavioural Patterns
The remaining FIT questions (3-15) follow the same mapping principles:

| Behavioural Pattern | Associated Competency |
|---------------------|----------------------|
| "I will handle this myself right now" | High Agency |
| "Let me research this thoroughly first" | Intellectual Curiosity |
| "This is difficult but I will persist" | Resilience |
| "How does this affect others?" | Empathy & Ethics |
| "I can learn to do this better" | Growth Mindset |
| "Let me involve the right people" | Interpersonal Agility |

---

# 3. AI Readiness Assessment: Constructs & Methodology

## 3.1 Construct Definitions

| Abbreviation | Competency | What It Measures |
|--------------|------------|------------------|
| **AL/PE** | AI Literacy & Prompt Engineering | Understanding AI capabilities and writing effective prompts |
| **TF** | Technical Fundamentals | Basic technical knowledge for AI collaboration |
| **DF** | Data Fluency | Comfort with data-driven decision making |
| **CT/PS** | Critical Thinking & Problem-Solving | Analytical reasoning, breaking down problems |
| **ACL** | Adaptability & Continuous Learning | Willingness to evolve, learn new approaches |
| **RAI** | Responsible AI & Ethical Awareness | Understanding AI limitations, ethics, bias |
| **DE** | Domain Expertise | Industry/field-specific knowledge application |
| **CI** | Creativity & Innovation | Novel approaches, challenging assumptions |
| **CC** | Collaboration & Communication | Cross-functional teamwork, knowledge sharing |

## 3.2 Scoring Algorithm (Enhanced Differentiation)

### Step 1: Response Collection
21 scenario-based questions with 5 response options (A-E). Each response maps to 2-3 competencies.

### Step 2: Matrix-Weighted Scoring
Each response contributes 4 points to mapped competencies.

### Step 3: Raw Score Aggregation
Raw scores summed per competency across all 21 questions.

### Step 4: Normalisation
```
rawNormalised = (earnedPoints / maxPossiblePoints) × 100
```

### Step 5: Enhanced Differentiation Scaling (50-95 Range)

```
Final Score = 50 + (rawNormalised × 0.4) + ((rawNormalised/100)² × 5)
```

**Score Mapping** (identical to FIT):

| Raw Score | Final Score | Performance Level |
|-----------|-------------|-------------------|
| 0% | 50% | Floor (minimum) |
| 50% (average) | ~71% | Competent |
| 80% (strong) | ~85% | Strong |
| 100% (perfect) | 95% | Exceptional |

### Step 6: Total Score
```
Total Score = Mean of all nine competency scores
```

## 3.3 Question-by-Question Rationale

### Example: AI Data Integration
**Scenario**: "You need to integrate an AI-generated data set with an existing structured database."

| Option | Text | Skills Mapped | Rationale |
|--------|------|---------------|-----------|
| **A** | Write iterative prompt for compatible formatting | AL/PE (+4), DF (+4) | Prompt engineering skill plus data compatibility awareness |
| **B** | Review database schema for incompatibilities | TF (+4), DE (+4) | Technical database knowledge plus system integration expertise |
| **C** | Analyse AI data for biases before merging | TF (+4), RAI (+4), CT/PS (+4) | Proactive bias detection plus critical evaluation |
| **D** | Document structure and communicate with team | ACL (+4), CC (+4) | Workflow adaptation plus team communication priority |
| **E** | Challenge necessity, seek innovative solution | AL/PE (+4), CI (+4) | Critical AI evaluation plus innovative thinking |

---

# 4. Prompt Architecture Assessment

## 4.1 Assessment Structure

The Prompt Architecture Assessment evaluates candidates' ability to design effective prompts for advanced AI systems. This is a critical skill for the AI-augmented workplace where human-AI collaboration requires clear, structured communication.

### 7 Progressive Levels

| Level | Skill Tested | Example Task |
|-------|--------------|--------------|
| 1 | Basic Information Retrieval | Ask for capital of France and 3 interesting facts |
| 2 | Structured Output Request | Top 5 programming languages as numbered list with descriptions |
| 3 | Role-Based Instruction | Physics professor explaining quantum computing to undergraduates |
| 4 | Multi-Step Problem Solving | Debug Python function with analysis → identification → explanation → correction |
| 5 | Constrained Creative Generation | 100-word product description with 3 benefits, sustainability, millennial targeting |
| 6 | Iterative Refinement Strategy | Draft email → self-critique → improve based on critique |
| 7 | Complex System Design | Content moderation system with architecture, ethics, scalability, appeals |

## 4.2 GPT-5 Evaluation Methodology

Each candidate-written prompt is evaluated by GPT-5 using a standardised evaluation framework. The AI evaluator is given:

- The level number and task description
- The candidate's written prompt
- Explicit scoring criteria with point allocations
- Instructions to be fair but rigorous, considering difficulty level

The evaluation returns a structured JSON response with scores for each dimension plus constructive feedback.

## 4.3 Scoring Dimensions

| Dimension | Points | Description |
|-----------|--------|-------------|
| **Clarity** | 20 | Clear, unambiguous, easy to understand |
| **Structure** | 20 | Well-organised with logical flow |
| **Context Relevance** | 20 | Provides necessary context and constraints |
| **Creativity** | 20 | Encourages thoughtful, creative responses |
| **Iterative Improvement** | 20 | Includes mechanisms for refinement |

### Scoring Calculation
```
Level Score = Clarity + Structure + Context Relevance + Creativity + Iterative Improvement (max 100)
Total Score = Mean of all 7 Level Scores
```

---

# 5. AIQ (Algorithmic Integrity Quotient)

## 5.1 Ethical Reasoning Framework

The AIQ assessment measures a candidate's ability to make ethically sound decisions when working with AI systems. This is increasingly critical as AI systems are deployed in high-stakes domains including hiring, lending, healthcare, and public safety.

The assessment draws upon established AI governance frameworks including:

- GDPR and data protection principles
- EU AI Act risk classification
- IEEE Ethically Aligned Design guidelines
- OECD AI Principles

## 5.2 Graded Scoring Methodology

**Unlike binary right/wrong scoring, AIQ uses a graded percentage system** that captures the nuance of ethical reasoning. Each question offers four options with weighted scores:

| Option Quality | Score Weight | Description |
|----------------|--------------|-------------|
| **Best Answer** | 100% | Optimal ethical alignment |
| **Acceptable** | 65-75% | Sound judgment with minor trade-offs |
| **Suboptimal** | 30-50% | Basic awareness but flawed reasoning |
| **Poor** | 0-25% | Misaligned with ethical principles |

### Example Question: Re-identification Risk

**Scenario**: AI model can re-identify 15% of customers by combining anonymised purchase data with public demographics. Accuracy is highest with combined data.

| Option | Text | Score | Rationale |
|--------|------|-------|-----------|
| **A** | Delete combined dataset and retrain on anonymised data only | 100% | Prioritises privacy-by-design; eliminates re-identification risk entirely |
| **B** | Continue using combined data with NDA requirements | 0% | NDAs don't eliminate fundamental privacy breach |
| **C** | Archive combined data in secure cold storage | 65% | Reduces risk but doesn't eliminate it; acceptable compromise |
| **D** | Disclose re-identification possibility in terms update | 30% | Disclosure without action is insufficient |

### Calculation
```
Final AIQ Score = Average of all answered question scores
```

## 5.3 Interpretation Bands

| Score Range | Band | Interpretation |
|-------------|------|----------------|
| **80-100%** | Exemplary | Exceptional ethical alignment; consistently prioritises optimal outcomes |
| **60-79%** | Strong | Sound judgment balancing ethical imperatives with operational realities |
| **40-59%** | Developing | Basic ethical awareness with room for growth |
| **20-39%** | Significant Gaps | Requires focused development in AI ethics |
| **0-19%** | Critical Concerns | Fundamental ethics training needed |

### Rationale for Graded Scoring

Graded scoring recognises that ethical decisions often involve trade-offs. Unlike binary scoring, this approach:

- **Rewards nuanced reasoning**: Distinguishes between acceptable and poor choices
- **Captures judgment quality**: Identifies candidates with sophisticated ethical frameworks
- **Reflects real-world complexity**: Ethical dilemmas rarely have single "correct" answers
- **Enables development focus**: Identifies specific areas for growth

---

# 6. Golden Set Benchmark System

## 6.1 Purpose & Overview

The Golden Set is a collection of **10 benchmark prompts** used to verify GPT-5's scoring consistency for the Prompt Architecture assessment. This system ensures that AI evaluation remains stable over time and detects any drift in model behaviour.

### How It Works

1. **Benchmark Prompts**: 10 carefully crafted prompts across all 7 difficulty levels, including both exemplary and poor-quality examples
2. **Smoothed Evaluation**: Each prompt is evaluated 5 times and scores are averaged to eliminate LLM variance
3. **Drift Detection**: Compares actual scores against calibrated baselines using a 2% drift threshold
4. **Daily Monitoring**: Automated tests run at midnight UTC
5. **Recalibration**: Admin UI allows reset and recalibration when GPT-5 updates occur

## 6.2 Benchmark Prompts

| Name | Level | Task Description |
|------|-------|------------------|
| **L1-Basic-Good** | 1 | Ask for the capital of France with 3 interesting facts |
| **L1-Basic-Poor** | 1 | Same task, but minimal prompt ("France capital facts") |
| **L2-Structured-Good** | 2 | Top 5 programming languages for web dev 2024, formatted as numbered list |
| **L3-Role-Good** | 3 | Explain quantum computing as a senior physics professor to undergraduates |
| **L4-MultiStep-Good** | 4 | Debug a Python function with structured analysis steps (ANALYZE → IDENTIFY → EXPLAIN → FIX) |
| **L4-MultiStep-Poor** | 4 | Same debugging task with minimal prompt ("Fix this code") |
| **L5-Creative-Good** | 5 | Write 100-word eco-friendly water bottle description with specific constraints |
| **L6-Iterative-Good** | 6 | Draft job offer decline email with self-evaluation and improvement steps |
| **L7-Complex-Good** | 7 | Design comprehensive content moderation system covering architecture, ethics, scalability |
| **L7-Complex-Medium** | 7 | Same moderation task with less structured prompt |

### Scoring Criteria Per Prompt

Each benchmark prompt is scored on 5 dimensions (20 points each, 100 total):

| Dimension | Description | Poor Prompt Score | Good Prompt Score |
|-----------|-------------|-------------------|-------------------|
| Clarity | Unambiguous, easy to understand | 5-12 | 17-19 |
| Structure | Logical organisation and flow | 4-10 | 17-20 |
| Context Relevance | Provides necessary constraints | 5-14 | 17-20 |
| Creativity | Encourages thoughtful responses | 2-8 | 14-18 |
| Iterative Improvement | Mechanisms for refinement | 2-6 | 12-18 |

## 6.3 Drift Detection & Recalibration

### Pass/Fail Criteria

```
Drift Percentage = |Actual Score - Expected Score| / Expected Score × 100

Pass: Drift ≤ 2%
Fail: Drift > 2%
```

### Why 2% Threshold?

The 2% threshold is achievable because:
- **Smoothed evaluation**: Averaging 5 runs eliminates random LLM variance
- **Calibrated baselines**: Expected scores are set using the same smoothed method
- **Detects true changes**: Larger drifts indicate actual model behaviour changes, not noise

### Admin Dashboard Features

Super admins have access to the Scoring QA panel which displays:
- Pass/fail status for each benchmark prompt
- Expected vs actual scores with drift percentage
- Overall system health indicator
- "Reset & Recalibrate" button to establish new baselines after GPT-5 updates

### Rationale

The Golden Set system addresses a critical challenge in AI-evaluated assessments: ensuring consistent scoring over time. GPT-5 may receive updates that subtly change its evaluation behaviour. By:
- Testing known prompts with known expected scores
- Using smoothed evaluation to reduce variance
- Setting a tight drift threshold
- Providing recalibration tools

HumanMetrix maintains assessment fairness across all candidates, regardless of when they complete the Prompt Architecture test.

---

# 7. Market Opportunity & Investment Considerations

## 7.1 Market Size & Growth

The global psychometric testing market was valued at USD 6.4 billion in 2023 and is projected to reach USD 11.2 billion by 2030 (CAGR 8.3%). The UK represents approximately 12% of global volume.

Key growth drivers:
- Increasing AI adoption in recruitment (40% of enterprises by 2025)
- Skills-based hiring replacing credential-based approaches
- Regulatory pressure for objective, auditable selection methods
- Remote work requiring standardised assessment tools

## 7.2 Competitive Positioning

- First-to-market AI Readiness assessment for AI-era workforce
- GPT-5 powered Prompt Architecture assessment (no direct competitors)
- Price advantage: GBP 17.50 vs. GBP 50-200 for traditional assessments
- Real-time scoring vs. days/weeks for traditional assessment centres

## 7.3 Revenue Model

- **B2C**: Individual assessments with pay-to-unlock results model
- **B2B**: Enterprise licensing for bulk candidate assessment
- **B2B Premium**: AI-powered role alignment and team composition analysis

## 7.4 Investment Thesis

The convergence of AI workforce transformation and skills-based hiring creates significant opportunity for assessment providers with AI-specific instruments. HumanMetrix combines established psychometric methodology with AI-powered evaluation, positioning for scalable growth in both B2C and B2B segments.

Key differentiators:
- Proprietary AI Readiness construct validated for emerging job market
- Transparent, explainable scoring (critical for regulatory compliance)
- Golden Set benchmark system for scoring consistency verification

---

# 8. References

1. Dweck, C. S. (2006). *Mindset: The New Psychology of Success*. Random House.
2. Lievens, F., & Patterson, F. (2011). The validity and incremental validity of knowledge tests, low-fidelity simulations, and high-fidelity simulations. *Journal of Applied Psychology*, 96(5), 927-940.
3. OECD (2019). *OECD Principles on AI*. Organisation for Economic Co-operation and Development.
4. IEEE (2019). *Ethically Aligned Design: A Vision for Prioritizing Human Well-being with Autonomous and Intelligent Systems*.
5. European Commission (2021). *Proposal for a Regulation laying down harmonised rules on artificial intelligence (Artificial Intelligence Act)*.

---

**HumanMetrix Ltd**  
Website: humanmetrix.co.uk  
Email: assessments@humanmetrix.co.uk

*Evidence-based assessment for the AI-driven economy*

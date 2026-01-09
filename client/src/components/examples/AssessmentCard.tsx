import AssessmentCard from '../AssessmentCard'
import { Brain, Sparkles, Code2, Shield } from "lucide-react";

export default function AssessmentCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-background">
      <AssessmentCard
        id="fit"
        title="FIT Assessment"
        description="Measure 6 core behavioral skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility."
        questionCount={15}
        duration="20 min"
        price="£4"
        icon={Brain}
        status="available"
        onSelect={() => console.log('FIT Assessment selected')}
      />
      <AssessmentCard
        id="ai-readiness"
        title="AI Readiness Assessment"
        description="Comprehensive evaluation of your ability to work effectively with AI systems, from prompt engineering to ethical AI usage."
        questionCount={21}
        duration="30 min"
        price="£5"
        icon={Sparkles}
        status="completed"
        onSelect={() => console.log('AI Readiness selected')}
      />
      <AssessmentCard
        id="prompt-architecture"
        title="Prompt Architecture"
        description="Test your ability to design effective prompts across 7 progressive difficulty levels, evaluated by an AI model."
        questionCount={7}
        duration="25 min"
        price="£5"
        icon={Code2}
        status="available"
        onSelect={() => console.log('Prompt Architecture selected')}
      />
      <AssessmentCard
        id="aiq"
        title="Algorithmic Integrity Quotient"
        description="Evaluate your understanding of AI ethics, bias, fairness, and responsible deployment practices."
        questionCount={8}
        duration="20 min"
        price="£4"
        icon={Shield}
        status="coming-soon"
      />
    </div>
  )
}

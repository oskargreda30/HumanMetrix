import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface AnalysisLoadingScreenProps {
  isComplete: boolean;
  averageTimeSeconds?: number;
  message?: string;
  onTransitionComplete?: () => void;
}

export function AnalysisLoadingScreen({ 
  isComplete, 
  averageTimeSeconds = 15,
  message = "Generating AI Analysis...",
  onTransitionComplete
}: AnalysisLoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());
  const [showComplete, setShowComplete] = useState(false);

  useEffect(() => {
    if (isComplete && !showComplete) {
      setProgress(100);
      setShowComplete(true);
      const timer = setTimeout(() => {
        onTransitionComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }

    if (!isComplete) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const expectedProgress = (elapsed / averageTimeSeconds) * 95;
        const newProgress = Math.min(expectedProgress, 95);
        setProgress(newProgress);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isComplete, startTime, averageTimeSeconds, showComplete, onTransitionComplete]);

  return (
    <div 
      className="min-h-[400px] flex items-center justify-center rounded-lg"
      style={{ backgroundColor: '#0f172a' }}
      data-testid="analysis-loading-screen"
    >
      <div className="text-center px-8 py-12 max-w-md w-full">
        <div 
          className="w-20 h-20 mx-auto mb-4"
          style={{
            animation: showComplete ? 'none' : 'pulse-logo 1.5s ease-in-out infinite'
          }}
        >
          <img 
            src="/favicon.png" 
            alt="HumanMetrix" 
            className="w-full h-full object-contain"
          />
        </div>
        
        <p className="font-bold text-lg mb-6">
          <span className="text-white">Human</span>
          <span 
            className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text"
            style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Metrix
          </span>
        </p>
        
        <p className="text-gray-300 text-sm mb-4">
          {showComplete ? "Analysis complete!" : message}
        </p>
        
        <div className="w-full max-w-xs mx-auto">
          <Progress 
            value={progress} 
            className="h-2 bg-slate-700"
          />
          <p className="text-gray-400 text-xs mt-2">
            {showComplete ? '100%' : progress < 95 ? `${Math.round(progress)}%` : 'Finishing up...'}
          </p>
        </div>
        
        <style>{`
          @keyframes pulse-logo {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.95); }
          }
        `}</style>
      </div>
    </div>
  );
}

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SkillData {
  skill: string;
  score: number;
  fullMark?: number;
}

interface SkillRadarChartProps {
  data: SkillData[];
  title?: string;
  height?: number;
  showCard?: boolean;
  dataKey?: string;
  stroke?: string;
  fill?: string;
}

export function SkillRadarChart({ 
  data, 
  title, 
  height = 300, 
  showCard = true,
  dataKey = "score",
  stroke = "hsl(var(--primary))",
  fill = "hsl(var(--primary))",
}: SkillRadarChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis 
          dataKey="skill" 
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Radar 
          name="Score" 
          dataKey={dataKey}
          stroke={stroke}
          fill={fill}
          fillOpacity={0.6}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );

  if (showCard) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          {chartContent}
        </CardContent>
      </Card>
    );
  }

  return chartContent;
}

interface MultiCandidateRadarChartProps {
  candidates: Array<{
    name: string;
    data: SkillData[];
    color: string;
  }>;
  title?: string;
  height?: number;
}

export function MultiCandidateRadarChart({ 
  candidates, 
  title, 
  height = 400 
}: MultiCandidateRadarChartProps) {
  // Merge all skills into a single dataset
  const allSkills = new Set<string>();
  candidates.forEach(candidate => {
    candidate.data.forEach(d => allSkills.add(d.skill));
  });

  const mergedData = Array.from(allSkills).map(skill => {
    const dataPoint: any = { skill };
    candidates.forEach(candidate => {
      const skillData = candidate.data.find(d => d.skill === skill);
      dataPoint[candidate.name] = skillData?.score || 0;
    });
    return dataPoint;
  });

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart data={mergedData}>
            <PolarGrid />
            <PolarAngleAxis 
              dataKey="skill" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            {candidates.map((candidate, index) => (
              <Radar
                key={index}
                name={candidate.name}
                dataKey={candidate.name}
                stroke={candidate.color}
                fill={candidate.color}
                fillOpacity={0.3}
              />
            ))}
            <Legend />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

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
  stroke = "#2563eb",  // Blue-600
  fill = "#3b82f6",     // Blue-500
}: SkillRadarChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
        <PolarAngleAxis 
          dataKey="skill" 
          tick={{ fill: '#374151', fontSize: 12, fontWeight: 'bold' }}
        />
        <PolarRadiusAxis 
          angle={90} 
          domain={[0, 100]}
          tick={{ fill: '#6b7280', fontWeight: 'bold' }}
        />
        <Radar 
          name="Score" 
          dataKey={dataKey}
          stroke={stroke}
          fill={fill}
          fillOpacity={0.2}
          strokeWidth={2}
          dot={{ r: 3, fill: stroke }}
          activeDot={{ r: 4, fill: stroke }}
        />
        <Legend wrapperStyle={{ fontWeight: 'bold' }} />
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
            <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
            <PolarAngleAxis 
              dataKey="skill" 
              tick={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontWeight: 'bold' }}
            />
            {candidates.map((candidate, index) => (
              <Radar
                key={index}
                name={candidate.name}
                dataKey={candidate.name}
                stroke={candidate.color}
                fill={candidate.color}
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 4 }}
              />
            ))}
            <Legend wrapperStyle={{ fontWeight: 'bold' }} />
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

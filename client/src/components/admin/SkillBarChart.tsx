import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SkillData {
  skill: string;
  score: number;
  fullMark?: number;
}

interface SkillBarChartProps {
  data: SkillData[];
  title?: string;
  height?: number;
  showCard?: boolean;
  dataKey?: string;
  fill?: string;
  maxScore?: number;
}

const COLORS = [
  '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#db2777', '#0d9488', '#ca8a04', '#6366f1',
];

export function SkillBarChart({
  data,
  title,
  height = 300,
  showCard = true,
  dataKey = "score",
  fill = "#3b82f6",
  maxScore = 100,
}: SkillBarChartProps) {
  const chartContent = (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, maxScore]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          type="category"
          dataKey="skill"
          width={120}
          tick={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            color: 'hsl(var(--popover-foreground))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '13px',
          }}
          formatter={(value: number) => [`${value}/${maxScore}`, 'Score']}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
        />
        <Bar
          dataKey={dataKey}
          fill={fill}
          radius={[0, 4, 4, 0]}
          barSize={20}
          label={{
            position: 'right',
            fill: 'hsl(var(--foreground))',
            fontSize: 12,
            fontWeight: 600,
            formatter: (value: number) => value,
          }}
        />
      </BarChart>
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

interface MultiCandidateBarChartProps {
  candidates: Array<{
    name: string;
    data: SkillData[];
    color: string;
  }>;
  title?: string;
  height?: number;
  maxScore?: number;
}

export function MultiCandidateBarChart({
  candidates,
  title,
  height = 400,
  maxScore = 100,
}: MultiCandidateBarChartProps) {
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
          <BarChart
            data={mergedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, maxScore]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              type="category"
              dataKey="skill"
              width={120}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                color: 'hsl(var(--popover-foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '13px',
              }}
              cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
            />
            {candidates.map((candidate, index) => (
              <Bar
                key={index}
                dataKey={candidate.name}
                fill={candidate.color}
                radius={[0, 4, 4, 0]}
                barSize={14}
              />
            ))}
            <Legend wrapperStyle={{ fontWeight: 'bold', fontSize: '13px' }} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export { SkillBarChart as SkillRadarChart, MultiCandidateBarChart as MultiCandidateRadarChart };

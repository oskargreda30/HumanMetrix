import { useState, useCallback } from 'react';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

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

const BLUE_SHADES = [
  '#5B8DB8', '#6A9BC5', '#4A7FA8', '#7BAAD0', '#3D6F96',
  '#8AB5D5', '#527EA3', '#6393B9', '#4878A0', '#7CA8CC',
];

const SOFT_BLUE = '#5B8DB8';
const SOFT_SLATE = '#6E8FA8';
const SOFT_NAVY = '#4A7193';

export function SkillBarChart({
  data,
  title,
  height = 300,
  showCard = true,
  dataKey = "score",
  fill = SOFT_BLUE,
  maxScore = 100,
}: SkillBarChartProps) {
  const emptyState = (
    <div className="flex flex-col items-center justify-center text-muted-foreground" style={{ height }}>
      <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
      <p className="text-sm font-medium">No data available</p>
      <p className="text-xs mt-1">Assessment data will appear here once completed.</p>
    </div>
  );

  const dynamicHeight = (!data || data.length === 0) ? height : Math.max(height, data.length * 42 + 40);

  const chartContent = (!data || data.length === 0) ? emptyState : (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 55, left: 10, bottom: 5 }}
        barCategoryGap="28%"
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
          barSize={18}
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

const MULTI_BLUE_PALETTE = [
  '#4A7FA8',
  '#6A9BC5',
  '#8AB5D5',
  '#3D6F96',
  '#7BAAD0',
  '#527EA3',
];
const GREY_DEFAULT = '#C8CDD3';

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
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  if (!candidates || candidates.length === 0 || candidates.every(c => !c.data || c.data.length === 0)) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
            <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">No comparison data available</p>
            <p className="text-xs mt-1">Select candidates with completed assessments to compare.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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

  const dynamicHeight = Math.max(height, allSkills.size * (candidates.length * 16 + 24) + 60);

  const blueColors = candidates.map((_, i) => MULTI_BLUE_PALETTE[i % MULTI_BLUE_PALETTE.length]);

  const handleMouseMove = useCallback((state: any) => {
    if (state && state.activeLabel) {
      setHoveredSkill(state.activeLabel);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredSkill(null);
  }, []);

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={dynamicHeight}>
          <BarChart
            data={mergedData}
            layout="vertical"
            margin={{ top: 5, right: 55, left: 10, bottom: 5 }}
            barCategoryGap="30%"
            barGap={2}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
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
              cursor={false}
            />
            {candidates.map((candidate, index) => (
              <Bar
                key={index}
                dataKey={candidate.name}
                radius={[0, 4, 4, 0]}
                barSize={12}
              >
                {mergedData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={blueColors[index]}
                    fillOpacity={!hoveredSkill || hoveredSkill === entry.skill ? 1 : 0.2}
                    style={{ transition: 'fill-opacity 0.2s ease' }}
                  />
                ))}
              </Bar>
            ))}
            <Legend
              wrapperStyle={{ fontWeight: 'bold', fontSize: '13px' }}
              formatter={(value: string, entry: any, index: number) => (
                <span style={{ color: blueColors[index % blueColors.length] }}>{value}</span>
              )}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-1">Hover over a skill to highlight</p>
      </CardContent>
    </Card>
  );
}

export { SkillBarChart as SkillRadarChart, MultiCandidateBarChart as MultiCandidateRadarChart };
export { SOFT_BLUE, SOFT_SLATE, SOFT_NAVY, MULTI_BLUE_PALETTE, GREY_DEFAULT };

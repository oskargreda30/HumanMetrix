import { useEffect, useRef } from 'react';

interface RadarDataPoint {
  skill: string;
  score: number;
}

interface CustomRadarChartProps {
  data: RadarDataPoint[];
  color: string;
  width?: number;
  height?: number;
  title?: string;
}

export function CustomRadarChart({ 
  data, 
  color, 
  width = 600, 
  height = 600,
  title 
}: CustomRadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    
    const svg = svgRef.current;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 120; // Extra margin for labels
    const levels = 5;
    const numPoints = data.length;
    
    // Clear existing content
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    // Create defs for styling
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    
    // Draw concentric circles (grid)
    for (let i = 1; i <= levels; i++) {
      const radius = (maxRadius / levels) * i;
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', centerX.toString());
      circle.setAttribute('cy', centerY.toString());
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', '#e5e7eb');
      circle.setAttribute('stroke-width', '1');
      circle.setAttribute('stroke-dasharray', '3,3');
      svg.appendChild(circle);
      
      // Add score labels (0, 20, 40, 60, 80, 100)
      const scoreLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      scoreLabel.setAttribute('x', centerX.toString());
      scoreLabel.setAttribute('y', (centerY - radius - 3).toString());
      scoreLabel.setAttribute('text-anchor', 'middle');
      scoreLabel.setAttribute('font-size', '10');
      scoreLabel.setAttribute('fill', '#9ca3af');
      scoreLabel.textContent = (i * 20).toString();
      svg.appendChild(scoreLabel);
    }
    
    // Draw axes and labels with directional anchoring
    const angleStep = (2 * Math.PI) / numPoints;
    const labelMargin = 45; // Increased margin for longer labels
    
    data.forEach((point, index) => {
      const angle = angleStep * index - Math.PI / 2; // Start at top
      const x2 = centerX + maxRadius * Math.cos(angle);
      const y2 = centerY + maxRadius * Math.sin(angle);
      
      // Draw axis line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', centerX.toString());
      line.setAttribute('y1', centerY.toString());
      line.setAttribute('x2', x2.toString());
      line.setAttribute('y2', y2.toString());
      line.setAttribute('stroke', '#e5e7eb');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);
      
      // Calculate label position with extra margin
      const labelRadius = maxRadius + labelMargin;
      const labelX = centerX + labelRadius * Math.cos(angle);
      const labelY = centerY + labelRadius * Math.sin(angle);
      
      // Determine text anchor based on position
      let textAnchor = 'middle';
      const normalizedAngle = ((angle + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      
      if (normalizedAngle > Math.PI / 6 && normalizedAngle < 5 * Math.PI / 6) {
        textAnchor = 'start'; // Right side
      } else if (normalizedAngle > 7 * Math.PI / 6 && normalizedAngle < 11 * Math.PI / 6) {
        textAnchor = 'end'; // Left side
      }
      
      // Smart text wrapping with max characters per line
      const maxCharsPerLine = 15;
      const words = point.skill.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      
      words.forEach(word => {
        if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) lines.push(currentLine);
      
      // Create text element with proper alignment
      const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      lines.forEach((line, lineIndex) => {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelX.toString());
        text.setAttribute('y', (labelY + lineIndex * 14 - (lines.length - 1) * 7).toString());
        text.setAttribute('text-anchor', textAnchor);
        text.setAttribute('font-size', '12');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('fill', '#374151');
        text.textContent = line;
        textGroup.appendChild(text);
      });
      
      svg.appendChild(textGroup);
    });
    
    // Draw data polygon
    const points = data.map((point, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const radius = (point.score / 100) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('fill', color);
    polygon.setAttribute('fill-opacity', '0.3');
    polygon.setAttribute('stroke', color);
    polygon.setAttribute('stroke-width', '2');
    svg.appendChild(polygon);
    
    // Draw data points
    data.forEach((point, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const radius = (point.score / 100) * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', color);
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);
    });
    
  }, [data, color, width, height]);
  
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {title && (
        <h3 style={{ 
          textAlign: 'center', 
          marginBottom: '10px', 
          color,
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          {title}
        </h3>
      )}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    </div>
  );
}

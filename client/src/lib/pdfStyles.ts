import jsPDF from 'jspdf';

// Shared PDF typography and styling helpers for HumanMetrix exports

// Typography helpers for consistent font styling
export function applyBodyText(pdf: jsPDF) {
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
}

export function applySubheading(pdf: jsPDF) {
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
}

export function applyHeading(pdf: jsPDF) {
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
}

export function applySmallText(pdf: jsPDF) {
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
}

// Blue color palette for charts and visualizations
export const CHART_COLORS = {
  // Primary blue shades for multi-series data
  blue600: '#2563eb',  // rgb(37, 99, 235)
  blue500: '#3b82f6',  // rgb(59, 130, 246)
  blue400: '#60a5fa',  // rgb(96, 165, 250)
  blue300: '#93c5fd',  // rgb(147, 197, 253)
  
  // Darker blue for emphasis
  blue700: '#1d4ed8',  // rgb(29, 78, 216)
  
  // Light blue for fills/backgrounds
  blue200: '#bfdbfe',  // rgb(191, 219, 254)
  blue100: '#dbeafe',  // rgb(219, 234, 254)
};

// Radar chart specific styling
export const RADAR_CHART_STYLE = {
  strokeWidth: 2,
  dotRadius: 3,
  activeDotRadius: 4,
  fillOpacity: 0.2,
  gridStroke: '#e5e7eb',
  gridStrokeWidth: 1,
};

// Standard spacing constants
export const PDF_SPACING = {
  small: 3,
  medium: 5,
  large: 8,
  xlarge: 10,
};

// Standard margins
export const PDF_MARGINS = {
  left: 20,
  right: 20,
  top: 30,
  bottom: 20,
};

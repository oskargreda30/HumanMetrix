import jsPDF from 'jspdf';

// Shared PDF typography and styling helpers for HumanMetrix exports

// Typography helpers for consistent font styling
// Standard font sizes: Body=9pt, Subheading=10pt, Heading=13pt, Small=8pt

export function applyBodyText(pdf: jsPDF) {
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
}

export function applySubheading(pdf: jsPDF) {
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
}

export function applyHeading(pdf: jsPDF) {
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
}

export function applySmallText(pdf: jsPDF) {
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
}

export function applyLabelText(pdf: jsPDF) {
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
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

// Mobile-friendly PDF save function
// On mobile browsers, pdf.save() often fails silently, especially on iOS Safari
// This function uses multiple strategies to ensure reliable PDF viewing/download
export function savePdfMobile(pdf: jsPDF, filename: string) {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);
  const isMobile = isIOS || isAndroid;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (!isMobile) {
    // Desktop: use normal download
    pdf.save(filename);
    return;
  }
  
  // Mobile approach: Generate blob and use multiple fallback strategies
  const pdfBlob = pdf.output('blob');
  
  if (isIOS && isSafari) {
    // iOS Safari: Use FileReader to convert to data URL and open in new tab
    // This is the most reliable method for iOS Safari
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Open the data URL in a new window/tab
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${filename}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: #f0f0f0; }
                embed { width: 100%; height: 100vh; }
              </style>
            </head>
            <body>
              <embed src="${dataUrl}" type="application/pdf" width="100%" height="100%">
            </body>
          </html>
        `);
        newWindow.document.close();
      } else {
        // Fallback: try to download directly if popup blocked
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    reader.readAsDataURL(pdfBlob);
  } else if (isAndroid) {
    // Android: Create blob URL and open in new tab, or trigger download
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    // Try opening in new tab first
    const newWindow = window.open(blobUrl, '_blank');
    
    if (!newWindow) {
      // Fallback: create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Cleanup after a delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1000);
    } else {
      // Revoke URL after delay to allow download
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
  } else {
    // Other mobile browsers: try standard approach with fallback
    try {
      pdf.save(filename);
    } catch {
      // Fallback: open blob URL
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }
  }
}

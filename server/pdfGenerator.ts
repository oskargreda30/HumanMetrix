import puppeteer, { Browser, Page } from 'puppeteer';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    console.log('[PDF Generator] Launching headless browser...');
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
      ],
    });
    console.log('[PDF Generator] Browser launched successfully');
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    console.log('[PDF Generator] Browser closed');
  }
}

interface GeneratePDFOptions {
  sessionId: string;
  email: string;
  baseUrl: string;
  waitForSelector?: string;
  printBackground?: boolean;
  format?: 'A4' | 'Letter';
  margin?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

export async function generateResultsPDF(options: GeneratePDFOptions): Promise<Buffer> {
  const {
    sessionId,
    email,
    baseUrl,
    waitForSelector = '[data-testid="results-content"]',
    printBackground = true,
    format = 'A4',
    margin = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  } = options;

  const resultsUrl = `${baseUrl}/b2b-pdf-email/${sessionId}?email=${encodeURIComponent(email)}&pdf=true`;
  
  return generatePDFFromUrl({
    url: resultsUrl,
    waitForSelector,
    printBackground,
    format,
    margin,
  });
}

interface GenerateMultiSessionPDFOptions {
  sessionIds: string[];
  email: string;
  baseUrl: string;
}

export async function generateMultiSessionPDF(options: GenerateMultiSessionPDFOptions): Promise<Buffer> {
  const { sessionIds, email, baseUrl } = options;
  
  console.log(`[PDF Generator] Generating multi-session PDF for ${sessionIds.length} sessions`);
  
  const bundleUrl = `${baseUrl}/b2b-results-bundle?sessions=${sessionIds.join(',')}&email=${encodeURIComponent(email)}&pdf=true`;
  
  return generatePDFFromUrl({
    url: bundleUrl,
    waitForSelector: '[data-testid="bundle-results-content"]',
  });
}

interface GeneratePDFFromUrlOptions {
  url: string;
  waitForSelector?: string;
  printBackground?: boolean;
  format?: 'A4' | 'Letter';
  margin?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

export async function generatePDFFromUrl(options: GeneratePDFFromUrlOptions): Promise<Buffer> {
  const {
    url,
    waitForSelector,
    printBackground = true,
    format = 'A4',
    margin = { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
  } = options;

  const browser = await getBrowser();
  let page: Page | null = null;

  try {
    page = await browser.newPage();
    
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 1.5,
    });

    console.log(`[PDF Generator] Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    // Wait for content to be ready
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 30000 });
        console.log('[PDF Generator] Primary content selector found');
      } catch (selectorError) {
        console.log('[PDF Generator] Primary selector not found, continuing...');
      }
    }
    
    // Wait for charts and dynamic content to render
    // Try to wait for Recharts containers which indicate charts have rendered
    try {
      await page.waitForSelector('.recharts-wrapper, [data-testid="results-content"], [data-testid="pdf-ready"]', { timeout: 10000 });
      console.log('[PDF Generator] Charts/content detected');
    } catch (chartError) {
      console.log('[PDF Generator] No charts detected, continuing...');
    }
    
    // Additional wait for any animations/transitions to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('[PDF Generator] Page ready for capture');

    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .no-print, 
          nav, 
          header:not(.print-header),
          footer:not(.print-footer),
          [data-testid="navigation"],
          [data-testid="footer"],
          .sticky {
            display: none !important;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .avoid-break {
            page-break-inside: avoid;
          }
          
          .print-only {
            display: block !important;
          }
        }
      `;
      document.head.appendChild(style);
    });

    await page.emulateMediaType('print');

    console.log('[PDF Generator] Generating PDF...');
    const pdfBuffer = await page.pdf({
      format,
      printBackground,
      margin,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="width: 100%; font-size: 9px; padding: 10px 20px; text-align: center; color: #666;">
          <span>HumanMetrix Assessment Results</span>
          <span style="margin-left: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    const sizeKB = Math.round(pdfBuffer.length / 1024);
    console.log(`[PDF Generator] PDF generated successfully (${sizeKB}KB)`);

    return Buffer.from(pdfBuffer);
  } catch (error: any) {
    console.error('[PDF Generator] Error generating PDF:', error.message);
    throw error;
  } finally {
    if (page) {
      await page.close();
    }
  }
}

process.on('SIGINT', async () => {
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

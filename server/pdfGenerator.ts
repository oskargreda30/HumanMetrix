import puppeteer, { Browser, Page } from 'puppeteer';
import { execSync } from 'child_process';
import { jsPDF } from 'jspdf';

let browserInstance: Browser | null = null;

function readPngWidth(buffer: Buffer): number {
  return buffer.readUInt32BE(16);
}

function readPngHeight(buffer: Buffer): number {
  return buffer.readUInt32BE(20);
}

function findChromiumPath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  
  const candidates = [
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
  ];
  
  for (const candidate of candidates) {
    try {
      const { statSync } = require('fs');
      statSync(candidate);
      return candidate;
    } catch {}
  }
  
  try {
    const result = execSync('which chromium 2>/dev/null || find /nix/store -name chromium -path "*/bin/chromium" 2>/dev/null | head -1', { encoding: 'utf-8' }).trim();
    if (result) {
      console.log(`[PDF Generator] Found chromium at: ${result}`);
      return result;
    }
  } catch {}
  
  return 'chromium';
}

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.connected) {
    const chromiumPath = findChromiumPath();
    console.log(`[PDF Generator] Launching headless browser with: ${chromiumPath}`);
    browserInstance = await puppeteer.launch({
      headless: true,
      executablePath: chromiumPath,
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
}

export async function generateResultsPDF(options: GeneratePDFOptions): Promise<Buffer> {
  const {
    sessionId,
    email,
    waitForSelector = '[data-testid="results-content"]',
  } = options;

  const localUrl = `http://127.0.0.1:5000/b2b-pdf-email/${sessionId}?email=${encodeURIComponent(email)}&pdf=true`;
  
  return generatePDFFromUrl({
    url: localUrl,
    waitForSelector,
  });
}

interface GenerateMultiSessionPDFOptions {
  sessionIds: string[];
  email: string;
  baseUrl: string;
}

export async function generateMultiSessionPDF(options: GenerateMultiSessionPDFOptions): Promise<Buffer> {
  const { sessionIds, email } = options;
  
  console.log(`[PDF Generator] Generating multi-session PDF for ${sessionIds.length} sessions`);
  
  const bundleUrl = `http://127.0.0.1:5000/b2b-results-bundle?sessions=${sessionIds.join(',')}&email=${encodeURIComponent(email)}&pdf=true`;
  
  return generatePDFFromUrl({
    url: bundleUrl,
    waitForSelector: '[data-testid="bundle-results-content"]',
  });
}

interface GeneratePDFFromUrlOptions {
  url: string;
  waitForSelector?: string;
}

export async function generatePDFFromUrl(options: GeneratePDFFromUrlOptions): Promise<Buffer> {
  const {
    url,
    waitForSelector,
  } = options;

  const browser = await getBrowser();
  let page: Page | null = null;

  try {
    page = await browser.newPage();
    
    await page.setViewport({
      width: 1200,
      height: 800,
      deviceScaleFactor: 2,
    });

    console.log(`[PDF Generator] Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 30000 });
        console.log('[PDF Generator] Primary content selector found');
      } catch (selectorError) {
        console.log('[PDF Generator] Primary selector not found, continuing...');
      }
    }
    
    try {
      await page.waitForSelector('.recharts-wrapper, [data-testid="results-content"], [data-testid="pdf-ready"]', { timeout: 10000 });
      console.log('[PDF Generator] Charts/content detected');
    } catch (chartError) {
      console.log('[PDF Generator] No charts detected, continuing...');
    }
    
    try {
      await page.waitForSelector('.recharts-bar-rectangle, .recharts-bar', { timeout: 2000 });
      console.log('[PDF Generator] Chart elements rendered');
    } catch (chartElError) {
      console.log('[PDF Generator] Chart elements not found, continuing...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('[PDF Generator] Page ready for screen capture');

    await page.evaluate(() => {
      const replitBanners = document.querySelectorAll('[class*="replit"], [id*="replit"]');
      replitBanners.forEach(el => el.remove());
      
      const allElements = document.querySelectorAll('div, span, p, a');
      allElements.forEach(el => {
        const text = el.textContent || '';
        if (text.includes('temporary development preview') || 
            text.includes('Deploy your app for secure sharing')) {
          let parent = el.parentElement;
          while (parent && parent !== document.body) {
            const style = window.getComputedStyle(parent);
            if (style.position === 'fixed' || style.position === 'sticky') {
              parent.remove();
              return;
            }
            parent = parent.parentElement;
          }
          (el as HTMLElement).style.display = 'none';
        }
      });

      const navElements = document.querySelectorAll('nav, [data-testid="navigation"], [data-testid="footer"], .no-print');
      navElements.forEach(el => (el as HTMLElement).style.display = 'none');

      document.body.style.background = '#ffffff';
      document.documentElement.style.background = '#ffffff';
    });

    console.log('[PDF Generator] Taking full-page screenshot...');
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: 'png',
      omitBackground: false,
    });

    console.log(`[PDF Generator] Screenshot captured (${Math.round(screenshotBuffer.length / 1024)}KB)`);

    const imgDataUri = `data:image/png;base64,${Buffer.from(screenshotBuffer).toString('base64')}`;

    const imgWidth = readPngWidth(screenshotBuffer as Buffer);
    const imgHeight = readPngHeight(screenshotBuffer as Buffer);
    console.log(`[PDF Generator] Screenshot dimensions: ${imgWidth}x${imgHeight}px`);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const scaledImgHeight = imgHeight * ratio;

    let heightLeft = scaledImgHeight;
    let position = 0;

    pdf.addImage(imgDataUri, 'PNG', imgX, position, imgWidth * ratio, scaledImgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - scaledImgHeight;
      pdf.addPage();
      pdf.addImage(imgDataUri, 'PNG', imgX, position, imgWidth * ratio, scaledImgHeight);
      heightLeft -= pdfHeight;
    }

    const pdfOutput = pdf.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfOutput);

    const sizeKB = Math.round(pdfBuffer.length / 1024);
    console.log(`[PDF Generator] Screenshot-based PDF generated successfully (${sizeKB}KB, ${pdf.getNumberOfPages()} pages)`);

    return pdfBuffer;
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

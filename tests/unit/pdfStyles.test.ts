/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  applyBodyText,
  applySubheading,
  applyHeading,
  applySmallText,
  applyLabelText,
  CHART_COLORS,
  BAR_CHART_STYLE,
  PDF_SPACING,
  PDF_MARGINS,
  savePdfMobile,
} from '@/lib/pdfStyles';

function createMockPdf() {
  return {
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    save: vi.fn(),
    output: vi.fn(),
  } as any;
}

describe('pdfStyles typography helpers', () => {
  let pdf: ReturnType<typeof createMockPdf>;

  beforeEach(() => {
    pdf = createMockPdf();
  });

  it('applyBodyText sets font size 9, helvetica normal, text color (55,65,81)', () => {
    applyBodyText(pdf);
    expect(pdf.setFontSize).toHaveBeenCalledWith(9);
    expect(pdf.setFont).toHaveBeenCalledWith('helvetica', 'normal');
    expect(pdf.setTextColor).toHaveBeenCalledWith(55, 65, 81);
  });

  it('applySubheading sets font size 10, helvetica bold, text color (55,65,81)', () => {
    applySubheading(pdf);
    expect(pdf.setFontSize).toHaveBeenCalledWith(10);
    expect(pdf.setFont).toHaveBeenCalledWith('helvetica', 'bold');
    expect(pdf.setTextColor).toHaveBeenCalledWith(55, 65, 81);
  });

  it('applyHeading sets font size 13, helvetica bold, text color (17,24,39)', () => {
    applyHeading(pdf);
    expect(pdf.setFontSize).toHaveBeenCalledWith(13);
    expect(pdf.setFont).toHaveBeenCalledWith('helvetica', 'bold');
    expect(pdf.setTextColor).toHaveBeenCalledWith(17, 24, 39);
  });

  it('applySmallText sets font size 8, helvetica normal, text color (107,114,128)', () => {
    applySmallText(pdf);
    expect(pdf.setFontSize).toHaveBeenCalledWith(8);
    expect(pdf.setFont).toHaveBeenCalledWith('helvetica', 'normal');
    expect(pdf.setTextColor).toHaveBeenCalledWith(107, 114, 128);
  });

  it('applyLabelText sets font size 9, helvetica bold, text color (55,65,81)', () => {
    applyLabelText(pdf);
    expect(pdf.setFontSize).toHaveBeenCalledWith(9);
    expect(pdf.setFont).toHaveBeenCalledWith('helvetica', 'bold');
    expect(pdf.setTextColor).toHaveBeenCalledWith(55, 65, 81);
  });
});

describe('pdfStyles constants', () => {
  it('CHART_COLORS contains expected blue hex values', () => {
    expect(CHART_COLORS.blue600).toBe('#2563eb');
    expect(CHART_COLORS.blue500).toBe('#3b82f6');
    expect(CHART_COLORS.blue400).toBe('#60a5fa');
    expect(CHART_COLORS.blue300).toBe('#93c5fd');
    expect(CHART_COLORS.blue700).toBe('#1d4ed8');
    expect(CHART_COLORS.blue200).toBe('#bfdbfe');
    expect(CHART_COLORS.blue100).toBe('#dbeafe');
  });

  it('BAR_CHART_STYLE contains expected styling values', () => {
    expect(BAR_CHART_STYLE.strokeWidth).toBe(2);
    expect(BAR_CHART_STYLE.barRadius).toBe(4);
    expect(BAR_CHART_STYLE.fillOpacity).toBe(0.8);
    expect(BAR_CHART_STYLE.gridStroke).toBe('#e5e7eb');
    expect(BAR_CHART_STYLE.gridStrokeWidth).toBe(1);
  });

  it('PDF_SPACING contains expected spacing values', () => {
    expect(PDF_SPACING.small).toBe(3);
    expect(PDF_SPACING.medium).toBe(5);
    expect(PDF_SPACING.large).toBe(8);
    expect(PDF_SPACING.xlarge).toBe(10);
  });

  it('PDF_MARGINS contains expected margin values', () => {
    expect(PDF_MARGINS.left).toBe(20);
    expect(PDF_MARGINS.right).toBe(20);
    expect(PDF_MARGINS.top).toBe(30);
    expect(PDF_MARGINS.bottom).toBe(20);
  });
});

describe('savePdfMobile', () => {
  let pdf: ReturnType<typeof createMockPdf>;
  let mockLink: Record<string, any>;

  beforeEach(() => {
    vi.useFakeTimers();
    pdf = createMockPdf();
    pdf.output.mockReturnValue(new Blob(['pdf-content'], { type: 'application/pdf' }));

    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({} as Window);

    mockLink = {
      href: '',
      download: '',
      target: '',
      rel: '',
      style: { position: '', top: '', left: '', display: '' },
      click: vi.fn(),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'contains').mockReturnValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setUserAgent(ua: string) {
    Object.defineProperty(navigator, 'userAgent', {
      value: ua,
      writable: true,
      configurable: true,
    });
  }

  it('desktop: calls pdf.save directly', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0');
    savePdfMobile(pdf, 'report.pdf');
    expect(pdf.save).toHaveBeenCalledWith('report.pdf');
    expect(pdf.output).not.toHaveBeenCalled();
  });

  it('iOS: creates blob, link element, sets link properties, appends to body, clicks after timeout', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    savePdfMobile(pdf, 'report.pdf');

    expect(pdf.output).toHaveBeenCalledWith('blob');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('blob:mock-url');
    expect(mockLink.download).toBe('report.pdf');
    expect(mockLink.target).toBe('_blank');
    expect(mockLink.rel).toBe('noopener noreferrer');
    expect(mockLink.style.position).toBe('fixed');
    expect(mockLink.style.top).toBe('-10000px');
    expect(mockLink.style.left).toBe('-10000px');
    expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);

    vi.advanceTimersByTime(100);
    expect(mockLink.click).toHaveBeenCalled();

    vi.advanceTimersByTime(5000);
    expect(document.body.contains).toHaveBeenCalledWith(mockLink);
    expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('iOS: tries window.open after 200ms and schedules revoke on success', () => {
    setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
    vi.spyOn(window, 'open').mockReturnValue({ focus: vi.fn() } as any);

    savePdfMobile(pdf, 'report.pdf');

    vi.advanceTimersByTime(200);
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank');

    vi.advanceTimersByTime(120000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('iOS: handles window.open returning null', () => {
    setUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    vi.spyOn(window, 'open').mockReturnValue(null);

    savePdfMobile(pdf, 'report.pdf');
    vi.advanceTimersByTime(200);
    expect(window.open).toHaveBeenCalled();
  });

  it('iOS: handles window.open throwing an error and logs fallback', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15');
    vi.spyOn(window, 'open').mockImplementation(() => { throw new Error('blocked'); });

    savePdfMobile(pdf, 'report.pdf');
    vi.advanceTimersByTime(200);
    expect(console.log).toHaveBeenCalledWith('PDF download initiated via link');
  });

  it('iOS: cleanup skips removeChild when body no longer contains link', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    vi.spyOn(document.body, 'contains').mockReturnValue(false);

    savePdfMobile(pdf, 'report.pdf');
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(5000);

    expect(document.body.removeChild).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('Android: creates blob, link element, appends to body, clicks after timeout, opens window', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');
    savePdfMobile(pdf, 'report.pdf');

    expect(pdf.output).toHaveBeenCalledWith('blob');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.href).toBe('blob:mock-url');
    expect(mockLink.download).toBe('report.pdf');
    expect(mockLink.target).toBe('_blank');
    expect(mockLink.style.display).toBe('none');
    expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);

    vi.advanceTimersByTime(100);
    expect(mockLink.click).toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank');

    vi.advanceTimersByTime(60000);
    expect(document.body.contains).toHaveBeenCalledWith(mockLink);
    expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('Android: handles window.open throwing an error silently', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36');
    vi.spyOn(window, 'open').mockImplementation(() => { throw new Error('popup blocked'); });

    savePdfMobile(pdf, 'report.pdf');
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(300);

    expect(window.open).toHaveBeenCalled();
  });

  it('Android: cleanup skips removeChild when body no longer contains link', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36');
    vi.spyOn(document.body, 'contains').mockReturnValue(false);

    savePdfMobile(pdf, 'report.pdf');
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(60000);

    expect(document.body.removeChild).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

});

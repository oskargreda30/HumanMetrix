// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: any }) => children,
}));

import {
  SEO,
  OrganizationSchema,
  ProductSchema,
  FAQSchema,
  BreadcrumbSchema,
  WebSiteSchema,
  ServiceSchema,
  SoftwareApplicationSchema,
  ArticleSchema,
  SiteNavigationSchema,
  LocalBusinessSchema,
  HowToSchema,
} from '../../client/src/lib/seo';

function flattenChildren(element: any): any[] {
  if (!element) return [];
  if (Array.isArray(element)) return element.flatMap(flattenChildren);
  if (element.props?.children) {
    const kids = element.props.children;
    if (Array.isArray(kids)) return [element, ...kids.flatMap(flattenChildren)];
    if (typeof kids === 'object' && kids !== null && kids.type) {
      return [element, ...flattenChildren(kids)];
    }
  }
  return [element];
}

function getAllElements(result: any): any[] {
  if (!result) return [];
  if (Array.isArray(result)) return result.flatMap(getAllElements).filter(Boolean);
  if (typeof result !== 'object') return [];
  const elements: any[] = [result];
  const children = result.props?.children;
  if (children) {
    if (Array.isArray(children)) {
      elements.push(...children.flatMap(getAllElements).filter(Boolean));
    } else if (typeof children === 'object' && children.type) {
      elements.push(...getAllElements(children));
    }
  }
  return elements;
}

function findElement(elements: any[], tag: string, propFilter?: Record<string, any>): any | null {
  for (const el of elements) {
    if (!el || typeof el !== 'object' || !el.type) continue;
    if (el.type !== tag) continue;
    if (propFilter) {
      const props = el.props || {};
      const match = Object.entries(propFilter).every(([k, v]) => props[k] === v);
      if (!match) continue;
    }
    return el;
  }
  return null;
}

function findElements(elements: any[], tag: string, propFilter?: Record<string, any>): any[] {
  return elements.filter((el) => {
    if (!el || typeof el !== 'object' || !el.type) return false;
    if (el.type !== tag) return false;
    if (propFilter) {
      const props = el.props || {};
      return Object.entries(propFilter).every(([k, v]) => props[k] === v);
    }
    return true;
  });
}

function getSchemaData(elements: any[]): any | null {
  const scripts = findElements(elements, 'script');
  for (const script of scripts) {
    if (script.props?.type === 'application/ld+json') {
      const content = script.props.children;
      if (typeof content === 'string') {
        try { return JSON.parse(content); } catch { /* skip */ }
      }
    }
  }
  return null;
}

function render(component: any): any[] {
  const result = typeof component === 'function' ? component() : component;
  return getAllElements(result).filter(Boolean);
}

describe('SEO Components', () => {
  describe('SEO', () => {
    it('renders default title when no title prop', () => {
      const els = render(() => SEO({}));
      const title = findElement(els, 'title');
      expect(title).toBeTruthy();
      expect(title.props.children).toBe('HumanMetrix - AI Assessment Platform for Recruitment | Human Metrix UK');
    });

    it('renders custom title with suffix', () => {
      const els = render(() => SEO({ title: 'Pricing' }));
      const title = findElement(els, 'title');
      expect(title.props.children).toBe('Pricing | HumanMetrix');
    });

    it('renders description meta tag', () => {
      const els = render(() => SEO({ description: 'Custom description' }));
      const meta = findElement(els, 'meta', { name: 'description' });
      expect(meta).toBeTruthy();
      expect(meta.props.content).toBe('Custom description');
    });

    it('renders default description', () => {
      const els = render(() => SEO({}));
      const meta = findElement(els, 'meta', { name: 'description' });
      expect(meta).toBeTruthy();
      expect(meta.props.content).toContain('HumanMetrix');
    });

    it('renders keywords meta tag', () => {
      const els = render(() => SEO({ keywords: 'test, keywords' }));
      const meta = findElement(els, 'meta', { name: 'keywords' });
      expect(meta).toBeTruthy();
      expect(meta.props.content).toBe('test, keywords');
    });

    it('renders author meta tag', () => {
      const els = render(() => SEO({ author: 'TestAuthor' }));
      const meta = findElement(els, 'meta', { name: 'author' });
      expect(meta).toBeTruthy();
      expect(meta.props.content).toBe('TestAuthor');
    });

    it('renders canonical link when provided', () => {
      const els = render(() => SEO({ canonical: '/pricing' }));
      const link = findElement(els, 'link');
      expect(link).toBeTruthy();
      expect(link.props.href).toBe('https://www.humanmetrix.co.uk/pricing');
    });

    it('does not render canonical when not provided', () => {
      const els = render(() => SEO({}));
      const links = findElements(els, 'link').filter((l: any) => l.props?.rel === 'canonical');
      expect(links.length).toBe(0);
    });

    it('renders noindex when noindex is true', () => {
      const els = render(() => SEO({ noindex: true }));
      const robots = findElements(els, 'meta').find(
        (el: any) => el.props?.name === 'robots' && el.props?.content?.includes('noindex')
      );
      expect(robots).toBeTruthy();
    });

    it('renders index follow when noindex is false', () => {
      const els = render(() => SEO({ noindex: false }));
      const robots = findElements(els, 'meta').find(
        (el: any) => el.props?.name === 'robots' && el.props?.content?.includes('index, follow')
      );
      expect(robots).toBeTruthy();
    });

    it('renders Open Graph tags', () => {
      const els = render(() => SEO({ title: 'Test Page', description: 'Test desc', ogType: 'article' }));

      const ogTitle = findElement(els, 'meta', { property: 'og:title' });
      expect(ogTitle.props.content).toBe('Test Page | HumanMetrix');

      const ogDesc = findElement(els, 'meta', { property: 'og:description' });
      expect(ogDesc.props.content).toBe('Test desc');

      const ogType = findElement(els, 'meta', { property: 'og:type' });
      expect(ogType.props.content).toBe('article');
    });

    it('renders default og:image', () => {
      const els = render(() => SEO({}));
      const ogImage = findElement(els, 'meta', { property: 'og:image' });
      expect(ogImage.props.content).toContain('og-image.png');
    });

    it('renders custom og:image', () => {
      const els = render(() => SEO({ ogImage: 'https://example.com/image.png' }));
      const ogImage = findElement(els, 'meta', { property: 'og:image' });
      expect(ogImage.props.content).toBe('https://example.com/image.png');
    });

    it('renders og:site_name and og:locale', () => {
      const els = render(() => SEO({}));
      const siteName = findElement(els, 'meta', { property: 'og:site_name' });
      expect(siteName.props.content).toBe('HumanMetrix');

      const locale = findElement(els, 'meta', { property: 'og:locale' });
      expect(locale.props.content).toBe('en_GB');
    });

    it('renders og:url when canonical provided', () => {
      const els = render(() => SEO({ canonical: '/about' }));
      const ogUrl = findElement(els, 'meta', { property: 'og:url' });
      expect(ogUrl).toBeTruthy();
      expect(ogUrl.props.content).toBe('https://www.humanmetrix.co.uk/about');
    });

    it('renders Twitter card tags', () => {
      const els = render(() => SEO({ title: 'Test', description: 'Desc' }));
      const card = findElement(els, 'meta', { name: 'twitter:card' });
      expect(card.props.content).toBe('summary_large_image');

      const site = findElement(els, 'meta', { name: 'twitter:site' });
      expect(site.props.content).toBe('@humanmetrix');

      const creator = findElement(els, 'meta', { name: 'twitter:creator' });
      expect(creator.props.content).toBe('@humanmetrix');
    });

    it('renders article time meta tags', () => {
      const els = render(() => SEO({ publishedTime: '2025-01-01', modifiedTime: '2025-06-01', section: 'Tech' }));
      const pub = findElement(els, 'meta', { property: 'article:published_time' });
      expect(pub.props.content).toBe('2025-01-01');

      const mod = findElement(els, 'meta', { property: 'article:modified_time' });
      expect(mod.props.content).toBe('2025-06-01');

      const sec = findElement(els, 'meta', { property: 'article:section' });
      expect(sec.props.content).toBe('Tech');
    });

    it('renders article:author when author provided', () => {
      const els = render(() => SEO({ author: 'TestAuthor' }));
      const authorMeta = findElement(els, 'meta', { property: 'article:author' });
      expect(authorMeta).toBeTruthy();
      expect(authorMeta.props.content).toBe('TestAuthor');
    });
  });

  describe('OrganizationSchema', () => {
    it('renders organization structured data', () => {
      const els = render(OrganizationSchema);
      const schema = getSchemaData(els);
      expect(schema).toBeTruthy();
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('HumanMetrix');
      expect(schema.url).toBe('https://www.humanmetrix.co.uk');
      expect(schema.alternateName).toContain('Human Metrix');
    });
  });

  describe('ProductSchema', () => {
    it('renders product structured data', () => {
      const els = render(() => ProductSchema({ name: 'FIT', description: 'Test', price: 29.99, url: '/fit' }));
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('Product');
      expect(schema.name).toBe('FIT');
      expect(schema.offers.price).toBe(29.99);
      expect(schema.offers.priceCurrency).toBe('GBP');
    });
  });

  describe('FAQSchema', () => {
    it('renders FAQ structured data', () => {
      const els = render(() => FAQSchema({ faqs: [{ question: 'Q1', answer: 'A1' }, { question: 'Q2', answer: 'A2' }] }));
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]['@type']).toBe('Question');
    });
  });

  describe('BreadcrumbSchema', () => {
    it('renders breadcrumb structured data', () => {
      const els = render(() => BreadcrumbSchema({ items: [{ name: 'Home', url: '/' }, { name: 'About', url: '/about' }] }));
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].position).toBe(1);
    });
  });

  describe('WebSiteSchema', () => {
    it('renders website structured data', () => {
      const els = render(WebSiteSchema);
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('WebSite');
      expect(schema.name).toBe('HumanMetrix');
      expect(schema.potentialAction['@type']).toBe('SearchAction');
    });
  });

  describe('ServiceSchema', () => {
    it('renders service without price', () => {
      const els = render(() => ServiceSchema({ name: 'FIT', description: 'Test', url: '/fit' }));
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('Service');
      expect(schema.offers).toBeUndefined();
    });

    it('renders service with price', () => {
      const els = render(() => ServiceSchema({ name: 'FIT', description: 'Test', url: '/fit', price: 19.99 }));
      const schema = getSchemaData(els);
      expect(schema.offers.price).toBe(19.99);
      expect(schema.offers.priceCurrency).toBe('GBP');
    });

    it('uses custom priceCurrency', () => {
      const els = render(() => ServiceSchema({ name: 'FIT', description: 'Test', url: '/fit', price: 25, priceCurrency: 'USD' }));
      const schema = getSchemaData(els);
      expect(schema.offers.priceCurrency).toBe('USD');
    });
  });

  describe('SoftwareApplicationSchema', () => {
    it('renders software application structured data', () => {
      const els = render(SoftwareApplicationSchema);
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('SoftwareApplication');
      expect(schema.applicationCategory).toBe('BusinessApplication');
      expect(schema.featureList.length).toBeGreaterThan(0);
    });
  });

  describe('ArticleSchema', () => {
    it('renders article structured data', () => {
      const els = render(() => ArticleSchema({ title: 'Test', description: 'Desc', url: '/test', publishedDate: '2025-01-01' }));
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('Article');
      expect(schema.headline).toBe('Test');
      expect(schema.datePublished).toBe('2025-01-01');
      expect(schema.dateModified).toBe('2025-01-01');
    });

    it('uses modifiedDate when provided', () => {
      const els = render(() => ArticleSchema({ title: 'T', description: 'D', url: '/t', publishedDate: '2025-01-01', modifiedDate: '2025-06-01' }));
      const schema = getSchemaData(els);
      expect(schema.dateModified).toBe('2025-06-01');
    });

    it('uses custom imageUrl', () => {
      const els = render(() => ArticleSchema({ title: 'T', description: 'D', url: '/t', publishedDate: '2025-01-01', imageUrl: 'https://example.com/img.png' }));
      const schema = getSchemaData(els);
      expect(schema.image).toBe('https://example.com/img.png');
    });

    it('uses default image when imageUrl not provided', () => {
      const els = render(() => ArticleSchema({ title: 'T', description: 'D', url: '/t', publishedDate: '2025-01-01' }));
      const schema = getSchemaData(els);
      expect(schema.image).toContain('og-image.png');
    });
  });

  describe('SiteNavigationSchema', () => {
    it('renders site navigation structured data', () => {
      const els = render(SiteNavigationSchema);
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('ItemList');
      expect(schema.itemListElement.length).toBeGreaterThan(0);
      expect(schema.itemListElement[0]['@type']).toBe('SiteNavigationElement');
    });
  });

  describe('LocalBusinessSchema', () => {
    it('renders local business structured data', () => {
      const els = render(LocalBusinessSchema);
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('ProfessionalService');
      expect(schema.name).toBe('HumanMetrix');
      expect(schema.openingHoursSpecification).toBeDefined();
    });
  });

  describe('HowToSchema', () => {
    it('renders how-to structured data', () => {
      const els = render(() => HowToSchema({
        name: 'Take FIT test',
        description: 'Guide',
        steps: [{ name: 'Register', text: 'Create account' }, { name: 'Start', text: 'Begin' }],
      }));
      const schema = getSchemaData(els);
      expect(schema['@type']).toBe('HowTo');
      expect(schema.name).toBe('Take FIT test');
      expect(schema.step).toHaveLength(2);
      expect(schema.step[0].position).toBe(1);
    });
  });
});

import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://humanmetrix.co.uk';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
}

const defaultSEO = {
  title: 'HumanMetrix - AI Assessment Platform for Recruitment | Human Metrix UK',
  description: 'HumanMetrix - UK AI-powered psychometric testing platform. Pre-employment assessments for FIT, AI Readiness & AIQ. Trusted by employers.',
  ogImage: `${BASE_URL}/og-image.png`,
  keywords: 'HumanMetrix, Human Metrix, psychometric tests UK, pre-employment testing, candidate assessment, AI assessment platform, recruitment testing, behavioural assessment',
};

export function SEO({ 
  title, 
  description = defaultSEO.description, 
  canonical,
  noindex = false,
  ogImage = defaultSEO.ogImage,
  ogType = 'website',
  keywords = defaultSEO.keywords,
  author = 'HumanMetrix',
  publishedTime,
  modifiedTime,
  section
}: SEOProps) {
  const fullTitle = title 
    ? `${title} | HumanMetrix` 
    : defaultSEO.title;
  
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />}
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:alt" content={title || 'HumanMetrix'} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="HumanMetrix" />
      <meta property="og:locale" content="en_GB" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {section && <meta property="article:section" content={section} />}
      {author && <meta property="article:author" content={author} />}
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@humanmetrix" />
      <meta name="twitter:creator" content="@humanmetrix" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={title || 'HumanMetrix'} />
    </Helmet>
  );
}

export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "HumanMetrix",
    "alternateName": ["Human Metrix", "HumanMetrix UK", "Human Metrics"],
    "url": BASE_URL,
    "logo": `${BASE_URL}/favicon.png`,
    "description": "HumanMetrix (Human Metrix) is the UK's leading AI-powered psychometric testing and candidate assessment platform. We measure human metrics for recruitment and career development.",
    "sameAs": [
      "https://www.linkedin.com/company/humanmetrix"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "hello@humanmetrix.co.uk",
      "contactType": "sales"
    },
    "areaServed": "GB",
    "knowsAbout": ["psychometric testing", "pre-employment assessment", "AI skills evaluation", "behavioural assessment", "candidate assessment", "recruitment testing"]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function ProductSchema({ 
  name, 
  description, 
  price,
  url 
}: { 
  name: string; 
  description: string; 
  price: number;
  url: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "description": description,
    "brand": {
      "@type": "Brand",
      "name": "HumanMetrix"
    },
    "offers": {
      "@type": "Offer",
      "price": price,
      "priceCurrency": "GBP",
      "availability": "https://schema.org/InStock",
      "url": `${BASE_URL}${url}`
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function FAQSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": `${BASE_URL}${item.url}`
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function WebSiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "HumanMetrix",
    "alternateName": ["Human Metrix", "HumanMetrix UK"],
    "url": BASE_URL,
    "description": "UK's leading AI-powered psychometric testing and candidate assessment platform",
    "publisher": {
      "@type": "Organization",
      "name": "HumanMetrix",
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/favicon.png`
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${BASE_URL}/articles?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function ServiceSchema({ 
  name, 
  description, 
  url,
  price,
  priceCurrency = "GBP"
}: { 
  name: string; 
  description: string; 
  url: string;
  price?: number;
  priceCurrency?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description,
    "url": `${BASE_URL}${url}`,
    "provider": {
      "@type": "Organization",
      "name": "HumanMetrix",
      "url": BASE_URL
    },
    "areaServed": {
      "@type": "Country",
      "name": "United Kingdom"
    },
    "serviceType": "Psychometric Assessment"
  };

  if (price) {
    schema.offers = {
      "@type": "Offer",
      "price": price,
      "priceCurrency": priceCurrency,
      "availability": "https://schema.org/InStock"
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function SoftwareApplicationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "HumanMetrix Assessment Platform",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "description": "AI-powered psychometric testing and candidate assessment platform for recruitment and career development",
    "url": BASE_URL,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "GBP",
      "description": "Free to start, pay only for completed assessments"
    },
    "featureList": [
      "FIT Assessment - Behavioural skills evaluation",
      "AI Readiness Test - AI literacy measurement",
      "Prompt Architecture Assessment - Communication effectiveness",
      "AIQ Assessment - Algorithmic integrity quotient"
    ],
    "screenshot": `${BASE_URL}/og-image.png`,
    "author": {
      "@type": "Organization",
      "name": "HumanMetrix"
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function ArticleSchema({
  title,
  description,
  url,
  imageUrl,
  publishedDate,
  modifiedDate,
  authorName = "HumanMetrix"
}: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  publishedDate: string;
  modifiedDate?: string;
  authorName?: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "description": description,
    "url": `${BASE_URL}${url}`,
    "image": imageUrl || `${BASE_URL}/og-image.png`,
    "datePublished": publishedDate,
    "dateModified": modifiedDate || publishedDate,
    "author": {
      "@type": "Organization",
      "name": authorName,
      "url": BASE_URL
    },
    "publisher": {
      "@type": "Organization",
      "name": "HumanMetrix",
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/favicon.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${BASE_URL}${url}`
    }
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function LocalBusinessSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "name": "HumanMetrix",
    "description": "AI-powered psychometric testing and candidate assessment platform",
    "url": BASE_URL,
    "logo": `${BASE_URL}/favicon.png`,
    "email": "hello@humanmetrix.co.uk",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "GB"
    },
    "priceRange": "££",
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "17:00"
    },
    "sameAs": [
      "https://www.linkedin.com/company/humanmetrix"
    ]
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

export function HowToSchema({
  name,
  description,
  steps
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "description": description,
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text
    }))
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
}

import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://humanmetrix.co.uk';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
}

const defaultSEO = {
  title: 'HumanMetrix - AI Assessment Platform for Recruitment | Human Metrix UK',
  description: 'HumanMetrix - UK AI-powered psychometric testing platform. Pre-employment assessments for FIT, AI Readiness & AIQ. Trusted by employers.',
  ogImage: `${BASE_URL}/og-image.png`,
};

export function SEO({ 
  title, 
  description = defaultSEO.description, 
  canonical,
  noindex = false,
  ogImage = defaultSEO.ogImage,
  ogType = 'website'
}: SEOProps) {
  const fullTitle = title 
    ? `${title} | HumanMetrix` 
    : defaultSEO.title;
  
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
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
      "email": "humanmetrix.sales@gmail.com",
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

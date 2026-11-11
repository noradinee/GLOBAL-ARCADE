export interface SEOProps {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'game';
  schemaData?: Record<string, any> | Record<string, any>[];
  lang?: 'en' | 'ar';
}

export function updatePageSEO({
  title,
  description,
  canonicalUrl = window.location.href,
  ogImage = '/og-banner.png',
  ogType = 'website',
  schemaData,
  lang = 'en',
}: SEOProps) {
  if (typeof document === 'undefined') return;

  // Title
  document.title = title;

  // Helper to set or create meta tag
  const setMetaTag = (attribute: string, name: string, content: string) => {
    let tag = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attribute, name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Standard Meta
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'title', title);

  // Open Graph
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:type', ogType);
  setMetaTag('property', 'og:image', ogImage);
  setMetaTag('property', 'og:site_name', lang === 'ar' ? 'جلوبال أركيد' : 'Global Arcade');

  // Twitter Card
  setMetaTag('property', 'twitter:card', 'summary_large_image');
  setMetaTag('property', 'twitter:title', title);
  setMetaTag('property', 'twitter:description', description);
  setMetaTag('property', 'twitter:image', ogImage);

  // Canonical link
  let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!linkCanonical) {
    linkCanonical = document.createElement('link');
    linkCanonical.setAttribute('rel', 'canonical');
    document.head.appendChild(linkCanonical);
  }
  linkCanonical.setAttribute('href', canonicalUrl);

  // JSON-LD Structured Data
  const existingScript = document.getElementById('seo-jsonld-schema');
  if (existingScript) {
    existingScript.remove();
  }

  if (schemaData) {
    const script = document.createElement('script');
    script.id = 'seo-jsonld-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
  }
}

import { getHreflangLinks, getLanguageMeta } from '../i18n/localeRouting';

export type SupportedLanguage =
  | 'en'
  | 'ar'
  | 'es'
  | 'pt'
  | 'fr'
  | 'de'
  | 'tr'
  | 'id'
  | 'ru'
  | 'it'
  | 'pl';

export interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'game';
  schemaData?: Record<string, any> | Record<string, any>[];
  lang?: SupportedLanguage | string;
  robots?: string;
  includeHreflang?: boolean;
}

export function updatePageSEO({
  title,
  description,
  keywords,
  canonicalUrl = window.location.href,
  ogImage = 'https://kyraxo.com/og-banner.png',
  ogType = 'website',
  schemaData,
  lang = 'en',
  robots = 'index, follow',
  includeHreflang = true,
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

  const langMeta = getLanguageMeta(lang);

  // Standard Meta
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'title', title);
  setMetaTag('name', 'robots', robots);
  if (keywords) {
    setMetaTag('name', 'keywords', keywords);
  }

  // Open Graph
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', canonicalUrl);
  setMetaTag('property', 'og:type', ogType);
  setMetaTag('property', 'og:image', ogImage);
  setMetaTag('property', 'og:locale', langMeta.ogLocale || 'en_US');
  setMetaTag('property', 'og:site_name', langMeta.brandName || 'KYRAXO');

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

  // Bidirectional Hreflang alternate tags for indexable SEO pages
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
  if (includeHreflang && !robots.includes('noindex')) {
    try {
      const parsed = new URL(canonicalUrl, window.location.origin);
      const hreflangs = getHreflangLinks(parsed.pathname, window.location.origin);
      for (const entry of hreflangs) {
        const linkAlt = document.createElement('link');
        linkAlt.setAttribute('rel', 'alternate');
        linkAlt.setAttribute('hreflang', entry.hrefLang);
        linkAlt.setAttribute('href', entry.href);
        document.head.appendChild(linkAlt);
      }
    } catch {
      // ignore invalid URL parse in constrained environments
    }
  }

  // JSON-LD Structured Data
  const existingScript = document.getElementById('seo-jsonld-schema');
  if (existingScript) {
    existingScript.remove();
  }

  if (schemaData) {
    const script = document.createElement('script');
    script.id = 'seo-jsonld-schema';
    script.type = 'application/ld+json';
    const jsonContent = Array.isArray(schemaData)
      ? { '@context': 'https://schema.org', '@graph': schemaData }
      : schemaData;
    script.text = JSON.stringify(jsonContent);
    document.head.appendChild(script);
  }
}

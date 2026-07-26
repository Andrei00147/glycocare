import React, { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  articleData?: {
    headline: string;
    description: string;
    datePublished?: string;
    dateModified?: string;
    authorName?: string;
  };
}

/**
 * Formats title to strictly fit between 50 and 60 characters with high-relevance search terms.
 */
function formatSEOTitle(rawTitle?: string): string {
  const defaultTitle = "NutriSaúdeVital - Saúde, Nutrição & Controle de Diabetes";
  if (!rawTitle || rawTitle.trim() === '') return defaultTitle;

  let title = rawTitle.trim();

  // If title is shorter than 50 chars, append brand or keywords to reach 50-60 chars
  if (title.length < 50) {
    const brandSuffix = " | NutriSaúdeVital";
    if ((title + brandSuffix).length <= 60) {
      title += brandSuffix;
    }
    const keywordSuffix = " - Saúde e Nutrição";
    if (title.length < 50 && (title + keywordSuffix).length <= 60) {
      title += keywordSuffix;
    }
  }

  // If title is longer than 60 chars, trim strictly to 60
  if (title.length > 60) {
    title = title.substring(0, 57).trim() + "...";
  }

  return title;
}

/**
 * Formats description to strictly fit between 150 and 160 characters with rich SEO keywords.
 */
function formatSEODescription(rawDesc?: string): string {
  const defaultDesc = "NutriSaúdeVital: Plataforma integrada de nutrição, saúde, composição corporal e cuidados com diabetes. Análise de refeições por IA e diário glicêmico.";
  if (!rawDesc || rawDesc.trim() === '') return defaultDesc;

  let desc = rawDesc.trim();

  // If longer than 160 chars, trim cleanly
  if (desc.length > 160) {
    desc = desc.substring(0, 157).trim() + "...";
  }

  // If shorter than 150 chars, pad with high-relevance search terms
  if (desc.length < 150) {
    const padding = " Conte com contador de carboidratos com foto por IA, diário glicêmico e receitas no NutriSaúdeVital.";
    const combined = desc + padding;
    if (combined.length <= 160) {
      desc = combined;
    } else {
      const remainingSpace = 160 - desc.length;
      if (remainingSpace > 15) {
        desc = (desc + " " + padding.trim()).substring(0, 157).trim() + "...";
      }
    }
  }

  return desc;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  canonicalUrl,
  breadcrumbs = [
    { name: "Início", url: "https://nutrisaudevital.com.br/" }
  ],
  articleData
}) => {
  const formattedTitle = formatSEOTitle(title);
  const formattedDescription = formatSEODescription(description);

  useEffect(() => {
    // Determine active origin dynamically
    const currentOrigin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://nutrisaudevital.com.br';

    const activeCanonical = canonicalUrl || `${currentOrigin}/`;

    // 1. Update Title and Description Meta
    document.title = formattedTitle;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', formattedDescription);

    // Update OpenGraph Meta Tags
    const setOgMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setOgMeta('og:title', formattedTitle);
    setOgMeta('og:description', formattedDescription);
    setOgMeta('og:url', activeCanonical);

    // Update Twitter Meta Tags
    const setTwitterMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    setTwitterMeta('twitter:title', formattedTitle);
    setTwitterMeta('twitter:description', formattedDescription);

    // Update or Insert Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', activeCanonical);

    // 2. Organization & WebSite JSON-LD Schema
    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "NutriSaúdeVital",
      "alternateName": ["Nutri Saúde Vital", "GlycoCare"],
      "url": currentOrigin,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${currentOrigin}/?s={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };

    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "NutriSaúdeVital",
      "url": currentOrigin,
      "logo": `${currentOrigin}/logo.png`,
      "sameAs": [
        "https://nutrisaudevital.com.br/",
        "https://nutrisaudevital.vercel.app/",
        "https://glycocare-five.vercel.app/"
      ]
    };

    // 3. BreadcrumbList JSON-LD Schema
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((b, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": b.name,
        "item": b.url
      }))
    };

    // 4. FAQPage Schema (AdSense & EEAT compliant)
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "O que é o NutriSaúdeVital?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "O NutriSaúdeVital é uma plataforma completa de saúde, nutrição, análise de refeições por Inteligência Artificial, avaliação de composição corporal e gerenciamento metabólico."
          }
        },
        {
          "@type": "Question",
          "name": "O NutriSaúdeVital é adequado para quem tem Diabetes?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Sim! Temos um plano dedicado e completo para pessoas com diabetes, com registro glicêmico, contagem automática de carboidratos, alertas de estoque de insulina e medicamentos, e geração de relatórios para seu médico."
          }
        },
        {
          "@type": "Question",
          "name": "Como funciona o scanner de alimentos por Inteligência Artificial?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Basta tirar uma foto do seu prato ou descrever a refeição. A nossa IA analisa os ingredientes e estima automaticamente carboidratos, calorias, proteínas, gorduras e fibras."
          }
        }
      ]
    };

    // Optional Article Schema
    let articleSchema = null;
    if (articleData) {
      articleSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": articleData.headline,
        "description": articleData.description,
        "datePublished": articleData.datePublished || "2026-01-01T08:00:00Z",
        "dateModified": articleData.dateModified || new Date().toISOString(),
        "author": {
          "@type": "Person",
          "name": articleData.authorName || "Equipe NutriSaúdeVital"
        },
        "publisher": {
          "@type": "Organization",
          "name": "NutriSaúdeVital",
          "logo": {
            "@type": "ImageObject",
            "url": `${currentOrigin}/logo.png`
          }
        }
      };
    }

    // Inject Scripts into Document Head
    const scriptId = 'nutri-schema-jsonld';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const allSchemas = [
      websiteSchema,
      organizationSchema,
      breadcrumbSchema,
      faqSchema,
      ...(articleSchema ? [articleSchema] : [])
    ];

    scriptTag.textContent = JSON.stringify(allSchemas, null, 2);

    return () => {
      // Clean up dynamic schema if needed
    };
  }, [formattedTitle, formattedDescription, canonicalUrl, breadcrumbs, articleData]);

  return null;
};

export default SEOHead;

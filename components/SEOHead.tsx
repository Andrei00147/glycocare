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

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = "NutriSaúdeVital - Saúde, Nutrição e Acompanhamento Integrado",
  description = "NutriSaúdeVital: Plataforma integrada de nutrição, saúde, composição corporal e cuidados com diabetes. Análise de refeições com IA e controle glicêmico.",
  canonicalUrl = "https://nutrisaudevital.com.br/",
  breadcrumbs = [
    { name: "Início", url: "https://nutrisaudevital.com.br/" }
  ],
  articleData
}) => {
  useEffect(() => {
    // Determine active origin dynamically
    const currentOrigin = typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://nutrisaudevital.com.br';

    const activeCanonical = canonicalUrl || `${currentOrigin}/`;

    // 1. Update Title and Description Meta
    document.title = title;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description.substring(0, 160));

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
            "url": "https://nutrisaudevital.com.br/logo.png"
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
  }, [title, description, canonicalUrl, breadcrumbs, articleData]);

  return null;
};

export default SEOHead;

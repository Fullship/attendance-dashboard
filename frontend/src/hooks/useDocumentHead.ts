/**
 * @file useDocumentHead.ts
 * @description Custom hook for managing document head elements (React 19 compatible)
 */

import { useEffect } from 'react';

interface MetaTag {
  name?: string;
  property?: string;
  content: string;
  [key: string]: string | undefined;
}

interface UseDocumentHeadOptions {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterCard?: string;
  structuredData?: object;
  additionalMeta?: MetaTag[];
}

export const useDocumentHead = (options: UseDocumentHeadOptions) => {
  useEffect(() => {
    const {
      title,
      description,
      keywords,
      ogTitle,
      ogDescription,
      ogImage,
      ogUrl,
      twitterTitle,
      twitterDescription,
      twitterImage,
      twitterCard = 'summary_large_image',
      structuredData,
      additionalMeta = []
    } = options;

    // Store original values for cleanup
    const originalTitle = document.title;
    const addedElements: HTMLElement[] = [];

    // Set title
    if (title) {
      document.title = title;
    }

    // Helper function to create and add meta tags
    const addMetaTag = (attributes: Record<string, string>) => {
      const existing = document.querySelector(
        `meta[name="${attributes.name}"], meta[property="${attributes.property}"]`
      );
      
      if (existing) {
        Object.keys(attributes).forEach(key => {
          existing.setAttribute(key, attributes[key]);
        });
      } else {
        const meta = document.createElement('meta');
        Object.keys(attributes).forEach(key => {
          meta.setAttribute(key, attributes[key]);
        });
        document.head.appendChild(meta);
        addedElements.push(meta);
      }
    };

    // Add basic meta tags
    if (description) {
      addMetaTag({ name: 'description', content: description });
    }

    if (keywords) {
      addMetaTag({ name: 'keywords', content: keywords });
    }

    // Add Open Graph tags
    if (ogTitle) {
      addMetaTag({ property: 'og:title', content: ogTitle });
    }

    if (ogDescription) {
      addMetaTag({ property: 'og:description', content: ogDescription });
    }

    if (ogImage) {
      addMetaTag({ property: 'og:image', content: ogImage });
    }

    if (ogUrl) {
      addMetaTag({ property: 'og:url', content: ogUrl });
    }

    addMetaTag({ property: 'og:type', content: 'website' });

    // Add Twitter tags
    addMetaTag({ property: 'twitter:card', content: twitterCard });

    if (twitterTitle) {
      addMetaTag({ property: 'twitter:title', content: twitterTitle });
    }

    if (twitterDescription) {
      addMetaTag({ property: 'twitter:description', content: twitterDescription });
    }

    if (twitterImage) {
      addMetaTag({ property: 'twitter:image', content: twitterImage });
    }

    // Add additional meta tags
    additionalMeta.forEach(meta => {
      const attributes: Record<string, string> = { content: meta.content };
      if (meta.name) attributes.name = meta.name;
      if (meta.property) attributes.property = meta.property;
      
      // Add any other attributes
      Object.keys(meta).forEach(key => {
        if (key !== 'content' && key !== 'name' && key !== 'property' && meta[key]) {
          attributes[key] = meta[key] as string;
        }
      });
      
      addMetaTag(attributes);
    });

    // Add structured data
    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
      addedElements.push(script);
    }

    // Cleanup function
    return () => {
      document.title = originalTitle;
      addedElements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    };
  }, [options]);
};

---
name: seo
description: 'Meta tags, Open Graph, JSON-LD structured data, sitemaps, robots.txt, canonical URLs, heading hierarchy.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags:
  [
    seo,
    search,
    open-graph,
    twitter-cards,
    structured-data,
    json-ld,
    sitemap,
    robots,
    canonical,
    headings,
  ]
tools: [opencode, claude, cursor, gemini]
---

# SEO

You are an **SEO specialist**. You make content findable, shareable, and understandable by search engines and social platforms. Every page needs a complete metadata layer.

## Core Meta Tags

Every page must have these in `<head>`:

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Page Title · Site Name</title>
<meta name="description" content="150–160 characters describing this specific page." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://example.com/current-page/" />
```

### Robots directives

| Content             | Meaning                                     |
| ------------------- | ------------------------------------------- |
| `index, follow`     | Allow indexing and link following (default) |
| `noindex`           | Do not show in search results               |
| `nofollow`          | Do not follow links on this page            |
| `noindex, nofollow` | Hide page entirely from search              |
| `none`              | Same as `noindex, nofollow`                 |

## Open Graph

Controls how links appear on Facebook, LinkedIn, Discord, Slack, and most chat apps.

```html
<meta property="og:title" content="Page Title · Site Name" />
<meta property="og:description" content="150–160 characters, matches meta description." />
<meta property="og:url" content="https://example.com/current-page/" />
<meta property="og:image" content="https://example.com/og-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Site Name" />
<meta property="og:locale" content="en_US" />
```

### Image requirements

- **Size**: 1200×630 px (1.91:1 ratio)
- **Format**: JPG or PNG, under 1 MB
- **Content**: Branded, readable at small sizes, no text cutoff
- **Fallback**: Every page should have an og:image, even if generic

## Twitter Cards

Controls how links appear on X/Twitter.

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Page Title · Site Name" />
<meta name="twitter:description" content="150–160 characters." />
<meta name="twitter:image" content="https://example.com/og-image.jpg" />
<meta name="twitter:site" content="@yoursite" />
```

When OG tags are present and Twitter card is `summary_large_image`, Twitter falls back to OG values for title/description/image.

## JSON-LD Structured Data

Structured data helps search engines understand page content and enables rich results (knowledge panels, FAQ snippets, breadcrumbs, etc.). Always use JSON-LD format in a `<script type="application/ld+json">` block.

### Organization (homepage)

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Site Name",
    "url": "https://example.com",
    "logo": "https://example.com/logo.png",
    "sameAs": ["https://twitter.com/yoursite", "https://github.com/yoursite"],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "hello@example.com",
      "contactType": "customer service"
    }
  }
</script>
```

### Person (portfolio / about page)

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Your Name",
    "url": "https://example.com",
    "image": "https://example.com/avatar.jpg",
    "jobTitle": "Job Title",
    "sameAs": ["https://github.com/yourhandle", "https://linkedin.com/in/yourhandle"]
  }
</script>
```

### FAQ

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is this?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "This is a site about..."
        }
      }
    ]
  }
</script>
```

### LocalBusiness

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Business Name",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Main St",
      "addressLocality": "City",
      "addressRegion": "ST",
      "postalCode": "12345"
    },
    "telephone": "+15551234567",
    "openingHours": "Mo-Fr 09:00-17:00"
  }
</script>
```

### BreadcrumbList

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://example.com"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Projects",
        "item": "https://example.com/projects/"
      }
    ]
  }
</script>
```

### Article (blog / content pages)

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Article Title",
    "description": "Article description",
    "image": "https://example.com/article-image.jpg",
    "datePublished": "2026-06-14",
    "dateModified": "2026-06-14",
    "author": {
      "@type": "Person",
      "name": "Author Name"
    }
  }
</script>
```

## Sitemaps

An XML sitemap helps search engines discover all pages, especially new or deeply linked ones.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-06-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about/</loc>
    <lastmod>2026-06-14</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

- Keep under 50,000 URLs per sitemap (split if larger)
- Reference in `robots.txt`: `Sitemap: https://example.com/sitemap.xml`
- Submit to Google Search Console and Bing Webmaster Tools

## Robots.txt

```txt
User-agent: *
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Block private or duplicate paths:

```txt
User-agent: *
Disallow: /admin/
Disallow: /private/
Disallow: /temp/
```

## Canonical URLs

Prevents duplicate content issues when the same page is accessible at multiple URLs.

```html
<link rel="canonical" href="https://example.com/preferred-url/" />
```

Always set the canonical URL on every page, even if there's only one version. It's the authoritative signal.

## Heading Hierarchy

Search engines use headings to understand content structure. Follow a logical hierarchy.

```html
<h1>Page title (one per page)</h1>
<h2>Section</h2>
<h3>Subsection</h3>
<h2>Another section</h2>
```

- One `<h1>` per page — describes the page's main topic
- Don't skip levels (h1 → h3 without h2 is OK for design, but logical hierarchy matters)
- Headings describe content, not style — "Team" not "Blue Section"
- Keep `<title>` under 60 characters, meta description under 160

## Performance SEO

Core Web Vitals are a ranking factor. Slow pages rank lower.

Key connections:

| SEO factor          | What matters                                               |
| ------------------- | ---------------------------------------------------------- |
| **LCP < 2.5s**      | Preload hero image, inline critical CSS, minify HTML       |
| **CLS < 0.1**       | Set width/height on images, reserve space for embeds/fonts |
| **Mobile-first**    | Google uses mobile indexing by default                     |
| **HTTPS**           | Required for ranking — never serve SEO pages over HTTP     |
| **Structured data** | Enables rich results (FAQ, review, breadcrumb)             |

## Sharing preview checklist

Test all pages at:

- https://developers.facebook.com/tools/debug/
- https://cards-dev.twitter.com/validator
- https://www.linkedin.com/post-inspector/
- https://search.google.com/test/rich-results

## Anti-patterns

- ❌ Missing or duplicate `<title>` tags
- ❌ Missing or auto-generated meta descriptions
- ❌ Same og:image for every page without context
- ❌ No canonical URL
- ❌ Blocking CSS/JS with robots.txt
- ❌ Content hidden behind JS without SSR/prerendering
- ❌ Heading hierarchy violations
- ❌ No sitemap or stale sitemap

## Checklist

- [ ] `<title>` set and unique per page
- [ ] `<meta name="description">` set and unique per page
- [ ] `<meta name="robots">` set appropriately
- [ ] `<link rel="canonical">` set on every page
- [ ] Open Graph tags complete (title, description, url, image)
- [ ] Twitter Card tags complete
- [ ] JSON-LD structured data added (Organization, Person, FAQ, Article, etc.)
- [ ] XML sitemap exists and is referenced in robots.txt
- [ ] robots.txt exists and allows desired paths
- [ ] Single `<h1>` per page, logical heading hierarchy
- [ ] Images have `alt` text
- [ ] All internal links use `<a href="...">` (not JS onClick)
- [ ] Page passes Core Web Vitals thresholds
- [ ] HTTPS enforced

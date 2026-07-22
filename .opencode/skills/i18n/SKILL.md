---
name: i18n
description: 'Locale detection, message catalogs, ICU formatting, pluralization, number/date/currency formats, RTL support, content negotiation.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [i18n, internationalization, localization, locale, translation, l10n]
tools: [opencode, claude, cursor, gemini]
---

# Internationalization (i18n)

You are an **i18n specialist**. You build applications that speak the user's language — with proper number formats, date formats, plural rules, and directionality for every locale.

## Locale Detection

### Server-side (Accept-Language header)

```javascript
function detectLocale(req, supported = ['en', 'fi', 'de'], defaultLocale = 'en') {
  const header = req.headers['accept-language'];
  if (!header) return defaultLocale;

  // Parse Accept-Language: "fi-FI,fi;q=0.9,en;q=0.8"
  const locales = header
    .split(',')
    .map((entry) => {
      const [locale, q = '1'] = entry.trim().split(';q=');
      return { locale: locale.split('-')[0], quality: parseFloat(q) };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of locales) {
    if (supported.includes(locale)) return locale;
  }

  return defaultLocale;
}

// Express middleware
app.use((req, res, next) => {
  req.locale = detectLocale(req);
  next();
});
```

### Client-side (navigator.language)

```javascript
function getBrowserLocale(supported = ['en', 'fi', 'de'], defaultLocale = 'en') {
  const lang = (navigator.language || navigator.userLanguage || '').split('-')[0];
  return supported.includes(lang) ? lang : defaultLocale;
}
```

### URL-based locale

```
/en/projects
/fi/projects
/de/projekte
```

```javascript
// Express route
app.get('/:locale/projects', (req, res, next) => {
  const { locale } = req.params;
  if (!supportedLocales.includes(locale)) return next(); // 404
  req.locale = locale;
  // ...
});
```

## Message Catalogs

```javascript
// locales/en.json
{
  "welcome": "Welcome",
  "greeting": "Hello, {name}!",
  "projects": {
    "title": "Projects",
    "empty": "No projects yet",
    "count": "{count} projects",
    "count_plural": "{count} project"
  },
  "errors": {
    "notFound": "Page not found",
    "serverError": "Something went wrong"
  },
  "dates": {
    "today": "Today",
    "yesterday": "Yesterday",
    "format": "{date, date, medium}"
  }
}

// locales/fi.json
{
  "welcome": "Tervetuloa",
  "greeting": "Hei, {name}!",
  "projects": {
    "title": "Projektit",
    "empty": "Ei projekteja vielä",
    "count": "{count} projektia",
    "count_plural": "{count} projekti"
  },
  "errors": {
    "notFound": "Sivua ei löydy",
    "serverError": "Jotain meni pieleen"
  }
}
```

## Translator / Formatter

```javascript
class I18n {
  constructor(locales = {}, defaultLocale = 'en') {
    this.locales = locales;
    this.defaultLocale = defaultLocale;
  }

  t(key, params = {}, locale) {
    const lang = locale || this.defaultLocale;
    const catalog = this.locales[lang] || this.locales[this.defaultLocale];

    // Resolve nested key: "projects.title"
    let value = catalog;
    for (const part of key.split('.')) {
      if (value == null) return key; // Fallback to key itself
      value = value[part];
    }

    if (value == null) return key;

    // Pluralization
    if (params.count != null) {
      const pluralKey = `${key}_plural`;
      let pluralValue = catalog;
      for (const part of pluralKey.split('.')) {
        if (pluralValue == null) break;
        pluralValue = pluralValue[part];
      }
      // Simple plural rule: use plural form if count !== 1
      if (pluralValue && params.count !== 1) {
        value = pluralValue;
      }
    }

    // Interpolation
    return value.replace(/\{(\w+)\}/g, (_, key) => {
      return params[key] != null ? params[key] : `{${key}}`;
    });
  }

  localeData(locale) {
    return this.locales[locale] || this.locales[this.defaultLocale];
  }
}

// Loading catalogs
const i18n = new I18n({
  en: require('./locales/en.json'),
  fi: require('./locales/fi.json'),
});

// Usage
i18n.t('welcome'); // "Welcome"
i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
i18n.t('projects.count', { count: 5 }); // "5 projects"
i18n.t('projects.count', { count: 1 }); // "1 project"
```

## ICU Message Format (advanced)

For proper ICU support with select, plural, and ordinal rules:

```javascript
// Simplified ICU-like formatter
function formatMessage(pattern, params) {
  return pattern.replace(/\{(\w+)(?:, (\w+)(?:, (.+?))?)?\}/g, (match, key, type, arg) => {
    const value = params[key];
    if (value == null) return match;

    switch (type) {
      case 'plural': {
        // arg = "one{...} other{...}"
        const rules = parsePluralRules(arg);
        const rule = new Intl.PluralRules(params._locale || 'en').select(value);
        return rules[rule] || rules.other || '';
      }
      case 'date': {
        return new Intl.DateTimeFormat(params._locale || 'en', {
          dateStyle: arg || 'medium',
        }).format(new Date(value));
      }
      case 'number': {
        return new Intl.NumberFormat(params._locale || 'en', {
          style: arg || 'decimal',
        }).format(value);
      }
      default:
        return value;
    }
  });
}

// Usage
const msg = 'You have {count, plural, one{# project} other{# projects}}';
formatMessage(msg, { count: 1, _locale: 'en' }); // "You have 1 project"
formatMessage(msg, { count: 5, _locale: 'en' }); // "You have 5 projects"
```

## Number and Date Formatting

Use `Intl` — available in all modern runtimes.

```javascript
const formatters = {
  number: (value, locale = 'en', options = {}) => {
    return new Intl.NumberFormat(locale, {
      style: options.style || 'decimal',
      minimumFractionDigits: options.minFraction ?? 0,
      maximumFractionDigits: options.maxFraction ?? 2,
      ...(options.currency && { currency: options.currency }),
    }).format(value);
  },

  currency: (value, currency = 'USD', locale = 'en') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  },

  date: (date, locale = 'en', options = {}) => {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: options.dateStyle || 'medium',
      timeStyle: options.timeStyle,
    }).format(new Date(date));
  },

  relative: (date, locale = 'en') => {
    const now = Date.now();
    const diff = now - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (seconds < 60) return rtf.format(-seconds, 'second');
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    if (hours < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-days, 'day');
  },
};

// Examples
formatters.number(1000.5, 'de'); // "1.000,5"
formatters.currency(99.95, 'EUR', 'fi'); // "99,95 €"
formatters.date('2026-06-14', 'en'); // "Jun 14, 2026"
formatters.relative(Date.now() - 5000); // "5 seconds ago"
```

## RTL Support

```javascript
// Detect RTL
const RTL_LOCALES = ['ar', 'he', 'fa', 'ur']

function isRTL(locale) {
  return RTL_LOCALES.some(rtl => locale.startsWith(rtl))
}

// Apply to HTML
function setDocumentDirection(locale) {
  document.documentElement.dir = isRTL(locale) ? 'rtl' : 'ltr'
  document.documentElement.lang = locale
}

// CSS: use logical properties instead of physical
/*
  /* Instead of: */
  margin-left: 10px;
  padding-right: 5px;

  /* Use: */
  margin-inline-start: 10px;
  padding-inline-end: 5px;
*/
```

## Lazy Loading Locales

Load only the locale the user needs, not all of them.

```javascript
class LazyI18n {
  constructor(defaultLocale = 'en') {
    this.defaultLocale = defaultLocale;
    this.cache = new Map();
    this.current = defaultLocale;
  }

  async setLocale(locale) {
    if (this.cache.has(locale)) {
      this.current = locale;
      return;
    }

    const messages = await import(`./locales/${locale}.json`);
    this.cache.set(locale, messages);
    this.current = locale;
  }

  t(key, params = {}) {
    const catalog = this.cache.get(this.current);
    if (!catalog) return key;
    // ... resolve and interpolate
  }

  preload(locales) {
    return Promise.all(locales.map((l) => this.setLocale(l)));
  }
}
```

## Content Negotiation

```javascript
// Server-side: set Content-Language header
app.use((req, res, next) => {
  res.setHeader('Content-Language', req.locale);
  next();
});

// Serve localized static files
function localizedStatic(locale) {
  return express.static(path.join(__dirname, 'public', locale));
}

app.use('/:locale', (req, res, next) => {
  const locale = req.params.locale;
  if (!supportedLocales.includes(locale)) return next();
  express.static(path.join(__dirname, 'public', locale))(req, res, next);
});
```

## i18n anti-patterns

- ❌ String concatenation — `"Hello, " + name + "!"` — breaks word order in other languages
- ❌ Using `Intl` without a locale — always pass locale explicitly
- ❌ Storing formatted values in the database — store raw data, format at display time
- ❌ Assuming all languages use left-to-right
- ❌ Only testing in English — test every supported locale
- ❌ Translating error messages server-side — keeps stack traces user-readable
- ❌ Hardcoding plurals — `item(s)` doesn't work for most languages

## Checklist

- [ ] Locale detected from Accept-Language, navigator.language, or URL path
- [ ] Message catalogs use parameterized templates, not concatenation
- [ ] Pluralization uses CLDR plural rules, not just count !== 1
- [ ] `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat` used
- [ ] RTL direction set on `<html>` element with logical CSS properties
- [ ] Locales lazy-loaded (not bundled together)
- [ ] `Content-Language` header sent on responses
- [ ] Fallback chain: requested locale → default locale → message key
- [ ] All user-facing strings go through the i18n translator (no hardcoded text)
- [ ] Dates, numbers, and currencies formatted with Intl, never hardcoded patterns

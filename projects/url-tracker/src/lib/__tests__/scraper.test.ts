import { describe, it, expect, vi, afterEach } from "vitest";
import { scrapeUrl, previewUrl, RobotsBlockedError } from "@/lib/scraper/scraper";
import type { ScrapeField } from "@/lib/scraper/scraper";

// Use unique hostnames per test to avoid robots.txt cache collisions

let hostCounter = 0;
function uniqueHost(): string {
  hostCounter++;
  return `test-${hostCounter}-${Date.now()}.example.com`;
}

function mockPage(html: string, status = 200) {
  return Promise.resolve(
    new Response(html, {
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: new Headers({ "content-type": "text/html" }),
    }),
  );
}

function mockRobotsTxt(body: string) {
  return Promise.resolve(
    new Response(body, {
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
    }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── scrapeUrl ──

describe("scrapeUrl", () => {
  it("extracts text content from a CSS selector", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // robots.txt request
    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    // page request
    fetchSpy.mockReturnValueOnce(mockPage('<p class="price">29.99</p>'));

    const result = await scrapeUrl(`https://${host}/product`, [
      { cssSelector: ".price", attribute: "text", valueType: "number" },
    ]);

    expect(result.blockedByRobots).toBe(false);
    expect(result.values).toHaveLength(1);
    expect(result.values[0].value).toBe("29.99");
    expect(result.values[0].error).toBeUndefined();
  });

  it("extracts href attribute from a link", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<a href="/details" class="link">Details</a>'));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".link", attribute: "href", valueType: "text" },
    ]);

    expect(result.values[0].value).toBe("/details");
  });

  it("extracts src attribute from an image", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<img src="photo.jpg" class="main-img" />'));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".main-img", attribute: "src", valueType: "text" },
    ]);

    expect(result.values[0].value).toBe("photo.jpg");
  });

  it("returns error when selector matches no elements", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage("<html></html>"));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".nonexistent", attribute: "text", valueType: "text" },
    ]);

    expect(result.values[0].value).toBe("");
    expect(result.values[0].error).toContain("matched no elements");
  });

  it("returns error when attribute is missing on matched element", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<div class="foo">text</div>'));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".foo", attribute: "href", valueType: "text" },
    ]);

    expect(result.values[0].value).toBe("");
    expect(result.values[0].error).toContain("no href found");
  });

  it("extracts page title from meta tags", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(
      mockPage('<html><head><meta property="og:title" content="Product Page" /></head><body></body></html>'),
    );

    const result = await scrapeUrl(`https://${host}`, []);

    expect(result.title).toBe("Product Page");
  });
});

// ── Number Parsing ──

describe("scrapeUrl — number parsing", () => {
  it.each([
    ["$29.99", "29.99"],
    ["£49.95", "49.95"],
    ["1,234.56", "1234.56"],
    ["  $12.50  ", "12.5"],
    ["0.99", "0.99"],
  ])("parses '%s' as '%s'", async (raw, expected) => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage(`<span class="price">${raw}</span>`));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".price", attribute: "text", valueType: "number" },
    ]);

    expect(result.values[0].value).toBe(expected);
  });

  it("returns error for unparseable number", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<span class="val">N/A</span>'));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".val", attribute: "text", valueType: "number" },
    ]);

    expect(result.values[0].error).toContain("Could not parse");
  });
});

// ── Boolean Parsing ──

describe("scrapeUrl — boolean parsing", () => {
  it.each([
    ["In Stock", "true"],
    ["in stock", "true"],
    ["Available", "true"],
    ["Out of Stock", "false"],
    ["Out of stock", "false"],
    ["Unavailable", "false"],
  ])("parses '%s' as '%s'", async (raw, expected) => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage(`<span class="stock">${raw}</span>`));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".stock", attribute: "text", valueType: "boolean" },
    ]);

    expect(result.values[0].value).toBe(expected);
  });

  it("returns error for unparseable boolean", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<span class="x">maybe</span>'));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".x", attribute: "text", valueType: "boolean" },
    ]);

    expect(result.values[0].error).toContain("Could not parse");
  });
});

// ── previewUrl — Auto-detection ──

describe("previewUrl", () => {
  it("detects meta tags (title, image, description)", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(
      mockPage(`<html><head>
        <meta property="og:title" content="Test Page" />
        <meta property="og:image" content="https://example.com/img.png" />
        <meta name="description" content="A test page" />
      </head><body></body></html>`),
    );

    const result = await previewUrl(`https://${host}`);

    expect(result.title).toBe("Test Page");
    expect(result.image).toBe("https://example.com/img.png");
    expect(result.description).toBe("A test page");
  });

  it("returns no detected fields for JSON-LD-only pages (no HTML elements to select)", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(
      mockPage(`<html><head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Widget",
          "offers": {
            "@type": "Offer",
            "price": "29.99"
          }
        }
        </script>
      </head><body></body></html>`),
    );

    const result = await previewUrl(`https://${host}`);

    // JSON-LD lives in a script tag — can't be targeted by CSS selectors
    expect(result.detectedFields).toHaveLength(0);
  });

  it("detects microdata (itemprop) fields", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(
      mockPage(`<html><body>
        <div itemscope itemtype="https://schema.org/Product">
          <h1 itemprop="name">Widget</h1>
          <span itemprop="price">29.99</span>
          <span itemprop="availability">In Stock</span>
        </div>
      </body></html>`),
    );

    const result = await previewUrl(`https://${host}`);

    const labels = result.detectedFields.map((f) => f.label);
    expect(labels).toContain("name");
    expect(labels).toContain("price");
    expect(labels).toContain("Availability");
  });

  it("detects price from common CSS class patterns", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<span class="price">$49.99</span>'));

    const result = await previewUrl(`https://${host}`);

    const labels = result.detectedFields.map((f) => f.label);
    expect(labels).toContain("Price");
  });

  it("detects stock status from common patterns", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<span class="availability">In Stock</span>'));

    const result = await previewUrl(`https://${host}`);

    const labels = result.detectedFields.map((f) => f.label);
    expect(labels).toContain("Stock Status");
  });

  it("detects rating from common patterns", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<span class="rating">4.5</span>'));

    const result = await previewUrl(`https://${host}`);

    const labels = result.detectedFields.map((f) => f.label);
    expect(labels).toContain("Rating");
  });
});

// ── Robots.txt ──

describe("robots.txt handling", () => {
  it("allows scraping when robots.txt allows", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<p>Hello</p>'));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: "p", attribute: "text", valueType: "text" },
    ]);

    expect(result.blockedByRobots).toBe(false);
    expect(result.values[0].value).toBe("Hello");
  });

  it("throws RobotsBlockedError when robots.txt disallows", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nDisallow: /\n"));

    await expect(
      scrapeUrl(`https://${host}`, [
        { cssSelector: "p", attribute: "text", valueType: "text" },
      ]),
    ).rejects.toThrow(RobotsBlockedError);
  });

  it("allows scraping when robots.txt returns non-200", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(Promise.resolve(new Response("Not Found", { status: 404 })));
    fetchSpy.mockReturnValueOnce(mockPage('<p>Hello</p>'));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: "p", attribute: "text", valueType: "text" },
    ]);

    expect(result.blockedByRobots).toBe(false);
    expect(result.values[0].value).toBe("Hello");
  });
});

// ── Error Handling ──

describe("error handling", () => {
  it("reports per-field errors without failing the whole scrape", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(mockPage('<p class="ok">42</p>'));

    const result = await scrapeUrl(`https://${host}`, [
      { cssSelector: ".ok", attribute: "text", valueType: "number" },
      { cssSelector: ".missing", attribute: "text", valueType: "text" },
    ]);

    expect(result.values[0].value).toBe("42");
    expect(result.values[0].error).toBeUndefined();
    expect(result.values[1].value).toBe("");
    expect(result.values[1].error).toContain("matched no elements");
  });

  it("rejects on fetch failure", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(
      scrapeUrl(`https://${host}`, [
        { cssSelector: "p", attribute: "text", valueType: "text" },
      ]),
    ).rejects.toThrow("Failed to fetch");
  });
});

// ── Multiple Fields ──

describe("multiple fields", () => {
  it("extracts multiple values in one scrape", async () => {
    const host = uniqueHost();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockReturnValueOnce(mockRobotsTxt("User-agent: *\nAllow: /\n"));
    fetchSpy.mockReturnValueOnce(
      mockPage(`<h1 class="title">Widget Pro</h1>
        <span class="price">$49.99</span>
        <span class="stock">In Stock</span>`),
    );

    const fields: ScrapeField[] = [
      { cssSelector: ".title", attribute: "text", valueType: "text" },
      { cssSelector: ".price", attribute: "text", valueType: "number" },
      { cssSelector: ".stock", attribute: "text", valueType: "boolean" },
    ];

    const result = await scrapeUrl(`https://${host}`, fields);

    expect(result.values).toHaveLength(3);
    expect(result.values[0].value).toBe("Widget Pro");
    expect(result.values[1].value).toBe("49.99");
    expect(result.values[2].value).toBe("true");
  });
});

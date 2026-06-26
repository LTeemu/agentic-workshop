"use client";

interface NewsItem {
  headline: string;
  summary: string;
  url: string;
  source: string;
  datetime: number;
  image?: string;
}

interface NewsFeedProps {
  news: NewsItem[] | null | undefined;
}

export function NewsFeed({ news }: NewsFeedProps) {
  if (!news || news.length === 0) {
    return (
      <section className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">News</h3>
        <p className="text-sm text-zinc-500">No recent news available.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border p-4">
      <h3 className="mb-3 font-semibold">Recent News</h3>

      <div className="flex flex-col gap-3">
        {news.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-md p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <div className="flex gap-3">
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  className="h-14 w-14 flex-shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium group-hover:text-blue-600">
                  {item.headline}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{item.summary}</p>
                <div className="mt-1 text-[10px] text-zinc-400">
                  {item.source} · {new Date(item.datetime * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

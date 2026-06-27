"use client";

import { CacheIndicator } from "./cache-indicator";

interface ProfileData {
  name: string;
  exchange: string;
  industry: string;
  country: string;
  currency: string;
  marketCapitalization: number;
  logo: string;
  weburl: string;
}

interface FundamentalsProps {
  profile: ProfileData | Record<string, never> | null | undefined;
  profileLoading: boolean;
  symbol: string;
  profileUpdatedAt?: number;
  profileError?: { message: string } | null;
}

export function Fundamentals({ profile, profileLoading, symbol, profileUpdatedAt, profileError }: FundamentalsProps) {
  if (profileLoading) {
    return (
      <section className="rounded-lg border p-4">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="font-semibold">Fundamentals</h3>
          <CacheIndicator label="Profile" updatedAt={profileUpdatedAt} staleAfter={86_400_000} />
        </div>
        {profileError ? (
          <p className="text-sm text-red-600">{profileError.message}</p>
        ) : (
          <p className="text-sm text-zinc-500">Loading...</p>
        )}
      </section>
    );
  }

  if (!profile || !("name" in profile)) {
    return (
      <section className="rounded-lg border p-4">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="font-semibold">Fundamentals</h3>
          <CacheIndicator label="Profile" updatedAt={profileUpdatedAt} staleAfter={86_400_000} />
        </div>
        {profileError ? (
          <p className="text-sm text-red-600">{profileError.message}</p>
        ) : (
          <p className="text-sm text-zinc-500">Fundamental data not available for {symbol} on the free plan (US only).</p>
        )}
      </section>
    );
  }

  const formatMarketCap = (cap: number) => {
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-semibold">Fundamentals</h3>
        <CacheIndicator label="Profile" updatedAt={profileUpdatedAt} staleAfter={86_400_000} />
      </div>
      {profileError && (
        <p className="mb-3 text-sm text-red-600">{profileError.message}</p>
      )}

      <div className="flex items-center gap-3 mb-4">
        {profile.logo && (
          <img src={profile.logo} alt={`${profile.name} logo`} className="h-10 w-10 rounded-full" />
        )}
        <div>
          <div className="font-medium">{profile.name}</div>
          <div className="text-xs text-zinc-500">{profile.exchange}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-zinc-500">Industry</div>
          <div className="font-medium">{profile.industry}</div>
        </div>
        <div>
          <div className="text-zinc-500">Country</div>
          <div className="font-medium">{profile.country}</div>
        </div>
        <div>
          <div className="text-zinc-500">Currency</div>
          <div className="font-medium">{profile.currency}</div>
        </div>
        <div>
          <div className="text-zinc-500">Market Cap</div>
          <div className="font-medium">{formatMarketCap(profile.marketCapitalization)}</div>
        </div>
      </div>

      <a
        href={profile.weburl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-xs text-blue-600 hover:underline"
      >
        Visit website →
      </a>
    </section>
  );
}

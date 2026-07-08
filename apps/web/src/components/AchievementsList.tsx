"use client";

import { useEffect, useMemo, useState } from "react";

interface AchievementView {
  id: string;
  nameDa: string;
  descDa: string;
  group: string;
  tier: string;
  rarity: string;
  comingSoon: boolean;
  unlockedAt: string | null;
}

interface AchievementsResponse {
  loggedIn: boolean;
  unlockedCount: number;
  totalCount: number;
  achievements: AchievementView[];
}

export function AchievementsList() {
  const [data, setData] = useState<AchievementsResponse | null>(null);

  useEffect(() => {
    fetch("/api/achievements")
      .then((res) => res.json())
      .then(setData);
  }, []);

  const grouped = useMemo(() => {
    if (!data) return [];
    const groups = new Map<string, AchievementView[]>();
    for (const a of data.achievements) {
      const list = groups.get(a.group) ?? [];
      list.push(a);
      groups.set(a.group, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  if (!data) {
    return <p className="text-sm text-muted">Indlæser…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-5 py-4">
        <div>
          <p className="font-display text-2xl font-bold text-accent-2">
            {data.unlockedCount} <span className="text-base font-medium text-faint">/ {data.totalCount}</span>
          </p>
          <p className="text-sm text-muted">bedrifter oplåst</p>
        </div>
        {!data.loggedIn && (
          <p className="max-w-[14rem] text-right text-xs text-faint">
            Log ind for at gemme din fremgang og optjene bedrifter.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {grouped.map(([group, achievements]) => {
          const unlockedInGroup = achievements.filter((a) => a.unlockedAt).length;
          return (
            <details key={group} className="rounded-xl border border-border bg-surface px-4 py-3">
              <summary className="cursor-pointer font-medium text-foreground">
                {group} ({unlockedInGroup}/{achievements.length})
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {achievements.map((a) => (
                  <AchievementRow key={a.id} achievement={a} />
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}

function AchievementRow({ achievement }: { achievement: AchievementView }) {
  const unlocked = Boolean(achievement.unlockedAt);
  return (
    <li
      className={`flex items-start gap-3 rounded-xl border-[1.5px] px-4 py-3 ${
        unlocked ? "border-accent-2 bg-accent-2/10" : "border-border bg-background"
      }`}
    >
      <span className="mt-0.5 text-lg">{unlocked ? "🏆" : achievement.comingSoon ? "🔒" : "⬜"}</span>
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={`font-display font-bold ${unlocked ? "text-foreground" : "text-muted"}`}>
            {achievement.nameDa}
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-faint">
            {achievement.tier}
          </span>
          {achievement.comingSoon && !unlocked && (
            <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-faint">
              kommer snart
            </span>
          )}
        </div>
        <p className="text-sm text-muted">{achievement.descDa}</p>
      </div>
    </li>
  );
}

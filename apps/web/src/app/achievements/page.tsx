import { AchievementsList } from "@/components/AchievementsList";

export default function AchievementsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Bedrifter</h1>
        <p className="text-sm text-muted">
          Optjen bedrifter ved at spille — kræver at du er logget ind, så din fremgang gemmes på tværs af spil.
        </p>
      </div>
      <AchievementsList />
    </main>
  );
}

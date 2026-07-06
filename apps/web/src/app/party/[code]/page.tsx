import { PartyRoom } from "@/components/PartyRoom";

export default async function PartyRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-16">
      <PartyRoom code={code.toUpperCase()} />
    </main>
  );
}

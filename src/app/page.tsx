import GameClient from "@/components/GameClient";

// Server component: just renders the client-only game shell.
export default function Home() {
  return (
    <main>
      <GameClient />
    </main>
  );
}

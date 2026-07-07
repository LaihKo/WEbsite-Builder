import { auth, signIn, signOut } from "@/auth";

export async function AuthStatus() {
  const session = await auth();

  if (session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
        className="flex items-center gap-3 text-sm"
      >
        <span className="text-muted">{session.user.name ?? session.user.email}</span>
        <button type="submit" className="text-accent hover:underline">
          Log ud
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
      >
        <button type="submit" className="text-accent hover:underline">
          Log ind med Google
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          await signIn("facebook");
        }}
      >
        <button type="submit" className="text-accent hover:underline">
          Log ind med Facebook
        </button>
      </form>
    </div>
  );
}

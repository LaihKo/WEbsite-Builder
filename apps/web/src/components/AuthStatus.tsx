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
        <span className="text-zinc-600 dark:text-zinc-400">
          {session.user.name ?? session.user.email}
        </span>
        <button type="submit" className="underline underline-offset-2">
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
        <button type="submit" className="underline underline-offset-2">
          Log ind med Google
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          await signIn("facebook");
        }}
      >
        <button type="submit" className="underline underline-offset-2">
          Log ind med Facebook
        </button>
      </form>
    </div>
  );
}

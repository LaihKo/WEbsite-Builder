import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, createAdminSessionToken, verifyAdminPassword } from "@/lib/adminAuth";
import { getClientKey, isRateLimited } from "@/lib/rateLimit";

export async function POST(request: Request) {
  if (isRateLimited(`admin-login:${getClientKey(request)}`, 5)) {
    return Response.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const password = (body as { password?: unknown } | null)?.password;
  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  }

  (await cookies()).set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return Response.json({ ok: true });
}

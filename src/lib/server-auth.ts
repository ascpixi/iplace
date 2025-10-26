import type { AstroGlobal } from "astro";
import { getUserBySession } from "./auth";

/**
 * Gets the current user from the Astro request. This should **NOT** be used from API endpoints,
 * and is only intended when doing SSR.
 */
export async function getCurrentUser(Astro: AstroGlobal) {
  const sessionCookie = Astro.cookies.get("session")?.value;
  if (!sessionCookie)
    return null;

  return getUserBySession(sessionCookie);
}

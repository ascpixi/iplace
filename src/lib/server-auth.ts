import type { AstroGlobal } from "astro";
import { getUserBySession } from "./auth";

/**
 * Gets the current user from the Astro request (server-side only)
 */
export async function getCurrentUser(Astro: AstroGlobal) {
  const sessionCookie = Astro.cookies.get("session")?.value;
  
  if (!sessionCookie) {
    return null;
  }

  return getUserBySession(sessionCookie);
}

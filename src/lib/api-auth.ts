import { getUserBySession } from "./auth";
import type { User } from "../prisma/generated/client";

/**
 * Gets the current authenticated user from an API request.
 * Extracts session cookie from request headers and validates it.
 * 
 * @param request The API request object
 * @returns The authenticated user or null if not authenticated
 */
export async function getCurrentUserFromRequest(request: Request): Promise<User | null> {
  const sessionCookie = request.headers.get("cookie")
    ?.split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!sessionCookie) {
    return null;
  }

  try {
    return await getUserBySession(sessionCookie);
  } catch (error) {
    // Invalid session cookie
    return null;
  }
}

/**
 * Validates internal secret token from request body.
 * Returns error response if validation fails, null if valid.
 * 
 * @param secret The secret token to validate
 * @returns Error response if invalid, null if valid
 */
export function validateInternalSecret(secret: string | undefined): Response | null {
  if (!secret || secret !== import.meta.env.INTERNAL_SECRET_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  return null;
}

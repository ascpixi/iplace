import jwt from "jsonwebtoken";
import prisma from "./prisma";
import type * as db from "../prisma/generated/client";

const JWT_SECRET = import.meta.env.JWT_SECRET;

export interface VerificationTokenPayload {
  slackId: string;
  iat: number;
  exp: number;
}

/**
 * Creates a token that verifies that a frame creation request was created by the given user.
 */
export function createAuthorshipToken(slackId: string): string {
  return jwt.sign({ slackId }, JWT_SECRET, { expiresIn: "12h" });
}

/**
 * Verifies that an authorship token is valid.
 */
export function verifyAuthorshipToken(token: string): VerificationTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as VerificationTokenPayload;
  }
  catch (error) {
    return null;
  }
}

export async function createSession(userId: number): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    }
  });

  return session.id;
}


export async function getUserBySession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      user: true,
    }
  });

  if (!session || session.expiresAt < new Date())
    return null;

  return session.user;
}

export async function cleanExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      }
    }
  });
}

export async function getUserFromRequest(request: Request): Promise<db.User | null> {
  const sessionCookie = request.headers.get("cookie")
    ?.split(";")
    .find(c => c.trim().startsWith("session="))
    ?.split("=")[1];

  if (!sessionCookie)
    return null;

  try {
    return await getUserBySession(sessionCookie);
  }
  catch (error) {
    console.warn("(warn) An error occured while verifying a user session!", error);
    return null;
  }
}

export function validateInternalSecret(secret: string | undefined): Response | null {
  if (!secret || secret !== import.meta.env.INTERNAL_SECRET_TOKEN) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  return null;
}
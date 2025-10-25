import jwt from 'jsonwebtoken';
import prisma from './prisma';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'fallback-secret-for-dev';

export interface VerificationTokenPayload {
  slackId: string;
  iat: number;
  exp: number;
}

/**
 * Creates a 12-hour verification token containing a Slack ID
 */
export function createVerificationToken(slackId: string): string {
  const payload = {
    slackId,
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '12h',
  });
}

/**
 * Verifies and decodes a verification token
 */
export function verifyVerificationToken(token: string): VerificationTokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as VerificationTokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired verification token');
  }
}

/**
 * Creates a new session for a user
 */
export async function createSession(userId: number): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    },
  });

  return session.id;
}

/**
 * Gets a user by session ID
 */
export async function getUserBySession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}

/**
 * Deletes expired sessions
 */
export async function cleanExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

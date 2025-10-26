import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/server-auth";
import prisma from "../../lib/prisma";
import { notAuthedResponse } from "../../lib/auth";

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getCurrentUser({ request } as any);
    if (!user)
        return notAuthedResponse();

    // Get the most recent frame for this user
    const recentFrames = await prisma.frame.findMany({
      where: {
        ownerId: user.id
      },
      orderBy: {
        id: 'desc'
      },
      take: 1
    });

    return new Response(JSON.stringify({
      frames: recentFrames.map(frame => ({
        id: frame.id,
        url: frame.url,
        isPending: frame.isPending,
        projectNames: frame.projectNames
      }))
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to fetch recent frames"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

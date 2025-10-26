import type { APIRoute } from "astro";
import { getCurrentUser } from "../../lib/server-auth";
import prisma from "../../lib/prisma";

export const GET: APIRoute = async ({ request }) => {
  try {
    const currentUser = await getCurrentUser({ request } as any);
    
    if (!currentUser) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get the most recent frame for this user
    const recentFrames = await prisma.frame.findMany({
      where: {
        ownerId: currentUser.id
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

import type { APIRoute } from "astro";
import prisma from "../../lib/prisma";
import { getUserFromRequest, notAuthedResponse } from "../../lib/auth";
import { jsonResponse } from "../../lib/api-util";

export const GET: APIRoute = async ({ request }) => {
    const user = await getUserFromRequest(request);
    if (!user)
        return notAuthedResponse();

    const url = new URL(request.url);
    const sinceParam = url.searchParams.get('since');
    
    let whereClause: any = { ownerId: user.id };
    
    if (sinceParam) {
        const sinceDate = new Date(sinceParam);
        whereClause.createdAt = { gte: sinceDate };
    }

    const recentFrames = await prisma.frame.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: sinceParam ? 10 : 1 // Return more frames when filtering by time
    });

    return jsonResponse({
        frames: recentFrames.map(frame => ({
            id: frame.id,
            url: frame.url,
            isPending: frame.isPending,
            projectNames: frame.projectNames,
            createdAt: frame.createdAt.toISOString()
        }))
    });
};

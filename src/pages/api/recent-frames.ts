import type { APIRoute } from "astro";
import prisma from "../../lib/prisma";
import { getUserFromRequest, notAuthedResponse } from "../../lib/auth";
import { jsonResponse } from "../../lib/api-util";

export const GET: APIRoute = async ({ request }) => {
    const user = await getUserFromRequest(request);
    if (!user)
        return notAuthedResponse();

    const recentFrames = await prisma.frame.findMany({
        where: { ownerId: user.id },
        orderBy: { id: "desc" },
        take: 1
    });

    return jsonResponse({
        frames: recentFrames.map(frame => ({
            id: frame.id,
            url: frame.url,
            isPending: frame.isPending,
            projectNames: frame.projectNames
        }))
    });
};

import type { APIRoute } from "astro";
import { z } from "zod";
import { notAuthedResponse, validateInternalSecret } from "../../../lib/auth";
import { validateRequestBody, InternalSecretSchema, jsonError, jsonResponse } from "../../../lib/api-util";
import prisma from "../../../lib/prisma";
import { Hackatime } from "../../../hackatime";

// This endpoint is intended to be used from automation scripts (e.g. from Airtable).

const ApproveFrameSchema = InternalSecretSchema.extend({
    url: z.string().url("url must be a valid URL")
});

const hackatime = new Hackatime(import.meta.env.HACKATIME_ADMIN_KEY);

export const POST: APIRoute = async ({ request }) => {
    const validation = await validateRequestBody(request, ApproveFrameSchema);
    if (!validation.success)
        return validation.response;

    const { secret, url } = validation.data;

    if (!validateInternalSecret(secret))
        return notAuthedResponse();

    const frame = await prisma.frame.findFirst({
        where: { url },
        include: { owner: true }
    });

    if (!frame)
        return jsonError(404, "Frame not found");

    if (!frame.projectNames)
        return jsonError(400, "Frame has no associated project names");

    const projectNamesList = frame.projectNames.split(',').map(name => name.trim());
    const allProjects = await hackatime.getProjectsFor(frame.owner.slackId);

    let approvedTime = 0;
    for (const projectName of projectNamesList) {
        const project = allProjects.find(p => p.name === projectName);
        if (project) {
            approvedTime += project.total_seconds;
        }
    }

    console.log(`(/api/internal/approve-frame) approving frame ${frame.url} (ID ${frame.id})`);
    const updatedFrame = await prisma.frame.update({
        where: { id: frame.id },
        data: {
            isPending: false,
            approvedTime
        }
    });

    return jsonResponse({
        success: true,
        frame: {
            id: updatedFrame.id,
            url: updatedFrame.url,
            ownerId: updatedFrame.ownerId,
            isPending: updatedFrame.isPending,
            approvedTime: updatedFrame.approvedTime,
            projectNames: updatedFrame.projectNames
        }
    });
};

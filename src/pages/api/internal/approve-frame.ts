import type { APIRoute } from "astro";
import { z } from "zod";
import { validateInternalSecret } from "../../../lib/api-auth";
import { validateRequestBody, InternalSecretSchema } from "../../../lib/api-schemas";
import prisma from "../../../lib/prisma";
import { Hackatime } from "../../../hackatime";

// This endpoint is intended to be used from automation scripts (e.g. from Airtable).

const ApproveFrameSchema = InternalSecretSchema.extend({
  url: z.string().url("url must be a valid URL")
});

const hackatime = new Hackatime(import.meta.env.HACKATIME_ADMIN_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const validation = await validateRequestBody(request, ApproveFrameSchema);
    if (!validation.success)
      return validation.response;
    
    const { secret, url } = validation.data;

    const authError = validateInternalSecret(secret);
    if (authError)
      return authError;

    const frame = await prisma.frame.findFirst({
      where: { url },
      include: { owner: true }
    });

    if (!frame) {
      return new Response(JSON.stringify({ error: "Frame not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!frame.projectNames) {
      return new Response(JSON.stringify({ error: "Frame has no associated project names" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const projectNamesList = frame.projectNames.split(',').map(name => name.trim());
    
    let allProjects;
    try {
      allProjects = await hackatime.getProjectsFor(frame.owner.slackId);
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: `Failed to fetch Hackatime data for user ${frame.owner.slackId}: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    let approvedTime = 0;
    for (const projectName of projectNamesList) {
      const project = allProjects.find(p => p.name === projectName);
      if (project) {
        approvedTime += project.total_seconds;
      }
    }

    const updatedFrame = await prisma.frame.update({
      where: { id: frame.id },
      data: {
        isPending: false,
        approvedTime
      }
    });

    return new Response(JSON.stringify({
      success: true,
      frame: {
        id: updatedFrame.id,
        url: updatedFrame.url,
        ownerId: updatedFrame.ownerId,
        isPending: updatedFrame.isPending,
        approvedTime: updatedFrame.approvedTime,
        projectNames: updatedFrame.projectNames
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to approve frame"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

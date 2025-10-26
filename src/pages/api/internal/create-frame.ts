import type { APIRoute } from "astro";
import { z } from "zod";
import { validateInternalSecret } from "../../../lib/api-auth";
import { validateRequestBody, InternalSecretSchema } from "../../../lib/api-schemas";
import { verifyVerificationToken } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

// This endpoint is intended to be used from automation scripts (e.g. from Airtable).

const CreateFrameSchema = InternalSecretSchema.extend({
  url: z.string().url("url must be a valid URL"),
  authorshipToken: z.string().min(1, "Authorship token is required"),
  projectNames: z.string().min(1, "Project names are required")
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const validation = await validateRequestBody(request, CreateFrameSchema);
    if (!validation.success)
      return validation.response;
    
    const { secret, url, authorshipToken, projectNames } = validation.data;

    const authError = validateInternalSecret(secret);
    if (authError)
      return authError;

    // Verify the authorship token and get the Slack ID
    let tokenPayload;
    try {
      tokenPayload = verifyVerificationToken(authorshipToken);
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid or expired authorship token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Find the user by Slack ID
    const owner = await prisma.user.findUnique({
      where: { slackId: tokenPayload.slackId }
    });

    if (!owner) {
      return new Response(JSON.stringify({ error: "User not found for the provided authorship token" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const frame = await prisma.frame.create({
      data: {
        url,
        ownerId: owner.id,
        isPending: true,
        projectNames
      }
    });

    return new Response(JSON.stringify({
      success: true,
      frame: {
        id: frame.id,
        url: frame.url,
        ownerId: frame.ownerId,
        isPending: frame.isPending,
        projectNames: frame.projectNames
      }
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to create frame"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

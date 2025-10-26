import type { APIRoute } from "astro";
import { z } from "zod";
import { validateRequestBody, InternalSecretSchema, jsonError, jsonResponse } from "../../../lib/api-util";
import { verifyAuthorshipToken, validateInternalSecret, notAuthedResponse } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

// This endpoint is intended to be used from automation scripts (e.g. from Airtable).

const CreateFrameSchema = InternalSecretSchema.extend({
    url: z.string().url("url must be a valid URL"),
    authorshipToken: z.string().min(1, "Authorship token is required"),
    projectNames: z.string().min(1, "Project names are required")
});

export const POST: APIRoute = async ({ request }) => {
    const validation = await validateRequestBody(request, CreateFrameSchema);
    if (!validation.success)
        return validation.response;

    const { secret, url, authorshipToken, projectNames } = validation.data;

    if (!validateInternalSecret(secret))
        return notAuthedResponse();

    const tokenPayload = verifyAuthorshipToken(authorshipToken);
    if (!tokenPayload)
        return jsonError(401, "Invalid or expired authorship token");

    const owner = await prisma.user.findUnique({
        where: { slackId: tokenPayload.slackId }
    });

    if (!owner)
        return jsonError(404, "User not found for the provided authorship token");

    const frame = await prisma.frame.create({
        data: {
            url,
            ownerId: owner.id,
            isPending: true,
            projectNames
        }
    });

    return jsonResponse({
        success: true,
        frame: {
            id: frame.id,
            url: frame.url,
            ownerId: frame.ownerId,
            isPending: frame.isPending,
            projectNames: frame.projectNames
        }
    });
};

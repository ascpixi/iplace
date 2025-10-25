import type { APIRoute } from "astro";
import { z } from "zod";
import { validateInternalSecret } from "../../../lib/api-auth";
import { validateRequestBody, InternalSecretSchema } from "../../../lib/api-schemas";
import prisma from "../../../lib/prisma";

// This endpoint is intended to be used from automation scripts (e.g. from Airtable).

// TODO: ughh the flow needs to be different because like if someone updates their iframe after working 5 hours the ui should show 5 tiles
// okay so maybe:
//    - the user first selects a frame. they can create or update them
//    - then they enter place mode where they can place tiles for that frame
//    - badabing badaboom we have a winnar

const PlacePendingTileSchema = InternalSecretSchema.extend({
  x: z.number().int("x must be an integer"),
  y: z.number().int("y must be an integer"),  
  frameId: z.number().int("frameId must be an integer").positive("frameId must be positive")
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const validation = await validateRequestBody(request, PlacePendingTileSchema);
    if (!validation.success)
      return validation.response;
    
    const { secret, x, y, frameId } = validation.data;

    const authError = validateInternalSecret(secret);
    if (authError)
      return authError;

    const frame = await prisma.frame.findUnique({
      where: { id: frameId }
    });

    if (!frame) {
      return new Response(JSON.stringify({ error: "Frame not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const tile = await prisma.tile.create({
      data: {
        x,
        y,
        frameId,
        isPending: true
      }
    });

    return new Response(JSON.stringify({
      success: true,
      tile: {
        x: tile.x,
        y: tile.y,
        frameId: tile.frameId,
        isPending: tile.isPending,
        placedAt: tile.placedAt
      }
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to create pending tile"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

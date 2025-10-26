import type { APIRoute } from "astro";
import { z } from "zod";
import { getCurrentUserFromRequest } from "../../lib/api-auth";
import { validateRequestBody } from "../../lib/api-schemas";
import prisma from "../../lib/prisma";

const PlaceTileSchema = z.object({
  x: z.number().int("x must be an integer"),
  y: z.number().int("y must be an integer"),
  frameId: z.number().int("frameId must be an integer").positive("frameId must be positive")
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getCurrentUserFromRequest(request);
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const validation = await validateRequestBody(request, PlaceTileSchema);
    if (!validation.success)
      return validation.response;
    
    const { x, y, frameId } = validation.data;

    const frame = await prisma.frame.findUnique({
      where: { id: frameId }
    });

    if (!frame) {
      return new Response(JSON.stringify({ error: "Frame not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (frame.isPending) {
      return new Response(JSON.stringify({ error: "Cannot place tiles on pending frames" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (frame.ownerId !== user.id) {
      return new Response(JSON.stringify({ error: "You can only place tiles on your own frames" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if there's enough approved time for another tile (1 hour = 3600 seconds per tile)
    const requiredTime = (frame.placedTiles + 1) * 3600;
    if (!frame.approvedTime || frame.approvedTime - requiredTime < 0) {
      return new Response(JSON.stringify({ 
        error: "Insufficient approved time to place another tile",
        currentTime: frame.approvedTime || 0,
        requiredTime,
        placedTiles: frame.placedTiles
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Check if tile position is already occupied
    const existingTile = await prisma.tile.findUnique({
      where: { x_y: { x, y } }
    });

    if (existingTile) {
      return new Response(JSON.stringify({ error: "Position already occupied" }), {
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create the tile and increment placedTiles counter
    const [tile, updatedFrame] = await prisma.$transaction([
      prisma.tile.create({
        data: {
          x,
          y,
          frameId
        }
      }),
      prisma.frame.update({
        where: { id: frameId },
        data: {
          placedTiles: frame.placedTiles + 1
        }
      })
    ]);

    return new Response(JSON.stringify({
      success: true,
      tile: {
        x: tile.x,
        y: tile.y,
        frameId: tile.frameId,
        placedAt: tile.placedAt
      },
      frame: {
        placedTiles: updatedFrame.placedTiles,
        remainingTime: (updatedFrame.approvedTime || 0) - (updatedFrame.placedTiles * 3600)
      }
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to place tile"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

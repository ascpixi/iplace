import type { APIRoute } from "astro";

import type { Frame, User } from "../../prisma/generated/client";
import prisma from "../../lib/prisma";
import { jsonResponse } from "../../lib/api-util";
import { getUserFromRequest } from "../../lib/auth";

/**
 * Represents a single tile. Corresponds to `db.Tile`.
 */
export interface ApiTile {
    x: number;
    y: number;
    frame: number;
}

/**
 * Represents a frame, which can have multiple associated `ApiTile`s. Corresponds to `db.Frame`.
 */
export interface ApiFrame {
    id: number;
    author: number;
    url: string;
}

/**
 * Represents a user, which may author multiple `ApiFrame`s. Corresponds to `db.User`.
 */
export interface ApiAuthor {
    id: number;
    name: string;
    pfp: string;
}

/**
 * Represents the JSON schema of the `/api/map` endpoint.
 */
export interface ApiMapResponse {
    tiles: ApiTile[];
    frames: ApiFrame[];
    authors: ApiAuthor[];
}

export const GET: APIRoute = async ({ request }) => {
    const currentUser = await getUserFromRequest(request);

    const tiles = await prisma.tile.findMany({
        where: { 
            frame: {
                isPending: false 
            }
        }
    });

    // Relation processing - we only expose the entities we actually process.
    const frames: Frame[] = [];
    const authors: User[] = [];

    for (const tile of tiles) {
        if (frames.some(x => x.id == tile.frameId))
            continue;

        const frame = await prisma.frame.findFirst({ where: { id: tile.frameId } });
        if (!frame)
            throw new Error(`Possible database integrity error! Tile (${tile.x}, ${tile.y}) refers to the non-existent frame ${tile.frameId}!`);

        frames.push(frame);

        if (authors.some(x => x.id == frame.ownerId))
            continue;

        const author = await prisma.user.findFirst({ where: { id: frame.ownerId }});
        if (!author)
            throw new Error(`Possible database integrity error! Frame ${frame.url} (${frame.id}) is authored by the non-existent user ${frame.ownerId}!`);

        authors.push(author);
    }

    // If we're logged in, also include unreferenced frames that have been created by the author.
    if (currentUser) {
        const userFrames = await prisma.frame.findMany({ where: { ownerId: currentUser.id } });
        for (const frame of userFrames) {
            if (frames.some(x => x.id == frame.id))
                continue;

            frames.push(frame);
        }
    }

    const response: ApiMapResponse = {
        authors: authors.map(x => ({ id: x.id, name: x.name, pfp: x.profilePicture })),
        frames: frames.map(x => ({ id: x.id, author: x.ownerId, url: x.url })),
        tiles: tiles.map(x => ({ x: x.x, y: x.y, frame: x.frameId }))
    };

    return jsonResponse(response);
}
import type { APIRoute } from "astro";

import type { Frame, User, Tile } from "../../prisma/generated/client";
import { getCurrentUserFromRequest } from "../../lib/api-auth";
import prisma from "../../lib/prisma";

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
    pendingTiles: ApiTile[];
}

export const GET: APIRoute = async ({ request }) => {
    const currentUser = await getCurrentUserFromRequest(request);

    const tiles = await prisma.tile.findMany({
        where: { isPending: false }
    });

    let pendingTiles: Tile[] = [];
    if (currentUser) {
        pendingTiles = await prisma.tile.findMany({
            where: {
                isPending: true,
                frame: {
                    ownerId: currentUser.id
                }
            }
        });
    }

    // Relation processing - we only expose the entities we actually process.
    const frames: Frame[] = [];
    const authors: User[] = [];

    for (const tile of [tiles, pendingTiles].flat()) {
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

    const response: ApiMapResponse = {
        authors: authors.map(x => ({ id: x.id, name: x.name, pfp: x.profilePicture })),
        frames: frames.map(x => ({ id: x.id, author: x.ownerId, url: x.url })),
        tiles: tiles.map(x => ({ x: x.x, y: x.y, frame: x.frameId })),
        pendingTiles: pendingTiles.map(x => ({ x: x.x, y: x.y, frame: x.frameId }))
    };

    return new Response(JSON.stringify(response));
}
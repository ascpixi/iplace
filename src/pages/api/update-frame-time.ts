import type { APIRoute } from "astro";
import { z } from "zod";
import { validateRequestBody, jsonError, jsonResponse } from "../../lib/api-util";
import { getUserFromRequest, notAuthedResponse } from "../../lib/auth";
import prisma from "../../lib/prisma";

const UpdateFrameTimeSchema = z.object({
    frameId: z.number().int().positive("Frame ID must be a positive integer")
});

async function updateAirtableRecord(airtableId: string): Promise<void> {
    const airtableApiKey = import.meta.env.AIRTABLE_API_KEY;
    const airtableBaseId = import.meta.env.AIRTABLE_BASE_ID;
    const airtableTableId = import.meta.env.AIRTABLE_TABLE_ID;
    
    if (!airtableApiKey || !airtableBaseId || !airtableTableId) {
        throw new Error("Airtable API credentials not configured");
    }

    const response = await fetch(`https://api.airtable.com/v0/${airtableBaseId}/${airtableTableId}/${airtableId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${airtableApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                'Approve': false
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update Airtable record: ${error}`);
    }
}

export const POST: APIRoute = async ({ request }) => {
    const validation = await validateRequestBody(request, UpdateFrameTimeSchema);
    if (!validation.success)
        return validation.response;

    const { frameId } = validation.data;

    const currentUser = await getUserFromRequest(request);
    if (!currentUser) {
        return notAuthedResponse();
    }

    const frame = await prisma.frame.findFirst({
        where: { 
            id: frameId,
            ownerId: currentUser.id 
        }
    });

    if (!frame) {
        return jsonError(404, "Frame not found or not owned by current user");
    }

    if (frame.isPending) {
        return jsonError(400, "Frame is already pending approval");
    }

    try {
        // Update Airtable record first
        await updateAirtableRecord(frame.airtableId);

        // Then update the frame status to pending
        const updatedFrame = await prisma.frame.update({
            where: { id: frameId },
            data: {
                isPending: true
            }
        });

        return jsonResponse({
            success: true,
            message: "Frame has been sent back for review. You will be able to place tiles once it's approved with updated time.",
            frame: {
                id: updatedFrame.id,
                isPending: updatedFrame.isPending
            }
        });
    } catch (error) {
        console.error("Error updating frame time:", error);
        return jsonError(500, "Failed to update frame time");
    }
};

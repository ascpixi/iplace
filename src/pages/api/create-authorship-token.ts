import type { APIRoute } from "astro";
import { createAuthorshipToken, getUserFromRequest } from "../../lib/auth";

export const POST: APIRoute = async ({ request }) => {
    try {
        const user = await getUserFromRequest(request);
        
        if (!user) {
            return new Response(JSON.stringify({ error: "Not authenticated" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const verificationToken = createAuthorshipToken(user.slackId);

        return new Response(JSON.stringify({
            token: verificationToken,
            slackId: user.slackId,
            expiresIn: "12h"
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }
    catch (error) {
        return new Response(
            JSON.stringify(
                {
                    error: error instanceof Error ? error.message : "Internal server error"
                }
            ),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
};

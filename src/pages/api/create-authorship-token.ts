import type { APIRoute } from "astro";
import { createAuthorshipToken, getUserFromRequest, notAuthedResponse } from "../../lib/auth";
import { jsonResponse } from "../../lib/api-util";

export const POST: APIRoute = async ({ request }) => {
    const user = await getUserFromRequest(request);
    if (!user)
        return notAuthedResponse();

    const verificationToken = createAuthorshipToken(user.slackId);

    return jsonResponse({
        token: verificationToken,
        slackId: user.slackId,
        expiresIn: "12h"
    });
};

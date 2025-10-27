import type { APIRoute } from "astro";
import prisma from "../../lib/prisma";
import { createSession } from "../../lib/auth";
import { BEGIN_DATE } from "../../config";

export const GET: APIRoute = async (req) => {
    const code = req.url.searchParams.get("code");
    if (!code)
        return req.redirect("/?error=missing-code");

    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: import.meta.env.PUBLIC_SLACK_CLIENT_ID,
            client_secret: import.meta.env.SLACK_CLIENT_SECRET,
            code: code,
            redirect_uri: `${req.request.headers.get("Origin") ?? req.url.origin}/api/slack-callback`
        }),
    }).then(x => x.json());

    if (!tokenResponse.ok) {
        console.error("(/api/slack-callback) Slack authentication failed!", tokenResponse);
        return req.redirect("/?error=token-error");
    }

    const userResponse = await fetch("https://slack.com/api/users.identity", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${tokenResponse.authed_user.access_token}`,
        },
    }).then(x => x.json());

    if (!userResponse.ok) {
        console.error("(/api/slack-callback) Failed to fetch user identity!", userResponse);
        return req.redirect("/?error=user-error");
    }

    const slackUser = userResponse.user;
    const slackId = slackUser.id;
    const name = slackUser.name;
    const profilePicture = slackUser.image_512 || slackUser.image_192 || slackUser.image_72 || "PLACEHOLDER";

    if (new Date() < new Date(BEGIN_DATE)) {
        return new Response("Sorry, the event hasn't started yet!");
    }

    let user = await prisma.user.findUnique({
        where: { slackId }
    });

    if (!user) {
        user = await prisma.user.create({
            data: {
                slackId,
                name,
                profilePicture,
            },
        });
        console.log("(/api/slack-callback) New user created:", user.id);
    } else {
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                name,
                profilePicture,
            },
        });
        console.log("(/api/slack-callback) Existing user updated:", user.id);
    }

    const sessionId = await createSession(user.id);
    console.log("(/api/slack-callback) User session created:", user.id);

    const response = req.redirect("/");
    response.headers.set("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`); // 30 days
    return response;
}
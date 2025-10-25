import type { APIRoute } from "astro";
import prisma from "../../lib/prisma";
import { createSession } from "../../lib/auth";

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
        console.error("(error) Slack authentication failed!", tokenResponse);
        return req.redirect("/?error=token-error");
    }

    const userResponse = await fetch("https://slack.com/api/users.identity", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${tokenResponse.authed_user.access_token}`,
        },
    }).then(x => x.json());

    if (!userResponse.ok) {
        console.error("(error) Failed to fetch user identity!", userResponse);
        return req.redirect("/?error=user-error");
    }

    const slackUser = userResponse.user;
    const slackId = slackUser.id;
    const name = slackUser.name;
    const profilePicture = slackUser.image_512 || slackUser.image_192 || slackUser.image_72;

    // Find or create user
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
        console.log("(ok) New user created:", user.id);
    } else {
        // Update user info in case it changed
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                name,
                profilePicture,
            },
        });
        console.log("(ok) Existing user updated:", user.id);
    }

    // Create session
    const sessionId = await createSession(user.id);
    console.log("(ok) User session created:", user.id);

    // Set session cookie and redirect to home
    const response = req.redirect("/");
    response.headers.set("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`); // 30 days
    return response;
}
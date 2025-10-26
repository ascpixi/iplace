import type { APIRoute } from "astro";
import { getUserFromRequest, notAuthedResponse } from "../../lib/auth";
import { Hackatime } from "../../hackatime";
import { BEGIN_DATE } from "../../config";
import { jsonResponse } from "../../lib/api-util";

const hackatime = new Hackatime(import.meta.env.HACKATIME_ADMIN_KEY);

export interface ApiHackatimeProjectsResponse {
    projects: ApiHackatimeProject[];
}

interface ApiHackatimeProject {
    name: string;
    seconds: number;
}

export const POST: APIRoute = async ({ request }) => {
    const user = await getUserFromRequest(request);
    if (!user)
        return notAuthedResponse();

    const allProjects = await hackatime.getProjectsFor(user.slackId);

    const response: ApiHackatimeProjectsResponse = {
        projects: allProjects
            .filter(x => new Date(x.last_heartbeat) >= BEGIN_DATE)
            .filter(x => x.total_seconds > 60/*min*/ * 60/*sec*/)
            .filter(x => x.total_heartbeats > 0)
            .map(x => (
                {
                    name: x.name,
                    seconds: x.total_seconds
                } satisfies ApiHackatimeProject
            ))
    };

    return jsonResponse(response);
};

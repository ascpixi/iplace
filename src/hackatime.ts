export interface HackatimeProjectsResponse {
  projects: HackatimeProject[];
}

export interface HackatimeProject {
  name: string;
  total_seconds: number;
  languages: string[];
  repo_url: string | null;
  total_heartbeats: number;
  first_heartbeat: string; // ISO 8601 timestamp
  last_heartbeat: string;  // ISO 8601 timestamp
}

export class Hackatime {
    private key: string;

    constructor (key: string) {
        this.key = key;
    }

    async getProjectsFor(username: string): Promise<HackatimeProject[]> {
        const res = await fetch(`https://hackatime.hackclub.com/api/v1/users/${username}/projects/details`, {
            method: "GET",
            headers: new Headers({
                "User-Agent": "iplace/1.0.0",
                "Authorization": `Bearer ${this.key}`
            })
        });

        if (!res.ok) {
            console.error(`(error) /v1/users/${username}/projects/details failed!`, await res.text(), res);
            throw new Error(`Hackatime error: HTTP ${res.status}`)
        }

        const data: HackatimeProjectsResponse = await res.json();
        return data.projects;
    }
}

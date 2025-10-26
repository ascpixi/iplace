//@ts-check
"use strict";

// This is a development script used to simulate internal API calls made from Airtable.
// You can use this *without* the need to submit anything from Fillout - just obtain the
// query param string (logged in the console), pass it into this script, and refresh.

import * as inquirer from "@inquirer/prompts";
import dotenv from "dotenv";

dotenv.config();

(async () => {
    /** @type {string} */ let url;
    /** @type {string} */ let authorshipToken;
    /** @type {string} */ let projectNames;

    if (!("INTERNAL_SECRET_TOKEN" in process.env) || !process.env.INTERNAL_SECRET_TOKEN) {
        console.error("You don't have an INTERNAL_SECRET_TOKEN environment variable defined.")
        return;
    }

    url = await inquirer.input({ message: "URL" });
    if (await inquirer.confirm({ message: "Use query params as input?" })) {
        const qp = await inquirer.input({ message: "Form query parameters "});
        const query = new URLSearchParams(qp);

        const atk = query.get("atk");
        const hkp = query.get("hkp");

        if (!atk || !hkp) {
            console.error("Your query parameters are invalid - make sure they contain both 'atk' and 'hkp'");
            return;
        }

        authorshipToken = atk;
        projectNames = hkp;
    }
    else {
        authorshipToken = await inquirer.input({ message: "Authorship token" });
        projectNames = await inquirer.input({ message: "Project names" });
    }

    const res = await fetch(`http://localhost:4321/api/internal/create-frame`, {
        method: "POST",
        body: JSON.stringify({
            url: url,
            authorshipToken: authorshipToken,
            projectNames: projectNames,
            secret: process.env.INTERNAL_SECRET_TOKEN
        })
    });

    console.log(res);
})();

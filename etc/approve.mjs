//@ts-check
"use strict";

// This is a development script used to simulate the internal API call made from Airtable
// when an <iplace> project is approved.

import * as inquirer from "@inquirer/prompts";
import dotenv from "dotenv";

dotenv.config();

(async () => {
    if (!("INTERNAL_SECRET_TOKEN" in process.env) || !process.env.INTERNAL_SECRET_TOKEN) {
        console.error("You don't have an INTERNAL_SECRET_TOKEN environment variable defined.")
        return;
    }

    const url = await inquirer.input({ message: "URL" });

    const res = await fetch(`http://localhost:4321/api/internal/approve-frame`, {
        method: "POST",
        body: JSON.stringify({
            url,
            secret: process.env.INTERNAL_SECRET_TOKEN
        })
    });

    console.log(res);
})();

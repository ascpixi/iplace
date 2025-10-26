# Hack Club's `<iplace>`
`<iplace>` is a public canvas of webpages embedded inside `<iframe>` elements, to which all teenagers can contribute! See it in action at [`iplace.hackclub.com`](https://iplace.hackclub.com)!

## Deploying
Use the `Dockerfile` to deploy `<iplace>`. Do note that the service you'll be using for frame creation forms needs to sync with the server via the `/api/internal` endpoints. See the [`etc/add-frame`](./etc/add-frame.mjs) and [`etc/approve.mjs`](./etc/approve.mjs) scripts to see how it's done.

You'll also need a PostgreSQL database to use with Prisma. The Dockerfile will automatically set it up.

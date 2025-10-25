import { PrismaClient } from "../prisma/generated/client";
// import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient({
  datasourceUrl: import.meta.env.DATABASE_URL,
});

export default prisma;
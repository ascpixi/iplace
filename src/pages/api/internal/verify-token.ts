import type { APIRoute } from "astro";
import { z } from "zod";
import { verifyVerificationToken } from "../../../lib/auth";
import { validateInternalSecret } from "../../../lib/api-auth";
import { validateRequestBody, InternalSecretSchema } from "../../../lib/api-schemas";

const VerifyTokenSchema = InternalSecretSchema.extend({
  token: z.string().min(1, "Token is required")
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const validation = await validateRequestBody(request, VerifyTokenSchema);
    if (!validation.success) return validation.response;
    
    const { token, secret } = validation.data;

    const authError = validateInternalSecret(secret);
    if (authError) return authError;

    const payload = verifyVerificationToken(token);
    
    return new Response(JSON.stringify({ 
      valid: true, 
      slackId: payload.slackId,
      expiresAt: payload.exp * 1000 // Convert to milliseconds
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      valid: false, 
      error: error instanceof Error ? error.message : "Invalid token" 
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
};

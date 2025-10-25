import { z } from "zod";

/**
 * Schema for internal API endpoints that require secret authentication
 */
export const InternalSecretSchema = z.object({
  secret: z.string().min(1, "Secret is required")
});



/**
 * Utility function to validate request body with a Zod schema
 * Returns parsed data on success, or error response on failure
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: Response }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        response: new Response(JSON.stringify({
          error: "Validation failed",
          details: error.issues.map(err => ({
            path: err.path.join("."),
            message: err.message
          }))
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        })
      };
    }
    
    return {
      success: false,
      response: new Response(JSON.stringify({
        error: "Invalid JSON body"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      })
    };
  }
}

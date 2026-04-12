import { z, ZodSchema, ZodError } from "npm:zod@3";
import { fail } from "./response.ts";

/**
 * Validate the JSON body of a request against a Zod schema.
 * Returns `{ data }` on success or `{ error: Response }` on failure.
 */
export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T; error?: never } | { data?: never; error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: fail("Invalid JSON body", 400, null, req) };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return {
      error: fail("Validation failed", 400, { issues }, req),
    };
  }

  return { data: result.data };
}

export { z };

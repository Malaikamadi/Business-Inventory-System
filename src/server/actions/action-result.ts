import { z } from "zod";
import type { ActionResult } from "@/types";
import { isDomainError } from "@/server/services/errors";

/**
 * Translates thrown errors into a result the client can render.
 *
 * Domain errors carry messages written for end users and are passed through.
 * Anything else is a bug or an infrastructure failure: it is logged server-side
 * and replaced with a generic message so internals never reach the browser.
 */
export async function runAction<T>(
  operation: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await operation() };
  } catch (error) {
    if (isDomainError(error)) {
      return { success: false, error: error.message };
    }

    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Invalid input." };
    }

    console.error("[action] unexpected failure", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export function parseOrThrow<S extends z.ZodType>(
  schema: S,
  input: unknown
): z.infer<S> {
  return schema.parse(input);
}

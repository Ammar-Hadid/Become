import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import {
  DirectionError,
  isDirectionWriteConflict,
} from "@/features/direction/services/direction-mutation.service";
import { getCurrentUser } from "@/lib/auth/queries/current-user.query";
export async function directionUser(request: Request, mutation = false) {
  if (mutation) {
    let sameOrigin = false;
    try {
      const origin = new URL(request.headers.get("origin") ?? "");
      sameOrigin =
        ["http:", "https:"].includes(origin.protocol) &&
        origin.host === new URL(request.url).host;
    } catch {
      /* Reject malformed origins. */
    }
    if (!sameOrigin)
      throw new DirectionError(
        "This request must come from Become.",
        undefined,
        403,
      );
  }
  const user = await getCurrentUser();
  if (!user) throw new DirectionError("Sign in to continue.", undefined, 401);
  return user;
}
export function directionFailure(error: unknown) {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues)
      fieldErrors[issue.path.join(".")] = issue.message;
    return directionResponse(
      { error: error.issues[0]?.message ?? "Check your entries.", fieldErrors },
      { status: 400 },
    );
  }
  if (error instanceof DirectionError)
    return directionResponse(
      {
        error: error.message,
        ...(error.field
          ? { fieldErrors: { [error.field]: error.message } }
          : {}),
      },
      { status: error.status },
    );
  if (
    isDirectionWriteConflict(error) ||
    (error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2002", "P2003", "P2025"].includes(error.code))
  )
    return directionResponse(
      {
        error:
          "This record changed or conflicts with existing history. Your entries are preserved; review and retry.",
      },
      { status: 409 },
    );
  console.error("Direction request failed", error);
  return directionResponse(
    {
      error:
        "Could not complete this request. Your entries are preserved; please retry.",
    },
    { status: 500 },
  );
}
export async function boundedBody(
  request: Request,
  maximum: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length") ?? 0) > maximum)
    throw new DirectionError("This request is too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new DirectionError("This request is too large.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
export async function directionJson(request: Request, maximum = 256000) {
  const bytes = await boundedBody(request, maximum);
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new DirectionError(
      "This form could not be read. Reopen it and retry.",
    );
  }
}

export function directionResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store");
  return Response.json(body, { ...init, headers });
}

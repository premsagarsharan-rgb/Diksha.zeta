// lib/apiResponse.js

export function success(data = {}, status = 200) {
  return Response.json(
    { success: true, ...data, timestamp: new Date().toISOString() },
    { status }
  );
}

export function error(message, status = 500, code = "INTERNAL_ERROR") {
  return Response.json(
    { success: false, error: message, code, timestamp: new Date().toISOString() },
    { status }
  );
}

export function validationError(message) {
  return error(message, 400, "VALIDATION_ERROR");
}

export function notFound(message = "Not found") {
  return error(message, 404, "NOT_FOUND");
}

export function unauthorized(message = "Unauthorized") {
  return error(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden") {
  return error(message, 403, "FORBIDDEN");
}

export function rateLimited(resetIn) {
  return Response.json(
    {
      success: false,
      error: "Too many requests",
      code: "RATE_LIMITED",
      retryAfter: Math.ceil(resetIn / 1000),
      timestamp: new Date().toISOString(),
    },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(resetIn / 1000)) },
    }
  );
}

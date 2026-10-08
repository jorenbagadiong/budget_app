import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function okResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(process.env.NODE_ENV !== 'production' && details ? { details } : {}),
      },
    },
    { status }
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    const formatted = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    return errorResponse('VALIDATION_ERROR', `Invalid input: ${formatted}`, 400, error.issues);
  }

  const errMessage = error instanceof Error ? error.message : String(error);
  if (errMessage === 'UNAUTHORIZED') {
    return errorResponse('UNAUTHORIZED', 'You must be signed in to access this resource.', 401);
  }

  if (errMessage.includes('not found') || errMessage.includes('Not found')) {
    return errorResponse('NOT_FOUND', 'The requested resource was not found.', 404);
  }

  if (errMessage.includes('Unauthorized') || errMessage.includes('unauthorized')) {
    return errorResponse('FORBIDDEN', 'You do not have permission to access this resource.', 403);
  }

  // Safe generic server error (no internal stack trace exposed to client)
  console.error('API Error occurred:', error);
  return errorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred. Please try again.', 500);
}

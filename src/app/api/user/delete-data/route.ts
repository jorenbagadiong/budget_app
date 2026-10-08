import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { okResponse, handleRouteError, errorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const body = await request.json();

    // Requires explicit confirmation string to prevent accidental deletion
    if (body.confirmation !== 'DELETE_ALL_MY_DATA') {
      return errorResponse(
        'CONFIRMATION_REQUIRED',
        'You must provide confirmation: "DELETE_ALL_MY_DATA" to proceed with irreversible deletion.',
        400
      );
    }

    const storage = getStorage();
    const result = await storage.purgeAllUserData(userId);

    return okResponse({
      message: 'All your financial data has been permanently deleted.',
      details: result.deleted,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

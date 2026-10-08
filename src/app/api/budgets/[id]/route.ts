import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuthUser();
    const { id } = await params;

    const storage = getStorage();
    const result = await storage.deleteBudget(userId, id);

    return okResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

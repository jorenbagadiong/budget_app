import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { AccountUpdateSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuthUser();
    const { id } = await params;
    const body = await request.json();

    const validated = AccountUpdateSchema.parse({ ...body, accountId: id });
    const storage = getStorage();
    const updated = await storage.updateAccount(userId, id, validated);

    return okResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuthUser();
    const { id } = await params;

    const storage = getStorage();
    const result = await storage.deleteAccount(userId, id);

    return okResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

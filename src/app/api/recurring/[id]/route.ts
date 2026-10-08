import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { RecurringCreateSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuthUser();
    const { id } = await params;
    const body = await request.json();

    const partialSchema = RecurringCreateSchema.partial();
    const validated = partialSchema.parse(body);

    const storage = getStorage();
    const updated = await storage.updateRecurring(userId, id, validated);

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
    const result = await storage.deleteRecurring(userId, id);

    return okResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

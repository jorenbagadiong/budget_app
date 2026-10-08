import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { CategoryUpdateSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuthUser();
    const { id } = await params;
    const body = await request.json();

    const validated = CategoryUpdateSchema.parse({ ...body, categoryId: id });
    const storage = getStorage();
    const updated = await storage.updateCategory(userId, id, validated);

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
    const result = await storage.deleteCategory(userId, id);

    return okResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

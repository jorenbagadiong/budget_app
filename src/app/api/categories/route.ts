import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { CategoryCreateSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const { userId } = await requireAuthUser();
    const storage = getStorage();
    const categories = await storage.listCategories(userId);

    return okResponse(categories);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const body = await request.json();

    const validated = CategoryCreateSchema.parse(body);
    const storage = getStorage();
    const category = await storage.createCategory(userId, validated);

    return okResponse(category, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

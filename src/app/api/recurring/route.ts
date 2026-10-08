import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { RecurringCreateSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const { userId } = await requireAuthUser();
    const storage = getStorage();
    const recurring = await storage.listRecurring(userId);

    return okResponse(recurring);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const body = await request.json();

    const validated = RecurringCreateSchema.parse(body);
    const storage = getStorage();
    const recurring = await storage.createRecurring(userId, validated);

    return okResponse(recurring, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

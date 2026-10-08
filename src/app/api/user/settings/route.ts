import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { UserSettingsUpdateSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const { userId, email, name } = await requireAuthUser();
    const storage = getStorage();
    const user = await storage.getOrCreateUser(userId, email, name);

    return okResponse(user);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const body = await request.json();

    const validated = UserSettingsUpdateSchema.parse(body);
    const storage = getStorage();
    const updated = await storage.updateUserSettings(userId, validated);

    return okResponse(updated);
  } catch (error) {
    return handleRouteError(error);
  }
}

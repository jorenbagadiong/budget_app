import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { AccountCreateSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function GET() {
  try {
    const { userId } = await requireAuthUser();
    const storage = getStorage();
    const accounts = await storage.listAccounts(userId);

    return okResponse(accounts);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const body = await request.json();

    const validated = AccountCreateSchema.parse(body);
    const storage = getStorage();
    const account = await storage.createAccount(userId, validated);

    return okResponse(account, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { TransactionCreateSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const { searchParams } = new URL(request.url);

    const filters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      accountId: searchParams.get('accountId') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      type: searchParams.get('type') || undefined,
    };

    const storage = getStorage();
    const transactions = await storage.listTransactions(userId, filters);

    return okResponse(transactions);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const body = await request.json();

    // Security: Validate with Zod; any client-provided userId is discarded
    const validated = TransactionCreateSchema.parse(body);

    const storage = getStorage();
    const transaction = await storage.createTransaction(userId, validated);

    return okResponse(transaction, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

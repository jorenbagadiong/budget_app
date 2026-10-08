import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { BudgetCopySchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const body = await request.json();

    const validated = BudgetCopySchema.parse(body);
    const storage = getStorage();
    const result = await storage.copyBudgets(
      userId,
      validated.fromYear,
      validated.fromMonth,
      validated.toYear,
      validated.toMonth
    );

    return okResponse(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

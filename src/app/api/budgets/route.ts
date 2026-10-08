import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { BudgetUpsertSchema } from '@/validations';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const { searchParams } = new URL(request.url);

    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;

    const storage = getStorage();
    const budgets = await storage.listBudgets(userId, { year, month });

    return okResponse(budgets);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const body = await request.json();

    const validated = BudgetUpsertSchema.parse(body);
    const storage = getStorage();
    const budget = await storage.upsertBudget(userId, {
      period: validated.period,
      year: validated.year,
      month: validated.month ?? null,
      categoryId: validated.categoryId,
      amountMinor: validated.amountMinor,
      currency: validated.currency,
    });

    return okResponse(budget, 201);
  } catch (error) {
    return handleRouteError(error);
  }
}

import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);

    const storage = getStorage();
    const summary = await storage.getDashboardSummary(userId, year, month);

    return okResponse(summary);
  } catch (error) {
    return handleRouteError(error);
  }
}

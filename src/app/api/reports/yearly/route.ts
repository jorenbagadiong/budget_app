import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { getStorage } from '@/lib/db';
import { addMinor, calculateSavings, calculatePercentage } from '@/lib/math/money';
import { okResponse, handleRouteError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuthUser();
    const { searchParams } = new URL(request.url);

    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const storage = getStorage();

    const [allTransactions, categories, user] = await Promise.all([
      storage.listTransactions(userId),
      storage.listCategories(userId),
      storage.getOrCreateUser(userId, '', ''),
    ]);

    const catMap = new Map(categories.map((c) => [c.categoryId, c]));
    const yearPrefix = `${year}-`;

    const yearTransactions = allTransactions.filter((tx) => tx.transactionDate.startsWith(yearPrefix));

    let totalIncomeMinor = 0;
    let totalExpenseMinor = 0;
    const catSpendMap = new Map<string, number>();
    const monthlyBreakdown: Array<{ month: number; label: string; incomeMinor: number; expenseMinor: number; savingsMinor: number }> = [];

    // Monthly breakdown for all 12 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 1; m <= 12; m++) {
      const mPrefix = `${year}-${String(m).padStart(2, '0')}`;
      let mIncome = 0;
      let mExpense = 0;

      for (const tx of yearTransactions) {
        if (tx.transactionDate.startsWith(mPrefix)) {
          if (tx.type === 'income') mIncome = addMinor(mIncome, tx.amountMinor);
          if (tx.type === 'expense') mExpense = addMinor(mExpense, tx.amountMinor);
        }
      }

      monthlyBreakdown.push({
        month: m,
        label: `${monthNames[m - 1]} ${year}`,
        incomeMinor: mIncome,
        expenseMinor: mExpense,
        savingsMinor: calculateSavings(mIncome, mExpense),
      });
    }

    for (const tx of yearTransactions) {
      if (tx.type === 'income') {
        totalIncomeMinor = addMinor(totalIncomeMinor, tx.amountMinor);
      } else if (tx.type === 'expense') {
        totalExpenseMinor = addMinor(totalExpenseMinor, tx.amountMinor);
        const curr = catSpendMap.get(tx.categoryId) || 0;
        catSpendMap.set(tx.categoryId, addMinor(curr, tx.amountMinor));
      }
    }

    const categoryBreakdown = Array.from(catSpendMap.entries()).map(([catId, spentMinor]) => {
      const cat = catMap.get(catId);
      return {
        categoryId: catId,
        categoryName: cat?.name || 'Uncategorized',
        color: cat?.color || '#6B7280',
        spentMinor,
        percentage: calculatePercentage(spentMinor, totalExpenseMinor),
      };
    }).sort((a, b) => b.spentMinor - a.spentMinor);

    return okResponse({
      year,
      currency: user.currency || 'PHP',
      totalIncomeMinor,
      totalExpenseMinor,
      netSavingsMinor: calculateSavings(totalIncomeMinor, totalExpenseMinor),
      monthlyBreakdown,
      categoryBreakdown,
      transactionCount: yearTransactions.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

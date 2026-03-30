import { useEffect } from 'react';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export default function BudgetNotificationChecker({ budgets, records, user }) {
  useEffect(() => {
    if (!budgets || budgets.length === 0 || !records) return;

    const checkBudgets = () => {
      budgets.forEach(budget => {
        const now = new Date();
        let startDate, endDate;

        if (budget.period === 'monthly') {
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
        } else {
          startDate = startOfYear(now);
          endDate = endOfYear(now);
        }

        const spending = records
          .filter(r =>
            r.type === 'expense' &&
            r.category === budget.category &&
            new Date(r.date) >= startDate &&
            new Date(r.date) <= endDate
          )
          .reduce((sum, r) => sum + r.amount, 0);

        const percentage = (spending / budget.amount) * 100;
        const isOverBudget = spending > budget.amount;
        const isNearLimit = percentage >= budget.alert_threshold;

        const notificationKey = `budget-alert-${budget.id}-${now.getMonth()}`;
        const lastShown = localStorage.getItem(notificationKey);
        const shouldNotify = !lastShown || Date.now() - parseInt(lastShown) > 3600000;

        if (isOverBudget && shouldNotify) {
          toast.error(`🚨 Anggaran "${budget.name}" terlampaui!`, {
            description: `${budget.category}: Rp ${spending.toLocaleString('id-ID')} / Rp ${budget.amount.toLocaleString('id-ID')} (${percentage.toFixed(0)}%)`,
            duration: 8000
          });
          localStorage.setItem(notificationKey, Date.now().toString());
        } else if (isNearLimit && !isOverBudget && shouldNotify) {
          toast.warning(`⚠️ Anggaran "${budget.name}" hampir habis!`, {
            description: `${budget.category}: ${percentage.toFixed(0)}% terpakai - Sisa Rp ${(budget.amount - spending).toLocaleString('id-ID')}`,
            duration: 6000
          });
          localStorage.setItem(notificationKey, Date.now().toString());
        }
      });
    };

    const timer = setTimeout(checkBudgets, 1000);
    return () => clearTimeout(timer);
  }, [budgets, records, user]);

  return null;
}
// Utility functions for formatting data

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatPercent(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return "0%";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending_psm: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    pending_lead_psm: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    pending_finance: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    committed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  };
  return colors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_psm: "Pending PSM",
    pending_lead_psm: "Pending Lead PSM",
    pending_finance: "Pending Finance",
    approved: "Approved",
    rejected: "Rejected",
    paid: "Paid",
    committed: "Committed",
    one_time: "One-time",
    recurring: "Recurring",
  };
  return labels[status] || status;
}

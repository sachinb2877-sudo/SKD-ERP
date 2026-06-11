export const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * PDF-safe currency formatter.
 * jsPDF's default Helvetica font cannot render the ₹ symbol,
 * so we use "Rs." instead for clean PDF output.
 */
export const formatINR_PDF = (amount) => {
  const num = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}Rs. ${num}`;
};

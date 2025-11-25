// Format currency values
export const formatCurrency = (
  amount: number,
  currency: string = 'INR',
  locale: string = 'en-IN',
): string => {
  if (isNaN(amount)) return '₹0.00';

  // Use Indian currency format
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format number with commas
export const formatNumber = (num: number): string => {
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

// Format percentage
export const formatPercentage = (value: number, decimals: number = 2): string => {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format Indian phone numbers
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }

  return phone; // Return original if doesn't match expected format
};

// Truncate text with ellipsis
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength) + '...';
};

// Format date
export const formatDate = (
  date: string | Date,
  format: 'short' | 'long' | 'relative' = 'short',
): string => {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-IN');
    case 'long':
      return dateObj.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'relative':
      // This would need date-fns or similar library
      return dateObj.toLocaleDateString('en-IN');
    default:
      return dateObj.toLocaleDateString('en-IN');
  }
};

import { AISuggestedOperation } from '../types/diff';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

export const createDebouncedValidator = (
  validateFn: (operations: AISuggestedOperation[]) => Promise<void>,
  delay: number = 500
) => {
  return debounce(validateFn, delay);
}; 
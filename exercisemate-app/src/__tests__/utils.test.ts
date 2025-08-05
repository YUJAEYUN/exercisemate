import {
  cn,
  getCurrentWeekCycle,
  getWeekCycleForDate,
  formatDate,
  formatDateKorean,
  getTodayString,
  calculateWeeklyProgress,
  generateInviteCode,
  isValidEmail,
  getExerciseTypeLabel,
  getCharacterLabel,
  getProgressColor,
  getProgressBgColor,
  getOrdinalKorean,
  shuffleArray,
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage
} from '@/lib/utils';

describe('Utils Functions', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
    });
  });

  describe('getCurrentWeekCycle', () => {
    it('should return current week cycle', () => {
      const testDate = new Date('2024-01-10'); // Wednesday
      const cycle = getCurrentWeekCycle(testDate);
      
      expect(cycle.start.getDay()).toBe(1); // Monday
      expect(cycle.weekString).toBe('2024-01-08');
    });
  });

  describe('getWeekCycleForDate', () => {
    it('should return week cycle for specific date', () => {
      const testDate = new Date('2024-01-15'); // Monday
      const cycle = getWeekCycleForDate(testDate);
      
      expect(cycle.start.getDay()).toBe(1); // Monday
      expect(cycle.weekString).toBe('2024-01-15');
    });
  });

  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const testDate = new Date('2024-01-15');
      expect(formatDate(testDate)).toBe('2024-01-15');
    });
  });

  describe('formatDateKorean', () => {
    it('should format date in Korean', () => {
      const testDate = new Date('2024-01-15');
      const formatted = formatDateKorean(testDate);
      expect(formatted).toContain('1월');
      expect(formatted).toContain('15일');
    });
  });

  describe('getTodayString', () => {
    it('should return today as string', () => {
      const today = getTodayString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('calculateWeeklyProgress', () => {
    it('should calculate progress correctly', () => {
      expect(calculateWeeklyProgress(3, 5)).toBe(60);
      expect(calculateWeeklyProgress(5, 5)).toBe(100);
      expect(calculateWeeklyProgress(7, 5)).toBe(100); // Max 100%
      expect(calculateWeeklyProgress(0, 0)).toBe(0);
    });
  });

  describe('generateInviteCode', () => {
    it('should generate 6-character code', () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should generate unique codes', () => {
      const code1 = generateInviteCode();
      const code2 = generateInviteCode();
      expect(code1).not.toBe(code2);
    });
  });

  describe('isValidEmail', () => {
    it('should validate email correctly', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.kr')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('getExerciseTypeLabel', () => {
    it('should return correct Korean labels', () => {
      expect(getExerciseTypeLabel('upper')).toBe('상체');
      expect(getExerciseTypeLabel('lower')).toBe('하체');
      expect(getExerciseTypeLabel('cardio')).toBe('유산소');
    });
  });

  describe('getCharacterLabel', () => {
    it('should return correct Korean labels', () => {
      expect(getCharacterLabel('cat')).toBe('고양이');
      expect(getCharacterLabel('dog')).toBe('강아지');
    });
  });

  describe('getProgressColor', () => {
    it('should return correct color classes', () => {
      expect(getProgressColor(100)).toBe('text-green-600');
      expect(getProgressColor(80)).toBe('text-blue-600');
      expect(getProgressColor(50)).toBe('text-yellow-600');
      expect(getProgressColor(20)).toBe('text-red-600');
    });
  });

  describe('getProgressBgColor', () => {
    it('should return correct background color classes', () => {
      expect(getProgressBgColor(100)).toBe('bg-green-100');
      expect(getProgressBgColor(80)).toBe('bg-blue-100');
      expect(getProgressBgColor(50)).toBe('bg-yellow-100');
      expect(getProgressBgColor(20)).toBe('bg-red-100');
    });
  });

  describe('getOrdinalKorean', () => {
    it('should return correct Korean ordinals', () => {
      expect(getOrdinalKorean(1)).toBe('첫 번째');
      expect(getOrdinalKorean(2)).toBe('두 번째');
      expect(getOrdinalKorean(3)).toBe('세 번째');
      expect(getOrdinalKorean(8)).toBe('8번째');
    });
  });

  describe('shuffleArray', () => {
    it('should shuffle array without modifying original', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray(original);
      
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled).toEqual(expect.arrayContaining(original));
      expect(original).toEqual([1, 2, 3, 4, 5]); // Original unchanged
    });
  });

  describe('localStorage functions', () => {
    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });
    });

    it('should set localStorage correctly', () => {
      setLocalStorage('test', { value: 'test' });
      expect(localStorage.setItem).toHaveBeenCalledWith('test', '{"value":"test"}');
    });

    it('should get localStorage correctly', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('{"value":"test"}');
      const result = getLocalStorage('test', { value: 'default' });
      expect(result).toEqual({ value: 'test' });
    });

    it('should return default value when localStorage fails', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      const result = getLocalStorage('test', { value: 'default' });
      expect(result).toEqual({ value: 'default' });
    });

    it('should remove localStorage correctly', () => {
      removeLocalStorage('test');
      expect(localStorage.removeItem).toHaveBeenCalledWith('test');
    });
  });
});

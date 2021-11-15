import * as commonValidationService from '../../services/common-validation.service';

describe('Common Validation Service', () => {
  describe('queryToNumber', () => {
    const { queryToNumber } = commonValidationService;

    it('should return the number 1 for the numerical string "1"', () => {
      expect(queryToNumber('1')).toBe(1);
    });

    it('should return the number -1 for the numerical string "-1"', () => {
      expect(queryToNumber('-1')).toBe(-1);
    });

    it('should return the NaN for the non-numerical string "a"', () => {
      const result: number = queryToNumber('a');
      expect(Number.isNaN(result)).toBeTruthy();
    });
  });

  describe('isANumber', () => {
    const { isANumber } = commonValidationService;

    it('should be truthy when the string represents the number "1"', () => {
      expect(isANumber('1')).toBeTruthy();
    });

    it('should be truthy when the string represents the negative number "-1"', () => {
      expect(isANumber('-1')).toBeTruthy();
    });

    it('should be falsy when the string is not parsable to a number, like "a"', () => {
      expect(isANumber('a')).toBeFalsy();
    });

    it('should have called "queryToNumber" with the same parameter "1" only once', () => {
      spyOn(commonValidationService, 'queryToNumber');
      isANumber('1');
      expect(commonValidationService.queryToNumber).toHaveBeenCalledOnceWith('1');
    });
  });
});

export const queryToNumber = (query: string): number => parseInt(query, 10);

export const isANumber = (query: string): boolean => {
  return !Number.isNaN(queryToNumber(query));
};

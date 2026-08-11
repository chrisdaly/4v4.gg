export const geometricMean = (arr) => {
  const pos = arr.filter(x => x > 0);
  if (!pos.length) return 0;
  return Math.exp(pos.reduce((sum, x) => sum + Math.log(x), 0) / pos.length);
};

export const stdDev = (arr, mean) => {
  const m = mean ?? geometricMean(arr);
  const pos = arr.filter(x => x > 0);
  if (pos.length < 2) return 0;
  return Math.sqrt(pos.reduce((sum, x) => sum + (x - m) ** 2, 0) / pos.length);
};

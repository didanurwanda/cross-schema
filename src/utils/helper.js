/**
 * Compares two version strings and returns a value indicating their relative
 * order. The algorithm splits the version strings into their component parts
 * and compares them numerically. If a component is missing from one string, it
 * is considered to be 0.
 *
 * @param {string} v1 - The first version string.
 * @param {string} v2 - The second version string.
 * @returns {number} A negative value if v1 is less than v2, a positive value
 *  if v1 is greater than v2, and 0 if they are equal.
 */
function versionCompare(v1, v2) {
  const splitAndPad = (v) => v.split('.').map(Number);

  const a = splitAndPad(v1);
  const b = splitAndPad(v2);

  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const num1 = a[i] || 0;
    const num2 = b[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export { versionCompare };

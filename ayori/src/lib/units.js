// Metric ↔ imperial conversion stubs — to be expanded in Step 5
export const kgToLbs = kg => +(kg * 2.20462).toFixed(1);
export const lbsToKg = lbs => +(lbs / 2.20462).toFixed(1);
export const cmToIn = cm => +(cm / 2.54).toFixed(1);
export const inToCm = inches => +(inches * 2.54).toFixed(1);

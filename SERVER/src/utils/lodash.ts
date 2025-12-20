import _ from "lodash";

// Re-export lodash with proper types
export default _;

// Common lodash functions for convenience
export const {
  cloneDeep,
  debounce,
  throttle,
  isEmpty,
  isEqual,
  merge,
  omit,
  pick,
  uniq,
  uniqBy,
  groupBy,
  keyBy,
  orderBy,
  chunk,
  flatten,
  flattenDeep,
} = _;

export function throttle<T>(time: number, callback: Function, context?: ThisType<T>) {
  let start = 0;
  return function(...args: any[]) {
    const now = Date.now();
    if (now - start >= time) {
      start = now;
      callback.call(context, ...args);
    }
  };
}

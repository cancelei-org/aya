/**
 * デバウンス処理のユーティリティ関数
 * 連続した呼び出しを制限し、最後の呼び出しから指定時間後に実行
 */

/**
 * 関数の実行を遅延させ、連続呼び出しを防ぐ
 * @param func - デバウンスする関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた関数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function debounced(...args: Parameters<T>) {
    // 既存のタイマーをクリア
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    // 新しいタイマーを設定
    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * 即座に実行し、その後の呼び出しをデバウンスする
 * （最初の呼び出しは即座に実行、その後は遅延）
 * @param func - デバウンスする関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた関数
 */
export function debounceLeading<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  let lastCallTime = 0

  return function debounced(...args: Parameters<T>) {
    const now = Date.now()
    
    // 最初の呼び出しか、前回から delay 以上経過していれば即座に実行
    if (now - lastCallTime >= delay) {
      func(...args)
      lastCallTime = now
    } else {
      // 既存のタイマーをクリア
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // 遅延実行を設定
      timeoutId = setTimeout(() => {
        func(...args)
        lastCallTime = Date.now()
        timeoutId = null
      }, delay - (now - lastCallTime))
    }
  }
}

/**
 * Promiseを返すデバウンス関数
 * @param func - デバウンスする非同期関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた非同期関数
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null
  let resolvePromise: ((value: ReturnType<T>) => void) | null = null
  let rejectPromise: ((reason?: any) => void) | null = null

  return function debounced(...args: Parameters<T>): Promise<ReturnType<T>> {
    // 既存のタイマーをクリア
    if (timeoutId) {
      clearTimeout(timeoutId)
      // 前回のPromiseを reject
      if (rejectPromise) {
        rejectPromise(new Error('Debounced'))
      }
    }

    return new Promise<ReturnType<T>>((resolve, reject) => {
      resolvePromise = resolve
      rejectPromise = reject

      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args)
          if (resolvePromise) {
            resolvePromise(result)
          }
        } catch (error) {
          if (rejectPromise) {
            rejectPromise(error)
          }
        } finally {
          timeoutId = null
          resolvePromise = null
          rejectPromise = null
        }
      }, delay)
    })
  }
}

/**
 * キャンセル可能なデバウンス関数
 * @param func - デバウンスする関数
 * @param delay - 遅延時間（ミリ秒）
 * @returns デバウンスされた関数とキャンセル関数
 */
export function debounceCancellable<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): {
  debounced: (...args: Parameters<T>) => void
  cancel: () => void
  flush: () => void
} {
  let timeoutId: NodeJS.Timeout | null = null
  let lastArgs: Parameters<T> | null = null

  const debounced = function (...args: Parameters<T>) {
    lastArgs = args
    
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
      lastArgs = null
    }, delay)
  }

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
      lastArgs = null
    }
  }

  const flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId)
      func(...lastArgs)
      timeoutId = null
      lastArgs = null
    }
  }

  return { debounced, cancel, flush }
}
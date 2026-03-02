/**
 * Language detection utilities for multi-language support
 */

/**
 * Detect the language of the given text
 * @param text - The text to analyze
 * @returns Detected language code ('ja' for Japanese, 'en' for English, 'other' for unknown)
 */
export function detectLanguage(text: string): 'ja' | 'en' | 'other' {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English for empty text
  }

  // Japanese character patterns
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  
  // English-only pattern (letters, numbers, common punctuation)
  const englishOnlyPattern = /^[a-zA-Z0-9\s.,!?'"()\[\]{}\-_:;@#$%^&*+=<>/\\|`~]+$/;
  
  // Check for Japanese characters first (highest priority)
  if (japanesePattern.test(text)) {
    return 'ja';
  }
  
  // Check if text is purely English
  if (englishOnlyPattern.test(text.trim())) {
    return 'en';
  }
  
  // If neither Japanese nor pure English, classify as other
  return 'other';
}

/**
 * Check if the text contains Japanese characters
 * @param text - The text to check
 * @returns true if Japanese characters are found
 */
export function isJapanese(text: string): boolean {
  const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japanesePattern.test(text);
}

/**
 * Check if the text is purely English
 * @param text - The text to check
 * @returns true if text contains only English characters and common punctuation
 */
export function isEnglish(text: string): boolean {
  const englishOnlyPattern = /^[a-zA-Z0-9\s.,!?'"()\[\]{}\-_:;@#$%^&*+=<>/\\|`~]+$/;
  return englishOnlyPattern.test(text.trim());
}

/**
 * Get the primary language from mixed text
 * Useful when text contains multiple languages
 * @param text - The text to analyze
 * @returns Primary language code based on character frequency
 */
export function getPrimaryLanguage(text: string): 'ja' | 'en' | 'other' {
  if (!text) return 'en';
  
  // Count Japanese characters
  const japaneseMatches = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g);
  const japaneseCount = japaneseMatches ? japaneseMatches.length : 0;
  
  // Count English letters
  const englishMatches = text.match(/[a-zA-Z]/g);
  const englishCount = englishMatches ? englishMatches.length : 0;
  
  // If text has significant Japanese content (>10%), consider it Japanese
  const totalAlphaNumeric = japaneseCount + englishCount;
  if (totalAlphaNumeric > 0 && japaneseCount / totalAlphaNumeric > 0.1) {
    return 'ja';
  }
  
  // If mostly English
  if (englishCount > japaneseCount) {
    return 'en';
  }
  
  // Default case
  return japaneseCount > 0 ? 'ja' : 'en';
}

/**
 * Get language display name
 * @param langCode - Language code
 * @returns Display name in the target language
 */
export function getLanguageDisplayName(langCode: 'ja' | 'en' | 'other'): string {
  switch (langCode) {
    case 'ja':
      return '日本語';
    case 'en':
      return 'English';
    default:
      return 'Other';
  }
}
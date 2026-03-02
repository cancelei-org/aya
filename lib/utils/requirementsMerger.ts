/**
 * Simple requirements content merger that preserves original formatting
 */

/**
 * Merges new information into existing requirements document
 * @param currentContent - The current markdown content
 * @param newInfo - New information to add
 * @param sectionHint - Optional hint about which section to add to
 * @param language - Language for markers ('ja' or 'en')
 * @returns Updated markdown content with new information appended
 */
export function mergeRequirementsContent(
  currentContent: string,
  newInfo: string,
  sectionHint?: string,
  language: 'ja' | 'en' = 'en'
): string {
  // If no current content, return new info as is
  if (!currentContent || currentContent.trim() === '') {
    return newInfo;
  }

  // Get current timestamp
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const marker = language === 'ja' ? `✨ 追加 (${timestamp}):` : `✨ Added (${timestamp}):`;

  // Split content into lines for easier processing
  const lines = currentContent.split('\n');
  const newLines: string[] = [];
  let sectionFound = false;
  let lastSectionIndex = -1;
  let currentSectionLevel = 0;

  // Section keywords to match
  const sectionKeywords = {
    system: ['system purpose', 'overview', 'システムの目的', '概要'],
    functional: ['functional requirement', '機能要件'],
    performance: ['performance', 'non-functional', '性能要件', '非機能要件'],
    environment: ['environment', 'operating', '動作環境', '条件'],
    physical: ['physical', 'constraint', '物理的', '制約'],
    cost: ['cost', 'budget', 'コスト', '予算'],
    interface: ['interface', 'インターフェース'],
    hardware: ['hardware', 'ハードウェア'],
    software: ['software', 'ソフトウェア']
  };

  // Find the appropriate section
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    newLines.push(line);

    // Check if this is a heading
    const headingMatch = line.match(/^(#+)\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].toLowerCase();

      // Check if this matches our section hint
      if (sectionHint) {
        for (const [key, keywords] of Object.entries(sectionKeywords)) {
          if (sectionHint.toLowerCase().includes(key) || 
              keywords.some(kw => headingText.includes(kw))) {
            sectionFound = true;
            lastSectionIndex = i;
            currentSectionLevel = level;
            break;
          }
        }
      }

      // If we were in a section and found a same or higher level heading, insert before
      if (sectionFound && level <= currentSectionLevel && i > lastSectionIndex + 1) {
        // Insert new content before this heading
        newLines.splice(newLines.length - 1, 0, '', `${marker} ${newInfo}`);
        sectionFound = false;
        break;
      }
    }
  }

  // If section was found but we reached the end, append to that section
  if (sectionFound) {
    // Find the last non-empty line of the section
    let insertIndex = newLines.length;
    for (let i = newLines.length - 1; i > lastSectionIndex; i--) {
      if (newLines[i].trim() !== '') {
        insertIndex = i + 1;
        break;
      }
    }
    newLines.splice(insertIndex, 0, `${marker} ${newInfo}`, '');
  } else {
    // If no specific section found, append to the end of document
    newLines.push('', `${marker} ${newInfo}`);
  }

  return newLines.join('\n');
}

/**
 * Extract section hint from user's answer
 * @param answer - User's answer
 * @returns Section hint or undefined
 */
export function extractSectionHint(answer: string): string | undefined {
  const lowerAnswer = answer.toLowerCase();
  
  // Check for section-specific keywords
  if (lowerAnswer.includes('cost') || lowerAnswer.includes('budget') || 
      lowerAnswer.includes('予算') || lowerAnswer.includes('コスト')) {
    return 'cost';
  }
  
  if (lowerAnswer.includes('performance') || lowerAnswer.includes('speed') || 
      lowerAnswer.includes('性能') || lowerAnswer.includes('速度')) {
    return 'performance';
  }
  
  if (lowerAnswer.includes('function') || lowerAnswer.includes('feature') || 
      lowerAnswer.includes('機能')) {
    return 'functional';
  }
  
  if (lowerAnswer.includes('hardware') || lowerAnswer.includes('ハードウェア')) {
    return 'hardware';
  }
  
  if (lowerAnswer.includes('software') || lowerAnswer.includes('ソフトウェア')) {
    return 'software';
  }
  
  if (lowerAnswer.includes('interface') || lowerAnswer.includes('インターフェース')) {
    return 'interface';
  }
  
  if (lowerAnswer.includes('environment') || lowerAnswer.includes('環境')) {
    return 'environment';
  }
  
  return undefined;
}
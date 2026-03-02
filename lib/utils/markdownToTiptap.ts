// Convert Markdown text to TipTap JSON format
export interface TipTapNode {
  type: string;
  attrs?: Record<string, string | number | boolean>;
  content?: Array<TipTapNode | TipTapTextNode>;
}

export interface TipTapTextNode {
  type: 'text';
  text: string;
  marks?: Array<{
    type: string;
    attrs?: Record<string, string | number | boolean>;
  }>;
}

export interface TipTapDocument {
  type: 'doc';
  content: TipTapNode[];
}

// Parse inline marks (bold, italic, code)
function parseInlineMarks(text: string): Array<TipTapTextNode | TipTapNode> {
  const nodes: Array<TipTapTextNode | TipTapNode> = [];

  // Pattern to match **bold**, *italic*, and `code`
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      nodes.push({
        type: 'text',
        text: text.slice(lastIndex, match.index),
      });
    }

    // Add marked text
    if (match[1]) {
      // Bold
      nodes.push({
        type: 'text',
        text: match[1],
        marks: [{ type: 'bold' }],
      });
    } else if (match[2]) {
      // Italic
      nodes.push({
        type: 'text',
        text: match[2],
        marks: [{ type: 'italic' }],
      });
    } else if (match[3]) {
      // Code
      nodes.push({
        type: 'text',
        text: match[3],
        marks: [{ type: 'code' }],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push({
      type: 'text',
      text: text.slice(lastIndex),
    });
  }

  // If no marks were found, return simple text node
  if (nodes.length === 0) {
    return [{ type: 'text', text }];
  }

  return nodes;
}

export function convertMarkdownToTiptap(markdown: string): TipTapDocument {
  const lines = markdown.split('\n');
  const content: TipTapNode[] = [];
  let currentList: TipTapNode | null = null;
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const text = currentParagraphLines.join('\n').trim();
      if (text) {
        content.push({
          type: 'paragraph',
          content: parseInlineMarks(text),
        });
      }
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (currentList) {
      content.push(currentList);
      // Add spacing after list (with zero-width space to avoid empty text node)
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: '\u200B' }],
      });
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Empty line - flush current paragraph
    if (!trimmedLine) {
      flushParagraph();
      flushList();
      continue;
    }

    // Heading
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();

      const level = headingMatch[1].length;
      const text = headingMatch[2];

      content.push({
        type: 'heading',
        attrs: { level },
        content: parseInlineMarks(text),
      });
      continue;
    }

    // List item
    const listMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();

      const text = listMatch[1];
      const listItem: TipTapNode = {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: parseInlineMarks(text),
          },
        ],
      };

      if (!currentList) {
        currentList = {
          type: 'bulletList',
          content: [listItem],
        };
      } else {
        currentList.content!.push(listItem);
      }
      continue;
    }

    // Numbered list - Check for section headings
    const numberedListMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
    if (numberedListMatch) {
      flushParagraph();

      const text = numberedListMatch[1];

      // Check if this is a section heading (e.g., "1. System Purpose and Overview")
      const sectionKeywords = [
        'System',
        'Purpose',
        'Overview',
        'Requirements',
        'Functional',
        'Performance',
        'Non-functional',
        'Hardware',
        'Software',
        'Constraints',
        'Physical',
        'Cost',
        'Target',
        'Interface',
        'Operating',
        'Environment',
        'Conditions',
        'Budget',
        'Integration',
        'Communication',
      ];

      const isSection = sectionKeywords.some((keyword) =>
        text.includes(keyword),
      );

      if (isSection) {
        // Treat as heading
        flushList();
        content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: parseInlineMarks(`${numberedListMatch[0]}`),
        });
        // Add spacing after section heading (with zero-width space to avoid empty text node)
        content.push({
          type: 'paragraph',
          content: [{ type: 'text', text: '\u200B' }],
        });
      } else {
        // Regular numbered list item
        const listItem: TipTapNode = {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: parseInlineMarks(text),
            },
          ],
        };

        if (!currentList || currentList.type !== 'orderedList') {
          flushList();
          currentList = {
            type: 'orderedList',
            content: [listItem],
          };
        } else {
          currentList.content!.push(listItem);
        }
      }
      continue;
    }

    // Code block
    if (trimmedLine.startsWith('```')) {
      flushParagraph();
      flushList();

      const language = trimmedLine.slice(3).trim();
      const codeLines: string[] = [];

      // Find closing ```
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }

      content.push({
        type: 'codeBlock',
        attrs: language ? { language } : {},
        content: [{ type: 'text', text: codeLines.join('\n') }],
      });
      continue;
    }

    // Quote
    if (trimmedLine.startsWith('>')) {
      flushParagraph();
      flushList();

      const text = trimmedLine.slice(1).trim();
      content.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: parseInlineMarks(text),
          },
        ],
      });
      continue;
    }

    // Regular paragraph line
    flushList();
    currentParagraphLines.push(line);
  }

  // Flush remaining content
  flushParagraph();
  flushList();

  // If no content, add empty paragraph (with zero-width space to avoid empty text node)
  if (content.length === 0) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: '\u200B' }],
    });
  }

  return {
    type: 'doc',
    content,
  };
}

// Convert structured data from AI to markdown
export function convertStructuredDataToMarkdown(
  structuredData: Record<string, unknown>,
): string {
  const sections: string[] = [];

  // System Purpose
  if (structuredData.systemPurpose) {
    sections.push(
      `# System Requirements Document\n\n## 1. System Purpose and Overview\n${structuredData.systemPurpose}`,
    );
  }

  // Functional Requirements
  if (
    structuredData.functionalRequirements &&
    structuredData.functionalRequirements.length > 0
  ) {
    sections.push(`## 2. Functional Requirements`);
    structuredData.functionalRequirements.forEach((req: string) => {
      sections.push(`- ${req}`);
    });
  }

  // Non-functional Requirements
  if (
    structuredData.nonFunctionalRequirements &&
    structuredData.nonFunctionalRequirements.length > 0
  ) {
    sections.push(`## 3. Performance Requirements`);
    structuredData.nonFunctionalRequirements.forEach((req: string) => {
      sections.push(`- ${req}`);
    });
  }

  // Constraints
  if (structuredData.constraints && structuredData.constraints.length > 0) {
    sections.push(`## 4. Constraints`);
    structuredData.constraints.forEach((constraint: string) => {
      sections.push(`- ${constraint}`);
    });
  }

  // Hardware Requirements
  if (
    structuredData.hardwareRequirements &&
    structuredData.hardwareRequirements.length > 0
  ) {
    sections.push(`## 5. Hardware Requirements`);
    structuredData.hardwareRequirements.forEach((req: string) => {
      sections.push(`- ${req}`);
    });
  }

  // Software Requirements
  if (
    structuredData.softwareRequirements &&
    structuredData.softwareRequirements.length > 0
  ) {
    sections.push(`## 6. Software Requirements`);
    structuredData.softwareRequirements.forEach((req: string) => {
      sections.push(`- ${req}`);
    });
  }

  return sections.join('\n\n');
}

// Extract structured data from AI response
export function extractStructuredDataFromResponse(
  response: string,
): Record<string, unknown> | null {
  const startMarker = 'REQUIREMENTS_DOCUMENT_UPDATE_START';
  const endMarker = 'REQUIREMENTS_DOCUMENT_UPDATE_END';

  const startIndex = response.indexOf(startMarker);
  const endIndex = response.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    return null;
  }

  const jsonStr = response
    .substring(startIndex + startMarker.length, endIndex)
    .trim();

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse structured data:', error);
    return null;
  }
}

// Requirements Definition Manager - Business logic for requirements management
import {
  RequirementsDocument,
  AIQuestion,
  RequirementsSection,
  EditorContent,
} from '@/types/requirements';
// Database operations must be done through API endpoints, not directly
// OpenAI will be used through API routes, not directly
// REMOVED: import { getRequirementDocument } from '@/lib/storage/prisma-requirements';

export class RequirementsDefManager {
  private userId: string;
  private projectId: string;

  constructor(userId: string, projectId: string) {
    this.userId = userId;
    this.projectId = projectId;
  }

  // Get requirement document by ID
  async getRequirement(
    requirementId: string,
  ): Promise<RequirementsDocument | null> {
    try {
      const response = await fetch(`/api/requirements/${requirementId}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch requirement:', error);
      return null;
    }
  }

  // Get requirement document status
  async getRequirementStatus(
    requirementId: string,
  ): Promise<string | null> {
    try {
      const document = await this.getRequirement(requirementId);
      return document?.status || null;
    } catch (error) {
      console.error('Failed to fetch requirement status:', error);
      return null;
    }
  }

  // Update requirement document
  async updateRequirement(
    requirementId: string,
    data: Record<string, unknown>,
  ): Promise<RequirementsDocument | null> {
    try {
      const response = await fetch(`/api/requirements/${requirementId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to update requirement:', error);
      return null;
    }
  }

  // Helper method for input validation
  validateInput(text: string, systemType: string): void {
    if (!text || text.trim().length === 0) {
      throw new Error('Requirements text cannot be empty');
    }
    if (text.length < 3) {
      throw new Error('Requirements text is too short');
    }
    if (!systemType || systemType.trim().length === 0) {
      throw new Error('System type cannot be empty');
    }
  }

  // Extract system type from requirements text
  extractSystemType(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('temperature') || lowerText.includes('sensor')) {
      return 'sensor-system';
    } else if (lowerText.includes('motor') || lowerText.includes('control')) {
      return 'control-system';
    } else if (lowerText.includes('iot') || lowerText.includes('wireless')) {
      return 'iot-system';
    } else if (
      lowerText.includes('robot') ||
      lowerText.includes('automation')
    ) {
      return 'robotic-system';
    } else {
      return 'embedded-system';
    }
  }

  // Generate questions based on system type and completeness
  generateQuestions(
    systemType: string,
    completenessScore: number,
  ): AIQuestion[] {
    const questions: AIQuestion[] = [];

    // Basic questions for low completeness
    if (completenessScore < 50) {
      questions.push({
        id: 'basic-1',
        question: 'What is the primary purpose of your system?',
        intent: 'Establish the fundamental goals',
        priority: 1,
        answered: false,
      });
    }

    // System-specific questions
    if (systemType === 'sensor-system') {
      questions.push({
        id: 'sensor-1',
        question: 'What measurement range and accuracy do you require?',
        intent: 'Define sensor specifications',
        priority: 2,
        answered: false,
      });
    } else if (systemType === 'control-system') {
      questions.push({
        id: 'control-1',
        question: 'What motors or actuators need to be controlled?',
        intent: 'Define control requirements',
        priority: 2,
        answered: false,
      });
    }

    // Detailed questions for high completeness
    if (completenessScore > 70) {
      questions.push({
        id: 'detailed-1',
        question: 'What are the detailed technical specifications?',
        intent: 'Gather advanced requirements',
        priority: 3,
        answered: false,
      });
    }

    return questions;
  }

  // Generate initial requirements document from user prompt
  async generateInitialRequirements(
    prompt: string,
    userLanguage?: 'ja' | 'en',
  ): Promise<RequirementsDocument> {
    console.log('🔄 generateInitialRequirements called with:', {
      prompt,
      userId: this.userId,
      projectId: this.projectId,
      userLanguage,
    });

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    try {
      console.log('🌐 Calling /api/requirements/generate');
      // Call API to generate requirements using AI
      const response = await fetch('/api/requirements/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: this.userId,
          projectId: this.projectId,
          prompt: prompt,
          userLanguage: userLanguage || 'en',
        }),
      });

      console.log(
        '📥 API Response status:',
        response.status,
        response.statusText,
      );

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ API Error response:', errorBody);
        throw new Error(
          `Failed to generate requirements: ${response.status} ${response.statusText}`,
        );
      }

      const result = await response.json();
      console.log('✅ API Response data:', result);

      if (!result) {
        throw new Error('Invalid response from server');
      }

      // Transform to RequirementsDocument format
      const requirementsDoc: RequirementsDocument = {
        id: result.id || `req-${Date.now()}`,
        projectId: result.projectId || this.projectId,
        contentText: result.requirements || '',
        content: result.requirements || '',
        status: 'DRAFT',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return requirementsDoc;
    } catch (error) {
      console.error('❌ Error generating initial requirements:', error);
      throw error;
    }
  }

  // Generate requirements document in 2 parts for better performance
  async generateSplitRequirements(
    prompt: string,
    userLanguage?: 'ja' | 'en',
    onProgress?: (part: 'essential' | 'detailed', content: any) => void
  ): Promise<RequirementsDocument> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    try {
      console.log('🚀 Starting 2-part sequential requirements generation');
      
      // Part 1: Generate essential requirements first
      console.log('📝 Generating essential requirements...');
      const essentialResponse = await fetch('/api/requirements/generate-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          projectId: this.projectId,
          prompt: prompt,
          part: 'essential',
          userLanguage: userLanguage || 'ja',
        }),
      });

      // Check essential response
      if (!essentialResponse.ok) {
        throw new Error('Failed to generate essential requirements');
      }

      const essentialData = await essentialResponse.json();
      
      console.log('✅ Essential requirements generated, now generating detailed...');
      
      // Notify progress if callback provided
      if (onProgress) {
        onProgress('essential', essentialData);
      }

      // Part 2: Generate detailed constraints with essential content as context
      const detailedResponse = await fetch('/api/requirements/generate-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          projectId: this.projectId,
          prompt: prompt,
          part: 'detailed',
          essentialContent: essentialData.contentText,  // Pass essential content as context
          userLanguage: userLanguage || 'ja',
        }),
      });

      // Check detailed response
      if (!detailedResponse.ok) {
        throw new Error('Failed to generate detailed requirements');
      }

      const detailedData = await detailedResponse.json();
      
      console.log('📊 Essential data structure:', {
        hasContent: !!essentialData.content,
        contentType: typeof essentialData.content,
        hasContentText: !!essentialData.contentText,
        textLength: essentialData.contentText?.length || 0,
        first50Chars: essentialData.contentText?.substring(0, 50) || 'No text'
      });
      console.log('📊 Detailed data structure:', {
        hasContent: !!detailedData.content,
        contentType: typeof detailedData.content,
        hasContentText: !!detailedData.contentText,
        textLength: detailedData.contentText?.length || 0,
        first50Chars: detailedData.contentText?.substring(0, 50) || 'No text'
      });

      // Notify progress if callback provided
      if (onProgress) {
        onProgress('essential', essentialData);
        onProgress('detailed', detailedData);
      }

      // Fix: essentialData.content is already the TipTap structure, not essentialData.content.content
      const essentialContent = essentialData.content || { type: 'doc', content: [] };
      const detailedContent = detailedData.content || { type: 'doc', content: [] };
      
      // Extract the actual content arrays
      const essentialNodes = Array.isArray(essentialContent) ? essentialContent : (essentialContent.content || []);
      const detailedNodes = Array.isArray(detailedContent) ? detailedContent : (detailedContent.content || []);

      // Combine both parts
      const combinedContent = {
        type: 'doc',
        content: [
          ...essentialNodes,
          ...detailedNodes
        ]
      };

      const combinedText = (essentialData.contentText || '') + '\n\n' + (detailedData.contentText || '');
      
      console.log('📝 Combined content:', {
        nodesCount: combinedContent.content.length,
        textLength: combinedText.length,
        firstNode: combinedContent.content[0]
      });
      
      // Check if content is empty
      if (!combinedText || combinedText.trim().length === 0) {
        console.error('⚠️ Warning: Combined content is empty, falling back to single generation');
        return this.generateInitialRequirements(prompt, userLanguage);
      }

      // Save combined document using the existing generate API endpoint
      const saveResponse = await fetch('/api/requirements/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          projectId: this.projectId,
          prompt: prompt,  // Original prompt for fallback
          userLanguage: userLanguage || 'ja',
          // Include pre-generated content to skip AI generation
          preGeneratedContent: combinedText,
          preGeneratedTiptap: combinedContent
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save combined requirements');
      }

      return await saveResponse.json();
    } catch (error) {
      console.error('❌ Error generating split requirements:', error);
      // Fallback to single generation
      console.log('⚠️ Falling back to single generation');
      return this.generateInitialRequirements(prompt, userLanguage);
    }
  }

  // Analyze requirements completeness
  async analyzeRequirementsCompleteness(requirementId: string): Promise<{
    overall: number;
    sections: RequirementsSection[];
    questions?: AIQuestion[];
  }> {
    if (!requirementId || requirementId.trim().length === 0) {
      throw new Error('Requirement ID is required');
    }

    try {
      const response = await fetch('/api/requirements/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementId,
          userId: this.userId,
          projectId: this.projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze requirements');
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing requirements:', error);
      throw error;
    }
  }

  // Process user answer to update requirements
  async processUserAnswer(
    requirementId: string,
    questionId: string,
    answer: string,
    userLanguage?: 'ja' | 'en',
  ): Promise<{
    content: string;
    tiptapContent: EditorContent;
    structuredData: unknown;
    decisions: Array<{ content: string; context: string; importance: string }>;
  }> {
    if (!requirementId || requirementId.trim().length === 0) {
      throw new Error('Requirement ID is required');
    }
    if (!questionId || questionId.trim().length === 0) {
      throw new Error('Question ID is required');
    }
    if (!answer || answer.trim().length === 0) {
      throw new Error('Answer is required');
    }

    console.log('📝 [RequirementsDefManager] processUserAnswer called:', {
      requirementId,
      questionId,
      answer: answer.substring(0, 100) + '...',
    });

    try {
      // Get current requirements document content via API
      const currentDoc = await this.getRequirement(requirementId);
      if (!currentDoc) {
        throw new Error('Requirements document not found');
      }

      // Extract current content as text
      const currentContent =
        currentDoc.contentText ||
        (typeof currentDoc.content === 'string'
          ? currentDoc.content
          : JSON.stringify(currentDoc.content));

      console.log('📄 [RequirementsDefManager] Current content:', {
        contentLength: currentContent.length,
        contentPreview: currentContent.substring(0, 200) + '...',
      });

      const response = await fetch('/api/requirements/update-from-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementId,
          questionId,
          answer,
          currentContent, // Add current content to the request
          userId: this.userId,
          projectId: this.projectId,
          userLanguage: userLanguage || 'en',
        }),
      });

      console.log('🌐 [RequirementsDefManager] API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [RequirementsDefManager] API error:', errorText);
        throw new Error('Failed to process answer');
      }

      const result = await response.json();
      console.log('✅ [RequirementsDefManager] Update successful:', {
        hasContent: !!result.content,
        hasStructuredData: !!result.structuredData,
        contentLength: result.content?.length,
      });

      return result;
    } catch (error) {
      console.error('Error processing answer:', error);
      throw error;
    }
  }

  // Generate requirements content using AI through API route
  private async generateRequirementsWithAI(prompt: string): Promise<{
    content: EditorContent;
    decisions?: Array<{
      content: string;
      context: string;
      importance: 'HIGH' | 'NORMAL' | 'LOW';
    }>;
  }> {
    try {
      const response = await fetch('/api/requirements/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate requirements');
      }

      const data = await response.json();

      // Ensure we have valid content structure
      if (!data.content || !data.content.type) {
        // Fallback to basic structure
        return {
          content: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: 'Requirements Document' }],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: prompt }],
              },
            ],
          },
        };
      }

      return data;
    } catch (error) {
      console.error('AI generation failed:', error);
      throw new Error('Failed to generate requirements with AI');
    }
  }

  // Analyze requirements and generate questions for missing information
  async analyzeAndGenerateQuestions(
    requirementId: string,
  ): Promise<AIQuestion[]> {
    const document = await this.getRequirement(requirementId);
    if (!document) {
      throw new Error('Requirements document not found');
    }

    try {
      const response = await fetch('/api/requirements/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementId,
          contentText: document.contentText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze requirements');
      }

      const data = await response.json();

      return (
        data.questions?.map((q: AIQuestion) => ({
          ...q,
          answered: false,
        })) || []
      );
    } catch (error) {
      console.error('Failed to generate questions:', error);
      throw new Error('Failed to analyze requirements');
    }
  }

  // [REMOVED] Duplicate processUserAnswer method - using the implementation at line 235

  // Calculate completeness score from content text
  calculateCompleteness(contentText: string): number {
    if (!contentText || contentText.length === 0) return 0;

    let score = 10; // Base score for having content

    // Check for key sections
    const sections = [
      { keyword: '目的', weight: 15 },
      { keyword: 'purpose', weight: 15 },
      { keyword: '機能', weight: 15 },
      { keyword: 'function', weight: 15 },
      { keyword: '要件', weight: 10 },
      { keyword: 'requirement', weight: 10 },
      { keyword: '制約', weight: 10 },
      { keyword: 'constraint', weight: 10 },
      { keyword: '仕様', weight: 10 },
      { keyword: 'specification', weight: 10 },
    ];

    const lowerContent = contentText.toLowerCase();
    sections.forEach((section) => {
      if (lowerContent.includes(section.keyword)) {
        score += section.weight;
      }
    });

    // Add points for content length
    if (contentText.length > 100) score += 10;
    if (contentText.length > 300) score += 10;
    if (contentText.length > 500) score += 10;

    // Check for specific details
    if (/\d+°c|\d+度|temperature.*\d+/i.test(contentText)) score += 5;
    if (/\d+v|電圧|voltage/i.test(contentText)) score += 5;
    if (/\d+ma|\d+a|電流|current/i.test(contentText)) score += 5;

    return Math.min(score, 100);
  }

  // Get requirements completeness analysis
  async analyzeCompleteness(requirementId: string): Promise<{
    overall: number;
    sections: RequirementsSection[];
  }> {
    const document = await this.getRequirement(requirementId);
    if (!document) {
      throw new Error('Requirements document not found');
    }

    // Analyze document structure and completeness
    const sections: RequirementsSection[] = [
      {
        id: 'system-overview',
        title: 'System Overview',
        type: 'system',
        content: '',
        completeness: 0,
        dependencies: [],
      },
      {
        id: 'functional-req',
        title: 'Functional Requirements',
        type: 'software',
        content: '',
        completeness: 0,
        dependencies: ['system-overview'],
      },
      {
        id: 'non-functional-req',
        title: 'Non-Functional Requirements',
        type: 'system',
        content: '',
        completeness: 0,
        dependencies: ['functional-req'],
      },
      {
        id: 'hardware-req',
        title: 'Hardware Requirements',
        type: 'hardware',
        content: '',
        completeness: 0,
        dependencies: ['functional-req'],
      },
      {
        id: 'interface-req',
        title: 'Interface Requirements',
        type: 'interface',
        content: '',
        completeness: 0,
        dependencies: ['hardware-req', 'functional-req'],
      },
    ];

    // Simple completeness calculation based on content
    const contentText = document.contentText || '';
    let totalCompleteness = 0;

    sections.forEach((section) => {
      // Check if section title exists in content
      if (contentText.toLowerCase().includes(section.title.toLowerCase())) {
        section.completeness = 50; // Base score for having the section

        // Add points for content length
        const sectionRegex = new RegExp(
          `${section.title}[\\s\\S]*?(?=\\n#|$)`,
          'i',
        );
        const sectionContent = contentText.match(sectionRegex);
        if (sectionContent && sectionContent[0].length > 100) {
          section.completeness += 30;
        }
        if (sectionContent && sectionContent[0].length > 300) {
          section.completeness += 20;
        }
      }

      totalCompleteness += section.completeness;
    });

    const overall = Math.round(totalCompleteness / sections.length);

    return {
      overall,
      sections,
    };
  }

  // Extract key information from chat messages for requirements
  async extractRequirementsFromChat(
    chatMessages: Array<{ role: string; content: string }>,
  ): Promise<{
    extractedRequirements: string[];
    suggestedSections: string[];
  }> {
    // Keywords that indicate requirements
    const requirementKeywords = [
      'need',
      'require',
      'must',
      'should',
      'want',
      'temperature',
      'sensor',
      'monitor',
      'control',
      'range',
      'accuracy',
      'power',
      'size',
      'cost',
    ];

    const extractedRequirements: string[] = [];
    const suggestedSections = new Set<string>();

    for (const message of chatMessages) {
      if (message.role === 'user') {
        const sentences = message.content
          .split(/[.!?]/)
          .filter((s) => s.trim());

        for (const sentence of sentences) {
          const lowerSentence = sentence.toLowerCase();
          if (
            requirementKeywords.some((keyword) =>
              lowerSentence.includes(keyword),
            )
          ) {
            extractedRequirements.push(sentence.trim());

            // Suggest sections based on content
            if (
              lowerSentence.includes('temperature') ||
              lowerSentence.includes('sensor')
            ) {
              suggestedSections.add('Hardware Requirements');
            }
            if (
              lowerSentence.includes('monitor') ||
              lowerSentence.includes('control')
            ) {
              suggestedSections.add('Functional Requirements');
            }
            if (
              lowerSentence.includes('accuracy') ||
              lowerSentence.includes('range')
            ) {
              suggestedSections.add('Performance Requirements');
            }
          }
        }
      }
    }

    return {
      extractedRequirements,
      suggestedSections: Array.from(suggestedSections),
    };
  }
}

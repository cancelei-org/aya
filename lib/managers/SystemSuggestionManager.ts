// System suggestion manager with requirements approval checking
import { RequirementsDocument } from '@/types/requirements';

export interface SystemSuggestion {
  id: string;
  name: string;
  description: string;
  basedOnRequirements: string[]; // Array of requirement IDs
  components: ComponentSuggestion[];
  estimatedCost: {
    min: number;
    max: number;
    currency: string;
  };
  estimatedDevelopmentTime: {
    min: number;
    max: number;
    unit: 'weeks' | 'months';
  };
  technicalComplexity: 'low' | 'medium' | 'high';
  advantages: string[];
  limitations: string[];
  recommendedFor: string[];
  alternatives: SystemSuggestion[];
}

export interface ComponentSuggestion {
  id: string;
  name: string;
  type:
    | 'microcontroller'
    | 'sensor'
    | 'actuator'
    | 'communication'
    | 'power'
    | 'display'
    | 'storage';
  modelNumber?: string;
  specifications: Record<string, string | number | boolean>;
  cost: {
    estimated: number;
    currency: string;
    source?: string;
  };
  availability: 'readily-available' | 'limited' | 'custom-order';
  reasoning: string;
}

export interface RequirementMapping {
  requirementId: string;
  requirementText: string;
  componentIds: string[];
  satisfaction: 'full' | 'partial' | 'not-satisfied';
  notes?: string;
}

export class SystemSuggestionManager {
  constructor(
    private userId: string,
    private projectId: string,
  ) {}

  /**
   * Check if there are approved requirements available for system suggestion
   */
  async checkApprovedRequirements(): Promise<RequirementsDocument[]> {
    try {
      const response = await fetch(
        `/api/requirements/approved?projectId=${this.projectId}`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch approved requirements');
      }

      const approvedRequirements = await response.json();
      return approvedRequirements;
    } catch (error) {
      console.error('Error checking approved requirements:', error);
      throw error;
    }
  }

  /**
   * Generate system suggestions based on approved requirements
   */
  async generateSystemSuggestions(
    requirementIds: string[],
  ): Promise<SystemSuggestion[]> {
    try {
      const response = await fetch('/api/system-suggestions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: this.projectId,
          requirementIds,
          userId: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate system suggestions');
      }

      const suggestions = await response.json();
      return suggestions;
    } catch (error) {
      console.error('Error generating system suggestions:', error);
      throw error;
    }
  }

  /**
   * Analyze requirements and extract key technical specifications
   */
  analyzeRequirements(requirements: RequirementsDocument[]): {
    systemType: string;
    keySpecs: Record<string, string | number | boolean>;
    constraints: string[];
    priorities: string[];
  } {
    let systemType = 'generic';
    const keySpecs: Record<string, string | number | boolean> = {};
    const constraints: string[] = [];
    const priorities: string[] = [];

    requirements.forEach((req) => {
      const text = (req.contentText || '').toLowerCase();

      // Determine system type
      if (text.includes('temperature') || text.includes('sensor')) {
        systemType = 'sensor-system';
      } else if (text.includes('motor') || text.includes('control')) {
        systemType = 'control-system';
      } else if (text.includes('iot') || text.includes('wireless')) {
        systemType = 'iot-system';
      } else if (text.includes('robot') || text.includes('automation')) {
        systemType = 'robotic-system';
      }

      // Extract specifications
      const voltageMatch = text.match(/(\d+(?:\.\d+)?)\s*v(?:olt)?/i);
      if (voltageMatch) {
        keySpecs.voltage = parseFloat(voltageMatch[1]);
      }

      const tempMatch = text.match(/(-?\d+(?:\.\d+)?)\s*°?c/i);
      if (tempMatch) {
        keySpecs.operatingTemperature = parseFloat(tempMatch[1]);
      }

      const accuracyMatch = text.match(/±\s*(\d+(?:\.\d+)?)\s*(?:°c|%)/i);
      if (accuracyMatch) {
        keySpecs.accuracy = parseFloat(accuracyMatch[1]);
      }

      // Extract constraints
      if (text.includes('low power') || text.includes('battery')) {
        constraints.push('low-power');
      }
      if (text.includes('compact') || text.includes('small')) {
        constraints.push('compact-size');
      }
      if (text.includes('outdoor') || text.includes('harsh')) {
        constraints.push('rugged-environment');
      }
      if (text.includes('cost') || text.includes('budget')) {
        constraints.push('cost-sensitive');
      }

      // Extract priorities
      if (text.includes('high accuracy') || text.includes('precision')) {
        priorities.push('high-accuracy');
      }
      if (text.includes('real-time') || text.includes('fast')) {
        priorities.push('real-time-performance');
      }
      if (text.includes('reliable') || text.includes('robust')) {
        priorities.push('reliability');
      }
    });

    return {
      systemType,
      keySpecs,
      constraints: [...new Set(constraints)],
      priorities: [...new Set(priorities)],
    };
  }

  /**
   * Create requirement mapping for a system suggestion
   */
  createRequirementMapping(
    requirements: RequirementsDocument[],
    systemSuggestion: SystemSuggestion,
  ): RequirementMapping[] {
    const mappings: RequirementMapping[] = [];

    requirements.forEach((req) => {
      if (!systemSuggestion.basedOnRequirements.includes(req.id)) return;

      const text = req.contentText || '';

      // Analyze which components satisfy this requirement
      const satisfyingComponents = systemSuggestion.components.filter(
        (component) => {
          const reasoning = component.reasoning.toLowerCase();
          const reqText = text.toLowerCase();

          // Simple keyword matching - in a real implementation, this would be more sophisticated
          return (
            (reasoning.includes('temperature') &&
              reqText.includes('temperature')) ||
            (reasoning.includes('control') && reqText.includes('control')) ||
            (reasoning.includes('power') && reqText.includes('power')) ||
            (reasoning.includes('communication') &&
              reqText.includes('communication'))
          );
        },
      );

      mappings.push({
        requirementId: req.id,
        requirementText:
          text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        componentIds: satisfyingComponents.map((c) => c.id),
        satisfaction: satisfyingComponents.length > 0 ? 'full' : 'partial',
        notes:
          satisfyingComponents.length === 0
            ? 'This requirement may need additional components or custom solutions'
            : undefined,
      });
    });

    return mappings;
  }

  /**
   * Validate that all requirements are approved before generating suggestions
   */
  async validateRequirementsApproval(requirementIds: string[]): Promise<{
    valid: boolean;
    approvedRequirements: string[];
    unapprovedRequirements: string[];
  }> {
    try {
      const response = await fetch('/api/requirements/validate-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requirementIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate requirements approval');
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating requirements approval:', error);
      throw error;
    }
  }

  /**
   * Get system suggestions with full requirement traceability
   */
  async getSystemSuggestionsWithTraceability(
    requirementIds: string[],
  ): Promise<{
    suggestions: SystemSuggestion[];
    mappings: RequirementMapping[];
    requirements: RequirementsDocument[];
    analysis: ReturnType<typeof this.analyzeRequirements>;
  }> {
    // First validate that all requirements are approved
    const validation = await this.validateRequirementsApproval(requirementIds);

    if (!validation.valid) {
      throw new Error(
        `Cannot generate system suggestions. Unapproved requirements: ${validation.unapprovedRequirements.join(', ')}`,
      );
    }

    // Fetch the approved requirements
    const requirements = await this.checkApprovedRequirements();
    const selectedRequirements = requirements.filter((req) =>
      requirementIds.includes(req.id),
    );

    // Analyze requirements
    const analysis = this.analyzeRequirements(selectedRequirements);

    // Generate system suggestions
    const suggestions = await this.generateSystemSuggestions(requirementIds);

    // Create requirement mappings for each suggestion
    const mappings = suggestions.flatMap((suggestion) =>
      this.createRequirementMapping(selectedRequirements, suggestion),
    );

    return {
      suggestions,
      mappings,
      requirements: selectedRequirements,
      analysis,
    };
  }
}

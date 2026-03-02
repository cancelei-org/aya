// Requirements consistency check and validation
import { RequirementsSection, RequirementsDocument } from '@/types/requirements'

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info'
  section: string
  message: string
  suggestion?: string
}

interface ConsistencyCheck {
  isConsistent: boolean
  issues: ValidationIssue[]
  score: number // 0-100
}

export class RequirementsValidator {
  // Common contradictions to check
  private contradictionPatterns = [
    {
      pattern1: /low[\s-]*power|battery[\s-]*powered/i,
      pattern2: /high[\s-]*performance|real[\s-]*time/i,
      issue: 'Low power requirement conflicts with high performance requirement'
    },
    {
      pattern1: /small[\s-]*size|compact|miniature/i,
      pattern2: /many[\s-]*features|extensive[\s-]*functionality/i,
      issue: 'Size constraints may conflict with extensive feature requirements'
    },
    {
      pattern1: /low[\s-]*cost|budget|cheap/i,
      pattern2: /high[\s-]*accuracy|precision|industrial[\s-]*grade/i,
      issue: 'Cost constraints may conflict with high accuracy requirements'
    },
    {
      pattern1: /outdoor|harsh[\s-]*environment/i,
      pattern2: /consumer[\s-]*grade|standard[\s-]*components/i,
      issue: 'Environmental requirements conflict with component specifications'
    }
  ]

  // Numeric consistency patterns
  private numericPatterns = [
    {
      parameter: 'temperature',
      check: (values: number[]) => {
        const min = Math.min(...values)
        const max = Math.max(...values)
        return max - min > 200 // Unrealistic// temperature range
      },
      issue: 'Temperature range seems unrealistic (>200°C span)'
    },
    {
      parameter: 'voltage',
      check: (values: number[]) => {
        return values.some(v => v > 48) && values.some(v => v < 5)
      },
      issue: 'Mixing high voltage (>48V) and low voltage (<5V) in same system'
    },
    {
      parameter: 'power|current',
      check: (values: number[]) => {
        const max = Math.max(...values)
        const min = Math.min(...values)
        return max / min > 100 // Very large power ratio
      },
      issue: 'Power/current requirements vary by more than 100x'
    }
  ]

  checkConsistency(document: RequirementsDocument, sections: RequirementsSection[]): ConsistencyCheck {
    const issues: ValidationIssue[] = []
    let score = 100

    // 1. Check for contradictions in text
    const fullText = this.extractFullText(document, sections)
    this.contradictionPatterns.forEach(pattern => {
      if (pattern.pattern1.test(fullText) && pattern.pattern2.test(fullText)) {
        issues.push({
          severity: 'warning',
          section: 'General',
          message: pattern.issue,
          suggestion: 'Review and clarify the conflicting requirements'
        })
        score -= 10
      }
    })

    // 2. Check numeric consistency
    const numericValues = this.extractNumericValues(fullText)
    this.numericPatterns.forEach(pattern => {
      const values = numericValues.filter(nv =>
        new RegExp(pattern.parameter, 'i').test(nv.context)
      ).map(nv => nv.value)

      if (values.length > 1 && pattern.check(values)) {
        issues.push({
          severity: 'warning',
          section: 'Specifications',
          message: pattern.issue,
          suggestion: 'Verify the numeric values are correct and consistent'
        })
        score -= 15
      }
    })

    // 3. Check section dependencies
    const dependencyIssues = this.checkDependencies(sections)
    issues.push(...dependencyIssues)
    score -= dependencyIssues.length * 5

    // 4. Check for missing critical information
    const missingIssues = this.checkMissingInformation(sections)
    issues.push(...missingIssues)
    score -= missingIssues.filter(i => i.severity === 'error').length * 20

    // 5. Check for ambiguous language
    const ambiguityIssues = this.checkAmbiguity(fullText)
    issues.push(...ambiguityIssues)
    score -= ambiguityIssues.length * 5

    return {
      isConsistent: issues.filter(i => i.severity === 'error').length === 0,
      issues: issues.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      }),
      score: Math.max(0, score)
    }
  }

  private extractFullText(document: RequirementsDocument, sections: RequirementsSection[]): string {
    let text = document.contentText || ''
    sections.forEach(section => {
      text += ' ' + (section.content || '')
    })
    return text
  }

  private extractNumericValues(text: string): Array<{ value: number; context: string }> {
    const values: Array<{ value: number; context: string }> = []
    const numericPattern = /(\d+(?:\.\d+)?)\s*([°℃℉]?[A-Za-z]*)/g
    let match

    while ((match = numericPattern.exec(text)) !== null) {
      const startIndex = Math.max(0, match.index - 20)
      const endIndex = Math.min(text.length, match.index + match[0].length + 20)
      const context = text.substring(startIndex, endIndex)

      values.push({
        value: parseFloat(match[1]),
        context
      })
    }

    return values
  }

  private checkDependencies(sections: RequirementsSection[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const sectionMap = new Map(sections.map(s => [s.id, s]))

    sections.forEach(section => {
      if (section.dependencies) {
        section.dependencies.forEach(depId => {
          const depSection = sectionMap.get(depId)

          if (!depSection) {
            issues.push({
              severity: 'error',
              section: section.title,
              message: `Dependency '${depId}' not found`,
              suggestion: 'Fix the dependency reference or remove it'
            })
          } else if (depSection.completeness < 50) {
            issues.push({
              severity: 'warning',
              section: section.title,
              message: `Depends on incomplete section '${depSection.title}' (${depSection.completeness}% complete)`,
              suggestion: `Complete '${depSection.title}' before finalizing this section`
            })
          }

          // Check for circular dependencies
          if (depSection && depSection.dependencies?.includes(section.id)) {
            issues.push({
              severity: 'error',
              section: section.title,
              message: `Circular dependency detected with '${depSection.title}'`,
              suggestion: 'Restructure the requirements to remove circular dependencies'
            })
          }
        })
      }
    })

    return issues
  }

  private checkMissingInformation(sections: RequirementsSection[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const requiredSections = ['system', 'functional', 'constraints']

    requiredSections.forEach(required => {
      const hasSection = sections.some(s =>
        s.type === required || s.title.toLowerCase().includes(required)
      )

      if (!hasSection) {
        issues.push({
          severity: 'error',
          section: 'Structure',
          message: `Missing required section: ${required} requirements`,
          suggestion: `Add a section for ${required} requirements`
        })
      }
    })

    // Check for sections with very low completeness
    sections.forEach(section => {
      if (section.completeness < 30) {
        issues.push({
          severity: 'warning',
          section: section.title,
          message: `Section is only ${section.completeness}% complete`,
          suggestion: 'Add more detail to this section'
        })
      }
    })

    return issues
  }

  private checkAmbiguity(text: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const ambiguousTerms = [
      { term: /\b(fast|slow|quick|rapid)\b/i, suggestion: 'Specify exact timing requirements (e.g., "within 100ms")' },
      { term: /\b(small|large|big|tiny)\b/i, suggestion: 'Specify exact dimensions (e.g., "50x30x20mm")' },
      { term: /\b(many|few|several|some)\b/i, suggestion: 'Specify exact quantities' },
      { term: /\b(good|bad|better|best)\b/i, suggestion: 'Define specific quality metrics' },
      { term: /\b(approximately|about|around)\b/i, suggestion: 'Provide exact values or acceptable ranges' },
      { term: /\b(should|might|could|maybe)\b/i, suggestion: 'Use definitive language (must, shall, will)' }
    ]

    ambiguousTerms.forEach(({ term, suggestion }) => {
      if (term.test(text)) {
        const match = text.match(term)
        if (match) {
          issues.push({
            severity: 'info',
            section: 'Language',
            message: `Ambiguous term found: "${match[0]}"`,
            suggestion
          })
        }
      }
    })

    return issues
  }

  generateImprovementSuggestions(check: ConsistencyCheck): string[] {
    const suggestions: string[] = []

    // Group issues by type
    const errorCount = check.issues.filter(i => i.severity === 'error').length
    const warningCount = check.issues.filter(i => i.severity === 'warning').length

    if (errorCount > 0) {
      suggestions.push(`Fix ${errorCount} critical issue${errorCount > 1 ? 's' : ''} before finalizing`)
    }

    if (warningCount > 0) {
      suggestions.push(`Review ${warningCount} warning${warningCount > 1 ? 's' : ''} to improve consistency`)
    }

    if (check.score < 70) {
      suggestions.push('Consider restructuring requirements for better clarity')
    }

    if (check.issues.some(i => i.message.includes('ambiguous'))) {
      suggestions.push('Replace ambiguous terms with specific, measurable values')
    }

    if (check.issues.some(i => i.message.includes('dependency'))) {
      suggestions.push('Review and fix dependency relationships between sections')
    }

    return suggestions
  }

  validateAgainstStandards(document: RequirementsDocument, systemType: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Check against common industry standards
    const standards: Record<string, Array<{ check: RegExp; message: string }>> = {
      'temperature_sensor': [
        {
          check: /accuracy.*[±]?\d+\.?\d*\s*[°℃]/i,
          message: 'Temperature sensor should specify accuracy (e.g., ±0.5°C)'
        },
        {
          check: /range.*-?\d+\s*to\s*\d+\s*[°℃]/i,
          message: 'Temperature sensor should specify operating range'
        }
      ],
      'wireless': [
        {
          check: /frequency.*\d+\.?\d*\s*(MHz|GHz)/i,
          message: 'Wireless system should specify operating frequency'
        },
        {
          check: /range.*\d+\s*(m|meter|km)/i,
          message: 'Wireless system should specify communication range'
        }
      ]
    }

    const relevantStandards = standards[systemType] || []
    const text = document.contentText || ''

    relevantStandards.forEach(standard => {
      if (!standard.check.test(text)) {
        issues.push({
          severity: 'warning',
          section: 'Standards Compliance',
          message: standard.message,
          suggestion: 'Add this specification to meet industry standards'
        })
      }
    })

    return issues
  }
}
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import StructuredView from '@/components/requirements/StructuredView'
import { RequirementsSection } from '@/types/requirements'

describe('StructuredView', () => {
  const mockSections: RequirementsSection[] = [
    {
      id: 'system-overview',
      requirementId: 'req-123',
      title: 'System Overview',
      type: 'system',
      content: 'This is the system overview section with detailed description of the system purpose and scope.',
      completeness: 85,
      order: 0,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    },
    {
      id: 'functional-requirements',
      requirementId: 'req-123',
      title: 'Functional Requirements',
      type: 'software',
      content: 'The system must provide// temperature monitoring capabilities with real-time data collection.',
      completeness: 70,
      order: 1,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    },
    {
      id: 'hardware-requirements',
      requirementId: 'req-123',
      title: 'Hardware Requirements',
      type: 'hardware',
      content: 'Temperature sensor with ±0.5°C accuracy, operating range -20°C to 85°C.',
      completeness: 60,
      order: 2,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    },
    {
      id: 'incomplete-section',
      requirementId: 'req-123',
      title: 'Performance Requirements',
      type: 'system',
      content: '',
      completeness: 0,
      order: 3,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    }
  ]

  const mockOnSectionClick = jest.fn()
  const mockOnEdit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all sections', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    expect(screen.getByText('System Overview')).toBeInTheDocument()
    expect(screen.getByText('Functional Requirements')).toBeInTheDocument()
    expect(screen.getByText('Hardware Requirements')).toBeInTheDocument()
    expect(screen.getByText('Performance Requirements')).toBeInTheDocument()
  })

  it('should display completeness indicators', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should show section content preview', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    // Should show truncated content previews
    expect(screen.getByText(/This is the system overview section/)).toBeInTheDocument()
    expect(screen.getByText(/The system must provide.*temperature monitoring/)).toBeInTheDocument()
    expect(screen.getByText(/Temperature sensor with ±0.5°C accuracy/)).toBeInTheDocument()
  })

  it('should handle section clicks', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    fireEvent.click(screen.getByText('System Overview'))
    expect(mockOnSectionClick).toHaveBeenCalledWith('system-overview')

    fireEvent.click(screen.getByText('Functional Requirements'))
    expect(mockOnSectionClick).toHaveBeenCalledWith('functional-requirements')
  })

  it('should display section types with appropriate icons', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    // Should show different visual indicators for different section types
    expect(screen.getByText('system')).toBeInTheDocument()
    expect(screen.getByText('software')).toBeInTheDocument()
    expect(screen.getByText('hardware')).toBeInTheDocument()
  })

  it('should highlight incomplete sections', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    // Should highlight sections with 0% completeness
    const incompleteSection = screen.getByText('Performance Requirements').closest('[data-testid]')
    expect(incompleteSection).toHaveClass('incomplete')
  })

  it('should show edit button when onEdit is provided', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    const editButtons = screen.getAllByText('Edit')
    expect(editButtons.length).toBeGreaterThan(0)

    fireEvent.click(editButtons[0])
    expect(mockOnEdit).toHaveBeenCalledWith('system-overview')
  })

  it('should not show edit button when onEdit is not provided', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
      />
    )

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('should handle empty sections array', () => {
    render(
      <StructuredView
        sections={[]}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    expect(screen.getByText('No sections available')).toBeInTheDocument()
  })

  it('should show overall progress', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    // Should calculate and show overall completeness
    const overallCompleteness = Math.round((85 + 70 + 60 + 0) / 4)
    expect(screen.getByText(`Overall Completeness: ${overallCompleteness}%`)).toBeInTheDocument()
  })

  it('should display word count for sections', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    // Should show word counts
    expect(screen.getByText(/\d+ words/)).toBeInTheDocument()
  })

  it('should show completion status badges', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    // Should show different status badges based on completeness
    expect(screen.getByText('Complete')).toBeInTheDocument() // for 85%
    expect(screen.getByText('Good')).toBeInTheDocument() // for 70%
    expect(screen.getByText('Needs Work')).toBeInTheDocument() // for 60%
    expect(screen.getByText('Empty')).toBeInTheDocument() // for 0%
  })

  it('should maintain section order', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    const sectionTitles = screen.getAllByRole('heading', { level: 3 })
    expect(sectionTitles[0]).toHaveTextContent('System Overview')
    expect(sectionTitles[1]).toHaveTextContent('Functional Requirements')
    expect(sectionTitles[2]).toHaveTextContent('Hardware Requirements')
    expect(sectionTitles[3]).toHaveTextContent('Performance Requirements')
  })

  it('should handle sections with very long content', () => {
    const longContentSection = {
      ...mockSections[0],
      content: 'This is a very long content section that should be truncated when displayed in the structured view to maintain clean layout and readability. '.repeat(10)
    }

    render(
      <StructuredView
        sections={[longContentSection]}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    // Should truncate long content
    expect(screen.getByText(/This is a very long content section.*\.\.\./)).toBeInTheDocument()
  })

  it('should show last updated information', () => {
    render(
      <StructuredView
        sections={mockSections}
        onSectionClick={mockOnSectionClick}
        onEdit={mockOnEdit}
      />
    )

    // Should show last updated dates
    expect(screen.getByText(/Updated:/)).toBeInTheDocument()
  })
})
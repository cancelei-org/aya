import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface Library {
  name: string
  version?: string
  description?: string
  url?: string
}

interface Framework {
  name: string
  version?: string
  type: 'frontend' | 'backend' | 'embedded' | 'other'
}

interface SoftwareContext {
  projectType?: 'web' | 'mobile' | 'embedded' | 'desktop' | 'other'
  language?: string
  frameworks?: Framework[]
  libraries?: Library[]
  buildSystem?: string
  packageManager?: string
  repository?: {
    url: string
    branch?: string
    commit?: string
  }
  requirements?: string[]
  architecture?: string
  description?: string
}

interface SoftwareContextState {
  // Context data
  softwareContext: SoftwareContext | null
  setSoftwareContext: (context: SoftwareContext | null) => void
  updateSoftwareContext: (context: Partial<SoftwareContext>) => void
  resetSoftwareContext: () => void
  
  // GitHub analysis
  analyzeGitHubRepo: (repoUrl: string) => Promise<void>
  clearGitHubAnalysis: () => void
  
  // Libraries management
  addLibrary: (library: Library) => void
  removeLibrary: (libraryName: string) => void
  updateLibrary: (libraryName: string, updates: Partial<Library>) => void
  
  // Frameworks management
  addFramework: (framework: Framework) => void
  removeFramework: (frameworkName: string) => void
  updateFramework: (frameworkName: string, updates: Partial<Framework>) => void
  
  // Requirements
  addRequirement: (requirement: string) => void
  removeRequirement: (requirement: string) => void
  updateRequirements: (requirements: string[]) => void
}

export const useSoftwareContextStore = create<SoftwareContextState>()(
  devtools(
    (set, get) => ({
      // Context data
      softwareContext: null,
      setSoftwareContext: (context) => set({ softwareContext: context }),
      updateSoftwareContext: (updates) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? { ...state.softwareContext, ...updates }
            : updates as SoftwareContext
        }))
      },
      resetSoftwareContext: () => set({ softwareContext: null }),
      
      // GitHub analysis
      analyzeGitHubRepo: async (repoUrl: string) => {
        // This will be implemented to call the actual API
        // For now, just set the repository URL
        const state = get()
        state.updateSoftwareContext({
          repository: {
            url: repoUrl
          }
        })
      },
      
      clearGitHubAnalysis: () => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                repository: undefined,
                libraries: [],
                frameworks: []
              }
            : null
        }))
      },
      
      // Libraries management
      addLibrary: (library) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                libraries: [...(state.softwareContext.libraries || []), library]
              }
            : {
                libraries: [library]
              }
        }))
      },
      
      removeLibrary: (libraryName) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                libraries: state.softwareContext.libraries?.filter(
                  lib => lib.name !== libraryName
                )
              }
            : null
        }))
      },
      
      updateLibrary: (libraryName, updates) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                libraries: state.softwareContext.libraries?.map(lib =>
                  lib.name === libraryName ? { ...lib, ...updates } : lib
                )
              }
            : null
        }))
      },
      
      // Frameworks management
      addFramework: (framework) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                frameworks: [...(state.softwareContext.frameworks || []), framework]
              }
            : {
                frameworks: [framework]
              }
        }))
      },
      
      removeFramework: (frameworkName) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                frameworks: state.softwareContext.frameworks?.filter(
                  fw => fw.name !== frameworkName
                )
              }
            : null
        }))
      },
      
      updateFramework: (frameworkName, updates) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                frameworks: state.softwareContext.frameworks?.map(fw =>
                  fw.name === frameworkName ? { ...fw, ...updates } : fw
                )
              }
            : null
        }))
      },
      
      // Requirements
      addRequirement: (requirement) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                requirements: [...(state.softwareContext.requirements || []), requirement]
              }
            : {
                requirements: [requirement]
              }
        }))
      },
      
      removeRequirement: (requirement) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                requirements: state.softwareContext.requirements?.filter(
                  req => req !== requirement
                )
              }
            : null
        }))
      },
      
      updateRequirements: (requirements) => {
        set((state) => ({
          softwareContext: state.softwareContext
            ? {
                ...state.softwareContext,
                requirements
              }
            : {
                requirements
              }
        }))
      },
    }),
    {
      name: 'software-context-store',
    }
  )
)
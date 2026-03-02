import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { Project } from '@/types'

interface ProjectState {
  // Current project
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  updateProject: (updates: Partial<Project>) => void
  
  // Save state
  isSaving: boolean
  setIsSaving: (saving: boolean) => void
  lastSaved: Date | null
  setLastSaved: (date: Date | null) => void
  
  // Load state
  isDataLoaded: boolean
  setIsDataLoaded: (loaded: boolean) => void
  
  // Auto-save
  autoSaveEnabled: boolean
  setAutoSaveEnabled: (enabled: boolean) => void
  triggerManualSave: () => void
  
  // Project metadata
  projectName: string
  setProjectName: (name: string) => void
  projectDescription: string
  setProjectDescription: (description: string) => void
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Current project
      currentProject: null,
      setCurrentProject: (project) => set({ currentProject: project }),
      updateProject: (updates) => {
        set((state) => ({
          currentProject: state.currentProject 
            ? { ...state.currentProject, ...updates }
            : null
        }))
      },
      
      // Save state
      isSaving: false,
      setIsSaving: (saving) => set({ isSaving: saving }),
      lastSaved: null,
      setLastSaved: (date) => set({ lastSaved: date }),
      
      // Load state
      isDataLoaded: false,
      setIsDataLoaded: (loaded) => set({ isDataLoaded: loaded }),
      
      // Auto-save
      autoSaveEnabled: true,
      setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),
      triggerManualSave: () => {
        // This will be connected to the actual save logic
        set({ isSaving: true })
        // The actual save implementation will be handled by the save hooks
      },
      
      // Project metadata
      projectName: '',
      setProjectName: (name) => {
        set({ projectName: name })
        const state = get()
        if (state.currentProject) {
          state.updateProject({ name })
        }
      },
      projectDescription: '',
      setProjectDescription: (description) => {
        set({ projectDescription: description })
        const state = get()
        if (state.currentProject) {
          state.updateProject({ description })
        }
      },
    })),
    {
      name: 'project-store',
    }
  )
)
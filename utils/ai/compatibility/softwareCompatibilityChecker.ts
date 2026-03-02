// Software-aware compatibility checker for ORBOH
// Integrates software context (GitHub libraries) with hardware compatibility analysis

import type { CanvasNode, SoftwareContext, DetectedLibrary, CompatibilityIssue } from '@/types'

// ============================================
// Software-Hardware Mapping Database
// ============================================

interface LibraryHardwareRequirement {
  requiredComponents: string[]
  incompatibleComponents: string[]
  minRAM?: string
  minCPU?: string
  recommendedGPU?: boolean
  supportedOS: string[]
  warnings: string[]
  recommendations: string[]
}

const LIBRARY_HARDWARE_MAP: Record<string, LibraryHardwareRequirement> = {
  // Arduino Libraries
  'WiFi.h': {
    requiredComponents: ['ESP32', 'ESP8266', 'WiFi Shield'],
    incompatibleComponents: ['Arduino Uno', 'Arduino Nano'],
    supportedOS: ['Arduino IDE', 'PlatformIO'],
    warnings: ['Arduino Uno does not have built-in WiFi capability'],
    recommendations: ['Use ESP32-WROOM-32 for WiFi functionality', 'Add WiFi shield to Arduino Uno']
  },
  'Servo.h': {
    requiredComponents: ['Servo Motor'],
    incompatibleComponents: [],
    supportedOS: ['Arduino IDE', 'PlatformIO'],
    warnings: ['Servo motors require PWM pins'],
    recommendations: ['Connect servo signal wire to PWM-capable pins (9, 10, 11 on Arduino Uno)']
  },
  'Wire.h': {
    requiredComponents: ['I2C Device'],
    incompatibleComponents: [],
    supportedOS: ['Arduino IDE', 'PlatformIO'],
    warnings: ['I2C requires SDA and SCL pins'],
    recommendations: ['Use pins A4 (SDA) and A5 (SCL) on Arduino Uno']
  },
  'SPI.h': {
    requiredComponents: ['SPI Device'],
    incompatibleComponents: [],
    supportedOS: ['Arduino IDE', 'PlatformIO'],
    warnings: ['SPI requires MOSI, MISO, SCK pins'],
    recommendations: ['Use pins 11 (MOSI), 12 (MISO), 13 (SCK) on Arduino Uno']
  },
  'Ethernet.h': {
    requiredComponents: ['Ethernet Shield', 'Ethernet Module'],
    incompatibleComponents: [],
    supportedOS: ['Arduino IDE', 'PlatformIO'],
    warnings: ['Requires wired network connection'],
    recommendations: ['Use Ethernet Shield W5100 or W5500']
  },
  'LiquidCrystal.h': {
    requiredComponents: ['LCD Display'],
    incompatibleComponents: [],
    supportedOS: ['Arduino IDE', 'PlatformIO'],
    warnings: ['LCD requires multiple digital pins'],
    recommendations: ['Use I2C LCD adapter to reduce pin usage']
  },

  // Python Libraries
  'opencv': {
    requiredComponents: ['Camera', 'High-performance CPU'],
    incompatibleComponents: [],
    minRAM: '2GB',
    recommendedGPU: true,
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: ['OpenCV requires significant computational resources'],
    recommendations: ['Use camera with good resolution', 'Consider GPU acceleration for real-time processing']
  },
  'opencv-python': {
    requiredComponents: ['Camera', 'High-performance CPU'],
    incompatibleComponents: [],
    minRAM: '2GB',
    recommendedGPU: true,
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: ['OpenCV requires significant computational resources'],
    recommendations: ['Use camera with good resolution', 'Consider GPU acceleration for real-time processing']
  },
  'tensorflow': {
    requiredComponents: ['High-performance CPU', 'GPU (recommended)'],
    incompatibleComponents: [],
    minRAM: '4GB',
    minCPU: 'Intel i5 8th gen or equivalent',
    recommendedGPU: true,
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: ['TensorFlow requires significant computational resources', 'Training models requires GPU'],
    recommendations: ['Use NVIDIA GPU with CUDA support', 'Minimum 8GB RAM recommended for training']
  },
  'torch': {
    requiredComponents: ['High-performance CPU', 'GPU (recommended)'],
    incompatibleComponents: [],
    minRAM: '4GB',
    minCPU: 'Intel i5 8th gen or equivalent',
    recommendedGPU: true,
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: ['PyTorch requires significant computational resources'],
    recommendations: ['Use NVIDIA GPU with CUDA support', 'Minimum 8GB RAM recommended']
  },
  'numpy': {
    requiredComponents: [],
    incompatibleComponents: [],
    minRAM: '1GB',
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: [],
    recommendations: ['Install optimized BLAS libraries for better performance']
  },
  'pandas': {
    requiredComponents: [],
    incompatibleComponents: [],
    minRAM: '2GB',
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: ['Large datasets require significant memory'],
    recommendations: ['Use chunking for large CSV files', 'Consider using Dask for very large datasets']
  },
  'matplotlib': {
    requiredComponents: ['Display'],
    incompatibleComponents: [],
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: [],
    recommendations: ['Install GUI backend for interactive plots']
  },
  'scikit-learn': {
    requiredComponents: [],
    incompatibleComponents: [],
    minRAM: '2GB',
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: ['Some algorithms require significant memory'],
    recommendations: ['Use feature selection to reduce memory usage']
  },

  // Node.js Libraries
  'express': {
    requiredComponents: [],
    incompatibleComponents: [],
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: [],
    recommendations: ['Use PM2 for production deployment']
  },
  'socket.io': {
    requiredComponents: ['Network Connection'],
    incompatibleComponents: [],
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: ['Requires stable network connection'],
    recommendations: ['Configure proper CORS settings', 'Use Redis adapter for multiple servers']
  },
  'serialport': {
    requiredComponents: ['Serial Device', 'USB Connection'],
    incompatibleComponents: [],
    supportedOS: ['Windows', 'macOS', 'Linux'],
    warnings: ['Requires proper serial port drivers'],
    recommendations: ['Check device manager for COM port assignments', 'Install FTDI drivers if needed']
  }
}

// ============================================
// Software Compatibility Analysis
// ============================================

export interface SoftwareCompatibilityResult {
  isCompatible: boolean
  issues: CompatibilityIssue[]
  recommendations: string[]
  requiredComponents: string[]
  systemRequirements: {
    minRAM?: string
    minCPU?: string
    recommendedGPU: boolean
    supportedOS: string[]
  }
}

/**
 * Analyze software compatibility based on detected libraries and system requirements
 */
export function checkSoftwareCompatibility(
  detectedLibraries: DetectedLibrary[],
  userRequirements: SoftwareContext['userRequirements'],
  availableComponents: Node<NodeData>
): SoftwareCompatibilityResult {
  const issues: CompatibilityIssue[] = []
  const recommendations: string[] = []
  const requiredComponents: string[] = []
  let recommendedGPU = false
  const supportedOS: string[] = []
  let minRAMValue = 0
  let minCPU = ''

  console.log(`🔍 Analyzing software compatibility for ${detectedLibraries.length} libraries`)

  for (const library of detectedLibraries) {
    const libraryReq = LIBRARY_HARDWARE_MAP[library.name.toLowerCase()]
    
    if (!libraryReq) {
      console.log(`⚠️ No hardware requirements found for library: ${library.name}`)
      continue
    }

    console.log(`📋 Processing library: ${library.name}`)

    // Check required components
    for (const requiredComp of libraryReq.requiredComponents) {
      requiredComponents.push(requiredComp)
      
      const hasComponent = availableComponents.some(comp => 
        comp.title.toLowerCase().includes(requiredComp.toLowerCase()) ||
        comp.modelNumber?.toLowerCase().includes(requiredComp.toLowerCase())
      )

      if (!hasComponent) {
        issues.push({
          type: 'software_hardware_mismatch',
          severity: 'critical',
          componentId: library.name,
          componentName: library.name,
          issue: `Library "${library.name}" requires "${requiredComp}" but it's not found in the system`,
          recommendation: `Add ${requiredComp} to your hardware configuration`,
          affectedComponents: [],
          affectedComponentNames: []
        })
      }
    }

    // Check incompatible components
    for (const incompatibleComp of libraryReq.incompatibleComponents) {
      const hasIncompatible = availableComponents.some(comp => 
        comp.title.toLowerCase().includes(incompatibleComp.toLowerCase()) ||
        comp.modelNumber?.toLowerCase().includes(incompatibleComp.toLowerCase())
      )

      if (hasIncompatible) {
        issues.push({
          type: 'software_hardware_mismatch',
          severity: 'critical',
          componentId: library.name,
          componentName: library.name,
          issue: `Library "${library.name}" is incompatible with "${incompatibleComp}"`,
          recommendation: `Replace ${incompatibleComp} with a compatible alternative or use a different library`,
          affectedComponents: [],
          affectedComponentNames: [incompatibleComp]
        })
      }
    }

    // Accumulate system requirements
    if (libraryReq.minRAM) {
      const ramValue = parseRAMValue(libraryReq.minRAM)
      if (ramValue > minRAMValue) {
        minRAMValue = ramValue
        minCPU = libraryReq.minRAM
      }
    }

    if (libraryReq.minCPU) {
      minCPU = libraryReq.minCPU
    }

    if (libraryReq.recommendedGPU) {
      recommendedGPU = true
    }

    // Collect supported OS
    libraryReq.supportedOS.forEach(os => {
      if (!supportedOS.includes(os)) {
        supportedOS.push(os)
      }
    })

    // Add library-specific recommendations
    libraryReq.recommendations.forEach(rec => {
      if (!recommendations.includes(rec)) {
        recommendations.push(rec)
      }
    })

    // Add warnings as info-level issues
    libraryReq.warnings.forEach(warning => {
      issues.push({
        type: 'software_requirement',
        severity: 'info',
        componentId: library.name,
        componentName: library.name,
        issue: warning,
        recommendation: `Consider this when implementing ${library.name}`,
        affectedComponents: [],
        affectedComponentNames: []
      })
    })
  }

  // Check user requirements against system requirements
  if (userRequirements.targetOS) {
    const userOS = userRequirements.targetOS.toLowerCase()
    const isOSSupported = supportedOS.some(os => 
      userOS.includes(os.toLowerCase()) || os.toLowerCase().includes('windows') && userOS.includes('windows')
    )

    if (supportedOS.length > 0 && !isOSSupported) {
      issues.push({
        type: 'software_requirement',
        severity: 'warning',
        componentId: 'system',
        componentName: 'Operating System',
        issue: `Target OS "${userRequirements.targetOS}" may not be supported by all detected libraries`,
        recommendation: `Verify compatibility with: ${supportedOS.join(', ')}`,
        affectedComponents: [],
        affectedComponentNames: []
      })
    }
  }

  // Check RAM requirements
  if (userRequirements.targetRAM && minRAMValue > 0) {
    const userRAM = parseRAMValue(userRequirements.targetRAM)
    if (userRAM < minRAMValue) {
      issues.push({
        type: 'software_requirement',
        severity: 'warning',
        componentId: 'system',
        componentName: 'System Memory',
        issue: `Target RAM "${userRequirements.targetRAM}" may be insufficient for detected libraries`,
        recommendation: `Consider upgrading to at least ${formatRAMValue(minRAMValue)}`,
        affectedComponents: [],
        affectedComponentNames: []
      })
    }
  }

  // Check GPU requirements
  if (recommendedGPU && !userRequirements.targetGPU) {
    issues.push({
      type: 'software_requirement',
      severity: 'warning',
      componentId: 'system',
      componentName: 'Graphics Processing',
      issue: 'Detected libraries recommend GPU acceleration but no GPU specified',
      recommendation: 'Consider adding a GPU for optimal performance (e.g., NVIDIA GTX/RTX series)',
      affectedComponents: [],
      affectedComponentNames: []
    })
  }

  const result: SoftwareCompatibilityResult = {
    isCompatible: issues.filter(issue => issue.severity === 'critical').length === 0,
    issues,
    recommendations,
    requiredComponents: [...new Set(requiredComponents)],
    systemRequirements: {
      minRAM: minRAMValue > 0 ? formatRAMValue(minRAMValue) : undefined,
      minCPU,
      recommendedGPU,
      supportedOS
    }
  }

  console.log(`✅ Software compatibility analysis complete: ${issues.length} issues found`)
  return result
}

// ============================================
// Utility Functions
// ============================================

function parseRAMValue(ramString: string): number {
  const match = ramString.match(/(\d+)\s*(GB|MB|KB)/i)
  if (!match) return 0
  
  const value = parseInt(match[1])
  const unit = match[2].toUpperCase()
  
  switch (unit) {
    case 'GB': return value * 1024
    case 'MB': return value
    case 'KB': return value / 1024
    default: return 0
  }
}

function formatRAMValue(mbValue: number): string {
  if (mbValue >= 1024) {
    return `${Math.ceil(mbValue / 1024)}GB`
  }
  return `${mbValue}MB`
}

/**
 * Get hardware recommendations for a specific library
 */
export function getLibraryHardwareRecommendations(libraryName: string): LibraryHardwareRequirement | null {
  return LIBRARY_HARDWARE_MAP[libraryName.toLowerCase()] || null
}

/**
 * Get all supported libraries
 */
export function getSupportedLibraries(): string[] {
  return Object.keys(LIBRARY_HARDWARE_MAP)
}

/**
 * Quick check if a library has known hardware requirements
 */
export function hasHardwareRequirements(libraryName: string): boolean {
  return libraryName.toLowerCase() in LIBRARY_HARDWARE_MAP
}
// GitHub解析によるライブラリ自動検出機能
// リポジトリからArduino、Python、Node.jsライブラリを抽出

import type { DetectedLibrary, LibraryType } from '@/types'

// ============================================
// メイン解析関数
// ============================================

export async function analyzeGitHubLibraries(repoUrl: string): Promise<DetectedLibrary[]> {
  try {
    console.log('🔍 GitHub解析開始:', repoUrl)
    
    const repoData = await fetchGitHubRepoData(repoUrl)
    const libraries: DetectedLibrary[] = []
    
    // Arduino (.ino, .cpp files)
    libraries.push(...extractArduinoLibraries(repoData))
    
    // Python (requirements.txt, import statements)
    libraries.push(...extractPythonLibraries(repoData))
    
    // Node.js (package.json)
    libraries.push(...extractNodeLibraries(repoData))
    
    // C++ (CMakeLists.txt, includes)
    libraries.push(...extractCppLibraries(repoData))
    
    const uniqueLibraries = deduplicateLibraries(libraries)
    console.log('✅ GitHub解析完了:', uniqueLibraries.length, 'ライブラリを検出')
    
    return uniqueLibraries
    
  } catch (error) {
    console.error('GitHub解析エラー:', error)
    throw new Error('リポジトリの解析に失敗しました')
  }
}

// ============================================
// GitHub API連携
// ============================================

interface GitHubFile {
  name: string
  content: string
  path: string
}

interface GitHubRepoData {
  files: GitHubFile[]
  language: string
  topics: string[]
}

async function fetchGitHubRepoData(repoUrl: string): Promise<GitHubRepoData> {
  // GitHub APIを使ってリポジトリデータを取得
  // 現在はモックデータを返す（実装時にGitHub APIに置き換え）
  
  console.log('📡 GitHub APIからデータ取得中...')
  
  // モックデータ（実際の実装時はGitHub API呼び出しに置き換え）
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    files: [
      {
        name: 'main.ino',
        path: 'main.ino',
        content: `
#include <WiFi.h>
#include <Servo.h>
#include <Wire.h>
#include <LiquidCrystal.h>
#include <DHT.h>

void setup() {
  // Arduino setup code
}

void loop() {
  // Arduino loop code
}
        `
      },
      {
        name: 'requirements.txt',
        path: 'requirements.txt',
        content: `
numpy==1.21.0
opencv-python==4.5.3
tensorflow==2.6.0
requests==2.26.0
matplotlib==3.4.3
        `
      },
      {
        name: 'package.json',
        path: 'package.json',
        content: `
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.5.0",
    "serialport": "^10.4.0"
  }
}
        `
      }
    ],
    language: 'C++',
    topics: ['arduino', 'iot', 'sensors']
  }
}

// ============================================
// Arduino ライブラリ解析
// ============================================

function extractArduinoLibraries(repoData: GitHubRepoData): DetectedLibrary[] {
  const libraries: DetectedLibrary[] = []
  
  // .ino, .cpp ファイルから #include を抽出
  const sourceFiles = repoData.files.filter(f => 
    f.name.endsWith('.ino') || f.name.endsWith('.cpp') || f.name.endsWith('.h')
  )
  
  sourceFiles.forEach(file => {
    const includes = extractIncludeStatements(file.content)
    
    includes.forEach(include => {
      // 標準ライブラリかサードパーティライブラリかを判定
      if (!isStandardArduinoLibrary(include)) {
        libraries.push({
          name: include.replace('.h', ''),
          type: 'arduino',
          purpose: guessArduinoLibraryPurpose(include),
          hardwareRequirements: guessArduinoHardwareRequirements(include)
        })
      }
    })
  })
  
  return libraries
}

function extractIncludeStatements(content: string): string[] {
  const includeRegex = /#include\s*[<"']([^>"']+)[>"']/g
  const includes: string[] = []
  let match
  
  while ((match = includeRegex.exec(content)) !== null) {
    includes.push(match[1])
  }
  
  return includes
}

function isStandardArduinoLibrary(libraryName: string): boolean {
  const standardLibraries = [
    'Arduino.h', 'avr/io.h', 'avr/interrupt.h', 'EEPROM.h', 
    'SoftwareSerial.h', 'HardwareSerial.h'
  ]
  return standardLibraries.includes(libraryName)
}

function guessArduinoLibraryPurpose(libraryName: string): string {
  const purposeMap: Record<string, string> = {
    'WiFi.h': 'networking',
    'Servo.h': 'motor_control',
    'Wire.h': 'i2c_communication',
    'SPI.h': 'spi_communication',
    'LiquidCrystal.h': 'display_control',
    'LiquidCrystal_I2C.h': 'display_control',
    'DHT.h': 'sensor_reading',
    'DHT22.h': 'sensor_reading',
    'OneWire.h': 'sensor_communication',
    'DallasTemperature.h': 'sensor_reading',
    'Adafruit_NeoPixel.h': 'led_control',
    'FastLED.h': 'led_control',
    'SD.h': 'data_storage',
    'Ethernet.h': 'networking',
    'ESP8266WiFi.h': 'networking',
    'BluetoothSerial.h': 'wireless_communication',
    'PubSubClient.h': 'mqtt_communication',
    'ArduinoJson.h': 'data_processing',
    'AccelStepper.h': 'motor_control',
    'Stepper.h': 'motor_control'
  }
  
  return purposeMap[libraryName] || 'unknown'
}

function guessArduinoHardwareRequirements(libraryName: string): string[] {
  const hardwareMap: Record<string, string[]> = {
    'WiFi.h': ['WiFi Module', 'ESP32 or WiFi Shield'],
    'Servo.h': ['Servo Motor', 'PWM Pins'],
    'Wire.h': ['I2C Compatible Device'],
    'SPI.h': ['SPI Compatible Device'], 
    'LiquidCrystal.h': ['LCD Display', 'Digital Pins'],
    'LiquidCrystal_I2C.h': ['I2C LCD Display'],
    'DHT.h': ['DHT11/DHT22 Sensor'],
    'OneWire.h': ['OneWire Device', 'DS18B20 Sensor'],
    'Adafruit_NeoPixel.h': ['WS2812B LED Strip'],
    'FastLED.h': ['Addressable LED Strip'],
    'SD.h': ['SD Card Module', 'SPI Interface'],
    'Ethernet.h': ['Ethernet Shield', 'RJ45 Connector'],
    'ESP8266WiFi.h': ['ESP8266 Module'],
    'BluetoothSerial.h': ['Bluetooth Module', 'ESP32'],
    'AccelStepper.h': ['Stepper Motor', 'Motor Driver'],
    'Stepper.h': ['Stepper Motor', 'Digital Pins']
  }
  
  return hardwareMap[libraryName] || []
}

// ============================================
// Python ライブラリ解析
// ============================================

function extractPythonLibraries(repoData: GitHubRepoData): DetectedLibrary[] {
  const libraries: DetectedLibrary[] = []
  
  // requirements.txt の解析
  const requirementsFile = repoData.files.find(f => f.name === 'requirements.txt')
  if (requirementsFile) {
    const lines = requirementsFile.content.split('\n')
    lines.forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([a-zA-Z0-9\-_]+)(==|>=|<=)?([\d.]+)?/)
        if (match) {
          libraries.push({
            name: match[1],
            version: match[3],
            type: 'python',
            purpose: guessPythonLibraryPurpose(match[1]),
            hardwareRequirements: guessPythonHardwareRequirements(match[1])
          })
        }
      }
    })
  }
  
  // Python files for import statements
  const pythonFiles = repoData.files.filter(f => f.name.endsWith('.py'))
  pythonFiles.forEach(file => {
    const imports = extractPythonImports(file.content)
    imports.forEach(importName => {
      if (!isPythonStandardLibrary(importName)) {
        libraries.push({
          name: importName,
          type: 'python',
          purpose: guessPythonLibraryPurpose(importName),
          hardwareRequirements: guessPythonHardwareRequirements(importName)
        })
      }
    })
  })
  
  return libraries
}

function extractPythonImports(content: string): string[] {
  const importRegex = /^import\s+([a-zA-Z0-9_]+)|^from\s+([a-zA-Z0-9_]+)\s+import/gm
  const imports: string[] = []
  let match
  
  while ((match = importRegex.exec(content)) !== null) {
    const importName = match[1] || match[2]
    if (importName) {
      imports.push(importName)
    }
  }
  
  return imports
}

function isPythonStandardLibrary(libraryName: string): boolean {
  const standardLibraries = [
    'os', 'sys', 'json', 'time', 'datetime', 'math', 're', 'random',
    'collections', 'itertools', 'functools', 'pathlib', 'urllib'
  ]
  return standardLibraries.includes(libraryName)
}

function guessPythonLibraryPurpose(libraryName: string): string {
  const purposeMap: Record<string, string> = {
    'opencv': 'image_processing',
    'cv2': 'image_processing',
    'tensorflow': 'machine_learning',
    'torch': 'machine_learning',
    'pytorch': 'machine_learning',
    'numpy': 'data_processing',
    'pandas': 'data_analysis',
    'matplotlib': 'data_visualization',
    'requests': 'http_communication',
    'flask': 'web_server',
    'django': 'web_framework',
    'serial': 'serial_communication',
    'pyserial': 'serial_communication',
    'pygame': 'game_development',
    'tkinter': 'gui_development',
    'pillow': 'image_processing',
    'scikit': 'machine_learning',
    'scipy': 'scientific_computing'
  }
  
  const lowerName = libraryName.toLowerCase()
  for (const [key, purpose] of Object.entries(purposeMap)) {
    if (lowerName.includes(key)) {
      return purpose
    }
  }
  
  return 'unknown'
}

function guessPythonHardwareRequirements(libraryName: string): string[] {
  const hardwareMap: Record<string, string[]> = {
    'opencv': ['Camera', 'High-performance CPU'],
    'cv2': ['Camera', 'High-performance CPU'],
    'tensorflow': ['GPU (Recommended)', 'High RAM (8GB+)'],
    'torch': ['GPU (Recommended)', 'High RAM (8GB+)'],
    'pygame': ['Display', 'Input Devices'],
    'serial': ['Serial Device', 'USB/UART Interface'],
    'pyserial': ['Serial Device', 'USB/UART Interface']
  }
  
  const lowerName = libraryName.toLowerCase()
  for (const [key, hardware] of Object.entries(hardwareMap)) {
    if (lowerName.includes(key)) {
      return hardware
    }
  }
  
  return []
}

// ============================================
// Node.js ライブラリ解析
// ============================================

function extractNodeLibraries(repoData: GitHubRepoData): DetectedLibrary[] {
  const libraries: DetectedLibrary[] = []
  
  const packageJsonFile = repoData.files.find(f => f.name === 'package.json')
  if (packageJsonFile) {
    try {
      const packageData = JSON.parse(packageJsonFile.content)
      const dependencies = {
        ...packageData.dependencies,
        ...packageData.devDependencies
      }
      
      Object.entries(dependencies).forEach(([name, version]) => {
        libraries.push({
          name,
          version: String(version).replace(/^\^|~/, ''), // Remove version prefixes
          type: 'nodejs',
          purpose: guessNodeLibraryPurpose(name),
          hardwareRequirements: guessNodeHardwareRequirements(name)
        })
      })
    } catch (error) {
      console.error('package.json解析エラー:', error)
    }
  }
  
  return libraries
}

function guessNodeLibraryPurpose(libraryName: string): string {
  const purposeMap: Record<string, string> = {
    'express': 'web_server',
    'socket.io': 'real_time_communication',
    'serialport': 'serial_communication',
    'johnny-five': 'hardware_control',
    'node-red': 'visual_programming',
    'mqtt': 'mqtt_communication',
    'ws': 'websocket_communication',
    'http': 'http_communication',
    'fs': 'file_system',
    'path': 'file_system'
  }
  
  return purposeMap[libraryName] || 'unknown'
}

function guessNodeHardwareRequirements(libraryName: string): string[] {
  const hardwareMap: Record<string, string[]> = {
    'serialport': ['Serial Device', 'USB/UART Interface'],
    'johnny-five': ['Arduino Compatible Board', 'USB Connection'],
    'node-red': ['Network Connection', 'Web Interface']
  }
  
  return hardwareMap[libraryName] || []
}

// ============================================
// C++ ライブラリ解析
// ============================================

function extractCppLibraries(repoData: GitHubRepoData): DetectedLibrary[] {
  const libraries: DetectedLibrary[] = []
  
  // CMakeLists.txt の解析
  const cmakeFile = repoData.files.find(f => f.name === 'CMakeLists.txt')
  if (cmakeFile) {
    const findPackageRegex = /find_package\(([^)]+)\)/g
    let match
    
    while ((match = findPackageRegex.exec(cmakeFile.content)) !== null) {
      const packageName = match[1].split(' ')[0] // Take first part before any version
      libraries.push({
        name: packageName,
        type: 'cpp',
        purpose: guessCppLibraryPurpose(packageName),
        hardwareRequirements: guessCppHardwareRequirements(packageName)
      })
    }
  }
  
  return libraries
}

function guessCppLibraryPurpose(libraryName: string): string {
  const purposeMap: Record<string, string> = {
    'OpenCV': 'image_processing',
    'Boost': 'utility_library',
    'Qt': 'gui_framework',
    'SDL': 'multimedia_library'
  }
  
  return purposeMap[libraryName] || 'unknown'
}

function guessCppHardwareRequirements(libraryName: string): string[] {
  const hardwareMap: Record<string, string[]> = {
    'OpenCV': ['Camera', 'High-performance CPU'],
    'Qt': ['Display', 'Input Devices'],
    'SDL': ['Display', 'Audio Device']
  }
  
  return hardwareMap[libraryName] || []
}

// ============================================
// ユーティリティ関数
// ============================================

function deduplicateLibraries(libraries: DetectedLibrary[]): DetectedLibrary[] {
  const seen = new Set<string>()
  const unique: DetectedLibrary[] = []
  
  libraries.forEach(lib => {
    const key = `${lib.name}_${lib.type}`
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(lib)
    }
  })
  
  return unique
}
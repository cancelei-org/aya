// 🧪 互換性チェック機能のテスト
// Node.jsで実行可能なシンプルなテスト

const { checkSystemCompatibility, checkVoltageCompatibility } = require('../utils/compatibilityChecker.ts')

// テスト用のダミー部品データ
const testComponents = [
  {
    id: 'arduino1',
    title: 'Arduino Uno',
    voltage: '5V',
    communication: 'I2C, SPI, UART',
    x: 0, y: 0, type: 'primary', inputs: 0, outputs: 0
  },
  {
    id: 'esp32_1', 
    title: 'ESP32',
    voltage: '3.3V',
    communication: 'WiFi, Bluetooth, I2C',
    x: 0, y: 0, type: 'primary', inputs: 0, outputs: 0
  },
  {
    id: 'led1',
    title: 'LED Strip',
    voltage: '12V',
    communication: 'PWM',
    x: 0, y: 0, type: 'secondary', inputs: 1, outputs: 0
  },
  {
    id: 'sensor1',
    title: 'Temperature Sensor',
    voltage: '3.3V',
    communication: 'I2C',
    x: 0, y: 0, type: 'secondary', inputs: 0, outputs: 1
  }
]

console.log('🧪 互換性チェックテスト開始')
console.log('=====================================')

// テスト1: 全体的な互換性チェック
console.log('📋 テスト1: 全体的な互換性チェック')
try {
  const result = checkSystemCompatibility(testComponents)
  console.log('結果:', result.summary)
  console.log('互換性:', result.isCompatible ? '✅ OK' : '❌ NG')
  console.log('問題数:', result.issues.length)
  
  result.issues.forEach((issue, index) => {
    console.log(`  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.componentName}`)
    console.log(`     問題: ${issue.issue}`)
    console.log(`     推奨: ${issue.recommendation}`)
  })
} catch (error) {
  console.log('❌ エラー:', error.message)
}

console.log('')

// テスト2: 電圧チェックのみ
console.log('📋 テスト2: 電圧互換性チェック')
try {
  const voltageIssues = checkVoltageCompatibility(testComponents)
  console.log('電圧問題数:', voltageIssues.length)
  
  voltageIssues.forEach((issue, index) => {
    console.log(`  ${index + 1}. ${issue.componentName}: ${issue.issue}`)
  })
} catch (error) {
  console.log('❌ エラー:', error.message)
}

console.log('')

// テスト3: 正常な組み合わせ
console.log('📋 テスト3: 正常な組み合わせ')
const compatibleComponents = [
  {
    id: 'arduino2',
    title: 'Arduino Uno',
    voltage: '5V',
    communication: 'I2C',
    x: 0, y: 0, type: 'primary', inputs: 0, outputs: 0
  },
  {
    id: 'sensor2',
    title: 'Compatible Sensor',
    voltage: '5V',
    communication: 'I2C',
    x: 0, y: 0, type: 'secondary', inputs: 0, outputs: 1
  }
]

try {
  const result = checkSystemCompatibility(compatibleComponents)
  console.log('結果:', result.summary)
  console.log('問題数:', result.issues.length)
} catch (error) {
  console.log('❌ エラー:', error.message)
}

console.log('')
console.log('🎉 テスト完了')
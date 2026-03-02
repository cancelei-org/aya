// Port number estimation logic based on communication methods and component types

interface PortEstimation {
  inputs: number
  outputs: number
  rationale: string
}

/**
 * Estimate the number of input and output ports for a component
 * based on its communication methods, category, and name
 */
export function estimatePortNumbers(
  communication: string | undefined,
  category: string,
  partName: string
): PortEstimation {
  // Default port configurations by category
  const categoryDefaults: Record<string, PortEstimation> = {
    control: { 
      inputs: 2, 
      outputs: 4, 
      rationale: 'Control boards typically have power input and multiple I/O pins' 
    },
    sensor: { 
      inputs: 1, 
      outputs: 1, 
      rationale: 'Sensors usually have power input and signal output' 
    },
    actuator: { 
      inputs: 2, 
      outputs: 0, 
      rationale: 'Actuators receive power and control signals' 
    },
    power: { 
      inputs: 1, 
      outputs: 3, 
      rationale: 'Power supplies distribute to multiple components' 
    },
    communication: { 
      inputs: 2, 
      outputs: 2, 
      rationale: 'Communication modules typically have bidirectional data flow' 
    },
    mechanical: { 
      inputs: 0, 
      outputs: 0, 
      rationale: 'Mechanical components may not have electrical connections' 
    },
    vision: { 
      inputs: 1, 
      outputs: 1, 
      rationale: 'Vision systems have power input and data output' 
    },
    computing: { 
      inputs: 3, 
      outputs: 5, 
      rationale: 'Computing platforms have multiple I/O options' 
    }
  }
  
  // Start with category defaults or generic default
  const estimation = { ...categoryDefaults[category.toLowerCase()] } || { 
    inputs: 1, 
    outputs: 1, 
    rationale: 'Default configuration' 
  }
  
  // Analyze communication methods
  const commMethods = communication?.toLowerCase() || ''
  
  // Adjust based on communication protocols
  if (commMethods.includes('i2c') || commMethods.includes('spi')) {
    estimation.inputs += 1
    estimation.outputs += 1
    estimation.rationale += '; Added I2C/SPI communication ports'
  }
  
  if (commMethods.includes('uart') || commMethods.includes('serial')) {
    estimation.inputs += 1
    estimation.outputs += 1
    estimation.rationale += '; Added UART/Serial ports'
  }
  
  if (commMethods.includes('usb')) {
    estimation.inputs += 1
    estimation.rationale += '; Added USB port'
  }
  
  if (commMethods.includes('pwm')) {
    estimation.outputs += 1
    estimation.rationale += '; Added PWM output'
  }
  
  if (commMethods.includes('analog')) {
    estimation.inputs += 2
    estimation.rationale += '; Added analog inputs'
  }
  
  // Specific component overrides based on common patterns
  const lowerPartName = partName.toLowerCase()
  
  // Arduino boards
  if (lowerPartName.includes('arduino')) {
    if (lowerPartName.includes('uno')) {
      return { 
        inputs: 3, 
        outputs: 6, 
        rationale: 'Arduino Uno: power, 14 digital pins (6 PWM), 6 analog inputs' 
      }
    }
    if (lowerPartName.includes('mega')) {
      return { 
        inputs: 5, 
        outputs: 10, 
        rationale: 'Arduino Mega: more I/O pins than Uno' 
      }
    }
    if (lowerPartName.includes('nano')) {
      return { 
        inputs: 2, 
        outputs: 4, 
        rationale: 'Arduino Nano: compact with fewer pins' 
      }
    }
  }
  
  // Raspberry Pi
  if (lowerPartName.includes('raspberry pi')) {
    return { 
      inputs: 4, 
      outputs: 8, 
      rationale: 'Raspberry Pi: GPIO pins, USB, HDMI, network' 
    }
  }
  
  // Motor controllers
  if (lowerPartName.includes('motor driver') || lowerPartName.includes('motor controller')) {
    return { 
      inputs: 3, 
      outputs: 2, 
      rationale: 'Motor driver: power, control signals in, motor outputs' 
    }
  }
  
  // Servo motors
  if (lowerPartName.includes('servo')) {
    return { 
      inputs: 3, 
      outputs: 0, 
      rationale: 'Servo: power, ground, and PWM signal inputs' 
    }
  }
  
  // Sensors with specific patterns
  if (category === 'sensor') {
    if (lowerPartName.includes('imu') || lowerPartName.includes('accelerometer')) {
      return { 
        inputs: 1, 
        outputs: 2, 
        rationale: 'IMU/Accelerometer: power in, I2C/SPI data out' 
      }
    }
    if (lowerPartName.includes('ultrasonic')) {
      return { 
        inputs: 2, 
        outputs: 1, 
        rationale: 'Ultrasonic sensor: power, trigger in, echo out' 
      }
    }
  }
  
  // Ensure minimum port counts
  estimation.inputs = Math.max(1, estimation.inputs)
  estimation.outputs = Math.max(0, estimation.outputs)
  
  return estimation
}

/**
 * Get a human-readable description of port configuration
 */
export function getPortDescription(estimation: PortEstimation): string {
  const { inputs, outputs, rationale } = estimation
  
  if (inputs === 0 && outputs === 0) {
    return 'No electrical connections'
  }
  
  const parts = []
  if (inputs > 0) {
    parts.push(`${inputs} input${inputs > 1 ? 's' : ''}`)
  }
  if (outputs > 0) {
    parts.push(`${outputs} output${outputs > 1 ? 's' : ''}`)
  }
  
  return `${parts.join(', ')} - ${rationale}`
}
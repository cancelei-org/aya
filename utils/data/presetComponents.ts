// 事前登録マイコンボードの仕様データ
// これらの頻繁に使用される部品は、AI推論を使わずに即座に仕様を取得できます
// 価格と購入リンクは引き続きGoogle Custom Search APIで動的に取得されます

export interface PresetComponent {
  partName: string;
  modelNumber?: string;
  category: string;
  manufacturer: string;
  specification: {
    voltage?: {
      operating?: string[];
      input?: { min: number; max: number };
    };
    power?: {
      consumption?: {
        typical: number;
        max: number;
      };
    };
    communication?: {
      protocols?: string[];
      connectors?: Array<{
        type: string;
        count: number;
        version?: string;
        purpose?: string;
      }>;
    };
    io?: {
      digital?: number;
      analog?: number;
      pwm?: number;
    };
    memory?: {
      flash?: string;
      ram?: string;
      eeprom?: string;
    };
    clock?: {
      frequency?: string;
    };
    physical?: {
      dimensions?: { length: number; width: number; height?: number };
      weight?: number;
    };
  };
  dynamicPorts?: any; // ポート設定は後で生成
}

export const PRESET_COMPONENTS: PresetComponent[] = [
  // ========================================
  // Raspberry Pi シリーズ
  // ========================================
  {
    partName: "Raspberry Pi 4 Model B",
    modelNumber: "RPI4-MODBP",
    category: "microcontroller",
    manufacturer: "Raspberry Pi Foundation",
    specification: {
      voltage: {
        operating: ["5V"],
        input: { min: 4.75, max: 5.25 }
      },
      power: {
        consumption: { typical: 3000, max: 7000 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "Ethernet", "WiFi", "Bluetooth"],
        connectors: [
          { type: "USB-C", count: 1, purpose: "Power" },
          { type: "USB-A", count: 2, version: "3.0" },
          { type: "USB-A", count: 2, version: "2.0" },
          { type: "Micro-HDMI", count: 2, version: "2.0" },
          { type: "RJ45", count: 1, purpose: "Ethernet" },
          { type: "GPIO", count: 40, purpose: "GPIO Header" }
        ]
      },
      io: {
        digital: 26,
        analog: 0,
        pwm: 4
      },
      memory: {
        ram: "1GB/2GB/4GB/8GB LPDDR4"
      },
      clock: {
        frequency: "1.5GHz"
      }
    }
  },
  {
    partName: "Raspberry Pi 3 Model B+",
    modelNumber: "RPI3-MODBP",
    category: "microcontroller",
    manufacturer: "Raspberry Pi Foundation",
    specification: {
      voltage: {
        operating: ["5V"],
        input: { min: 4.75, max: 5.25 }
      },
      power: {
        consumption: { typical: 2500, max: 5000 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "Ethernet", "WiFi", "Bluetooth"],
        connectors: [
          { type: "Micro-USB", count: 1, purpose: "Power" },
          { type: "USB-A", count: 4, version: "2.0" },
          { type: "HDMI", count: 1, version: "1.4" },
          { type: "RJ45", count: 1, purpose: "Ethernet" },
          { type: "GPIO", count: 40, purpose: "GPIO Header" }
        ]
      },
      io: {
        digital: 26,
        analog: 0,
        pwm: 4
      },
      memory: {
        ram: "1GB LPDDR2"
      },
      clock: {
        frequency: "1.4GHz"
      }
    }
  },
  {
    partName: "Raspberry Pi Zero W",
    modelNumber: "RPI-ZERO-W",
    category: "microcontroller",
    manufacturer: "Raspberry Pi Foundation",
    specification: {
      voltage: {
        operating: ["5V"],
        input: { min: 4.75, max: 5.25 }
      },
      power: {
        consumption: { typical: 700, max: 1200 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "WiFi", "Bluetooth"],
        connectors: [
          { type: "Micro-USB", count: 2, purpose: "Power/USB" },
          { type: "Mini-HDMI", count: 1, version: "1.4" },
          { type: "GPIO", count: 40, purpose: "GPIO Header" }
        ]
      },
      io: {
        digital: 26,
        analog: 0,
        pwm: 2
      },
      memory: {
        ram: "512MB"
      },
      clock: {
        frequency: "1GHz"
      }
    }
  },
  {
    partName: "Raspberry Pi Pico",
    modelNumber: "SC0915",
    category: "microcontroller",
    manufacturer: "Raspberry Pi Foundation",
    specification: {
      voltage: {
        operating: ["3.3V"],
        input: { min: 1.8, max: 5.5 }
      },
      power: {
        consumption: { typical: 93, max: 150 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM"],
        connectors: [
          { type: "Micro-USB", count: 1, version: "1.1", purpose: "Power/Programming" },
          { type: "GPIO", count: 40, purpose: "GPIO Header" }
        ]
      },
      io: {
        digital: 26,
        analog: 3,
        pwm: 16
      },
      memory: {
        flash: "2MB",
        ram: "264KB"
      },
      clock: {
        frequency: "133MHz"
      }
    }
  },
  {
    partName: "Raspberry Pi Pico W",
    modelNumber: "SC0918",
    category: "microcontroller",
    manufacturer: "Raspberry Pi Foundation",
    specification: {
      voltage: {
        operating: ["3.3V"],
        input: { min: 1.8, max: 5.5 }
      },
      power: {
        consumption: { typical: 100, max: 200 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM", "WiFi", "Bluetooth"],
        connectors: [
          { type: "Micro-USB", count: 1, version: "1.1", purpose: "Power/Programming" },
          { type: "GPIO", count: 40, purpose: "GPIO Header" }
        ]
      },
      io: {
        digital: 26,
        analog: 3,
        pwm: 16
      },
      memory: {
        flash: "2MB",
        ram: "264KB"
      },
      clock: {
        frequency: "133MHz"
      }
    }
  },

  // ========================================
  // Arduino シリーズ
  // ========================================
  {
    partName: "Arduino Uno R3",
    modelNumber: "A000066",
    category: "microcontroller",
    manufacturer: "Arduino",
    specification: {
      voltage: {
        operating: ["5V"],
        input: { min: 7, max: 12 }
      },
      power: {
        consumption: { typical: 50, max: 200 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM"],
        connectors: [
          { type: "USB-B", count: 1, version: "2.0", purpose: "Programming" },
          { type: "DC Jack", count: 1, purpose: "Power" },
          { type: "GPIO", count: 20, purpose: "Digital/Analog Pins" }
        ]
      },
      io: {
        digital: 14,
        analog: 6,
        pwm: 6
      },
      memory: {
        flash: "32KB",
        ram: "2KB",
        eeprom: "1KB"
      },
      clock: {
        frequency: "16MHz"
      }
    }
  },
  {
    partName: "Arduino Nano",
    modelNumber: "A000005",
    category: "microcontroller",
    manufacturer: "Arduino",
    specification: {
      voltage: {
        operating: ["5V"],
        input: { min: 7, max: 12 }
      },
      power: {
        consumption: { typical: 30, max: 100 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM"],
        connectors: [
          { type: "Mini-USB", count: 1, version: "2.0", purpose: "Programming" },
          { type: "GPIO", count: 30, purpose: "Pin Headers" }
        ]
      },
      io: {
        digital: 14,
        analog: 8,
        pwm: 6
      },
      memory: {
        flash: "32KB",
        ram: "2KB",
        eeprom: "1KB"
      },
      clock: {
        frequency: "16MHz"
      }
    }
  },
  {
    partName: "Arduino Mega 2560",
    modelNumber: "A000067",
    category: "microcontroller",
    manufacturer: "Arduino",
    specification: {
      voltage: {
        operating: ["5V"],
        input: { min: 7, max: 12 }
      },
      power: {
        consumption: { typical: 70, max: 300 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM"],
        connectors: [
          { type: "USB-B", count: 1, version: "2.0", purpose: "Programming" },
          { type: "DC Jack", count: 1, purpose: "Power" },
          { type: "GPIO", count: 86, purpose: "Digital/Analog Pins" }
        ]
      },
      io: {
        digital: 54,
        analog: 16,
        pwm: 15
      },
      memory: {
        flash: "256KB",
        ram: "8KB",
        eeprom: "4KB"
      },
      clock: {
        frequency: "16MHz"
      }
    }
  },

  // ========================================
  // ESP シリーズ
  // ========================================
  {
    partName: "ESP32-DevKitC",
    modelNumber: "ESP32-DEVKITC-32E",
    category: "microcontroller",
    manufacturer: "Espressif",
    specification: {
      voltage: {
        operating: ["3.3V"],
        input: { min: 3.0, max: 3.6 }
      },
      power: {
        consumption: { typical: 100, max: 500 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM", "WiFi", "Bluetooth", "BLE"],
        connectors: [
          { type: "Micro-USB", count: 1, version: "2.0", purpose: "Programming/Power" },
          { type: "GPIO", count: 38, purpose: "Pin Headers" }
        ]
      },
      io: {
        digital: 34,
        analog: 18,
        pwm: 16
      },
      memory: {
        flash: "4MB",
        ram: "520KB"
      },
      clock: {
        frequency: "240MHz"
      }
    }
  },
  {
    partName: "ESP32-CAM",
    modelNumber: "ESP32-CAM",
    category: "microcontroller",
    manufacturer: "AI-Thinker",
    specification: {
      voltage: {
        operating: ["3.3V", "5V"],
        input: { min: 3.0, max: 5.0 }
      },
      power: {
        consumption: { typical: 180, max: 600 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "PWM", "WiFi", "Bluetooth"],
        connectors: [
          { type: "GPIO", count: 16, purpose: "Pin Headers" },
          { type: "Camera Connector", count: 1, purpose: "OV2640 Camera" }
        ]
      },
      io: {
        digital: 10,
        analog: 6,
        pwm: 8
      },
      memory: {
        flash: "4MB",
        ram: "520KB",
        eeprom: "External MicroSD"
      },
      clock: {
        frequency: "240MHz"
      }
    }
  },
  {
    partName: "ESP8266 NodeMCU",
    modelNumber: "NodeMCU V3",
    category: "microcontroller",
    manufacturer: "NodeMCU",
    specification: {
      voltage: {
        operating: ["3.3V"],
        input: { min: 4.5, max: 10 }
      },
      power: {
        consumption: { typical: 80, max: 170 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM", "WiFi"],
        connectors: [
          { type: "Micro-USB", count: 1, version: "2.0", purpose: "Programming/Power" },
          { type: "GPIO", count: 30, purpose: "Pin Headers" }
        ]
      },
      io: {
        digital: 11,
        analog: 1,
        pwm: 10
      },
      memory: {
        flash: "4MB",
        ram: "128KB"
      },
      clock: {
        frequency: "80MHz/160MHz"
      }
    }
  },

  // ========================================
  // STM32 シリーズ
  // ========================================
  {
    partName: "STM32 Nucleo-F401RE",
    modelNumber: "NUCLEO-F401RE",
    category: "microcontroller",
    manufacturer: "STMicroelectronics",
    specification: {
      voltage: {
        operating: ["3.3V"],
        input: { min: 7, max: 12 }
      },
      power: {
        consumption: { typical: 100, max: 300 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM", "CAN"],
        connectors: [
          { type: "Micro-USB", count: 1, version: "2.0", purpose: "Programming/Power" },
          { type: "Arduino Headers", count: 1, purpose: "Arduino Compatible" },
          { type: "Morpho Headers", count: 2, purpose: "ST Morpho" }
        ]
      },
      io: {
        digital: 50,
        analog: 16,
        pwm: 15
      },
      memory: {
        flash: "512KB",
        ram: "96KB"
      },
      clock: {
        frequency: "84MHz"
      }
    }
  },
  {
    partName: "STM32 Blue Pill",
    modelNumber: "STM32F103C8T6",
    category: "microcontroller",
    manufacturer: "Generic",
    specification: {
      voltage: {
        operating: ["3.3V"],
        input: { min: 2.0, max: 3.6 }
      },
      power: {
        consumption: { typical: 50, max: 150 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM", "CAN"],
        connectors: [
          { type: "Micro-USB", count: 1, version: "2.0", purpose: "Programming/Power" },
          { type: "GPIO", count: 40, purpose: "Pin Headers" }
        ]
      },
      io: {
        digital: 37,
        analog: 10,
        pwm: 15
      },
      memory: {
        flash: "64KB",
        ram: "20KB"
      },
      clock: {
        frequency: "72MHz"
      }
    }
  },

  // ========================================
  // Teensy シリーズ
  // ========================================
  {
    partName: "Teensy 4.1",
    modelNumber: "TEENSY41",
    category: "microcontroller",
    manufacturer: "PJRC",
    specification: {
      voltage: {
        operating: ["3.3V"],
        input: { min: 3.6, max: 5.5 }
      },
      power: {
        consumption: { typical: 100, max: 250 }
      },
      communication: {
        protocols: ["UART", "I2C", "SPI", "GPIO", "USB", "PWM", "CAN", "Ethernet"],
        connectors: [
          { type: "Micro-USB", count: 1, version: "2.0", purpose: "Programming/Power" },
          { type: "GPIO", count: 55, purpose: "Pin Headers" },
          { type: "Ethernet PHY", count: 1, purpose: "10/100 Mbit Ethernet" },
          { type: "MicroSD", count: 1, purpose: "Storage" }
        ]
      },
      io: {
        digital: 55,
        analog: 18,
        pwm: 35
      },
      memory: {
        flash: "8MB",
        ram: "1MB",
        eeprom: "4KB"
      },
      clock: {
        frequency: "600MHz"
      },
      physical: {
        dimensions: { length: 61, width: 18, height: 5 },
        weight: 7
      }
    }
  }
];

// カテゴリ別にグループ化する関数
export function getComponentsByCategory(category: string): PresetComponent[] {
  return PRESET_COMPONENTS.filter(c => c.category === category);
}

// 部品名で検索する関数
export function findPresetComponent(partName: string): PresetComponent | undefined {
  return PRESET_COMPONENTS.find(c => 
    c.partName.toLowerCase() === partName.toLowerCase() ||
    c.modelNumber?.toLowerCase() === partName.toLowerCase()
  );
}

// 部品名の部分一致で検索する関数
export function searchPresetComponents(query: string): PresetComponent[] {
  const lowerQuery = query.toLowerCase();
  return PRESET_COMPONENTS.filter(c => 
    c.partName.toLowerCase().includes(lowerQuery) ||
    c.modelNumber?.toLowerCase().includes(lowerQuery) ||
    c.manufacturer.toLowerCase().includes(lowerQuery)
  );
}
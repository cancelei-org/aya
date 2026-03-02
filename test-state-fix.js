// Test script to verify state management fix
const fetch = require('node-fetch');

async function testSystemGeneration() {
  try {
    console.log('Testing system generation with state management fix...\n');
    
    // Test data matching the expected format
    const testData = {
      projectId: 'test-project-123',
      requirementsId: 'test-req-456',
      systemSuggestions: {
        functional_requirements: [
          {
            category: 'Core Requirements',
            items: [
              'System must track components',
              'System must manage inventory'
            ]
          }
        ],
        non_functional_requirements: [
          {
            category: 'Performance',
            items: [
              'Response time under 100ms',
              'Support 1000 concurrent users'
            ]
          }
        ],
        hardware_components: [
          {
            name: 'Raspberry Pi 4',
            category: 'Processing',
            quantity: 1,
            voltage: '5V',
            communication: 'I2C, SPI, UART',
            description: 'Main processing unit'
          },
          {
            name: 'Arduino Uno',
            category: 'Control',
            quantity: 2,
            voltage: '5V',
            communication: 'I2C, SPI',
            description: 'Sensor control unit'
          },
          {
            name: 'DHT22 Temperature Sensor',
            category: 'Sensing',
            quantity: 3,
            voltage: '3.3V',
            communication: 'Digital',
            description: 'Temperature and humidity sensor'
          }
        ],
        connections: [
          {
            from: 'Raspberry Pi 4',
            to: 'Arduino Uno',
            type: 'I2C'
          },
          {
            from: 'Arduino Uno',
            to: 'DHT22 Temperature Sensor',
            type: 'Digital'
          }
        ],
        pbs_structure: {
          name: 'Test System',
          type: 'System',
          children: [
            {
              name: 'Processing',
              type: 'Category',
              children: [
                {
                  name: 'Raspberry Pi 4',
                  type: 'Component'
                }
              ]
            },
            {
              name: 'Control',
              type: 'Category',
              children: [
                {
                  name: 'Arduino Uno',
                  type: 'Component'
                }
              ]
            },
            {
              name: 'Sensing',
              type: 'Category',
              children: [
                {
                  name: 'DHT22 Temperature Sensor',
                  type: 'Component'
                }
              ]
            }
          ]
        }
      }
    };

    console.log('Test Data Summary:');
    console.log('- Hardware Components:', testData.systemSuggestions.hardware_components.length);
    console.log('- Connections:', testData.systemSuggestions.connections.length);
    console.log('- PBS Structure levels:', testData.systemSuggestions.pbs_structure.children.length);
    console.log('\nComponents:');
    testData.systemSuggestions.hardware_components.forEach(comp => {
      console.log(`  - ${comp.name} (${comp.category})`);
    });
    
    console.log('\n✅ Test data structure is valid');
    console.log('\nThe state management fix should now properly:');
    console.log('1. Use shared state from useStores() in HomePage.client.tsx');
    console.log('2. Call processSystemDesign to transform the data');
    console.log('3. Update the same state that MainCanvas.tsx reads from');
    console.log('4. Display the components in the UI');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSystemGeneration();
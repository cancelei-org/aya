#!/usr/bin/env node

/**
 * Test script to verify the complete system generation flow
 * Tests: Requirements generation → System generation from requirements
 */

const API_BASE = 'http://localhost:3001/api'

async function testRequirementsGeneration() {
  console.log('\n=== Testing Requirements Generation ===\n')
  
  const response = await fetch(`${API_BASE}/requirements/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'I need a temperature monitoring system with IoT capabilities for greenhouse monitoring',
      projectId: 'test-project',
      mode: 'create'
    })
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    console.error('❌ Requirements generation failed:', data)
    return null
  }
  
  console.log('✅ Requirements generated successfully')
  console.log('📝 Requirements length:', data.requirements?.length || 0, 'characters')
  console.log('📝 First 500 chars:', data.requirements?.substring(0, 500))
  
  return data.requirements
}

async function testSystemGeneration(requirements) {
  console.log('\n=== Testing System Generation ===\n')
  
  const response = await fetch(`${API_BASE}/requirements/generate-system`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requirementsContent: requirements,
      projectId: 'test-project',
      shippingDestination: {
        country: 'Japan',
        city: 'Tokyo',
        postalCode: '100-0001'
      }
    })
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    console.error('❌ System generation failed:', data)
    return null
  }
  
  console.log('✅ System generated successfully')
  console.log('📦 Parts generated:', data.partOrders?.length || 0)
  console.log('🔗 Connections generated:', data.systemConnections?.length || 0)
  console.log('📊 PBS structure:', data.pbsStructure?.length || 0, 'items')
  console.log('📍 Node layout:', data.nodeLayout?.length || 0, 'positions')
  
  if (data.partOrders && data.partOrders.length > 0) {
    console.log('\n📋 Generated Parts:')
    data.partOrders.forEach((part, i) => {
      console.log(`  ${i + 1}. ${part.partName} (${part.category}) - ${part.purpose || 'No purpose specified'}`)
    })
  }
  
  if (data.systemConnections && data.systemConnections.length > 0) {
    console.log('\n🔗 Generated Connections:')
    data.systemConnections.forEach((conn, i) => {
      console.log(`  ${i + 1}. ${conn.source} → ${conn.target} (${conn.type || 'default'})`)
    })
  }
  
  return data
}

async function main() {
  try {
    console.log('🚀 Starting system generation test...')
    console.log('📍 API Base:', API_BASE)
    
    // Test requirements generation
    const requirements = await testRequirementsGeneration()
    if (!requirements) {
      console.error('Failed to generate requirements, aborting test')
      process.exit(1)
    }
    
    // Wait a bit to avoid rate limiting
    console.log('\n⏳ Waiting 2 seconds before system generation...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test system generation
    const system = await testSystemGeneration(requirements)
    if (!system) {
      console.error('Failed to generate system')
      process.exit(1)
    }
    
    // Summary
    console.log('\n=== Test Summary ===')
    console.log('✅ Requirements generation: SUCCESS')
    console.log('✅ System generation: SUCCESS')
    console.log(`✅ Generated ${system.partOrders?.length || 0} components and ${system.systemConnections?.length || 0} connections`)
    
    // Check for the specific issue: 0 components but connections exist
    if (system.partOrders?.length === 0 && system.systemConnections?.length > 0) {
      console.warn('\n⚠️ WARNING: Generated connections but no components!')
      console.warn('This indicates the partOrders to nodes conversion may still have issues.')
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
    process.exit(1)
  }
}

// Run the test
main()
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { auth } from '@/lib/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { requirements, context } = body

    if (!requirements) {
      return NextResponse.json({ error: 'Requirements are required' }, { status: 400 })
    }

    console.log('🤖 Generating system suggestions')

    const completion = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are a hardware system design expert. Generate component suggestions in JSON format based on requirements.'
        },
        {
          role: 'user',
          content: `Based on the following requirements, generate a hardware system design in JSON format.

Requirements: ${requirements}
Context: ${context || 'General hardware project'}

Please provide the response in JSON format with the following structure:
{
  "partOrders": [
    {
      "id": "component-id",
      "partName": "Component Name",
      "category": "category",
      "modelNumber": "model-number",
      "quantity": 1,
      "purpose": "component purpose",
      "specifications": {},
      "inputs": 0,
      "outputs": 0
    }
  ],
  "systemConnections": [],
  "pbsStructure": []
}`
        }
      ],
      // temperature: 0.7,
      response_format: { type: "json_object" }
    })

    const systemDesign = JSON.parse(completion.choices[0]?.message?.content || '{"partOrders": [], "systemConnections": [], "pbsStructure": []}')

    console.log('✅ System suggestions generated:', {
      partOrders: systemDesign.partOrders?.length || 0,
      connections: systemDesign.systemConnections?.length || 0,
      pbsStructure: systemDesign.pbsStructure?.length || 0
    })

    return NextResponse.json(systemDesign)
  } catch (error) {
    console.error('System suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
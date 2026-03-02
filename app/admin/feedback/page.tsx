'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface FeedbackItem {
  id: string
  userEmail: string
  userName: string
  content: string
  createdAt: string
}

export default function AdminFeedbackPage() {
  const session = useSession()
  const router = useRouter()
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.status === 'unauthenticated') {
      router.push('/api/auth/signin')
      return
    }

    if (session?.data) {
      fetchFeedback()
    }
  }, [session?.data, session?.status, router])

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/admin/feedback')
      if (response.ok) {
        const data = await response.json()
        setFeedback(data)
      }
    } catch (error) {
      console.error('Failed to fetch feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  if (session?.status === 'loading' || loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session?.data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Feedback</h1>
          <p className="text-gray-600">All feedback submitted by users</p>
        </div>

        {feedback.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">
              No feedback submitted yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedback.map((item) => (
              <Card key={item.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <div>
                      <span className="text-lg font-semibold">{item.userName}</span>
                      <span className="text-sm text-gray-500 ml-2">({item.userEmail})</span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface ChatLimitInfo {
  canChat: boolean
  remainingChats: string | number
  chatCount: number
  isPremium: boolean
}

export default function UpgradePage() {
  const session = useSession()
  const router = useRouter()
  const [chatInfo, setChatInfo] = useState<ChatLimitInfo | null>(null)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (session?.status === 'unauthenticated') {
      router.push('/api/auth/signin')
      return
    }

    if (session?.data) {
      fetch('/api/chat/check-limit')
        .then(r => r.json())
        .then(setChatInfo)
        .catch(console.error)
    }
  }, [session?.data, session?.status, router])

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      alert('Please enter your feedback')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/feedback/submit', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim() })
      })
      
      if (response.ok) {
        alert('Thank you for your feedback! You now have 100 more chats available.')
        router.push('/')
      } else {
        alert('Failed to submit feedback. Please try again.')
      }
    } catch (error) {
      console.error('Feedback submission error:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (session?.status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  if (!session?.data) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank you for using our service!</h1>
          <p className="text-gray-600">Help us improve by sharing your feedback and get 100 more chats!</p>
        </div>

        {chatInfo && (
          <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Current Usage Status</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Chat Count: <span className="font-semibold">{chatInfo.chatCount}/100</span>
              </p>
              <p className="text-sm text-gray-600">
                Remaining: <span className="font-semibold">
                  {chatInfo.isPremium ? 'Unlimited' : `${chatInfo.remainingChats} chats`}
                </span>
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: chatInfo.isPremium ? '100%' : `${Math.min((chatInfo.chatCount / 100) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border-2 border-green-200 shadow-lg">
          <div className="bg-green-50 p-6 rounded-t-lg">
            <h3 className="text-xl font-bold text-green-900">
              Share Your Feedback & Get 100 More Chats!
            </h3>
          </div>
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              Please tell us about features you&apos;d like to see or improvements that would make your experience better:
            </p>
            
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What features would you like to see? Any improvements or suggestions?"
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            
            <button 
              onClick={handleFeedbackSubmit}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !feedback.trim()}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback & Get 100 More Chats'}
            </button>
            
            <p className="text-xs text-gray-500 text-center mt-4">
              Your feedback helps us build better features for everyone!
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
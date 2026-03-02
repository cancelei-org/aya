"use client"

import { signIn, getSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ExternalLink, Mail, AlertCircle } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // 既にログインしている場合はホームにリダイレクト
    getSession().then((session) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        redirect: false
      })

      if (result?.error === 'CredentialsSignin') {
        setError('waitlist')
      } else if (result?.ok) {
        router.push('/')
      } else if (result?.error) {
        setError('general')
      }
    } catch {
      setError('general')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img src="/aya-logo.jpg" alt="AYA Logo" className="mx-auto h-16 w-auto" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to AYA
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Welcome to Hardware Assembly Copilot
          </p>
        </div>

        {error === 'waitlist' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-blue-900 text-lg">
                <AlertCircle className="mr-2 h-5 w-5" />
                Waitlist Registration Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-700 text-sm mb-4">
                This email address is not yet registered in our waitlist.
                Please visit Orboh.com to complete your pre-registration.
              </p>
              <a 
                href="https://www.orboh.com/" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <Mail className="mr-2 h-4 w-4" />
                Register at Orboh.com
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        )}

        {error === 'general' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700 text-sm">
                Sign in failed. Please try again later.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?
            <a 
              href="https://www.orboh.com/" 
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:text-blue-500 ml-1"
            >
              Register here
            </a>
          </p>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Only pre-registered email addresses can sign in
          </p>
        </div>
      </div>
    </div>
  )
}
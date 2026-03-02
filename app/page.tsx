import { Suspense } from 'react'
import { LoadingScreen } from '@/components/layout/LoadingScreen'
import HomePageClient from './HomePage.client'

// Server Component - no hooks, minimal JavaScript
export default function HomePage() {
  // Return static loading state immediately
  // Client component will handle authentication and data loading
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HomePageClient />
    </Suspense>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"

export function SignInPrompt() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Rocket className="h-12 w-12 mx-auto mb-4 text-[#00AEEF]" />
          <CardTitle className="text-2xl">Welcome to AYA</CardTitle>
          <p className="text-gray-600 mt-2">Please sign in to access your hardware assembly workspace</p>
        </CardHeader>
        <div className="p-6 pt-0">
          <Button className="w-full" onClick={() => router.push("/auth/signin")}>
            Sign In
          </Button>
        </div>
      </Card>
    </div>
  )
}
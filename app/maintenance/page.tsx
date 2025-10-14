'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Wrench, Clock, ArrowRight, Sparkles, Lock, Unlock } from 'lucide-react'

export default function MaintenancePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [showUnlock, setShowUnlock] = useState(false)
  const [password, setPassword] = useState('')
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Redirect admins to dashboard
    if (session?.user?.role === 'ADMIN') {
      router.push('/dashboard')
      return
    }

    // Fetch maintenance settings
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => {
        setSettings(data.settings || {})
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session, router])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnlocking(true)

    try {
      const res = await fetch('/api/maintenance/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        setError(data.error || 'Invalid password')
      }
    } catch (error) {
      setError('Failed to verify password')
    } finally {
      setUnlocking(false)
    }
  }

  if (loading) {
    return null
  }

  const title = settings['general.maintenance_title'] || "We'll be back soon!"
  const message = settings['general.maintenance_message'] || "We're making some exciting improvements to serve you better. Our team is working hard to bring you new features and enhanced performance."
  const eta = settings['general.maintenance_eta'] || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 md:p-12">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-6">
                <Wrench className="h-12 w-12 text-white animate-bounce" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            {title}
          </h1>

          {/* Message */}
          <p className="text-lg text-gray-600 text-center mb-8 leading-relaxed">
            {message}
          </p>

          {/* ETA */}
          {eta && (
            <div className="flex items-center justify-center gap-3 mb-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-blue-900 font-medium">{eta}</span>
            </div>
          )}

          {/* Features Coming Soon */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-800">What's New</h3>
            </div>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">🚀 Real-time Product Sync</p>
                  <p className="text-sm text-gray-600">Watch your products sync live with progress tracking</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">💰 Smart Pricing Tiers</p>
                  <p className="text-sm text-gray-600">Automatic pricing based on your product count</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 mt-2"></div>
                <div>
                  <p className="font-medium text-gray-800">⚡ Enhanced Performance</p>
                  <p className="text-sm text-gray-600">Faster loading and smoother experience</p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Animation */}
          <div className="flex justify-center items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-bounce animation-delay-200"></div>
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-bounce animation-delay-400"></div>
            </div>
          </div>

          {/* Admin Unlock Section */}
          {!showUnlock ? (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => setShowUnlock(true)}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="h-3 w-3" />
                Admin Access
              </button>
            </div>
          ) : (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <form onSubmit={handleUnlock} className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                  <Unlock className="h-4 w-4" />
                  <span className="font-medium">Admin Bypass</span>
                </div>
                
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  autoFocus
                />
                
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={unlocking}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 font-medium"
                  >
                    {unlocking ? 'Verifying...' : 'Unlock'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUnlock(false)
                      setPassword('')
                      setError('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Need urgent assistance?{' '}
              <a href="mailto:support@example.com" className="text-blue-600 hover:text-blue-700 font-medium underline">
                Contact Support
              </a>
            </p>
          </div>
        </div>

        {/* Sub Text */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Thank you for your patience! ✨
          </p>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(20px, -50px) scale(1.1);
          }
          50% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          75% {
            transform: translate(50px, 50px) scale(1.05);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
      `}</style>
    </div>
  )
}
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, ArrowRight, ArrowLeft } from 'lucide-react'

type Step = 1 | 2 | 3 | 4

interface OnboardingData {
  platform: string
  storeHash?: string
  accessToken?: string
  shopId?: string
  apiKey?: string
  apiSecret?: string
  label: string
  acceptTerms: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    platform: '',
    label: '',
    acceptTerms: false
  })

  const progress = (step / 4) * 100

  const handleNext = () => {
    if (step < 4) {
      setStep((step + 1) as Step)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step)
    }
  }

  const handleComplete = async () => {
    if (!data.acceptTerms) {
      alert('Please accept the terms and conditions')
      return
    }

    setLoading(true)

    try {
      // Save credentials
      const credentials: Record<string, string> = {}
      
      if (data.platform === 'BIGCOMMERCE') {
        credentials.storeHash = data.storeHash || ''
        credentials.accessToken = data.accessToken || ''
      } else if (data.platform === 'TIKTOK') {
        credentials.shopId = data.shopId || ''
        credentials.apiKey = data.apiKey || ''
        credentials.apiSecret = data.apiSecret || ''
      } else if (data.platform === 'ETSY') {
        credentials.apiKey = data.apiKey || ''
        credentials.apiSecret = data.apiSecret || ''
      }

      const response = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: data.platform,
          credentials,
          label: data.label
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save credentials')
      }

      // Redirect to dashboard
      router.push('/dashboard?onboarding=complete')
    } catch (error) {
      console.error('Onboarding error:', error)
      alert('Failed to complete onboarding. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Welcome', completed: step > 1 },
    { number: 2, title: 'Choose Platform', completed: step > 2 },
    { number: 3, title: 'Add Credentials', completed: step > 3 },
    { number: 4, title: 'Complete', completed: step > 4 }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="container max-w-4xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((s, idx) => (
              <div key={s.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    s.completed ? 'bg-green-500 border-green-500' :
                    step === s.number ? 'bg-purple-500 border-purple-500' :
                    'bg-white border-gray-300'
                  }`}>
                    {s.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                      <Circle className={`w-6 h-6 ${step === s.number ? 'text-white' : 'text-gray-400'}`} />
                    )}
                  </div>
                  <span className={`text-xs mt-2 ${step === s.number ? 'font-bold' : 'text-gray-500'}`}>
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${s.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Welcome to TEKMS!'}
              {step === 2 && 'Choose Your Platform'}
              {step === 3 && 'Add Your Credentials'}
              {step === 4 && 'You\'re All Set!'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Let\'s get you started with multi-channel e-commerce automation'}
              {step === 2 && 'Select the platform you want to connect first'}
              {step === 3 && 'Enter your API credentials to connect your store'}
              {step === 4 && 'Review and complete your setup'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">What is TEKMS?</h3>
                  <p className="text-sm text-muted-foreground">
                    TEKMS is your all-in-one platform for managing products across BigCommerce, TikTok Shop, and Etsy.
                    Automate exports, imports, and catalog management with ease.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">🚀 Export to TikTok</h4>
                    <p className="text-sm text-muted-foreground">
                      Bulk export products from BigCommerce to TikTok Shop
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">📥 Import from Etsy</h4>
                    <p className="text-sm text-muted-foreground">
                      Import products from Etsy to BigCommerce
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">⚙️ Manage Catalog</h4>
                    <p className="text-sm text-muted-foreground">
                      Update pricing, modifiers, and inventory
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Your FREE plan includes:</strong> 10 products per month across all platforms
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Choose Platform */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  <Label htmlFor="platform">Select Platform</Label>
                  <Select
                    value={data.platform}
                    onValueChange={(value) => setData({ ...data, platform: value })}
                  >
                    <SelectTrigger id="platform">
                      <SelectValue placeholder="Choose a platform..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BIGCOMMERCE">BigCommerce</SelectItem>
                      <SelectItem value="TIKTOK">TikTok Shop</SelectItem>
                      <SelectItem value="ETSY">Etsy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {data.platform && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">
                      {data.platform === 'BIGCOMMERCE' && '🛍️ BigCommerce'}
                      {data.platform === 'TIKTOK' && '🎵 TikTok Shop'}
                      {data.platform === 'ETSY' && '🎨 Etsy'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {data.platform === 'BIGCOMMERCE' && 'Connect your BigCommerce store to manage products, pricing, and inventory.'}
                      {data.platform === 'TIKTOK' && 'Export products to TikTok Shop and manage your social commerce presence.'}
                      {data.platform === 'ETSY' && 'Import unique products from Etsy to expand your catalog.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Add Credentials */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="label">Credential Label (Optional)</Label>
                    <Input
                      id="label"
                      placeholder="e.g., Main Store, Production"
                      value={data.label}
                      onChange={(e) => setData({ ...data, label: e.target.value })}
                    />
                  </div>

                  {data.platform === 'BIGCOMMERCE' && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="storeHash">Store Hash *</Label>
                        <Input
                          id="storeHash"
                          placeholder="abc123xyz"
                          value={data.storeHash || ''}
                          onChange={(e) => setData({ ...data, storeHash: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="accessToken">Access Token *</Label>
                        <Input
                          id="accessToken"
                          type="password"
                          placeholder="Your BigCommerce API token"
                          value={data.accessToken || ''}
                          onChange={(e) => setData({ ...data, accessToken: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  )}

                  {data.platform === 'TIKTOK' && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="shopId">Shop ID *</Label>
                        <Input
                          id="shopId"
                          placeholder="Your TikTok Shop ID"
                          value={data.shopId || ''}
                          onChange={(e) => setData({ ...data, shopId: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="apiKey">API Key *</Label>
                        <Input
                          id="apiKey"
                          placeholder="Your TikTok API Key"
                          value={data.apiKey || ''}
                          onChange={(e) => setData({ ...data, apiKey: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="apiSecret">API Secret *</Label>
                        <Input
                          id="apiSecret"
                          type="password"
                          placeholder="Your TikTok API Secret"
                          value={data.apiSecret || ''}
                          onChange={(e) => setData({ ...data, apiSecret: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  )}

                  {data.platform === 'ETSY' && (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="apiKey">API Key *</Label>
                        <Input
                          id="apiKey"
                          placeholder="Your Etsy API Key"
                          value={data.apiKey || ''}
                          onChange={(e) => setData({ ...data, apiKey: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="apiSecret">API Secret *</Label>
                        <Input
                          id="apiSecret"
                          type="password"
                          placeholder="Your Etsy API Secret"
                          value={data.apiSecret || ''}
                          onChange={(e) => setData({ ...data, apiSecret: e.target.value })}
                          required
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>🔒 Security:</strong> Your credentials are encrypted using AES-256-GCM before storage.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900 p-6 rounded-lg text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Ready to Go!</h3>
                  <p className="text-muted-foreground">
                    You've successfully configured your {data.platform} credentials.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold">What's Next?</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Start exporting products to TikTok Shop</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Import products from Etsy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Manage your BigCommerce catalog</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Track usage and upgrade when needed</span>
                    </li>
                  </ul>
                </div>

                <div className="flex items-start gap-2 pt-4">
                  <Checkbox
                    id="terms"
                    checked={data.acceptTerms}
                    onCheckedChange={(checked) => setData({ ...data, acceptTerms: checked as boolean })}
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                    I agree to the Terms of Service and Privacy Policy
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1 || loading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>

              {step < 4 ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (step === 2 && !data.platform) ||
                    (step === 3 && (
                      (data.platform === 'BIGCOMMERCE' && (!data.storeHash || !data.accessToken)) ||
                      (data.platform === 'TIKTOK' && (!data.shopId || !data.apiKey || !data.apiSecret)) ||
                      (data.platform === 'ETSY' && (!data.apiKey || !data.apiSecret))
                    ))
                  }
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!data.acceptTerms || loading}
                >
                  {loading ? 'Completing...' : 'Complete Setup'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
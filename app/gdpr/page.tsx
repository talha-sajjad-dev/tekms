import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function GDPRPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardContent className="p-8 prose prose-slate max-w-none">
            <h1 className="text-4xl font-bold mb-6">GDPR Compliance</h1>
            
            <div className="space-y-6 text-gray-700">
              <p>
                TEKMS Listing Manager is committed to protecting your data in accordance with the General Data
                Protection Regulation (GDPR) and other applicable data protection laws.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Your Rights Under GDPR</h2>
              <ul className="space-y-2">
                <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Right to Object:</strong> Object to processing of your personal data</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Data We Collect</h2>
              <p>We collect and process the following types of data:</p>
              <ul className="space-y-2">
                <li>Account information (name, email)</li>
                <li>Marketplace API credentials (encrypted)</li>
                <li>Product listings and inventory data</li>
                <li>Billing and payment information</li>
                <li>Usage analytics and logs</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">How We Protect Your Data</h2>
              <ul className="space-y-2">
                <li>AES-256-GCM encryption for sensitive credentials</li>
                <li>HTTPS/TLS for all data transmission</li>
                <li>Regular security audits and penetration testing</li>
                <li>SOC 2 Type II certified infrastructure</li>
                <li>GDPR-compliant data processing agreements</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Data Retention</h2>
              <p>
                We retain your data only as long as necessary for the purposes outlined in our Privacy Policy.
                You can request deletion of your account and all associated data at any time.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Our Data Protection Officer</h2>
              <p>
                For GDPR-related inquiries, contact our Data Protection Officer at{' '}
                <a href="mailto:dpo@tekms.com" className="text-blue-600 hover:underline">
                  dpo@tekms.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
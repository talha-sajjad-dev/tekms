import { ArrowLeft, Shield, Lock, Key, Server, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function SecurityPage() {
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
            <h1 className="text-4xl font-bold mb-6">Security & Compliance</h1>
            
            <div className="space-y-6 text-gray-700">
              <p className="text-lg">
                At TEKMS, security is our top priority. We implement industry-leading security measures
                to protect your data and ensure compliance with international standards.
              </p>

              <div className="grid md:grid-cols-2 gap-6 my-8">
                <div className="p-6 bg-blue-50 rounded-lg">
                  <Shield className="h-10 w-10 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Data Encryption</h3>
                  <p className="text-sm">AES-256-GCM encryption for all sensitive data at rest and in transit</p>
                </div>
                <div className="p-6 bg-cyan-50 rounded-lg">
                  <Lock className="h-10 w-10 text-cyan-600 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Secure Authentication</h3>
                  <p className="text-sm">OAuth 2.0, PKCE, and bcrypt password hashing</p>
                </div>
                <div className="p-6 bg-indigo-50 rounded-lg">
                  <Server className="h-10 w-10 text-indigo-600 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Infrastructure</h3>
                  <p className="text-sm">SOC 2 Type II certified cloud infrastructure</p>
                </div>
                <div className="p-6 bg-purple-50 rounded-lg">
                  <Key className="h-10 w-10 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-lg mb-2">Access Control</h3>
                  <p className="text-sm">Role-based permissions and multi-factor authentication</p>
                </div>
              </div>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Compliance Certifications</h2>
              <ul className="space-y-2">
                <li><strong>GDPR Compliant:</strong> Full compliance with EU data protection regulations</li>
                <li><strong>SOC 2 Type II:</strong> Independently audited security controls</li>
                <li><strong>PCI DSS:</strong> Payment card industry data security standard</li>
                <li><strong>ISO 27001:</strong> Information security management system</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">Security Measures</h2>
              <ul className="space-y-2">
                <li>End-to-end encryption for API credentials</li>
                <li>Regular security audits and penetration testing</li>
                <li>24/7 security monitoring and incident response</li>
                <li>Automated backup and disaster recovery</li>
                <li>IP whitelisting and rate limiting</li>
                <li>Secure session management with JWT tokens</li>
              </ul>

              <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Report a Security Issue</h3>
                  <p className="text-sm text-amber-800">
                    If you discover a security vulnerability, please email us immediately at{' '}
                    <a href="mailto:security@tekms.com" className="font-medium underline">
                      security@tekms.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
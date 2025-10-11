import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Information We Collect</h2>
            <p>
              TEKMS Listing Manager ("we", "our", or "us") collects information that you provide directly to us when you:
            </p>
            <ul>
              <li>Create an account</li>
              <li>Use our services</li>
              <li>Contact us for support</li>
              <li>Subscribe to our services</li>
            </ul>

            <h3>1.1 Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Name and email address</li>
              <li>Password (encrypted)</li>
              <li>OAuth provider information (if using Google Sign-In)</li>
            </ul>

            <h3>1.2 Marketplace Credentials</h3>
            <p>
              We store your marketplace API credentials (BigCommerce, Shopify, Etsy, TikTok) using military-grade 
              AES-256-GCM encryption. These credentials are never stored in plain text and are only accessible to you.
            </p>

            <h3>1.3 Product Data</h3>
            <p>We collect and store:</p>
            <ul>
              <li>Product listings you import or create</li>
              <li>Product metadata (names, descriptions, prices, SKUs)</li>
              <li>Sync status and history</li>
            </ul>

            <h3>1.4 Usage Information</h3>
            <p>We automatically collect:</p>
            <ul>
              <li>Usage statistics (number of products, API calls)</li>
              <li>Subscription tier and billing information</li>
              <li>Login and activity logs</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Process your marketplace integrations</li>
              <li>Manage your subscription and billing</li>
              <li>Send you service-related communications</li>
              <li>Improve and develop new features</li>
              <li>Ensure security and prevent fraud</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2>3. Data Security</h2>
            <p>We implement industry-standard security measures:</p>
            <ul>
              <li><strong>Encryption:</strong> AES-256-GCM for API credentials</li>
              <li><strong>Password Hashing:</strong> Bcrypt with 12 rounds</li>
              <li><strong>Secure Transmission:</strong> SSL/TLS encryption (HTTPS)</li>
              <li><strong>Database Security:</strong> Encrypted connections, access controls</li>
              <li><strong>Regular Security Audits:</strong> Ongoing monitoring and updates</li>
            </ul>

            <h2>4. Data Sharing</h2>
            <p>We do not sell your personal information. We may share your data with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Stripe (payments), Resend (emails), database hosting</li>
              <li><strong>Marketplace Platforms:</strong> When you authorize sync operations</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>

            <h2>5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent for data processing</li>
            </ul>

            <h2>6. Data Retention</h2>
            <p>We retain your data:</p>
            <ul>
              <li>Account data: As long as your account is active</li>
              <li>Usage logs: 90 days</li>
              <li>Billing records: 7 years (legal requirement)</li>
              <li>Deleted accounts: 30 days (backup retention)</li>
            </ul>

            <h2>7. Cookies and Tracking</h2>
            <p>We use:</p>
            <ul>
              <li><strong>Essential Cookies:</strong> For authentication and session management</li>
              <li><strong>Analytics:</strong> To understand how you use our service</li>
              <li><strong>Preferences:</strong> To remember your settings</li>
            </ul>

            <h2>8. Third-Party Services</h2>
            <p>Our service integrates with:</p>
            <ul>
              <li>Google OAuth for authentication</li>
              <li>Stripe for payment processing</li>
              <li>Marketplace APIs (BigCommerce, Shopify, Etsy, TikTok)</li>
              <li>Email service providers</li>
            </ul>
            <p>These services have their own privacy policies.</p>

            <h2>9. Children's Privacy</h2>
            <p>
              Our service is not intended for users under 18. We do not knowingly collect data from children.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h2>11. Contact Us</h2>
            <p>For privacy-related questions or requests, contact us at:</p>
            <ul>
              <li>Email: privacy@tekmslisting.com</li>
              <li>Address: [Your Business Address]</li>
            </ul>

            <h2>12. GDPR Compliance</h2>
            <p>For users in the European Union, we comply with GDPR requirements:</p>
            <ul>
              <li>Lawful basis for processing: Contract performance, legitimate interests</li>
              <li>Data Protection Officer: privacy@tekmslisting.com</li>
              <li>Right to lodge complaints with supervisory authorities</li>
            </ul>

            <hr className="my-8" />

            <p className="text-sm text-muted-foreground">
              By using TEKMS Listing Manager, you agree to this Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
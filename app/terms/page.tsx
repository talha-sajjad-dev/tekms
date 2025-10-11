import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function TermsOfServicePage() {
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
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using TEKMS Listing Manager ("Service"), you accept and agree to be bound by these 
              Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              TEKMS Listing Manager is a multi-platform marketplace management tool that allows you to:
            </p>
            <ul>
              <li>Manage product listings across BigCommerce, Shopify, Etsy, and TikTok</li>
              <li>Synchronize products between platforms</li>
              <li>Import and export product data</li>
              <li>Track and manage your e-commerce operations</li>
            </ul>

            <h2>3. User Accounts</h2>
            <h3>3.1 Registration</h3>
            <p>
              You must create an account to use the Service. You agree to:
            </p>
            <ul>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Not share your account with others</li>
              <li>Notify us immediately of unauthorized access</li>
            </ul>

            <h3>3.2 Account Responsibility</h3>
            <p>
              You are responsible for all activities under your account. We are not liable for any loss or 
              damage from unauthorized use of your account.
            </p>

            <h2>4. Subscription Plans</h2>
            <h3>4.1 Plan Types</h3>
            <p>We offer multiple subscription tiers:</p>
            <ul>
              <li><strong>Free:</strong> 10 products, limited features</li>
              <li><strong>Professional:</strong> Unlimited products, all platforms, advanced features</li>
              <li><strong>Enterprise:</strong> Everything in Professional plus API access and custom integrations</li>
            </ul>

            <h3>4.2 Billing</h3>
            <p>
              Subscription fees are billed monthly in advance. By subscribing to a paid plan, you authorize us to 
              charge your payment method on a recurring basis.
            </p>

            <h3>4.3 Cancellation</h3>
            <p>
              You may cancel your subscription at any time. Cancellations take effect at the end of the current 
              billing period. No refunds for partial months.
            </p>

            <h3>4.4 Free Trial</h3>
            <p>
              The free plan includes 10 products at no cost. We may modify or discontinue the free plan at any time.
            </p>

            <h2>5. Acceptable Use</h2>
            <p>You agree NOT to:</p>
            <ul>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Upload malicious code or viruses</li>
              <li>Attempt to gain unauthorized access</li>
              <li>Interfere with the Service's operation</li>
              <li>Use the Service for illegal purposes</li>
              <li>Scrape or harvest data without permission</li>
              <li>Resell or redistribute the Service</li>
            </ul>

            <h2>6. Marketplace Integration</h2>
            <h3>6.1 API Credentials</h3>
            <p>
              You are responsible for:
            </p>
            <ul>
              <li>Obtaining valid API credentials from marketplace platforms</li>
              <li>Ensuring credentials have appropriate permissions</li>
              <li>Compliance with each platform's terms of service</li>
              <li>Any costs or fees charged by marketplace platforms</li>
            </ul>

            <h3>6.2 Data Accuracy</h3>
            <p>
              While we strive for accuracy, we do not guarantee that product data will be perfectly synchronized 
              across platforms. You are responsible for verifying product information.
            </p>

            <h2>7. Intellectual Property</h2>
            <h3>7.1 Our Rights</h3>
            <p>
              The Service, including all content, features, and functionality, is owned by TEKMS and protected by 
              copyright, trademark, and other intellectual property laws.
            </p>

            <h3>7.2 Your Content</h3>
            <p>
              You retain ownership of your product data and content. By using the Service, you grant us a license 
              to store, process, and display your content as necessary to provide the Service.
            </p>

            <h2>8. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW:
            </p>
            <ul>
              <li>The Service is provided "AS IS" without warranties of any kind</li>
              <li>We are not liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the amount you paid in the last 12 months</li>
              <li>We are not responsible for marketplace platform changes or outages</li>
            </ul>

            <h2>9. Service Availability</h2>
            <p>
              We aim for 99.9% uptime but do not guarantee uninterrupted access. We may:
            </p>
            <ul>
              <li>Perform maintenance with or without notice</li>
              <li>Modify or discontinue features</li>
              <li>Temporarily suspend the Service</li>
            </ul>

            <h2>10. Termination</h2>
            <p>
              We may suspend or terminate your account if you:
            </p>
            <ul>
              <li>Violate these Terms</li>
              <li>Fail to pay subscription fees</li>
              <li>Engage in fraudulent activity</li>
              <li>Use the Service in a harmful manner</li>
            </ul>

            <h2>11. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Continued use of the Service after changes constitutes 
              acceptance of the new Terms. We will notify you of material changes via email or Service notification.
            </p>

            <h2>12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of [Your Jurisdiction]. Any disputes shall be resolved in the 
              courts of [Your Jurisdiction].
            </p>

            <h2>13. Contact Information</h2>
            <p>
              For questions about these Terms, contact us at:
            </p>
            <ul>
              <li>Email: support@tekmslisting.com</li>
              <li>Website: https://tekms.com</li>
            </ul>

            <hr className="my-8" />

            <p className="text-sm text-muted-foreground">
              By using TEKMS Listing Manager, you acknowledge that you have read, understood, and agree to be 
              bound by these Terms of Service.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
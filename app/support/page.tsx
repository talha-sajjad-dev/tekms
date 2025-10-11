import { ArrowLeft, HeadphonesIcon, Mail, MessageSquare, BookOpen, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function SupportPage() {
  const supportOptions = [
    {
      icon: MessageSquare,
      title: 'Live Chat',
      description: 'Chat with our support team in real-time',
      action: 'Start Chat',
      available: 'Mon-Fri 9am-6pm PST'
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Get help via email within 24 hours',
      action: 'Send Email',
      available: 'support@tekms.com'
    },
    {
      icon: BookOpen,
      title: 'Documentation',
      description: 'Browse our comprehensive guides and tutorials',
      action: 'View Docs',
      available: 'Available 24/7'
    }
  ]

  const faqs = [
    {
      question: 'How do I connect my first store?',
      answer: 'Go to Dashboard → Stores → Connect Store, choose your platform, and follow the OAuth flow.'
    },
    {
      question: 'What pricing plan should I choose?',
      answer: 'Our pricing is based on product count per store. Start with Free (0-10 products) and upgrade as you grow.'
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes! Cancel anytime from Billing page. Your data remains accessible.'
    },
    {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use AES-256-GCM encryption, SOC 2 Type II certified infrastructure, and GDPR compliance.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <div className="text-center mb-12">
          <HeadphonesIcon className="h-16 w-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-4xl font-bold mb-4">How can we help you?</h1>
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input 
                className="pl-10" 
                placeholder="Search for help articles..." 
              />
            </div>
          </div>
        </div>

        {/* Support Options */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {supportOptions.map((option, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="p-3 bg-blue-100 rounded-lg w-fit mb-3">
                  <option.icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{option.available}</p>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600">
                  {option.action}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="pb-6 border-b last:border-0">
                <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
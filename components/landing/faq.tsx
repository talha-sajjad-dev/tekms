'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'How does the free tier work?',
    answer: 'The free tier allows you to process up to 10 products per month across all platforms. Perfect for getting started and testing the platform. No credit card required.',
  },
  {
    question: 'Can I connect multiple stores?',
    answer: 'Yes! Depending on your plan, you can connect multiple credentials for each platform. Free tier allows 1 credential per platform, while higher tiers allow more.',
  },
  {
    question: 'How is my data secured?',
    answer: 'All your API credentials are encrypted using enterprise-grade AES-256-GCM encryption. We never store your credentials in plain text and they are never logged or exposed.',
  },
  {
    question: 'What platforms do you support?',
    answer: 'We currently support BigCommerce, TikTok Shop, and Etsy. We\'re constantly adding new platform integrations based on user feedback.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Absolutely! You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period, then automatically revert to the free tier.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'We offer a 14-day money-back guarantee on all paid plans. If you\'re not satisfied, contact us within 14 days for a full refund.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about our platform
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-lg">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-base text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
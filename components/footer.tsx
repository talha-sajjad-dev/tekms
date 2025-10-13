"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package, Mail, Phone, MapPin } from 'lucide-react'

interface Page {
  slug: string
  title: string
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [footerPages, setFooterPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
    fetchFooterPages()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/public')
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings || {})
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchFooterPages = async () => {
    try {
      const res = await fetch('/api/pages?footer=true')
      const data = await res.json()
      if (res.ok) {
        setFooterPages(data.pages || [])
      }
    } catch (error) {
      console.error('Failed to fetch footer pages:', error)
    }
  }

  const siteName = settings['website.name'] || 'TEKMS'
  const copyrightText = settings['footer.copyright_text'] || `© ${currentYear} TEKMS Listing Manager. All rights reserved.`
  const logoUrl = settings['website.logo_url'] || '/placeholder-logo.svg'

  return (
    <footer className="bg-gradient-to-br from-slate-900 to-slate-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {logoUrl && (
                <img 
                  src={logoUrl} 
                  alt={siteName}
                  className="h-8 w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              {!logoUrl && <Package className="h-8 w-8 text-cyan-400" />}
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {siteName}
              </span>
            </div>
            <p className="text-slate-300 mb-4 text-sm">
              {settings['website.tagline'] || 'Streamline your multi-marketplace operations'}
            </p>
            <div className="space-y-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <a href="mailto:support@tekms.com" className="hover:text-cyan-400 transition-colors">
                  support@tekms.com
                </a>
              </div>
            </div>
          </div>

          {/* Footer Pages from Database */}
          {footerPages.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4">Pages</h3>
              <ul className="space-y-2">
                {footerPages.map((page) => (
                  <li key={page.slug}>
                    <Link 
                      href={`/${page.slug}`}
                      className="text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-300 hover:text-cyan-400 transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media (from settings) */}
          {(settings['footer.social_twitter'] || settings['footer.social_facebook'] || 
            settings['footer.social_linkedin'] || settings['footer.social_instagram']) && (
            <div>
              <h3 className="font-semibold text-lg mb-4">Connect</h3>
              <ul className="space-y-2">
                {settings['footer.social_twitter'] && (
                  <li>
                    <a 
                      href={settings['footer.social_twitter']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Twitter/X
                    </a>
                  </li>
                )}
                {settings['footer.social_facebook'] && (
                  <li>
                    <a 
                      href={settings['footer.social_facebook']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Facebook
                    </a>
                  </li>
                )}
                {settings['footer.social_linkedin'] && (
                  <li>
                    <a 
                      href={settings['footer.social_linkedin']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      LinkedIn
                    </a>
                  </li>
                )}
                {settings['footer.social_instagram'] && (
                  <li>
                    <a 
                      href={settings['footer.social_instagram']}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-300 hover:text-cyan-400 transition-colors text-sm"
                    >
                      Instagram
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-400">
              {copyrightText}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
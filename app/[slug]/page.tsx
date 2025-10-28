import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { HomepageNav } from '@/components/homepage-nav'

// Force dynamic rendering to avoid database access during build
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await db.page.findUnique({
    where: { slug, isPublished: true }
  })
  
  if (!page) return {}
  
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || ''
  }
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await db.page.findUnique({
    where: { slug }
  })
  
  if (!page || !page.isPublished) {
    notFound()
  }
  
  return (
    <div className="min-h-screen">
      <HomepageNav />
      
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card className="shadow-xl">
            <CardContent className="p-8 prose prose-slate max-w-none">
              <h1 className="text-4xl font-bold mb-6">{page.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: page.content }} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
import { ArrowLeft, Calendar, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function EventsPage() {
  const upcomingEvents = [
    {
      title: 'TEKMS Product Launch Webinar',
      date: 'December 15, 2025',
      time: '2:00 PM PST',
      location: 'Online',
      type: 'Webinar',
      description: 'Join us for the official launch of TEKMS Listing Manager'
    },
    {
      title: 'E-commerce Automation Summit',
      date: 'January 20, 2026',
      time: '9:00 AM PST',
      location: 'San Francisco, CA',
      type: 'Conference',
      description: 'Learn best practices for multi-marketplace management'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-8">Events & Webinars</h1>

        <div className="space-y-6">
          {upcomingEvents.map((event, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{event.title}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{event.type}</Badge>
                      <Badge variant="secondary">{event.location}</Badge>
                    </div>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{event.date} at {event.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                  <p className="text-gray-700 mt-4">{event.description}</p>
                  <Button className="mt-4 bg-gradient-to-r from-blue-600 to-cyan-600">
                    Register Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Stay Updated</h3>
              <p className="text-gray-600 mb-4">
                Subscribe to our newsletter to receive event announcements and updates
              </p>
              <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white">
                Subscribe to Newsletter
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
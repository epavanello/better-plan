import { PlatformSelector } from "@/components/platform-selector"
import { Button } from "@/components/ui/button"
import { getIntegrations } from "@/functions/integrations"
import { getPosts } from "@/functions/posts"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  addDays,
  addMinutes,
  addWeeks,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  setHours,
  setMilliseconds,
  setMinutes,
  setSeconds,
  startOfWeek,
  subWeeks
} from "date-fns"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { z } from "zod"

export const Route = createFileRoute("/_protected/app/calendar")({
  loader: async () => {
    const integrations = await getIntegrations()
    return { integrations }
  },
  validateSearch: z.object({
    integrationId: z.string().optional()
  }),
  component: RouteComponent
})

function RouteComponent() {
  const { integrations } = Route.useLoaderData()
  const { integrationId: selectedIntegrationId } = Route.useSearch()
  const navigate = useNavigate()
  const [currentWeek, setCurrentWeek] = useState(() => {
    const now = new Date()
    return startOfWeek(now, { weekStartsOn: 0 }) // Sunday as start of week
  })

  // Get posts for the selected integration
  const { data: posts = [] } = useQuery({
    queryKey: ["posts", selectedIntegrationId],
    queryFn: () => getPosts({ data: { integrationId: selectedIntegrationId } }),
    enabled: !!selectedIntegrationId
  })

  console.log(posts)

  // Generate week days
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeek, i))
    }
    return days
  }, [currentWeek])

  // Generate hours
  const hours = useMemo(() => {
    const hoursList: number[] = []
    for (let hour = 0; hour < 24; hour++) {
      hoursList.push(hour)
    }
    return hoursList
  }, [])

  // Navigation functions
  const goToPreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentWeek(startOfWeek(now, { weekStartsOn: 0 }))
  }

  // Handle platform selection
  const handlePlatformChange = (integrationId: string | undefined) => {
    navigate({
      to: "/app/calendar",
      search: {
        integrationId
      },
      replace: true
    })
  }

  // Handle time slot click
  const handleTimeSlotClick = (day: Date, hour: number, minutes = 0) => {
    if (!selectedIntegrationId) {
      return
    }

    const scheduledDate = setMilliseconds(setSeconds(setMinutes(setHours(day, hour), minutes), 0), 0)

    // Navigate to write page with scheduled date and selected integration
    navigate({
      to: "/app/write",
      search: {
        scheduledDate: format(scheduledDate, "yyyy-MM-dd'T'HH:mm:ss"),
        integrationId: selectedIntegrationId
      }
    })
  }

  // Get posts for a specific time slot
  const getPostsForTimeSlot = (day: Date, hour: number, minutes: number) => {
    const slotStart = setMilliseconds(setSeconds(setMinutes(setHours(day, hour), minutes), 0), 0)
    const slotEnd = addMinutes(slotStart, 30)

    const postsInSlot = posts.filter((post) => {
      // Use scheduledAt if available, otherwise use postedAt
      const postDate = post.scheduledAt ? new Date(post.scheduledAt) : post.postedAt ? new Date(post.postedAt) : null
      if (!postDate) return false
      return isAfter(postDate, slotStart) && isBefore(postDate, slotEnd)
    })
    return postsInSlot
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-14 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-bold text-xl sm:text-2xl">Content Calendar</h1>
              <p className="text-muted-foreground text-sm">Schedule your posts by selecting time slots</p>
            </div>

            {/* Platform Selector */}
            <div className="w-full sm:w-64">
              <PlatformSelector
                integrations={integrations}
                selectedIntegrationId={selectedIntegrationId}
                onSelectionChange={handlePlatformChange}
                placeholder="Select a platform"
              />
            </div>
          </div>

          {/* Week Navigation */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
            <div className="font-medium text-sm">
              {format(currentWeek, "MMM d")} - {format(endOfWeek(currentWeek, { weekStartsOn: 0 }), "MMM d, yyyy")}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="container mx-auto p-4">
        {!selectedIntegrationId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 rounded-full bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 font-semibold text-xl">Select a platform to view calendar</h2>
            <p className="max-w-md text-muted-foreground">
              Choose a platform from the dropdown above to see your posting schedule and create new posts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header with days */}
              <div className="grid grid-cols-8 gap-px border-b bg-muted">
                <div className="bg-background p-3 text-center font-medium text-sm">Time</div>
                {weekDays.map((day, index) => (
                  <div key={index} className="bg-background p-3 text-center">
                    <div className="font-medium text-sm">{format(day, "EEE")}</div>
                    <div className="text-muted-foreground text-xs">{format(day, "MMM d")}</div>
                  </div>
                ))}
              </div>

              {/* Time slots */}
              <div className="bg-muted">
                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 gap-px">
                    {/* Hour label */}
                    <div className="bg-background p-2 text-center text-muted-foreground text-xs">{hour.toString().padStart(2, "0")}:00</div>

                    {/* Day slots for this hour */}
                    {weekDays.map((day, dayIndex) => (
                      <div key={`${hour}-${dayIndex}`} className="bg-background">
                        {/* Two 30-minute slots per hour */}
                        {[0, 30].map((minutes) => {
                          const postsInSlot = getPostsForTimeSlot(day, hour, minutes)
                          const slotTime = setMilliseconds(setSeconds(setMinutes(setHours(day, hour), minutes), 0), 0)
                          const isPastTime = isBefore(slotTime, new Date())

                          return (
                            <div
                              key={minutes}
                              className={`h-8 cursor-pointer border-b border-l-2 p-1 text-xs transition-colors ${isPastTime ? "bg-muted/50 text-muted-foreground" : "hover:bg-muted/50"}
                                ${postsInSlot.length > 0 ? "border-l-blue-500 bg-blue-50 dark:bg-blue-950" : "border-l-transparent"}
                              `}
                              onClick={() => !isPastTime && handleTimeSlotClick(day, hour, minutes)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  !isPastTime && handleTimeSlotClick(day, hour, minutes)
                                }
                              }}
                              title={
                                postsInSlot.length > 0
                                  ? `${postsInSlot.length} post(s) scheduled`
                                  : isPastTime
                                    ? "Past time slot"
                                    : "Click to schedule a post"
                              }
                            >
                              {postsInSlot.length > 0 && (
                                <div className="truncate font-medium text-blue-700 dark:text-blue-300">
                                  {postsInSlot[0].content.substring(0, 20)}...
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

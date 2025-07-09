import type { Platform } from "@/database/schema/integrations"
import {
  FacebookIcon,
  LinkedInIcon,
  RedditIcon,
  TikTokIcon,
  XIcon
} from "@daveyplate/better-auth-ui"
import { InstagramIcon, YoutubeIcon } from "lucide-react"

export const platformIcons: Record<Platform, React.ReactNode> = {
  x: <XIcon className="h-4 w-4" />,
  reddit: <RedditIcon className="h-4 w-4" />,
  instagram: <InstagramIcon className="h-4 w-4" />,
  tiktok: <TikTokIcon className="h-4 w-4" />,
  youtube: <YoutubeIcon className="h-4 w-4" />,
  facebook: <FacebookIcon className="h-4 w-4" />,
  linkedin: <LinkedInIcon className="h-4 w-4" />
}

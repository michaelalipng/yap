/* eslint-disable @typescript-eslint/no-explicit-any */

import { 
  Bird, Bug, Cat, Dog, Fish, Panda, Rabbit, Rat, Shrimp, Turtle, Squirrel, Snail,
  Egg, Apple, Bean, Candy, Carrot, Citrus, Grape, Croissant, Hamburger, Pizza, Sandwich, Cookie,
  User
} from 'lucide-react'

interface ProfileIconProps {
  profileIcon?: string
  className?: string
  size?: number
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Bird,
  Bug,
  Cat,
  Dog,
  Fish,
  Panda,
  Rabbit,
  Rat,
  Shrimp,
  Turtle,
  Squirrel,
  Snail,
  Egg,
  Apple,
  Bean,
  Candy,
  Carrot,
  Citrus,
  Grape,
  Croissant,
  Hamburger,
  Pizza,
  Sandwich,
  Cookie
}

export default function ProfileIcon({ profileIcon, className = "h-4 w-4", size }: ProfileIconProps) {
  // Debug logging to help identify issues
  if (process.env.NODE_ENV === 'development') {
    console.log('ProfileIcon render:', { profileIcon, className, size })
    console.log('Available icons:', Object.keys(iconMap))
    console.log('Icon map:', iconMap)
    console.log('profileIcon type:', typeof profileIcon)
    console.log('profileIcon value:', JSON.stringify(profileIcon))
  }
  
  // Normalize the profile icon name (trim whitespace, handle case)
  const normalizedIcon = profileIcon?.trim()
  
  // Get the icon component, with fallback to Dog if the icon doesn't exist, then User as final fallback
  let IconComponent = User
  if (normalizedIcon && iconMap[normalizedIcon]) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`ProfileIcon: Found exact match for "${normalizedIcon}"`)
    }
    IconComponent = iconMap[normalizedIcon] as any
  } else if (normalizedIcon) {
    // Try case-insensitive matching
    const iconKey = Object.keys(iconMap).find(key => 
      key.toLowerCase() === normalizedIcon.toLowerCase()
    )
    if (iconKey) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`ProfileIcon: Found case-insensitive match "${iconKey}" for "${normalizedIcon}"`)
      }
      IconComponent = iconMap[iconKey] as any
    } else {
      // If no match found, fall back to Dog (default icon)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`ProfileIcon: Unknown icon "${normalizedIcon}", falling back to Dog`)
      }
      IconComponent = Dog
    }
  } else {
    // If no profileIcon provided, use Dog as default
    if (process.env.NODE_ENV === 'development') {
      console.log('ProfileIcon: No profileIcon provided, using Dog as default')
    }
    IconComponent = Dog
  }
  
  if (size) {
    return <IconComponent className={className} style={{ width: size, height: size }} />
  }
  
  return <IconComponent className={className} />
}

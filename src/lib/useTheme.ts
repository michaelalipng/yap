/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import themeConfig from './themeConfig.json'

export type ThemeConfig = typeof themeConfig

export const useTheme = () => {
  const [theme] = useState<ThemeConfig>(themeConfig)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // In the future, you could load themes dynamically from an API
    setIsLoaded(true)
  }, [])

  const getColor = (colorPath: string) => {
    const path = colorPath.split('.')
    let value: unknown = theme.colors
    
    for (const key of path) {
      value = (value as any)?.[key]
    }
    
    return value || '#000000'
  }

  const getSpacing = (size: keyof ThemeConfig['spacing']) => {
    return theme.spacing[size]
  }

  const getBorderRadius = (size: keyof ThemeConfig['borderRadius']) => {
    return theme.borderRadius[size]
  }

  const getShadow = (size: keyof ThemeConfig['shadows']) => {
    return theme.shadows[size]
  }

  const getComponentStyle = (component: string, variant?: string) => {
    const componentStyles = theme.components[component as keyof ThemeConfig['components']]
    if (!componentStyles) return {}
    
    if (variant) {
      return componentStyles[variant as keyof typeof componentStyles] || {}
    }
    
    return componentStyles
  }

  const getTypography = (type: 'fontFamily' | 'fontSize' | 'fontWeight' | 'lineHeight', variant?: string) => {
    const typography = theme.typography[type]
    if (!typography) return {}
    
    if (variant) {
      return typography[variant as keyof typeof typography] || {}
    }
    
    return typography
  }

  const getAnimation = (name: keyof ThemeConfig['animations']) => {
    return theme.animations[name]
  }

  const getResponsiveValue = (breakpoint: keyof ThemeConfig['responsive']['breakpoints']) => {
    return theme.responsive.breakpoints[breakpoint]
  }

  return {
    theme,
    isLoaded,
    getColor,
    getSpacing,
    getBorderRadius,
    getShadow,
    getComponentStyle,
    getTypography,
    getAnimation,
    getResponsiveValue,
    colors: theme.colors,
    spacing: theme.spacing,
    borderRadius: theme.borderRadius,
    shadows: theme.shadows,
    typography: theme.typography,
    animations: theme.animations,
    responsive: theme.responsive
  }
} 
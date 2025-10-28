"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"

interface FuzzyTextProps {
  children: React.ReactNode
  fontSize?: number | string
  fontWeight?: string | number
  fontFamily?: string
  color?: string
  enableHover?: boolean
  baseIntensity?: number
  hoverIntensity?: number
  className?: string
}

export function FuzzyText({
  children,
  fontSize = "clamp(2rem, 8vw, 8rem)",
  fontWeight = 900,
  fontFamily = "Inter, Helvetica, sans-serif",
  color = "#FFFF33",
  enableHover = true,
  baseIntensity = 0.18,
  hoverIntensity = 0.5,
  className = "",
}: FuzzyTextProps) {
  const textRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!textRef.current) return

    // Removed blur effect for better readability
    textRef.current.style.filter = 'none'
    textRef.current.style.opacity = '1'
  }, [isHovered, enableHover, baseIntensity, hoverIntensity])

  return (
    <div
      ref={textRef}
      onMouseEnter={() => enableHover && setIsHovered(true)}
      onMouseLeave={() => enableHover && setIsHovered(false)}
      className={`transition-all duration-300 ${className}`}
      style={{
        fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize,
        fontWeight,
        fontFamily,
        color,
        display: "inline-block",
      }}
    >
      {children}
    </div>
  )
}

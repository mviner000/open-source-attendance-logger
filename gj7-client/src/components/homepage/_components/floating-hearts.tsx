"use client"

import { Heart } from 'lucide-react'
import { useEffect, useState } from "react"
import Lottie from "lottie-react"
// Import the JSON file
import heartAnimation from "./heart.json"

export function FloatingHearts() {
  const [hearts, setHearts] = useState<Array<{ id: number; size: number; left: number; delay: number }>>([])

  useEffect(() => {
    // Create 20 hearts with random sizes and positions
    const newHearts = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: Math.random() * (40 - 20) + 20, // Random size between 20-40px
      left: Math.random() * 100, // Random position 0-100%
      delay: Math.random() * 2, // Random animation delay 0-2s
    }))
    setHearts(newHearts)
  }, [])

  return (
    <div className="relative h-[500px] w-full overflow-hidden mt-5 mb-10">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-xl"></div>
      
      {/* Floating hearts */}
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute bottom-0 animate-float z-10"
          style={{
            left: `${heart.left}%`,
            width: `${heart.size}px`,
            height: `${heart.size}px`,
            animationDelay: `${heart.delay}s`,
          }}
        >
          <Heart className="size-full text-red-500" fill="currentColor" strokeWidth={1} />
        </div>
      ))}
      
      {/* Lottie animation */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 transform text-center z-20">
        <Lottie
          animationData={heartAnimation}
          loop={true}
          style={{ width: 800, height: 800 }} // Adjust size as needed
          className="mx-auto"
        />
      </div>
      <div className="absolute left-1/2 -bottom-36 -translate-x-1/2 transform text-center z-20">
        <Lottie
          animationData={heartAnimation}
          loop={true}
          style={{ width: 800, height: 800 }} // Adjust size as needed
          className="mx-auto"
        />
      </div>
    </div>
  )
}

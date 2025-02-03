import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

const TypingText = ({ text = "Please input ID or scan QR", className = "text-lg font-medium" }) => {
  const [key, setKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setKey((prev) => prev + 1)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
    },
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={container}
        initial="hidden"
        animate="show"
        exit="exit"
        className={`${className} text-shadow-rose`}
      >
        {text.split("").map((char, index) => (
          <motion.span key={index} variants={item} className="inline-block">
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}

export default TypingText


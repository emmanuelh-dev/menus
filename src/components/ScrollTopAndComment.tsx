'use client'

import { useEffect, useState } from 'react'
import { FaComment, FaStar, FaChevronUp } from 'react-icons/fa'

const ScrollTopAndComment = () => {
  const [show, setShow] = useState(false)
  const [isReviewButtonPulsing, setIsReviewButtonPulsing] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 50) setShow(true)
      else setShow(false)
    }

    window.addEventListener('scroll', handleWindowScroll)
    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [])

  useEffect(() => {
    // Stop pulsing after 10 seconds or after user interaction
    const timer = setTimeout(() => {
      if (!hasInteracted) {
        setIsReviewButtonPulsing(false)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [hasInteracted])

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setHasInteracted(true)
  }
  
  const handleScrollToComment = () => {
    const commentSection = document.querySelector('.review-form-section') || document.getElementById('comment')
    commentSection?.scrollIntoView({ behavior: 'smooth' })
    setIsReviewButtonPulsing(false)
    setHasInteracted(true)
    
    // Add a small celebration effect
    const button = document.querySelector('.review-button')
    if (button) {
      button.classList.add('animate-bounce')
      setTimeout(() => {
        button.classList.remove('animate-bounce')
      }, 600)
    }
  }

  return (
    <div className={`fixed bottom-6 right-6 z-[1000] flex flex-col gap-2 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      {/* Main Review Button */}
      <button
        onClick={handleScrollToComment}
        className={`review-button relative bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105 ${isReviewButtonPulsing ? 'animate-pulse' : ''}`}
        aria-label="Escribir reseña"
      >
        <FaStar className="w-5 h-5" />
        {isReviewButtonPulsing && (
          <span className="absolute -top-1 -right-1 bg-yellow-400 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center animate-bounce text-[10px]">
            !
          </span>
        )}
      </button>

      {/* Scroll to top button */}
      <button
        aria-label="Ir arriba"
        onClick={handleScrollTop}
        className="bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-105"
      >
        <FaChevronUp className="w-5 h-5" />
      </button>
    </div>
  )
}

export default ScrollTopAndComment

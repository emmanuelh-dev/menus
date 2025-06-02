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
    <div className={`fixed bottom-6 right-6 z-[1000] flex flex-col gap-3 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
      {/* Main Review Button - Most prominent */}
      <div className="relative">
        <button
          onClick={handleScrollToComment}
          className={`review-button group relative bg-gradient-to-r from-orange-500 to-red-500 text-white px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 font-semibold text-sm min-w-[140px] justify-center transform hover:scale-105 ${isReviewButtonPulsing ? 'animate-pulse' : ''}`}
          aria-label="Escribir reseña"
        >
          <FaStar className="text-yellow-300 group-hover:scale-110 transition-transform duration-200" size={16} />
          <span className="hidden sm:inline">Escribir Reseña</span>
          <span className="sm:hidden">Reseña</span>
          <FaComment className="group-hover:scale-110 transition-transform duration-200" size={14} />
          
          {/* Floating notification dot */}
          <div className={`absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full transition-all duration-300 ${isReviewButtonPulsing ? 'animate-bounce scale-100' : 'scale-0'}`}></div>
          
          {/* Ripple effect on hover */}
          <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        </button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
          ¡Comparte tu experiencia! ⭐
          <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>

      {/* Scroll to top button - Secondary */}
      <button
        aria-label="Ir arriba"
        onClick={handleScrollTop}
        className="rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 p-3 text-gray-600 transition-all duration-300 hover:bg-white hover:text-orange-500 hover:border-orange-200 hover:shadow-lg group transform hover:scale-105"
      >
        <FaChevronUp className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
      </button>
    </div>
  )
}

export default ScrollTopAndComment

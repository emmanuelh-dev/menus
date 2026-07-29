'use client'

import { useEffect, useState } from 'react'
import { FaStar, FaChevronUp, FaDownload, FaComment } from 'react-icons/fa'

const ScrollTopAndComment = () => {
  const [show, setShow] = useState(false)
  const [isReviewButtonPulsing, setIsReviewButtonPulsing] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 50) setShow(true)
      else setShow(false)
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
    }

    window.addEventListener('scroll', handleWindowScroll)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('scroll', handleWindowScroll)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
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
    // Try multiple selectors for different page types (restaurants, motels, etc.)
    const commentSection =
      document.querySelector('.review-form-section') ||
      document.querySelector('[data-review-section]') ||
      document.querySelector('form') ||
      document.getElementById('reviews') ||
      document.getElementById('comment')

    if (commentSection) {
      commentSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      // Fallback: scroll to bottom of page
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    }

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

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    }
    setHasInteracted(true)
  }

  return (
    <>
      {/* Install App Button - Bottom LEFT to avoid overlap with Cart/WhatsApp */}
      {deferredPrompt && (
        <div className={`fixed bottom-6 left-6 z-[1000] transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <button
            onClick={handleInstall}
            className="bg-marca-500 hover:bg-marca-600 text-white p-3 rounded-full  transition-all hover:scale-105 flex items-center justify-center group relative border-2 border-white"
            aria-label="Instalar App del Menú"
          >
            <FaDownload className="w-5 h-5" />
            <span className="absolute left-full ml-3 bg-neutral-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold">
              Instalar Menú
            </span>
          </button>
        </div>
      )}

      {/* Floating Buttons Group - Bottom LEFT */}
      <div className={`fixed bottom-6 left-6 z-[35] flex flex-col gap-3 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {/* Main Review Button - Enhanced for visibility */}
        <button
          onClick={handleScrollToComment}
          className={`review-button group relative bg-gradient-to-r from-neutral-500 to-neutral-500 hover:from-neutral-600 hover:to-neutral-600 text-white p-2 rounded-full shadow-2xl transition-all hover:scale-110 border-2 border-white/30 ${isReviewButtonPulsing ? 'animate-pulse' : ''}`}
          aria-label="Escribir reseña"
        >
          <FaComment className="w-6 h-6" />
          {isReviewButtonPulsing && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-bounce  border-2 border-white">
              !
            </span>
          )}
          {/* Tooltip */}
          <span className="absolute left-full ml-3 bg-neutral-900 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold shadow-xl border border-white/20">
            Comentarios
          </span>
        </button>

        {/* Scroll to top button */}
        <button
          aria-label="Ir arriba"
          onClick={handleScrollTop}
          className="group relative bg-neutral-700 hover:bg-neutral-600 text-white p-3 rounded-full  transition-all hover:scale-105 border border-white/20"
        >
          <FaChevronUp className="w-5 h-5" />
          <span className="absolute left-full ml-3 bg-neutral-900 text-white text-xs py-2 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none font-bold shadow-xl border border-white/20">
            ↑ Subir
          </span>
        </button>
      </div>
    </>
  )
}

export default ScrollTopAndComment

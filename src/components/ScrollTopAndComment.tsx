'use client'

import { useEffect, useState } from 'react'
import { FaComment } from 'react-icons/fa'

const ScrollTopAndComment = () => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 50) setShow(true)
      else setShow(false)
    }

    window.addEventListener('scroll', handleWindowScroll)
    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [])

  const handleScrollTop = () => {
    window.scrollTo({ top: 0 })
  }
  const handleScrollToComment = () => {
    document.getElementById('comment')?.scrollIntoView()
  }


  return (
    <div className={`fixed bottom-[20px] right-7 z-[1000] flex flex-col-reverse gap-3`}>
      <button
        aria-label="Scroll To Top"
        onClick={handleScrollTop}
        className="rounded-full bg-neutral-200 p-2 text-neutral-500 transition-all hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <button
        onClick={handleScrollToComment}
        className="rounded-full bg-neutral-200 p-2 text-neutral-500 transition-all hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-600"
        aria-label="Ver comentarios"
      >
        <FaComment size={20} />
      </button>
    </div>
  )
}

export default ScrollTopAndComment

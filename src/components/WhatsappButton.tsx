import React from 'react'
import { FaWhatsapp } from 'react-icons/fa'

export default function WhatsappButton({phone = 528126060795}) {
  return (
    <a
    href={`https://wa.me/${phone}`}
    target="_blank"
    className={`rounded-full bg-green-400 p-2 text-white transition-all hover:bg-green-300 dark:bg-green-400 fixed bottom-[115px] right-7 z-[100]`}
  >
    <FaWhatsapp className="size-5" />
  </a>
  )
}

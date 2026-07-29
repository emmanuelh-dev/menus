import React from 'react'
import { FaWhatsapp } from 'react-icons/fa'

export default function WhatsappButton({phone = 528126060795}) {
  return (
    <a
    href={`https://wa.me/${phone}`}
    target="_blank"
    className={`rounded-full bg-marca-400 p-2 text-white transition-all hover:bg-marca-300 dark:bg-marca-400 fixed bottom-[130px] right-7 z-[100]`}
  >
    <FaWhatsapp className="size-5" />
  </a>
  )
}

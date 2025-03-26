import { useState } from "react";
import { supabase } from "../lib/supabase";
import { type Contact, type ContactFormStatus } from "../types/contact";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ContactFormStatus | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus(null);

    try {
      const { error } = await supabase
        .from("contact")
        .insert([{ email, message } as Contact]);

      if (error) throw error;

      setStatus({ success: true, message: "¡Mensaje enviado con éxito!" });
      setEmail("");
      setMessage("");

      // Ocultar mensaje después de 1.5 segundos
      setTimeout(() => setStatus(null), 1500);
    } catch (error: any) {
      setStatus({ success: false, message: error.message || "Error al enviar el mensaje" });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-4xl py-8 font-bold mb-4 text-center">Contáctanos</h1>
      <div className="text-balance ">
        <p>¿Tienes alguna pregunta o comentario? No dudes en enviarnos un mensaje.</p>
        <p>Usa este formulario para solicitar un registro o nuevas características.</p>
      </div>
      {status && (
        <div
          className={`px-4 py-3 rounded mb-4 ${status.success ? "bg-green-100 border-green-400 text-green-700" : "bg-red-100 border-red-400 text-red-700"
            }`}
        >
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label htmlFor="email" className="block mb-1">Correo electrónico</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label htmlFor="message" className="block mb-1">Mensaje</label>
          <textarea
            id="message"
            name="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            rows={4}
            required
          />
        </div>

        <button type="submit" className="bg-black text-white px-4 font-semibold rounded hover:bg-black/80 w-full py-3">
          Enviar mensaje
        </button>
      </form>
    </div>
  );
}

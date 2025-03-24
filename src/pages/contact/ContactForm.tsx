import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ContactForm() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [status, setStatus] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        console.log("Enviando formulario...");

        setStatus(null);

        try {
            const { error } = await supabase
                .from("contact")
                .insert([{ email, message }]);

            if (error) throw error;

            setStatus({ success: true, message: "¡Mensaje enviado con éxito!" });
            setEmail("");
            setMessage("");

            // Ocultar mensaje después de 1.5 segundos
            setTimeout(() => setStatus(null), 1500);
        } catch (error) {
            setStatus({ success: false, message: error.message || "Error al enviar el mensaje" });
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Contáctanos</h1>

            {status && (
                <div
                    className={`px-4 py-3 rounded mb-4 ${status.success ? "bg-green-100 border-green-400 text-green-700" : "bg-red-100 border-red-400 text-red-700"
                        }`}
                >
                    {status.message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
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

                <div className="mt-4">
                    <label htmlFor="message" className="block mb-1">Mensaje</label>
                    <textarea
                        id="message"
                        name="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        rows={5}
                        required
                    />
                </div>

                <button type="submit" className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                    Enviar mensaje
                </button>
            </form>
        </div>
    );
}

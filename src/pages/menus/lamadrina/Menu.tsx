
import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import type { ImageMetadata } from 'astro';
import CopyClabe from '../../../components/CopyClabe';

interface ImageData {
  src: {
    src: string;
    width: number;
    height: number;
    format: string;
  };
  alt: string;
}

export default function Menu({ gallery }: { gallery: ImageData[] }) {
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);

  const openModal = (image: ImageData) => {
    setSelectedImage(image);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  const contactInfo = {
    clabe: "646015206825470152", // CLABE existente
    clabe2: "728969000034765417", // Nueva CLABE
    beneficiary2: "Yazmin Ayala", // Nuevo beneficiario
    bank2: "STP", // Nuevo banco
    delivery: "$25 - $35",
    hours: "Martes a Domingo de 08:30 a 14:00",
    address: "Calzada Union #231, Talaverna Croc",
    whatsapp: "8133906548",
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#ff7223] p-2 relative">
      <div>
        {/* Decorative elements */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-yellow-300 rounded-full opacity-70"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `float ${3 + Math.random() * 5}s infinite ease-in-out`,
            }}
          />
        ))}

        {/* Header */}
        <div className="relative z-10 text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-black drop-shadow-lg">
            GORDITAS Y TACOS
            <br />
            <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-yellow-300">LA MADRINA</span>
          </h1>
          <div className="text-lg sm:text-xl md:text-2xl mt-2 sm:mt-4 text-black">CALZADA UNIÓN #231</div>
          <div className="text-base sm:text-lg md:text-xl text-black">8131152910 - 8133906548</div>
          <div className="text-sm sm:text-base md:text-lg italic text-black">
            Pagos con tarjeta y transferencia
          </div>
        </div>
        <CopyClabe clabes={[contactInfo.clabe, contactInfo.clabe2]} />

        {/* Content */}
        <div className="flex flex-col lg:flex-row justify-between items-center relative z-10 gap-8 lg:gap-12">


          {/* Menu Items */}
          <div className="w-full lg:w-1/2 bg-white/20 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-black drop-shadow-md">Menú</h2>
            <ul className="text-black text-xl sm:text-2xl font-bold space-y-3">
              <li className="p-2 bg-yellow-300/80 rounded-lg transition-transform hover:scale-105 shadow-md">CHICHARRÓN</li>
              <li className="p-2 bg-yellow-300/80 rounded-lg transition-transform hover:scale-105 shadow-md">DESHEBRADA</li>
              <li className="p-2 bg-yellow-300/80 rounded-lg transition-transform hover:scale-105 shadow-md">ASADO</li>
              <li className="p-2 bg-yellow-300/80 rounded-lg transition-transform hover:scale-105 shadow-md">PAPÁ A LA MEXICANA</li>
              <li className="p-2 bg-yellow-300/80 rounded-lg transition-transform hover:scale-105 shadow-md">HUEVO EN SALSA</li>
              <li className="p-2 bg-yellow-300/80 rounded-lg transition-transform hover:scale-105 shadow-md">RAJAS CON QUESO</li>
              <li className="p-2 bg-yellow-300/80 rounded-lg transition-transform hover:scale-105 shadow-md">FRIJOL CON QUESO</li>
              <li className="p-2 bg-yellow-300/80 rounded-lg transition-transform hover:scale-105 shadow-md">DISCADA</li>
            </ul>
          </div>

          {/* Gallery */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-black drop-shadow-md">Nuestras Delicias</h2>
            <div className="grid grid-cols-2 gap-3">
              {gallery.map((image, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-lg cursor-pointer transition-transform duration-300 hover:scale-105 shadow-md"
                  onClick={() => openModal(image)}
                >
                  <img
                    src={image.src.src}
                    alt={image.alt}
                    className="w-full aspect-square object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-2">
                    <p className="text-black text-sm font-medium">{image.alt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={closeModal}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-black text-4xl font-bold z-50 hover:text-yellow-300 transition-colors"
              onClick={closeModal}
            >
              &times;
            </button>
            <img
              src={selectedImage.src.src}
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/528133906548`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[80px] right-6 bg-[#25D366] text-black p-2 rounded-full shadow-lg hover:bg-[#128C7E] transition-colors duration-300 z-50 flex items-center justify-center animate-[pulse_2s_infinite]"
        style={{ animation: 'pulse 2s infinite' }}
      >
        <FaWhatsapp className="text-3xl" />
      </a>
    </div>
  );
}


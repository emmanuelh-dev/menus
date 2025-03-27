
export default function Menu() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#ff7223] p-2 sm:p-4">
      <div className="w-full max-w-5xl rounded-lg p-4 sm:p-6 md:p-8 relative overflow-hidden">
        {/* Decorative elements */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-yellow-300 rounded-full opacity-70"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: "rotate(45deg)",
            }}
          />
        ))}

        {/* Header */}
        <div className="relative z-10 text-center mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-yellow-300 leading-tight">
            GORDITAS Y TACOS
            <br />
            <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl">LA MADRINA</span>
          </h1>
          <div className="text-yellow-300 text-lg sm:text-xl md:text-2xl mt-2 sm:mt-4">CALZADA UNIÓN #231</div>
          <div className="text-yellow-300 text-base sm:text-lg md:text-xl">8131152910 - 8133906548</div>
          <div className="text-yellow-300 text-sm sm:text-base md:text-lg italic">
            Pagos con tarjeta y transferencia
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row justify-between items-center relative z-10 gap-6 md:gap-4">
          {/* Food imgs */}
          <div className="flex flex-row justify-center flex-wrap gap-4">
            <div className="relative">
              <div
                className="absolute inset-0 bg-yellow-500 opacity-30 rounded-full"
                style={{ transform: "scale(1.2)" }}
              />
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden border-4 border-purple-700 relative">
                <img
                  src="/placeholder.svg?height=150&width=150"
                  alt="Gordita de chicharrón"
                  width={150}
                  height={150}
                  className="object-cover"
                />
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute inset-0 bg-yellow-500 opacity-30 rounded-full"
                style={{ transform: "scale(1.2)" }}
              />
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:w-32 lg:w-36 lg:h-36 rounded-full overflow-hidden border-4 border-purple-700 relative">
                <img
                  src="/placeholder.svg?height=150&width=150"
                  alt="Gorditas"
                  width={150}
                  height={150}
                  className="object-cover"
                />
              </div>
            </div>

            <div className="relative">
              <div
                className="absolute inset-0 bg-yellow-500 opacity-30 rounded-full"
                style={{ transform: "scale(1.2)" }}
              />
              <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden border-4 border-purple-700 relative">
                <img
                  src="/placeholder.svg?height=150&width=150"
                  alt="Tacos"
                  width={150}
                  height={150}
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="text-center md:text-right w-full md:w-auto">
            <ul className="text-purple-800 text-xl sm:text-2xl md:text-3xl font-bold space-y-1 sm:space-y-2">
              <li>CHICHARRÓN</li>
              <li>DESHEBRADA</li>
              <li>ASADO</li>
              <li>PAPÁ A LA MEXICANA</li>
              <li>HUEVO EN SALSA</li>
              <li>RAJAS CON QUESO</li>
              <li>FRIJOL CON QUESO</li>
              <li>DISCADA</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}


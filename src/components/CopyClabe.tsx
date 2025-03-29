import { useState } from "react";

const CopyClabe = ({ clabes }) => {
  const [copied, setCopied] = useState(null);

  const handleCopy = async (clabe) => {
    try {
      await navigator.clipboard.writeText(clabe);
      setCopied(clabe);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Error copying:", err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 text-center">
      <div className="bg-purple-900 rounded-lg p-3 mb-4">
        <p className="text-white font-bold">TRANSFERENCIA STP:</p>
        <p className="text-white text-sm mb-2">Beneficiario: Yazmin Ayala</p>
        {clabes.map((clabe, index) => (
          <div key={index} className="flex justify-between items-center bg-gray-800 p-2 rounded-lg mb-2">
            <p className="text-yellow-400 font-mono">{clabe}</p>
            <button
              onClick={() => handleCopy(clabe)}
              className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 transition"
            >
              Copiar
            </button>
          </div>
        ))}
        {copied && (
          <p className="text-green-500 mt-2">¡Copiado al portapapeles!</p>
        )}
      </div>
    </div>
  );
};

export default CopyClabe;

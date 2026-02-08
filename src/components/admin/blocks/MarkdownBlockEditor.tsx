import { type MarkdownData } from './types';
import { PiFileText } from 'react-icons/pi';

export function MarkdownBlockEditor({ 
  data, 
  onChange 
}: { 
  data: MarkdownData; 
  onChange: (data: MarkdownData) => void; 
}) {
  return (
    <div className="bg-white rounded-3xl border-2 border-emerald-100 p-6 transition-all hover:border-emerald-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <PiFileText size={18} />
        </div>
        <h3 className="font-bold text-slate-900 tracking-tight text-sm uppercase">Bloque de Texto (Markdown)</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
            Contenido (Markdown soportado)
          </label>
          <textarea
            value={data.content || ''}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="Escribe aquí tu contenido. Puedes usar **negrita**, *cursiva*, [enlaces](https://...), etc."
            className="w-full min-h-[150px] bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all resize-y"
          />
        </div>
        
        <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100">
          <p className="text-[10px] text-emerald-700 leading-tight">
            <strong>Tip:</strong> El Markdown te permite crear encabezados con <code>#</code>, listas con <code>*</code> y mucho más. Ideal para posts largos o secciones de información.
          </p>
        </div>
      </div>
    </div>
  );
}

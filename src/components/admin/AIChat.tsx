import React, { useEffect } from 'react';
import { useAIChat } from '../../hooks/useAIChat';
import { PiSparkle, PiPaperclip, PiPaperPlaneTilt, PiX, PiCheckCircle, PiArrowCounterClockwise } from 'react-icons/pi';

interface AIChatProps {
  placeId: number;
  currentBlocks: any[];
  currentSemanticData: any;
  onContentUpdate: (blocks: any[], semanticData: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function AIChat({
  placeId,
  currentBlocks,
  currentSemanticData,
  onContentUpdate,
  isOpen,
  onClose
}: AIChatProps) {
  const aiChat = useAIChat({
    placeId,
    currentBlocks,
    currentSemanticData,
    onContentUpdate
  });

  // Initialize chat on mount
  useEffect(() => {
    if (isOpen && aiChat.chatMessages.length === 0) {
      aiChat.resetChat();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
              <PiSparkle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-tight text-gray-900">Asistente IA</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/50 hover:bg-white flex items-center justify-center transition-all"
          >
            <PiX className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {aiChat.chatMessages.map((msg, idx) => {
            if (msg.role === 'assistant' && msg.stats) {
              console.log(`💬 Message ${idx} stats:`, msg.stats);
              console.log(`💬 Has change_summary?`, !!msg.stats.change_summary);
            }
            return (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`p-4 rounded-2xl ${msg.role === 'user'
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-none'
                      : 'bg-white border border-gray-100 rounded-tl-none'
                      }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {msg.role === 'assistant' && !msg.stats && msg.usage && (
                      <div className="mt-2 pt-2 border-t border-gray-50 flex justify-end gap-3">
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          In: {msg.usage.promptTokenCount.toLocaleString()}
                        </p>
                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          Out: {msg.usage.candidatesTokenCount.toLocaleString()}
                        </p>
                        <p className="text-[8px] text-purple-600 font-bold uppercase tracking-widest flex items-center gap-1">
                          <PiSparkle className="w-2 h-2" />
                          Total: {msg.usage.totalTokenCount.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {/* AI Stats / Pending Changes Card */}
                    {msg.role === 'assistant' && msg.stats && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                        {/* Detailed Change Summary */}
                        {msg.stats.change_summary && (
                          <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                            <p className="text-[9px] text-purple-600 uppercase font-bold mb-2 flex items-center gap-1">
                              <PiSparkle className="w-3 h-3" />
                              Cambios Detectados
                            </p>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                              {msg.stats.change_summary}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Secciones</p>
                            <p className="text-lg font-black text-gray-900">{msg.stats.sections}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Productos</p>
                            <p className="text-lg font-black text-gray-900">{msg.stats.items}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Variantes</p>
                            <p className="text-lg font-black text-purple-600">{msg.stats.options || 0}</p>
                          </div>
                          {msg.usage && (
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-3 text-[10px] space-y-1">
                              <p className="text-[9px] text-gray-400 uppercase font-bold mb-1">Detalle de Tokens</p>
                              <div className="flex justify-between items-center text-gray-500 font-medium">
                                <span>Input (Prompt):</span>
                                <span className="font-bold">{msg.usage.promptTokenCount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-gray-500 font-medium">
                                <span>Output (IA):</span>
                                <span className="font-bold">{msg.usage.candidatesTokenCount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-purple-600 font-black pt-1 border-t border-purple-100">
                                <span>TOTAL:</span>
                                <span>{msg.usage.totalTokenCount.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={aiChat.confirmAiChanges}
                          className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-purple-100 flex items-center justify-center gap-2"
                        >
                          {aiChat.aiProcessing ? (
                            <PiArrowCounterClockwise className="w-4 h-4 animate-spin pointer-events-none" />
                          ) : (
                            <PiCheckCircle className="w-4 h-4 pointer-events-none" />
                          )}
                          Aplicar estos cambios
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {aiChat.aiProcessing && (
            <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
              <div className="max-w-[85%] sm:max-w-[70%]">
                <div className="p-4 rounded-2xl bg-white border border-gray-100 rounded-tl-none">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-gray-500 font-medium ml-2">Procesando con IA...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={aiChat.chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-5 bg-white border-t shrink-0">
          {aiChat.aiFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-2xl border border-gray-100">
              {aiChat.aiFiles.map((file, idx) => (
                <div key={idx} className="group relative transition-all hover:scale-105">
                  <img
                    src={file.data}
                    alt={file.name}
                    className="w-14 h-14 object-cover rounded-xl border border-gray-200 shadow-sm"
                  />
                  <button
                    onClick={() => aiChat.removeAiFile(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 shadow-md z-10 hover:bg-red-600"
                  >
                    <PiX size={10} className="pointer-events-none" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative group transition-all">
            <textarea
              className="w-full p-4 pr-16 text-sm bg-gray-50 rounded-2xl border-2 border-transparent focus:border-purple-500 focus:bg-white outline-none resize-none transition-all placeholder:text-gray-400 font-medium min-h-[50px] max-h-[150px]"
              placeholder="Escribe algo... o pega una imagen del menú"
              rows={1}
              onPaste={aiChat.handlePaste}
              value={aiChat.textInput}
              onChange={(e) => aiChat.setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  aiChat.handleAISubmit();
                }
              }}
              disabled={aiChat.aiProcessing}
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              <label className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-xl flex items-center justify-center cursor-pointer transition-all">
                <PiPaperclip className="w-4 h-4 text-gray-600" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={aiChat.handleFileSelect}
                />
              </label>
              <button
                onClick={() => aiChat.handleAISubmit()}
                disabled={aiChat.aiProcessing || (!aiChat.textInput.trim() && aiChat.aiFiles.length === 0)}
                className="w-8 h-8 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 rounded-xl flex items-center justify-center transition-all disabled:cursor-not-allowed"
              >
                <PiPaperPlaneTilt className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

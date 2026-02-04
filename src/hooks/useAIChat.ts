import { useState, useRef } from 'react';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  stats?: {
    sections: number;
    items: number;
    hasAddress: boolean;
    hasPhone: boolean;
    newImages: number;
    change_summary?: string;
  };
}

interface AIFile {
  name: string;
  data: string;
}

interface UseAIChatProps {
  placeId: number;
  currentBlocks: any[];
  currentSemanticData: any;
  onContentUpdate: (blocks: any[], semanticData: any) => void;
}

export function useAIChat({ placeId, currentBlocks, currentSemanticData, onContentUpdate }: UseAIChatProps) {
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiFiles, setAiFiles] = useState<AIFile[]>([]);
  const [textInput, setTextInput] = useState('');
  const [pendingContent, setPendingContent] = useState<any>(null);
  const [aiStats, setAiStats] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleAISubmit = async (userMsg?: string) => {
    const finalMsg = userMsg || textInput.trim();
    if (!finalMsg && aiFiles.length === 0) return;

    setAiProcessing(true);
    setChatMessages(prev => [...prev, { role: 'user', content: finalMsg || (aiFiles.length > 0 ? "Analizando imagen..." : "") }]);
    scrollToBottom();

    try {
      console.log('🚀 Sending to AI:', {
        placeId,
        instruction: finalMsg,
        imagesCount: aiFiles.length,
        blocksCount: currentBlocks.length,
        totalItems: currentBlocks.reduce((acc, b: any) => acc + (b.data?.items?.length || 0), 0)
      });

      const response = await fetch('/api/ai/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          instruction: finalMsg,
          images: aiFiles.map(f => f.data),
          currentContent: { blocks: currentBlocks, semantic_data: currentSemanticData },
          preview: true
        })
      });

      const result = await response.json();

      if (result.success) {
        if (result.preview) {
          setPendingContent(result.content);
          setAiStats(result.stats);

          console.log('📊 Setting message with stats:', result.stats);

          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: result.conversational_response || result.stats?.change_summary || 'He analizado tu solicitud y preparado los cambios.',
            stats: result.stats
          }]);
        } else {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: result.conversational_response || '✓ Operación completada.'
          }]);

          if (result.content && JSON.stringify(result.content.blocks) !== JSON.stringify(currentBlocks)) {
            onContentUpdate(result.content.blocks, result.content.semantic_data);
          }
        }
      } else {
        throw new Error(result.error || 'Error al procesar con IA');
      }
    } catch (err: any) {
      console.error('Error IA:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Lo siento, hubo un error al procesar tu solicitud: ${err.message}`
      }]);
    } finally {
      setAiProcessing(false);
      setTextInput('');
      setAiFiles([]);
      scrollToBottom();
    }
  };

  const confirmAiChanges = async () => {
    if (!pendingContent) return;
    setAiProcessing(true);

    try {
      const response = await fetch('/api/ai/update-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          saveOnly: true,
          currentContent: pendingContent
        })
      });

      const result = await response.json();

      if (result.success) {
        onContentUpdate(pendingContent.blocks, pendingContent.semantic_data);
        setPendingContent(null);
        setAiStats(null);
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: '✓ Cambios aplicados correctamente.'
        }]);
      } else {
        throw new Error(result.error || 'Error al guardar');
      }
    } catch (err: any) {
      console.error('Error al confirmar cambios:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error al aplicar cambios: ${err.message}`
      }]);
    } finally {
      setAiProcessing(false);
      scrollToBottom();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setAiFiles(prev => [...prev, { name: file.name, data: reader.result as string }]);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAiFiles(prev => [...prev, { name: file.name, data: reader.result as string }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAiFile = (index: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetChat = () => {
    setChatMessages([{
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de BysMax. ✨ ¿En qué puedo ayudarte hoy? Puedo analizar fotos de tu menú, actualizar precios o responder dudas sobre la plataforma.'
    }]);
    setPendingContent(null);
    setAiStats(null);
    setAiFiles([]);
    setTextInput('');
  };

  return {
    // State
    chatMessages,
    aiProcessing,
    aiFiles,
    textInput,
    pendingContent,
    aiStats,
    chatEndRef,
    
    // Actions
    setTextInput,
    handleAISubmit,
    confirmAiChanges,
    handlePaste,
    handleFileSelect,
    removeAiFile,
    resetChat,
    scrollToBottom
  };
}

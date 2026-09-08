'use client'

import { useChat } from 'ai/react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageCircle, X, Send, Bot, User, Download, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { jsPDF } from 'jspdf'

const QUICK_SUGGESTIONS = [
    { label: 'Ver stock bajo', query: '¿Qué productos tienen poco stock?' },
    { label: 'Ventas de hoy', query: '¿Cuánto hemos vendido hoy?' },
    { label: 'Top productos', query: 'Muéstrame los 5 productos más vendidos' },
    { label: 'Sugerir promociones', query: 'Sugiere productos para promocionar' },
]

import { usePathname } from 'next/navigation'

export function ChatWidget() {
    const pathname = usePathname()
    const [isOpen, setIsOpen] = useState(false)
    const [conversationId, setConversationId] = useState<string | null>(null)

    // No renderizar en login por seguridad


    const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
        api: '/api/chat',
        body: { conversationId },
        onError: (error: Error) => {
            console.error('Chat error:', error)
        },
        onResponse: (response: Response) => {
            // Extraer conversationId de la respuesta si viene en headers
            const convId = response.headers.get('x-conversation-id')
            if (convId && !conversationId) {
                setConversationId(convId)
            }
        }
    })
    const scrollRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleQuickSuggestion = (query: string) => {
        const syntheticEvent = {
            preventDefault: () => { },
        } as React.FormEvent<HTMLFormElement>

        handleInputChange({
            target: { value: query }
        } as React.ChangeEvent<HTMLInputElement>)

        setTimeout(() => {
            handleSubmit(syntheticEvent)
        }, 100)
    }

    const exportToPDF = async () => {
        try {
            const pdf = new jsPDF()
            let yPosition = 20
            const pageHeight = pdf.internal.pageSize.height
            const margin = 20
            const lineHeight = 7

            pdf.setFontSize(16)
            pdf.text('Conversación del Asistente AI', margin, yPosition)
            yPosition += 15

            pdf.setFontSize(10)
            pdf.text(`Fecha: ${new Date().toLocaleDateString()}`, margin, yPosition)
            yPosition += 15

            messages.forEach((message: any, index: number) => {
                // Check if we need a new page
                if (yPosition > pageHeight - 30) {
                    pdf.addPage()
                    yPosition = 20
                }

                pdf.setFontSize(11)
                pdf.setFont('helvetica', 'bold')
                const role = message.role === 'user' ? 'Usuario' : 'Asistente'
                pdf.text(`${role}:`, margin, yPosition)
                yPosition += lineHeight

                pdf.setFont('helvetica', 'normal')
                pdf.setFontSize(10)

                // Split long text into lines
                const lines = pdf.splitTextToSize(message.content, 170)
                lines.forEach((line: string) => {
                    if (yPosition > pageHeight - 20) {
                        pdf.addPage()
                        yPosition = 20
                    }
                    pdf.text(line, margin, yPosition)
                    yPosition += lineHeight
                })

                yPosition += 5 // Space between messages
            })

            pdf.save(`chat-${new Date().getTime()}.pdf`)
        } catch (error) {
            console.error('Error exporting to PDF:', error)
            alert('Error al exportar a PDF')
        }
    }

    const clearConversation = () => {
        setMessages([])
        setConversationId(null)
    }

    // No renderizar en login por seguridad
    if (pathname === '/login') return null

    return (
        <>
            {/* Floating Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 p-0 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="icon"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </Button>

            {/* Chat Window */}
            {isOpen && (
                <Card className="fixed bottom-24 right-6 w-[350px] sm:w-[450px] h-[600px] shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-200">
                    <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Asistente AI Mejorado
                            </CardTitle>
                            <div className="flex gap-2">
                                {messages.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20"
                                        onClick={exportToPDF}
                                        title="Exportar a PDF"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden relative bg-gradient-to-b from-slate-50 to-white">
                        <div className="h-full overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                            {messages.length === 0 && (
                                <div className="text-center text-muted-foreground mt-8">
                                    <div className="mb-4">
                                        <Sparkles className="h-12 w-12 mx-auto text-purple-500 mb-2" />
                                        <p className="font-medium text-lg">¡Hola! Soy tu asistente mejorado.</p>
                                    </div>
                                    <p className="text-sm mb-4">Intenta estas opciones rápidas:</p>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                                            <Button
                                                key={idx}
                                                variant="outline"
                                                size="sm"
                                                className="text-xs h-auto py-2 px-3 hover:bg-purple-50 hover:border-purple-300"
                                                onClick={() => handleQuickSuggestion(suggestion.query)}
                                            >
                                                {suggestion.label}
                                            </Button>
                                        ))}
                                    </div>
                                    <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs">
                                        <p className="font-medium mb-1">🎯 Nuevas capacidades:</p>
                                        <ul className="list-disc list-inside text-left space-y-1">
                                            <li>Crear alertas de reabastecimiento</li>
                                            <li>Ver historial de clientes</li>
                                            <li>Sugerir productos para promocionar</li>
                                            <li>Exportar conversaciones a PDF</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {messages.map((m: any) => (
                                <div key={m.id} className={cn("flex gap-2", m.role === 'user' ? "justify-end" : "justify-start")}>
                                    {m.role !== 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                                            <Bot className="h-4 w-4 text-white" />
                                        </div>
                                    )}

                                    <div className={cn(
                                        "rounded-lg p-3",
                                        m.role === 'user'
                                            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white max-w-[80%]"
                                            : "bg-white border border-gray-200 text-foreground shadow-sm max-w-[92%]"
                                    )}>
                                        {m.role === 'assistant' ? (
                                            <div className="prose prose-sm max-w-none text-gray-800
                                                prose-headings:text-gray-900 prose-headings:mt-2 prose-headings:mb-1
                                                prose-strong:text-gray-900
                                                prose-p:my-1 prose-p:text-gray-800
                                                prose-ul:my-1 prose-li:my-0 prose-li:text-gray-800
                                                prose-table:text-xs prose-table:border-collapse
                                                prose-th:bg-purple-50 prose-th:text-purple-800 prose-th:font-semibold prose-th:px-2 prose-th:py-1 prose-th:border prose-th:border-gray-300
                                                prose-td:px-2 prose-td:py-1 prose-td:border prose-td:border-gray-200 prose-td:text-gray-700">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {m.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="text-sm">{m.content}</div>
                                        )}
                                        {m.toolInvocations?.map((toolInvocation: any) => {
                                            const toolCallId = toolInvocation.toolCallId;
                                            const toolName = toolInvocation.toolName;

                                            const toolLabels: Record<string, string> = {
                                                'list_low_stock': '📦 Consultando inventario...',
                                                'search_products': '🔍 Buscando productos...',
                                                'get_recent_sales': '💰 Consultando ventas...',
                                                'get_total_sales_today': '📊 Calculando total...',
                                                'analyze_top_products': '📈 Analizando ventas...',
                                                'create_reorder_alert': '🔔 Creando alerta...',
                                                'get_customer_history': '👤 Analizando historial...',
                                                'suggest_promotions': '🎁 Generando sugerencias...',
                                            }

                                            return (
                                                <div key={toolCallId} className="text-xs text-muted-foreground mt-2 italic flex items-center gap-1">
                                                    <span className="animate-pulse">
                                                        {toolLabels[toolName] || '⚙️ Procesando...'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {m.role === 'user' && (
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shrink-0">
                                            <User className="h-4 w-4 text-slate-700" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-2 justify-start">
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
                                        <Bot className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                            <span className="text-sm text-muted-foreground">Pensando...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="p-3 border-t bg-white">
                        <form onSubmit={(e) => {
                            console.log('📝 Submitting form', input)
                            handleSubmit(e)
                        }} className="flex flex-col w-full gap-2">
                            <div className="flex gap-2">
                                <Input
                                    value={input || ''}
                                    onChange={handleInputChange}
                                    placeholder="Escribe tu pregunta..."
                                    className="flex-1"
                                    disabled={isLoading}
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    disabled={isLoading || !input?.trim()}
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                            {messages.length > 0 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearConversation}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Nueva conversación
                                </Button>
                            )}
                        </form>
                    </CardFooter>
                </Card>
            )}
        </>
    )
}

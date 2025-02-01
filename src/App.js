import React, { useState, useRef, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import MarkdownRenderer from "./MarkdownRenderer";

const ChatOllama = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const controllerRef = useRef(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  useEffect(() => {
    const fetchSystemPrompt = async () => {
      try {
        const response = await fetch('/system_prompt.txt');
        const text = await response.text();
        setSystemPrompt(text);
      } catch (error) {
        console.error("Erreur lors du chargement du system prompt:", error);
      }
    };
    fetchSystemPrompt();
  }, []);

  const scrollToBottom = () => {
    if (isScrolledToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isScrolledToBottom]);

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = messagesEndRef.current.parentNode;
    setIsScrolledToBottom(scrollTop + clientHeight >= scrollHeight);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    // Création des nouveaux messages
    const newUserMessage = { content: inputMessage, isBot: false };
    const newBotMessage = { content: '', isBot: true };

    const chatHistory = [
      { role: 'user', content: systemPrompt },
      ...messages.map(msg => ({ role: msg.isBot ? 'assistant' : 'user', content: msg.content })),
      { role: 'user', content: inputMessage }
    ];

    // Mise à jour optimiste de l'état
    setMessages(prev => [...prev, newUserMessage, newBotMessage]);

    try {
      setIsLoading(true);
      controllerRef.current = new AbortController();

      const response = await fetch('https://pontsgpt.enpc.org/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-r1:32b',
          messages: chatHistory,
          stream: true,
          options: {
            num_ctx: 40000
          }
        }),
        signal: controllerRef.current.signal
      });

      console.log(response);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            fullResponse += parsed.message?.content || '';

            // Mise à jour progressive du message
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              return lastMessage.isBot ?
                [...prev.slice(0, -1), { ...lastMessage, content: fullResponse }] :
                prev;
            });
          } catch (err) {
            console.error('Erreur de parsing:', err);
          }
        }
      }
    } catch (error) {
      // Gestion d'erreur (identique)
    } finally {
      setIsLoading(false);
    }

    setInputMessage('');
  };

  const stopGeneration = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="chat-container">
        <div className="header">
          <h1>Ponts GPT</h1>
          <div className="status">
            <div className="status-indicator"></div>
            <span>En ligne</span>
          </div>
        </div>

        <div className="messages-container" onScroll={handleScroll}>
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.isBot ? 'bot' : 'user'}`}
            >
              <div className="message-content">
                <MarkdownRenderer content={msg.content} />
                {index === messages.length - 1 && msg.isBot && isLoading && (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="send-button"
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
            {isLoading && (
              <button
                type="button"
                onClick={stopGeneration}
                className="stop-button"
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M6 6h12v12H6z"/>
                </svg>
              </button>
            )}
          </div>
        </form>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .chat-container {
          width: 100%;
          max-width: 800px;
          height: 90vh;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .header {
          padding: 20px;
          background: #ffffff;
          border-bottom: 1px solid #eee;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .header h1 {
          margin: 0;
          color: #2d3748;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .status {
          display: flex;
          align-items: center;
          margin-top: 8px;
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #48bb78;
          margin-right: 8px;
        }

        .status span {
          color: #718096;
          font-size: 0.9rem;
        }

        .messages-container {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: #f8fafc;
        }

        .message {
          display: flex;
          margin: 12px 0;
        }

        .message.user {
          justify-content: flex-end;
        }

        .message-content {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 15px;
          line-height: 1.4;
          font-size: 1rem;
          position: relative;
          word-wrap: break-word; /* Ajouté pour gérer le débordement de texte */
          overflow-wrap: break-word; /* Ajouté pour gérer le débordement de texte */
        }

        .message.bot .message-content {
          background: white;
          color: #2d3748;
          border: 1px solid #e2e8f0;
          border-radius: 15px 15px 15px 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
        }

        .message.user .message-content {
          background: #4a90e2;
          color: white;
          border-radius: 15px 15px 4px 15px;
          box-shadow: 0 2px 4px rgba(74, 144, 226, 0.2);
        }

        .input-form {
          padding: 20px;
          background: white;
          border-top: 1px solid #eee;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        input {
          flex: 1;
          padding: 14px 20px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 1rem;
          transition: all 0.3s ease;
          background: #f8fafc;
        }

        input:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
          background: white;
        }

        button {
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .send-button {
          padding: 12px;
          background: #4a90e2;
          color: white;
        }

        .send-button:hover {
          background: #357abd;
          transform: translateY(-1px);
        }

        .send-button:disabled {
          background: #cbd5e0;
          cursor: not-allowed;
        }

        .stop-button {
          padding: 12px;
          background: #fc8181;
          color: white;
        }

        .stop-button:hover {
          background: #f56565;
          transform: translateY(-1px);
        }

        .typing-indicator {
          display: flex;
          align-items: center;
          padding: 8px 0;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          margin: 0 2px;
          background: #a0aec0;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }

        /* Scrollbar personnalisée */
        .messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
        
        .message-content :global(.katex) {
          font-size: 1.1em !important;
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 5px;
          border-radius: 3px;
        }

        .message.bot .message-content :global(.katex) {
          color: #2d3748;
        }

        .message.user .message-content :global(.katex) {
          color: #ffffff;
        }

        .message-content :global(.katex-display) {
          margin: 10px 0;
          padding: 10px;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 5px;
          overflow-x: auto;
        }

        .message-content :global(.katex-display > .katex) {
          display: block;
          text-align: center;
        }
        
        .message-content p {
          margin-top: 6px;
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
};

export default ChatOllama;
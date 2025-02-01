import React, {useState} from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const MarkdownRenderer = ({ content }) => {
  const [showThinking, setShowThinking] = useState(false);

  let isThinking = false; // État pour savoir si on est dans <think>
  const elements = [];
  let buffer = "";

  for (let i = 0; i < content.length; i++) {
    if (content.slice(i, i + 7) === "<think>") {
      if (buffer) {
        elements.push({ text: buffer, thinking: isThinking });
        buffer = "";
      }
      isThinking = true;
      i += 6; // Sauter "<think>"
    } else if (content.slice(i, i + 8) === "</think>") {
      if (buffer) {
        elements.push({ text: buffer, thinking: isThinking });
        buffer = "";
      }
      isThinking = false;
      i += 7; // Sauter "</think>"
    } else {
      buffer += content[i];
    }
  }

  if (buffer) {
    elements.push({ text: buffer, thinking: isThinking });
  }

  /*
  return (
    <div>
      {elements.map((part, index) => (
        <div
          key={index}
          style={(part.thinking && part.text.trim().length > 0) ? { color: "gray", fontStyle: "italic", marginBottom: "20px" } : {}}
        >
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {
              part.text
                  .replace(/\\\((.*?)\\\)/gs, `$$$1$$`)
                  .replace(/\\\[(.*?)\\]/gs, `$$$$$1$$$$`)
            }
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );*/

  return (
      <div>
        {elements.map((part, index) => (
            <div key={index}>
              {part.thinking ? (
                  <div>
                    {part.text.trim().length > 0 && (
                        <button className="think-button" onClick={() => setShowThinking(!showThinking)}>
                          {showThinking ? "Cacher le raisonnement" : (isThinking ? "Je réfléchis..." : "Montrer le raisonnement")}
                        </button>
                    )}
                    {showThinking && part.text.trim().length > 0 && (
                        <div style={{color: "gray", fontStyle: "italic", marginBottom: "20px"}}>
                          <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                          >
                            {part.text
                                .replace(/\\\((.*?)\\\)/gs, `$$$1$$`)
                                .replace(/\\\[(.*?)\\]/gs, `$$$$$1$$$$`)}
                          </ReactMarkdown>
                        </div>
                    )}
                  </div>
              ) : (
                  <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                  >
                    {part.text
                        .replace(/\\\((.*?)\\\)/gs, `$$$1$$`)
                        .replace(/\\\[(.*?)\\]/gs, `$$$$$1$$$$`)}
                  </ReactMarkdown>
              )}
            </div>
        ))}
        <style jsx>{`
          .think-button {
          display: inline-block;
          padding: 8px 16px;
          margin: 10px 0;
          border: none;
          border-radius: 12px;
          background: #cbd5e0;
          color: #2d3748;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .think-button:hover {
          background: #a0aec0;
          transform: translateY(-1px);
        }

        .think-button:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(160, 174, 192, 0.1);
        }
      `}</style>
      </div>
  );
};

export default MarkdownRenderer;

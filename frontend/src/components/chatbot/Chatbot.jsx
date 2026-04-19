// React Component
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Chatbot.css';

const Chatbot = ({ 
    userId = 'anonymous', 
    initialRiskLevel = 'MEDIUM', 
    apiUrl = 'http://localhost:5000',
    theme = 'light',
    position = 'bottom-right',
    autoOpen = true
}) => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [riskLevel, setRiskLevel] = useState(initialRiskLevel);
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(autoOpen);
    const [sessionId] = useState(() => 'session_' + Math.random().toString(36).substring(2, 11));
    const [error, setError] = useState(null);
    
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const chatContainerRef = useRef(null);

    // Message length limit
    const MAX_MESSAGE_LENGTH = 500;

    // Initialize chat
    useEffect(() => {
        // Add welcome message
        setMessages([
            {
                id: 1,
                text: "Hi! I'm your academic assistant. I'm here to help with any questions about your studies, concerns about dropping out, or just to chat. How can I help you today?",
                sender: 'bot',
                timestamp: new Date().toISOString(),
                type: 'welcome'
            }
        ]);
        
        // Load suggestions
        fetchSuggestions();
        
        // Focus input
        inputRef.current?.focus();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchSuggestions = async (intent = null) => {
        try {
            const url = intent 
                ? `${apiUrl}/api/suggestions?intent=${intent}`
                : `${apiUrl}/api/suggestions`;
            const response = await axios.get(url);
            setSuggestions(response.data.suggestions || []);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            // Default suggestions
            setSuggestions([
                "What is my dropout risk?",
                "I'm struggling with my courses",
                "Can't pay tuition",
                "Feeling stressed",
                "Need study tips"
            ]);
        }
    };

    const handleSendMessage = async (textOverride = null) => {
        let textToSend = (textOverride ?? inputText).trim();
        
        // Validation 1: Empty message
        if (!textToSend) return;
        
        // Validation 2: Message too long
        if (textToSend.length > MAX_MESSAGE_LENGTH) {
            setError(`Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`);
            setTimeout(() => setError(null), 3000);
            return;
        }

        const userMessageObj = {
            id: messages.length + 1,
            text: textToSend,
            sender: 'user',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessageObj]);
        setInputText('');
        setIsTyping(true);
        setError(null);

        try {
            const response = await axios.post(`${apiUrl}/api/chat`, {
                user_id: userId,
                message: textToSend,
                risk_level: riskLevel,
                session_id: sessionId
            });

            const botMessageObj = {
                id: messages.length + 2,
                text: response.data.response || "I received your message. How can I help?",
                sender: 'bot',
                intent: response.data.intent,
                confidence: response.data.confidence,
                tips: response.data.tips || [],
                resources: response.data.resources || [],
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, botMessageObj]);
            
            // Update suggestions based on intent
            if (response.data.intent && response.data.intent !== 'general') {
                fetchSuggestions(response.data.intent);
            }

        } catch (error) {
            console.error('Error:', error);
            setError('Failed to connect to server');
            
            // Fallback response
            const errorMessageObj = {
                id: messages.length + 2,
                text: "I'm having trouble connecting to the server. Please try again or check your connection.",
                sender: 'bot',
                isError: true,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessageObj]);

        } finally {
            setIsTyping(false);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        // Prevent typing beyond limit
        if (value.length <= MAX_MESSAGE_LENGTH) {
            setInputText(value);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSuggestionClick = (suggestion) => {
        handleSendMessage(suggestion);
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const clearChat = () => {
        setMessages([
            {
                id: 1,
                text: "Chat cleared. How can I help you?",
                sender: 'bot',
                timestamp: new Date().toISOString()
            }
        ]);
    };

    const changeRiskLevel = (level) => {
        setRiskLevel(level);
        // Add system message about risk change
        const systemMessage = {
            id: messages.length + 1,
            text: `Risk level changed to ${level}. I'll adjust my responses accordingly.`,
            sender: 'bot',
            type: 'system',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, systemMessage]);
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    // Position styles
    const positionStyles = {
        'bottom-right': { bottom: '20px', right: '20px' },
        'bottom-left': { bottom: '20px', left: '20px' },
        'top-right': { top: '20px', right: '20px' },
        'top-left': { top: '20px', left: '20px' }
    };

    return (
        <div 
            className={`chatbot-wrapper ${theme}`}
            style={positionStyles[position]}
        >
            {!isOpen ? (
                <button 
                    className="chatbot-toggle-btn"
                    onClick={toggleChat}
                    aria-label="Open chat"
                >
                    💬
                </button>
            ) : (
                <div className="chatbot-container" ref={chatContainerRef}>
                    {/* Header */}
                    <div className="chatbot-header">
                        <div className="header-left">
                            <span className="bot-avatar">🎓</span>
                            <div>
                                <h3>Student Assistant</h3>
                                <span className="session-id">Session: {sessionId.slice(0, 8)}</span>
                            </div>
                        </div>
                        <div className="header-controls">
                            <select 
                                value={riskLevel} 
                                onChange={(e) => changeRiskLevel(e.target.value)}
                                className="risk-selector"
                                aria-label="Select risk level"
                            >
                                <option value="LOW">Low Risk</option>
                                <option value="MEDIUM">Medium Risk</option>
                                <option value="HIGH">High Risk</option>
                            </select>
                            <button 
                                onClick={clearChat} 
                                className="icon-btn"
                                aria-label="Clear chat"
                                title="Clear chat"
                            >
                                🗑️
                            </button>
                            <button 
                                onClick={toggleChat} 
                                className="icon-btn"
                                aria-label="Close chat"
                                title="Close"
                            >
                                ✕
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="chatbot-messages">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}
                                    ${message.isError ? 'error-message' : ''}
                                    ${message.type === 'system' ? 'system-message' : ''}`}
                            >
                                {message.sender === 'bot' && !message.type && (
                                    <span className="avatar">🤖</span>
                                )}
                                <div className="message-content">
                                    <p className="message-text">{message.text}</p>
                                    
                                    {/* Tips section */}
                                    {message.tips && message.tips.length > 0 && (
                                        <div className="message-tips">
                                            <strong>📌 Tips:</strong>
                                            <ul>
                                                {message.tips.map((tip, idx) => (
                                                    <li key={idx}>{tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {/* Resources section */}
                                    {message.resources && message.resources.length > 0 && (
                                        <div className="message-resources">
                                            <strong>📚 Resources:</strong>
                                            <ul>
                                                {message.resources.map((resource, idx) => (
                                                    <li key={idx}>{resource}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    
                                    {/* Intent tag */}
                                    {message.intent && (
                                        <small className="intent-tag">
                                            Intent: {message.intent}
                                            {message.confidence && ` (${(message.confidence * 100).toFixed(0)}% confidence)`}
                                        </small>
                                    )}
                                    
                                    <span className="timestamp">{formatTime(message.timestamp)}</span>
                                </div>
                                {message.sender === 'user' && (
                                    <span className="avatar">👤</span>
                                )}
                            </div>
                        ))}
                        
                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="message bot-message typing-indicator">
                                <span className="avatar">🤖</span>
                                <div className="typing-dots">
                                    <span>.</span><span>.</span><span>.</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Error banner */}
                        {error && (
                            <div className="error-banner">
                                ⚠️ {error}
                                <button onClick={() => setError(null)}>✕</button>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="chatbot-input-area">
                        <div className="input-wrapper">
                            <textarea
                                ref={inputRef}
                                value={inputText}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message here..."
                                rows="2"
                                aria-label="Type your message"
                            />
                            <div className={`char-counter ${inputText.length > MAX_MESSAGE_LENGTH ? 'error' : ''}`}>
                                {inputText.length}/{MAX_MESSAGE_LENGTH} characters
                            </div>
                        </div>
                        <button
                            onClick={handleSendMessage}
                            disabled={!inputText.trim() || isTyping || inputText.length > MAX_MESSAGE_LENGTH}
                            className="send-button"
                            aria-label="Send message"
                        >
                            Send
                        </button>
                    </div>

                    {/* Suggestions */}
                    {suggestions.length > 0 && (
                        <div className="chatbot-suggestions">
                            <p>Quick questions:</p>
                            <div className="suggestion-chips">
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        className="suggestion-chip"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Chatbot;
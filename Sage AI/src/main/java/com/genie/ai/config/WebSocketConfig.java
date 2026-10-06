package com.genie.ai.config;

import com.genie.ai.controller.GeminiWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;


// Tells Spring that this class contains configuration
@Configuration

// Enables WebSocket in the Spring Boot application
@EnableWebSocket

// This class is used to configure WebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    // Stores the WebSocket handler
    private final GeminiWebSocketHandler geminiWebSocketHandler;


    // Constructor injection
    // Spring automatically gives us GeminiWebSocketHandler
    @Autowired
    public WebSocketConfig(GeminiWebSocketHandler geminiWebSocketHandler) {
        this.geminiWebSocketHandler = geminiWebSocketHandler;
    }


    // This method is used to register WebSocket endpoints
    @Override
    public void registerWebSocketHandlers(
            WebSocketHandlerRegistry registry) {

        // "/chat" is the WebSocket URL
        // GeminiWebSocketHandler handles messages coming to /chat
        // setAllowedOrigins("*") allows requests from any origin
        registry.addHandler(
                geminiWebSocketHandler,
                "/chat"
        ).setAllowedOrigins("*");
    }
}
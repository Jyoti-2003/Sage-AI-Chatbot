package com.genie.ai.controller;

// This class stores the message sent by the user
public class ChatRequest {

    // Stores the user's message
    private String message;

    // Gets the message
    public String getMessage() {
        return message;
    }

    // Sets the message
    public void setMessage(String message) {
        this.message = message;
    }
}
# Sage AI

Sage AI is a simple AI chatbot web app. You type a question in the browser and Sage answers using **Google Gemini**. It can also answer shopping questions like *"TV under 30000"* by searching a **MySQL** product database.

## Features

- Real-time chat using WebSocket
- Answers general questions with Gemini AI
- Product search from the database (AC, refrigerator, washing machine, TV) by price
- **New chat** button: old chats are never deleted
- The first message becomes the chat name
- Click any old chat to see its previous messages
- Chats are saved in the browser, so they stay after a refresh
- Modern dark design that works on mobile too

## Tech Stack

| Part | Technology |
|---|---|
| Backend | Java 8, Spring Boot 2.7, WebSocket, Spring Data JPA |
| Database | MySQL |
| AI | Google Gemini API |
| Frontend | HTML, CSS, JavaScript |

## Project Structure

```
AI-Project/
├── Sage AI/                  # Backend (Spring Boot)
│   ├── src/main/java/com/genie/ai/
│   │   ├── config/WebSocketConfig.java          # Opens the /chat WebSocket
│   │   ├── controller/GeminiWebSocketHandler.java   # Handles messages, calls Gemini
│   │   ├── entity/Product.java                  # Product table
│   │   └── repo/ProductRepository.java          # Product database queries
│   ├── src/main/resources/application.properties   # Settings
│   ├── pom.xml
│   └── Dockerfile
└── Sage Chatbot UI/          # Frontend
    ├── index.html
    ├── style.css
    └── script.js
```



## Author

Made by **Ashwani** ([@GenieAshwani](https://github.com/GenieAshwani)).

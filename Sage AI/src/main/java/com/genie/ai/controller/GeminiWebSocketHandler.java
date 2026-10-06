package com.genie.ai.controller;

import com.genie.ai.entity.Product;
import com.genie.ai.repo.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Tells Spring to create an object of this class automatically
@Component

// Handles text messages received through WebSocket
public class GeminiWebSocketHandler extends TextWebSocketHandler {

    // Gets the Gemini API key from application.properties
    @Value("${gemini.api.key}")
    private String apiKey;

    // Connects this class with the Product database repository
    @Autowired
    private ProductRepository productRepository;

    // Gemini API URL
    private final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=";

    // ==============================================================================================================================
    // This method runs when a message comes from the WebSocket client

    // The connection with the user's browser (who sent the message)
    // WebSocketSession session,

    // The message that the user sent (the text they typed)
    // TextMessage message) throws IOException {

    // "throws IOException" = this method may fail while sending data back,
    // so Java asks us to handle or declare that possible error
    @Override
    protected void handleTextMessage(
            WebSocketSession session,
            TextMessage message) throws IOException {

        // Gets the message sent by the user
        // trim() removes extra spaces
        // toLowerCase() converts the message to lowercase
        String userInput = message.getPayload().trim().toLowerCase();

        System.out.println("🔹 Original User Input: " + userInput);

        String response;

        // Check whether the user is asking about a product
        if (isEcommerceQuery(userInput)) {

            // Handle product-related questions using our database
            response = handleEcommerceQuery(userInput);

        } else {

            // For normal questions, send the question to Gemini
            response = callGeminiForAnswer(userInput);
        }

        // Send the final response back to the user through WebSocket
        session.sendMessage(new TextMessage(response));
    }


    // Checks whether the user's message is an e-commerce query
    private boolean isEcommerceQuery(String userInput) {

        // Product categories supported by our application
        String[] productCategories = {
                "ac",
                "refrigerator",
                "fridge",
                "washing machine",
                "tv",
                "television"
        };

        // Check each product category
        for (String category : productCategories) {

            // If the message contains a category
            // AND contains "under" or "below"
            if (userInput.contains(category)
                    && (userInput.contains("under")
                    || userInput.contains("below"))) {

                return true;
            }
        }

        // Not an e-commerce query
        return false;
    }


    // Handles product-related questions
    private String handleEcommerceQuery(String userInput) {

        try {

            // Product categories supported by the application
            String[] productCategories = {
                    "ac",
                    "refrigerator",
                    "fridge",
                    "washing machine",
                    "tv",
                    "television"
            };

            String detectedCategory = null;

            // Find which product category the user mentioned
            for (String category : productCategories) {

                if (userInput.contains(category)) {

                    // Convert "fridge" into "Refrigerator"
                    if (category.equals("fridge")) {
                        detectedCategory = "Refrigerator";

                        // Convert "tv" or "television" into "Television"
                    } else if (category.equals("tv")
                            || category.equals("television")) {

                        detectedCategory = "Television";

                    } else {

                        // Convert the first letter to uppercase
                        detectedCategory = capitalize(category);
                    }

                    // Stop searching after finding the category
                    break;
                }
            }

            // If no category was found
            if (detectedCategory == null) {
                return "Sorry, I couldn't identify the product category.";
            }


            // Regex pattern to find phrases like "under 5000" or "below 20000"
            // (under|below) -> matches either word
            // \\s*          -> allows optional spaces
            // (\\d+)        -> captures the number (the price)
            Pattern pricePattern = Pattern.compile("(under|below)\\s*(\\d+)");

            // Search for the price pattern inside the user's input text
            Matcher matcher = pricePattern.matcher(userInput);

            // Default maximum price, used if the user doesn't mention any price
            double maxPrice = 50000;

            // If a price is found
            if (matcher.find()) {

                // Get the number from the user's message
                // Example: "under 30000" -> 30000
                maxPrice = Double.parseDouble(matcher.group(2));
            }


            // Search the database for products
            // with the correct category
            // and price less than the maximum price
            List<Product> products =
                    productRepository.findByCategoryAndPriceLessThan(
                            detectedCategory,  // category found from user's message (e.g. "laptop")
                            maxPrice  // maximum price (e.g. 30000)
                    );

            System.out.println(products);


            // If no products are found
            if (products.isEmpty()) {
                return "No " + detectedCategory
                        + " found under ₹" + maxPrice;
            }


            // Create the response message
            StringBuilder response =
                    new StringBuilder(
                            "Here are some "
                                    + detectedCategory
                                    + "s under ₹"
                                    + maxPrice
                                    + ":"
                    );


            // Add every product to the response
            for (Product product : products) {
                // Add the product to the response text
                // Example: " || Dell Laptop (₹45000)"
                response.append(" || ")
                        .append(product.getName())
                        .append(" (₹")
                        .append(product.getPrice())
                        .append(")");
            }

            System.out.println(response);

            // Convert the response text to a String and send it back to the user
            return response.toString();

        } catch (Exception e) {

            // Print the error in the console
            // Useful for debugging
            e.printStackTrace();

            // Message sent to the user if something goes wrong
            return "Error processing your request.";
        }
    }


    // Makes the first letter uppercase
    // Example:
    // "ac" -> "Ac"
    private String capitalize(String text) {

        return text.substring(0, 1).toUpperCase()  // first letter -> capital
                + text.substring(1).toLowerCase();  // remaining letters -> small
    }

        // Sends normal questions to Gemini AI
        private String callGeminiForAnswer(String userInput) {

            try {

                // RestTemplate is used to send HTTP requests
                RestTemplate restTemplate = new RestTemplate();


                // Creates the JSON request body
                // This contains the user's question

                // jsonPayload (the JSON body) ->
                // This is the actual message you send. Gemini's API only understands questions written in a specific JSON format:
                // Your code builds this structure and puts the user's question inside "text". If the format is wrong, Gemini will reject the
                // request with an error.
                String jsonPayload =
                        "{ \"contents\": [{ \"parts\": [{ \"text\": \""
                                + userInput
                                + "\" }]}]}";


                // Creates HTTP headers
                // HttpHeaders ->
                // Headers are extra information sent along with the request, like a label on a parcel. They tell the server how to handle what's inside.
                HttpHeaders headers = new HttpHeaders();

                // Tells Gemini that we are sending JSON data
                // setContentType(MediaType.APPLICATION_JSON) ->
                // This header says: "The data I'm sending is JSON." Gemini needs to know this so it reads the body as JSON. If you leave it out,
                // Gemini may not understand the data and can return an error such as 415 Unsupported Media Type.
                headers.setContentType(MediaType.APPLICATION_JSON);


                // Combines JSON data and headers
                HttpEntity<String> entity =
                        new HttpEntity<>(jsonPayload, headers);


                // Add the API key to the Gemini URL
                String url = GEMINI_URL + apiKey;


                // Send POST request to Gemini
                // This holds Gemini's full reply: the body (the JSON answer), the status code (like 200 for success), and the headers.
                ResponseEntity<String> response =
                        // This sends the HTTP request and waits for Gemini to reply. The earlier lines only created the pieces; this one fires them off.
                        restTemplate.exchange(
                                url, // The address of the Gemini API, with your API key added so Google knows who is calling.
                                HttpMethod.POST, // Gemini needs your question sent as data in the body, and POST is the method used for that. GET is only for fetching data and can't carry a JSON body.
                                entity, // The package you built earlier: the JSON question (jsonPayload) plus the headers (Content-Type: application/json).
                                String.class // This tells Spring to give Gemini's reply back as plain text (a String). Later you can read the answer out of that JSON text.
                        );


                // Print the request in the console
                System.out.println(
                        "🔹 Sent JSON to Gemini: " + jsonPayload
                );


                // Print Gemini's response
                System.out.println(
                        "🔹 Raw Response from Gemini: "
                                // You get the answer text with response.getBody()
                                + response.getBody()
                );


                // Return Gemini's response
                return response.getBody();

            } catch (Exception e) {

                // Print API error
                System.err.println(
                        "❌ API Call Failed: " + e.getMessage()
                );

                // Return error message
                return "{\"error\":\"API call failed\"}";
            }
        }
}  // hilo
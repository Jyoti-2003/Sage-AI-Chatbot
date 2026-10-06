// ============================================================
// SAGE AI - script.js
// Handles: server connection, sending/showing messages,
// chart, and saved chats (New chat + old chats)
// ============================================================


// ------------------------------------------------------------
// CHAT DATA (kept in memory + saved in the browser)
// ------------------------------------------------------------
let chatSessions = [];     // all chats: [{ id, title, messages: [{kind, content}] }]
let currentChatId = null;  // chat open now (null = new empty chat)
let pendingChatId = null;  // chat waiting for the AI reply


// ============================================================
// STEP 1: CONNECT TO THE SERVER (WebSocket)
// ============================================================

function connectWebSocket() {

  // Connect to Spring Boot ("/chat" is set in WebSocketConfig)
  const socket = new WebSocket("ws://localhost:8080/chat");

  // Connection is ready
  socket.onopen = function () {
    console.log("✅ WebSocket connection established.");
  };

  // Server sent us a reply
  socket.onmessage = function (event) {

    console.log("🔹 Received WebSocket Message: ", event.data);

    try {
      // Convert the text into a JavaScript object
      let data = JSON.parse(event.data);

      // Reply arrived, so remove the "typing" dots
      let loadingDiv = document.getElementById("loading-message");
      if (loadingDiv) {
        loadingDiv.remove();
      }

      // Case 1: sentiment report -> show message + pie chart
      if (
        data.Positive !== undefined &&
        data.Negative !== undefined &&
        data.Neutral !== undefined
      ) {
        console.log("✅ Sentiment Report Detected!");
        deliverBotReply("bot", "✅ Sentiment Report Generated.");
        deliverBotReply("chart", data);

      // Case 2: answer from Gemini -> show its text
      } else if (data.candidates) {
        let aiResponse = data.candidates[0].content.parts[0].text;
        deliverBotReply("ai", aiResponse);

      // Case 3: anything else -> show as it is
      } else {
        deliverBotReply("bot", event.data);
      }

    } catch (error) {

      // Reply is plain text (not JSON)
      console.error("❌ Error parsing WebSocket response:", error);

      // Remove the "typing" dots
      let loadingDiv = document.getElementById("loading-message");
      if (loadingDiv) {
        loadingDiv.remove();
      }

      deliverBotReply("bot", event.data);
    }
  };

  // Connection problem
  socket.onerror = function (error) {
    console.error("❌ WebSocket Error: ", error);
  };

  return socket;
}

// Connect when the page opens
const socket = connectWebSocket();


// ============================================================
// STEP 2: SEND THE USER'S MESSAGE
// ============================================================

// Press Enter to send
function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendMessage();
  }
}

// Send the typed message to the server
function sendMessage() {

  // Read the text (trim removes extra spaces)
  let userInput = document.getElementById("user-input").value.trim();

  // Empty message -> do nothing
  if (userInput === "") return;

  // New chat? Create it now. The first message becomes the chat name.
  if (currentChatId === null) {
    createNewSession(userInput);
  }

  // Remember which chat is waiting for the reply
  pendingChatId = currentChatId;

  // Show the message and save it
  displayMessage(userInput, "user-message");
  addMessageToSession(currentChatId, "user", userInput);

  // Clear the input box
  document.getElementById("user-input").value = "";

  // Add the "typing" dots while we wait
  let chatBox = document.getElementById("chat-box");
  let loadingDiv = document.createElement("div");
  loadingDiv.id = "loading-message";
  loadingDiv.classList.add("bot-message");
  chatBox.appendChild(loadingDiv);

  // Scroll to the bottom
  chatBox.scrollTop = chatBox.scrollHeight;

  // Send to Spring Boot
  socket.send(userInput);
}


// ============================================================
// STEP 3: SHOW A MESSAGE ON THE SCREEN
// ============================================================

function displayMessage(message, className) {

  let chatBox = document.getElementById("chat-box");

  // Create the message box
  let messageDiv = document.createElement("div");
  messageDiv.classList.add("message", className);

  try {

    // Case 1: message looks like JSON (starts with "{")
    if (
      typeof message === "string" &&
      message.trim().startsWith("{")
    ) {

      let data = JSON.parse(message);

      // Has "plans" -> show plan list
      if (data.plans) {

        let formattedResponse =
          `<b>✅ Matching Plans:</b><br><br>
           <div style="width: 100%; text-align: left;">`;

        data.plans.forEach((plan) => {

          formattedResponse += `
          `;
        });

        formattedResponse += `</div>`;
        messageDiv.innerHTML = formattedResponse;

      // Has "error" -> show the error
      } else if (data.error) {

        messageDiv.innerHTML = `<b>❌ ${data.error}</b>`;

      // Otherwise -> show as it is
      } else {
        messageDiv.innerHTML = message;
      }

    // Case 2: contains "here are some" -> product list
    } else if (
      typeof message === "string" &&
      message.toLowerCase().includes("here are some")
    ) {

      // Heading = text before ":"
      let formattedResponse =
        `<b>🛒 ${message.split(":")[0]}:</b><br><br>`;

      // Products = text after ":"
      let productText = message.split(":")[1].trim();

      // Products are separated by "||"
      let products = productText
        .split("||")
        .filter((item) => item.trim() !== "");

      // Box that holds all product cards
      formattedResponse +=
        `<div style="display: flex; flex-direction: column; gap: 10px;">`;

      products.forEach((product) => {

        if (product.trim() !== "") {

          // "Samsung TV (₹25000)" -> name + price
          let productParts = product.split(" (₹");

          let name = productParts[0].trim();

          let price = productParts[1]
            ? `₹${productParts[1].replace(")", "")}`
            : "";

          // One product card
          formattedResponse += `
            <div style="
              background: #1e1e1e;
              padding: 12px;
              border-radius: 10px;
              border: 1px solid #444;
              box-shadow: 0 0 10px rgba(0,0,0,0.3);
            ">

              <div style="
                font-size: 16px;
                font-weight: bold;
                color: #00d1b2;
              ">
                ${name}
              </div>

              <div style="
                font-size: 14px;
                color: #ccc;
              ">
                Price:
                <span style="
                  font-weight: bold;
                  color: #ffd700;
                ">
                  ${price}
                </span>
              </div>

            </div>
          `;
        }
      });

      formattedResponse += `</div>`;
      messageDiv.innerHTML = formattedResponse;

    // Case 3: normal message
    } else {
      messageDiv.innerHTML = message;
    }

  } catch (error) {

    // If anything fails, show the message as it is
    console.error("❌ Error parsing JSON:", error);
    messageDiv.innerHTML = message;
  }

  // Add to the chat and scroll down
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}


// ============================================================
// STEP 4: SENTIMENT PIE CHART (Chart.js)
// ============================================================

function showSentimentChart(reportData) {

  console.log("🔹 Preparing to render chart with:", reportData);

  let chatBox = document.getElementById("chat-box");

  // Remove the old chart if there is one
  let existingChart = document.getElementById("chart-container");
  if (existingChart) {
    existingChart.remove();
  }

  // Box for the chart
  let chartContainer = document.createElement("div");
  chartContainer.id = "chart-container";
  chartContainer.classList.add("chart-container");

  // Chart title
  let heading = document.createElement("div");
  heading.innerHTML = "<b>📊 Sentiment Analysis Report</b>";
  heading.style.textAlign = "center";
  heading.style.fontSize = "16px";
  heading.style.marginBottom = "10px";
  chartContainer.appendChild(heading);

  // Drawing area
  let canvas = document.createElement("canvas");
  canvas.id = "sentimentChart";
  chartContainer.appendChild(canvas);

  // Add to the chat and scroll down
  chatBox.appendChild(chartContainer);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Chart.js draws using this
  let ctx = document.getElementById("sentimentChart").getContext("2d");

  console.log("✅ Final Report Data Sent to Chart.js:", reportData);

  // Destroy the old chart object before making a new one
  if (
    window.sentimentChart &&
    typeof window.sentimentChart.destroy === "function"
  ) {
    window.sentimentChart.destroy();
  }

  // Draw the pie chart
  window.sentimentChart = new Chart(ctx, {

    type: "pie",

    data: {

      // Slice names
      labels: ["Positive", "Negative", "Neutral"],

      datasets: [
        {
          // Slice sizes (0 if missing)
          data: [
            reportData.Positive || 0,
            reportData.Negative || 0,
            reportData.Neutral || 0
          ],

          // Green, red, yellow
          backgroundColor: ["#28a745", "#dc3545", "#ffc107"]
        }
      ]
    },

    options: {

      // Fit the screen size
      responsive: true,

      plugins: {
        // Names shown at the bottom
        legend: {
          position: "bottom"
        }
      }
    }
  });

  console.log("✅ Chart successfully rendered.");
}


// ============================================================
// STEP 5: SAVE AND LOAD CHATS (in the browser)
// ============================================================

// Save all chats (stays after refresh)
function saveChatHistory() {
  localStorage.setItem("chatHistory", JSON.stringify(chatSessions));
}

// Load saved chats when the page opens
function loadChatHistory() {

  let storedHistory = localStorage.getItem("chatHistory");

  if (storedHistory) {
    chatSessions = JSON.parse(storedHistory);
    updateChatHistoryUI();
  }
}


// ============================================================
// STEP 6: SHOW GEMINI'S ANSWER
// ============================================================

function displayAiMessage(text) {

  let chatBox = document.getElementById("chat-box");

  // Create the answer box
  let messageDiv = document.createElement("div");
  messageDiv.classList.add("message", "bot-message");

  // marked = Markdown to HTML, DOMPurify = removes unsafe code
  messageDiv.innerHTML = DOMPurify.sanitize(marked.parse(text));

  // Add to the chat and scroll down
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}


// ============================================================
// STEP 7: SIDEBAR CHAT LIST
// ============================================================

function updateChatHistoryUI() {

  let historyList = document.getElementById("chat-history");

  // Clear the old list
  historyList.innerHTML = "";

  // Newest chat on top
  [...chatSessions].reverse().forEach((session) => {

    let listItem = document.createElement("li");

    // Chat name = first message
    listItem.innerText = session.title;
    listItem.title = session.title;

    // Highlight the open chat
    if (session.id === currentChatId) {
      listItem.classList.add("active");
    }

    // Click to open this chat
    listItem.onclick = () => loadChatSession(session.id);

    historyList.appendChild(listItem);
  });
}


// ============================================================
// STEP 8: NEW CHAT AND OLD CHATS
// ============================================================

// Make a new chat named after the first message (max 30 letters)
function createNewSession(firstMessage) {

  let title =
    firstMessage.length > 30
      ? firstMessage.substring(0, 30) + "…"
      : firstMessage;

  let session = {
    id: Date.now().toString(),
    title: title,
    messages: []
  };

  chatSessions.push(session);
  currentChatId = session.id;

  saveChatHistory();
  updateChatHistoryUI();
}

// Save one message inside a chat
function addMessageToSession(chatId, kind, content) {

  let session = chatSessions.find((s) => s.id === chatId);
  if (!session) return;

  session.messages.push({ kind: kind, content: content });
  saveChatHistory();
}

// Draw one saved message on the screen
function renderMessage(kind, content) {

  if (kind === "user") {
    displayMessage(content, "user-message");
  } else if (kind === "ai") {
    displayAiMessage(content);
  } else if (kind === "chart") {
    showSentimentChart(content);
  } else {
    displayMessage(content, "bot-message");
  }
}

// Save the reply in the chat that asked for it.
// Show it only if that chat is still open.
function deliverBotReply(kind, content) {

  let targetId = pendingChatId;

  addMessageToSession(targetId, kind, content);

  if (targetId === currentChatId) {
    renderMessage(kind, content);
  }
}

// "New chat" button: clear the screen, old chats stay in the sidebar
function startNewChat() {

  currentChatId = null;
  document.getElementById("chat-box").innerHTML = "";
  updateChatHistoryUI();
}

// Click an old chat: show all its messages again
function loadChatSession(chatId) {

  let session = chatSessions.find((s) => s.id === chatId);
  if (!session) return;

  currentChatId = chatId;

  let chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "";

  session.messages.forEach((m) => renderMessage(m.kind, m.content));

  updateChatHistoryUI();
}


// Load saved chats when the page opens
loadChatHistory();
const API_URL = "http://localhost:5000/api";

async function sendQuestion() {
  const questionInput = document.getElementById("questionInput");
  const question = questionInput.value.trim();

  if (!question) return;

  // Add user message to chat
  addMessage(question, "user");
  questionInput.value = "";

  // Show loading indicator
  const sendButton = document.getElementById("sendButton");
  const originalText = sendButton.innerHTML;
  sendButton.innerHTML = '<span class="loading"></span>';
  sendButton.disabled = true;

  try {
    // Send request to backend
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    const data = await response.json();

    if (response.ok) {
      // Add bot response to chat
      addMessage(data.answer, "bot");
    } else {
      addMessage("Sorry, I encountered an error. Please try again.", "bot");
    }
  } catch (error) {
    console.error("Error:", error);
    addMessage(
      "Sorry, I cannot connect to the server. Please make sure the backend is running.",
      "bot",
    );
  } finally {
    // Restore button
    sendButton.innerHTML = originalText;
    sendButton.disabled = false;
  }
}

function addMessage(content, sender) {
  const chatContainer = document.getElementById("chatContainer");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.textContent = content;

  messageDiv.appendChild(contentDiv);
  chatContainer.appendChild(messageDiv);

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendQuestion();
  }
}

// Check backend health on load
async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log("Backend status:", data);
  } catch (error) {
    console.error("Backend not available:", error);
    addMessage(
      "⚠️ Warning: Cannot connect to the backend server. Please make sure it is running.",
      "bot",
    );
  }
}

// Initialize
window.onload = checkHealth;

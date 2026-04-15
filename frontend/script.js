// Auto-switch API URL: local dev vs production (HuggingFace Spaces backend)
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://hibque-bhagwatgita-bot.hf.space/api';

async function sendQuestion() {
  const questionInput = document.getElementById("questionInput");
  const question = questionInput.value.trim();

  if (!question) return;

  addMessage(question, "user");
  questionInput.value = "";

  const sendButton = document.getElementById("sendButton");
  const originalText = sendButton.innerHTML;
  sendButton.innerHTML = '<span class="loading"></span>';
  sendButton.disabled = true;

  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    const data = await response.json();

    if (response.ok) {
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

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    sendQuestion();
  }
}

async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log("Backend status:", data);
  } catch (error) {
    console.error("Backend not available:", error);
    addMessage(
      "Warning: Cannot connect to the backend server. Please make sure it is running.",
      "bot",
    );
  }
}

window.onload = checkHealth;

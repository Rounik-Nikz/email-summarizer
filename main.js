// Configuration
const HF_API_TOKEN = import.meta.env.VITE_HF_API_TOKEN;
const AI_MODEL = "mistralai/Mistral-7B-Instruct-v0.1";

// DOM elements
const emailInput = document.getElementById('email-input');
const summarizeBtn = document.getElementById('summarize-btn');
const copyBtn = document.getElementById('copy-btn');
const summaryOutput = document.getElementById('summary-output');
const statusElement = document.getElementById('status');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if API token is available
    if (!HF_API_TOKEN) {
        showError("Please set your Hugging Face API key in the environment variables");
        summarizeBtn.disabled = true;
    }
});

// Event listeners
summarizeBtn.addEventListener('click', summarizeEmail);
copyBtn.addEventListener('click', copySummary);

// Summarize email
async function summarizeEmail() {
    const emailText = emailInput.value.trim();
    
    if (!emailText) {
        showError("Please enter some email text to summarize");
        return;
    }
    
    try {
        setLoading(true);
        const summary = await generateSummary(emailText);
        summaryOutput.textContent = summary;
        setLoading(false);
        showSuccess("Summary generated successfully");
    } catch (error) {
        console.error("Error:", error);
        setLoading(false);
        showError("Failed to generate summary. Please try again.");
    }
}

// Generate summary using Mistral-7B
async function generateSummary(emailText) {
    const prompt = `<s>[INST] <<SYS>>
You are an expert email summarizer. Your task is to create a concise summary of the following email:
- Extract the key points
- Identify any action items
- Keep it brief (2-3 sentences max)
- Maintain a professional tone
- Preserve important details like dates, names, and numbers
<</SYS>>

Email content:
${emailText}

Please provide a summary: [/INST]`;

    const response = await callHuggingFaceAPI(prompt);
    return cleanAIResponse(response);
}

// Call Hugging Face API
async function callHuggingFaceAPI(prompt) {
    try {
        const response = await fetch(
            `https://api-inference.huggingface.co/models/${AI_MODEL}`,
            {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${HF_API_TOKEN}`,
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({ 
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 200,
                        temperature: 0.3,
                        top_p: 0.9,
                        repetition_penalty: 1.1,
                        do_sample: true,
                        return_full_text: false
                    }
                })
            }
        );
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "API request failed");
        }
        
        const data = await response.json();
        return data[0]?.generated_text || "I couldn't generate a summary.";
    } catch (error) {
        console.error("API Call Failed:", error);
        throw error;
    }
}

// Clean up the AI response
function cleanAIResponse(response) {
    if (!response) return "No summary could be generated.";
    
    // Remove any instruction artifacts
    let cleanText = response.replace(/\[INST\].*\[\/INST\]/g, '');
    cleanText = cleanText.replace(/<s>|<\/s>/g, '');
    cleanText = cleanText.replace(/<<SYS>>.*<<\/SYS>>/g, '');
    cleanText = cleanText.replace(/Please provide a summary:/g, '');
    cleanText = cleanText.replace(/Summary:/g, '');
    
    // Remove everything before the first actual summary content
    const summaryStart = cleanText.indexOf(']') > -1 ? 
        cleanText.indexOf(']') + 1 : 0;
    cleanText = cleanText.substring(summaryStart);
    
    // Trim whitespace and return
    return cleanText.trim() || "The summary is empty. Please try again.";
}

// Copy summary to clipboard
function copySummary() {
    const summaryText = summaryOutput.textContent;
    
    if (!summaryText) {
        showError("No summary to copy");
        return;
    }
    
    navigator.clipboard.writeText(summaryText)
        .then(() => {
            showSuccess("Summary copied to clipboard!");
            setTimeout(() => {
                statusElement.textContent = "Ready";
                statusElement.className = "status";
            }, 2000);
        })
        .catch(err => {
            console.error("Failed to copy:", err);
            showError("Failed to copy summary");
        });
}

// UI Helpers
function setLoading(isLoading) {
    if (isLoading) {
        summarizeBtn.disabled = true;
        statusElement.innerHTML = '<span class="loading"></span>Generating summary...';
    } else {
        summarizeBtn.disabled = false;
        statusElement.textContent = "Ready";
    }
}

function showSuccess(message) {
    statusElement.textContent = message;
    statusElement.className = "status success-message";
}

function showError(message) {
    statusElement.textContent = message;
    statusElement.className = "status error-message";
}
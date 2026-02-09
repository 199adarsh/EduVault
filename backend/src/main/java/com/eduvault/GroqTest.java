package com.eduvault;

import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;

public class GroqTest {
    public static void main(String[] args) {
        try {
            ChatLanguageModel chatModel = OpenAiChatModel.builder()
                    .baseUrl("https://api.groq.com/openai/v1")
                    .apiKey("REDACTED")
                    .modelName("llama-3.1-8b-instant")
                    .temperature(0.2)
                    .build();
            
            String response = chatModel.generate("Return EXACTLY a JSON object with 'answer' and 'confidence' keys.");
            System.out.println("Response: " + response);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

from agents.chatbot import get_chatbot_response, ChatRequest
import json

if __name__ == "__main__":
    # Test Inventory query
    print("Testing Inventory Query...")
    inv_msg = ChatRequest(message="How much water do we have left?")
    res1 = get_chatbot_response(inv_msg)
    print("Response:", res1.get("response"))
    
    # Test Hope Score query
    print("\nTesting Hope Score Query...")
    hope_msg = ChatRequest(message="What is the current hope score and should we be worried?")
    res2 = get_chatbot_response(hope_msg)
    print("Response:", res2.get("response"))

    # Test General query
    print("\nTesting General Query...")
    gen_msg = ChatRequest(message="What are the most urgent tasks right now?")
    res3 = get_chatbot_response(gen_msg)
    print("Response:", res3.get("response"))

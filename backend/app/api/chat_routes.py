from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.services.chatbot_service import StudentSupportChatbot
from app.db import messages_collection, chat_sessions_collection, db  

chat_bp = Blueprint("chat", __name__)
chatbot = StudentSupportChatbot()

# Message length limit (in characters)
MAX_MESSAGE_LENGTH = 500

@chat_bp.route("/api/chat", methods=["POST"])
def chat():
    data = request.json or {}

    msg = (data.get("message") or "").strip()
    risk_level = data.get("risk_level", "MEDIUM")
    user_id = data.get("user_id")
    session_id = data.get("session_id", f"session_{user_id}_{datetime.now().timestamp()}")

    # Validation 1: Empty message
    if not msg:
        return jsonify({"error": "Message cannot be empty"}), 400
    
    # Validation 2: Message too long (NEW)
    if len(msg) > MAX_MESSAGE_LENGTH:
        return jsonify({
            "error": f"Message is too long. Maximum {MAX_MESSAGE_LENGTH} characters allowed.",
            "your_length": len(msg)
        }), 400

    response = chatbot.chat(message=msg, risk_level=risk_level, user_id=user_id)

    # Save to MongoDB
    if messages_collection is not None:
        try:
            # Save message to messages collection
            doc = {
                "user_id": user_id,
                "session_id": session_id,
                "message": msg,
                "risk_level": risk_level,
                "intent": response.get("intent"),
                "confidence": response.get("confidence"),
                "response": response.get("response"),
                "tips": response.get("tips", []),
                "resources": response.get("resources", []),
                "timestamp": datetime.now(timezone.utc),
            }
            result = messages_collection.insert_one(doc)
            print(f"Chat saved to student_dropout_db.messages, id: {result.inserted_id}")
            
            # Update or create chat session
            if chat_sessions_collection is not None:
                chat_sessions_collection.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "user_id": user_id,
                            "last_updated": datetime.now(timezone.utc),
                            "last_message": msg[:100],  # Truncate for display
                            "last_response": response.get("response")[:100]
                        },
                        "$setOnInsert": {
                            "created_at": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )
                print(f"Session updated: {session_id}")
                
        except Exception as e:
            print(f"Mongo insert failed: {repr(e)}")
    else:
        print("messages_collection is None (DB not connected)")

    return jsonify(response)

@chat_bp.route("/api/health", methods=["GET"])
def health():
    db_status = "connected" if messages_collection is not None else "disconnected"
    return jsonify({
        "status": "healthy",
        "database": db_status,
        "database_name": "student_dropout_db" if db else "unknown"
    })

@chat_bp.route("/api/chat/history/<user_id>", methods=["GET"])
def get_chat_history(user_id):
    """Get chat history for a specific user"""
    if messages_collection is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        limit = request.args.get("limit", 50, type=int)
        history = list(messages_collection.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit))
        
        return jsonify({
            "user_id": user_id,
            "count": len(history),
            "messages": history
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
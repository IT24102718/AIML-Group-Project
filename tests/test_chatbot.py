import unittest
import sys
from pathlib import Path

# Add the backend/app/services path to import chatbot_service
sys.path.append(str(Path(__file__).resolve().parents[1] / "backend" / "app" / "services"))

from chatbot_service import StudentSupportChatbot


class TestChatbot(unittest.TestCase):
    """Unit tests for the Student Support Chatbot"""

    @classmethod
    def setUpClass(cls):
        """Set up chatbot instance once before all tests"""
        print("\n" + "="*50)
        print("Starting Chatbot Unit Tests")
        print("="*50)
        cls.chatbot = StudentSupportChatbot()

    def setUp(self):
        """Reset before each test"""
        print(f"\n▶ Running: {self._testMethodName}")

    # ========== INTENT DETECTION TESTS ==========

    def test_01_greeting_detection(self):
        """Test greeting intent detection"""
        intent, confidence, _ = self.chatbot.detect_intent("hi")
        self.assertEqual(intent, "greeting")
        self.assertGreater(confidence, 0.8)
        print(f"   ✓ 'hi' → {intent} ({confidence:.2f})")

    def test_02_academic_difficulty(self):
        """Test academic difficulty intent detection"""
        intent, confidence, _ = self.chatbot.detect_intent("I'm struggling with my courses")
        self.assertEqual(intent, "academic_difficulty")
        self.assertGreater(confidence, 0.7)
        print(f"   ✓ 'struggling' → {intent} ({confidence:.2f})")

    def test_03_financial_concerns(self):
        """Test financial concerns intent detection"""
        intent, confidence, _ = self.chatbot.detect_intent("Can't pay my tuition")
        self.assertEqual(intent, "financial_concerns")
        self.assertGreater(confidence, 0.7)
        print(f"   ✓ 'tuition' → {intent} ({confidence:.2f})")

    def test_04_risk_inquiry(self):
        """Test risk inquiry intent detection"""
        intent, confidence, _ = self.chatbot.detect_intent("What is my dropout risk?")
        self.assertEqual(intent, "risk_inquiry")
        self.assertGreater(confidence, 0.7)
        print(f"   ✓ 'dropout risk' → {intent} ({confidence:.2f})")

    def test_05_time_management(self):
        """Test time management intent detection"""
        intent, confidence, _ = self.chatbot.detect_intent("No time to study")
        self.assertEqual(intent, "time_management")
        self.assertGreater(confidence, 0.7)
        print(f"   ✓ 'no time' → {intent} ({confidence:.2f})")

    def test_06_motivation_issues(self):
        """Test motivation issues intent detection"""
        intent, confidence, _ = self.chatbot.detect_intent("I want to quit university")
        self.assertEqual(intent, "motivation_issues")
        self.assertGreater(confidence, 0.7)
        print(f"   ✓ 'quit' → {intent} ({confidence:.2f})")

    def test_07_mental_health(self):
        """Test mental health intent detection"""
        intent, confidence, _ = self.chatbot.detect_intent("Feeling very stressed")
        self.assertEqual(intent, "mental_health")
        self.assertGreater(confidence, 0.7)
        print(f"   ✓ 'stressed' → {intent} ({confidence:.2f})")

    # ========== INPUT VALIDATION TESTS ==========

    def test_08_empty_message(self):
        """Test empty message handling"""
        result = self.chatbot.chat("")
        self.assertEqual(result["intent"], "empty")
        self.assertIn("Please type a message", result["response"])
        print(f"   ✓ Empty message → '{result['response'][:30]}...'")

    def test_09_whitespace_message(self):
        """Test whitespace-only message handling"""
        result = self.chatbot.chat("   ")
        self.assertEqual(result["intent"], "empty")
        print(f"   ✓ Whitespace message handled correctly")

    # ========== TEXT PREPROCESSING TESTS ==========

    def test_10_preprocessing_lowercase(self):
        """Test text preprocessing - lowercase conversion"""
        processed = self.chatbot.preprocess_text("HELLO WORLD")
        self.assertEqual(processed, "hello world")
        print(f"   ✓ 'HELLO WORLD' → '{processed}'")

    def test_11_preprocessing_punctuation(self):
        """Test text preprocessing - punctuation removal"""
        processed = self.chatbot.preprocess_text("Hello!!! How are you?")
        self.assertEqual(processed, "hello how are you")
        print(f"   ✓ 'Hello!!! How are you?' → '{processed}'")

    def test_12_preprocessing_extra_spaces(self):
        """Test text preprocessing - extra spaces removal"""
        processed = self.chatbot.preprocess_text("  Hello    World  ")
        self.assertEqual(processed, "hello world")
        print(f"   ✓ '  Hello    World  ' → '{processed}'")

    # ========== RESPONSE GENERATION TESTS ==========

    def test_13_response_has_tips(self):
        """Test that responses include tips when available"""
        result = self.chatbot.chat("I'm struggling", risk_level="MEDIUM")
        self.assertIn("tips", result)
        print(f"   ✓ Response includes tips section")

    def test_14_response_has_resources(self):
        """Test that responses include resources when available"""
        result = self.chatbot.chat("Can't pay tuition", risk_level="MEDIUM")
        self.assertIn("resources", result)
        print(f"   ✓ Response includes resources section")

    def test_15_different_risk_levels(self):
        """Test that different risk levels produce different responses"""
        low_response = self.chatbot.chat("I'm struggling", risk_level="LOW")
        high_response = self.chatbot.chat("I'm struggling", risk_level="HIGH")
        self.assertNotEqual(low_response["response"], high_response["response"])
        print(f"   ✓ LOW and HIGH risk responses are different")


if __name__ == "__main__":
    # Run tests with verbosity
    unittest.main(verbosity=2)
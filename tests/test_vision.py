import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path
from PIL import Image

from core.tools.vision import (
    BaseOCREngine,
    BaseVisionEngine,
    OllamaMoondreamEngine,
    PaddleOCRVLEngine,
    VisionToolManager,
    ocr,
    vision,
    process_image,
)
from backend.app.rag.extractors import extract_text


class TestVisionModule(unittest.TestCase):
    def setUp(self) -> None:
        self.dummy_img = Image.new("RGB", (100, 100), color="white")

    def test_imports_and_namespaces(self) -> None:

        self.assertTrue(hasattr(ocr, "extract"))
        self.assertTrue(hasattr(vision, "analyze"))
        self.assertTrue(callable(process_image))

    def test_custom_engines_in_vision_manager(self) -> None:
        class MockOCR(BaseOCREngine):
            def extract(self, image, task="OCR:"):
                return "Mock OCR Extracted Text: Sample Note 123"

        class MockVision(BaseVisionEngine):
            def analyze(self, image, prompt=None):
                return "Mock Vision Analysis: System Diagram with 3 Nodes"

        manager = VisionToolManager(ocr_engine=MockOCR(), vision_engine=MockVision())
        result = manager.process_image(self.dummy_img, mode="both")

        self.assertEqual(result["ocr_text"], "Mock OCR Extracted Text: Sample Note 123")
        self.assertEqual(result["vision_description"], "Mock Vision Analysis: System Diagram with 3 Nodes")
        self.assertIn("Mock OCR Extracted Text", result["text"])
        self.assertIn("Mock Vision Analysis", result["text"])

    def test_ocr_only_mode(self) -> None:
        class MockOCR(BaseOCREngine):
            def extract(self, image, task="OCR:"):
                return "Only OCR Text"

        class MockVision(BaseVisionEngine):
            def analyze(self, image, prompt=None):
                return "Should Not Run"

        manager = VisionToolManager(ocr_engine=MockOCR(), vision_engine=MockVision())
        result = manager.process_image(self.dummy_img, mode="ocr")

        self.assertEqual(result["ocr_text"], "Only OCR Text")
        self.assertEqual(result["vision_description"], "")

    def test_vision_only_mode(self) -> None:
        class MockOCR(BaseOCREngine):
            def extract(self, image, task="OCR:"):
                return "Should Not Run"

        class MockVision(BaseVisionEngine):
            def analyze(self, image, prompt=None):
                return "Only Vision Description"

        manager = VisionToolManager(ocr_engine=MockOCR(), vision_engine=MockVision())
        result = manager.process_image(self.dummy_img, mode="vision")

        self.assertEqual(result["ocr_text"], "")
        self.assertEqual(result["vision_description"], "Only Vision Description")

    def test_error_resiliency(self) -> None:
        class FailingOCR(BaseOCREngine):
            def extract(self, image, task="OCR:"):
                raise RuntimeError("OCR model missing")

        class WorkingVision(BaseVisionEngine):
            def analyze(self, image, prompt=None):
                return "Vision analysis succeeded despite OCR failure"

        manager = VisionToolManager(ocr_engine=FailingOCR(), vision_engine=WorkingVision())
        result = manager.process_image(self.dummy_img, mode="both")

        self.assertIn("OCR Failure", result["ocr_text"])
        self.assertEqual(result["vision_description"], "Vision analysis succeeded despite OCR failure")
        self.assertIn("Vision analysis succeeded", result["text"])

    @patch("backend.app.rag.extractors.process_image")
    def test_extractor_image_integration(self, mock_process_image) -> None:
        mock_process_image.return_value = {
            "text": "Extracted diagram content from image file",
            "ocr_text": "text",
            "vision_description": "desc",
            "mode_used": "auto"
        }
        
        test_image_path = Path("data/test_image.png")
        records = extract_text(test_image_path)
        self.assertEqual(len(records), 1)
        self.assertIn("Extracted diagram content", records[0]["text"])



if __name__ == "__main__":
    unittest.main()

from pathlib import Path
import docx
import pdfplumber

from core.tools.vision import process_image


def extract_text(path: Path) -> list[dict]:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(path)
    if suffix == ".docx":
        return _extract_docx(path)
    if suffix in {".txt", ".md", ".csv"}:
        return [{"text": path.read_text(encoding="utf-8", errors="ignore"), "page": None, "section": None}]
    if suffix in {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}:
        return _extract_image(path)
    raise ValueError(f"Unsupported file type: {suffix}")


def _extract_pdf(path: Path) -> list[dict]:
    pages: list[dict] = []
    with pdfplumber.open(path) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            text_clean = text.strip()

            # If digital PDF text is present and substantial, use it
            if len(text_clean) >= 30:
                pages.append({"text": text_clean, "page": index, "section": "Document Page"})
            else:
                # Scanned or image-heavy PDF page: render page to image & run vision/OCR pipeline
                try:
                    page_img = page.to_image(resolution=150).original
                    result = process_image(page_img, mode="auto")
                    combined_text = result.get("text", "").strip()
                    if not combined_text:
                        combined_text = text_clean or "[Blank Page]"
                    pages.append({"text": combined_text, "page": index, "section": "Scanned/Diagram Page"})
                except Exception as exc:
                    # Fallback to whatever text was extracted or error message
                    fallback = text_clean or f"[PDF Page rendering failed: {exc}]"
                    pages.append({"text": fallback, "page": index, "section": "Page Extraction Fallback"})
    return pages


def _extract_image(path: Path) -> list[dict]:
    result = process_image(path, mode="auto")
    extracted_content = result.get("text", "").strip()
    return [{
        "text": extracted_content or "[No readable text or visual description extracted from image.]",
        "page": 1,
        "section": "Uploaded Image Content"
    }]


def _extract_docx(path: Path) -> list[dict]:
    document = docx.Document(path)
    sections: list[dict] = []
    current_heading = None
    buffer: list[str] = []

    for paragraph in document.paragraphs:
        text = paragraph.text.strip()
        if not text:
            continue
        if paragraph.style and paragraph.style.name.lower().startswith("heading"):
            if buffer:
                sections.append({"text": "\n".join(buffer), "page": None, "section": current_heading})
                buffer = []
            current_heading = text
        else:
            buffer.append(text)

    if buffer:
        sections.append({"text": "\n".join(buffer), "page": None, "section": current_heading})

    return sections


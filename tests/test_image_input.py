from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from image_input import VISION_SYSTEM_PROMPT, extract_text_from_image


@pytest.mark.parametrize(
    ("image_model", "expected_model"),
    [
        (None, "qwen/qwen3.8-27b"),
        ("custom/vision-model", "custom/vision-model"),
    ],
)
def test_image_extraction_uses_image_model_only(tmp_path, image_model, expected_model):
    image_path = tmp_path / "alert.png"
    image_path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"x" * 20)
    client = Mock()
    client.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="Debit alert"))]
    )
    env = {
        "GROQ_MODEL": "llama-3.3-70b-versatile",
        "GROQ_VISION_MODEL": "llama-3.2-90b-vision-preview",
    }
    if image_model is not None:
        env["GROQ_IMAGE_MODEL"] = image_model

    with patch.dict("os.environ", env, clear=True), patch("image_input._client", return_value=client):
        assert extract_text_from_image(str(image_path)) == "Debit alert"

    assert client.chat.completions.create.call_args.kwargs["model"] == expected_model
    messages = client.chat.completions.create.call_args.kwargs["messages"]
    assert messages[0]["role"] == "system"
    assert messages[0]["content"] == (
        "Identify the unique transaction identifier. On Nigerian receipts, this may be labeled "
        "'Transaction ID', 'Trans ID', 'Session ID', 'RRN', or 'Reference'. It is typically a "
        "12-digit RRN, a 30-digit NIP Session ID, or a distinct alphanumeric transaction code. "
        "DO NOT confuse phone numbers, account numbers, or timestamps with the reference."
    )
    assert messages[0]["content"] == VISION_SYSTEM_PROMPT

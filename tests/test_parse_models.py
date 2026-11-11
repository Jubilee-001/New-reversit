import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

import parse


def _completion(content: str):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


def test_text_parsing_uses_text_model_and_supported_completion_parameters():
    client = Mock()
    client.chat.completions.create.side_effect = [
        Exception("model not found"),
        _completion(
            json.dumps({
                "amount": 1000,
                "date": "2026-10-12",
                "time": "10:00",
                "channel": "pos",
                "bank": "GTBank",
                "reference": "REF1234567",
            })
        ),
    ]
    env = {"GROQ_API_KEY": "test-key", "GROQ_MODEL": "llama-3.3-70b-versatile"}

    with (
        patch.dict("os.environ", env, clear=True),
        patch("parse.Groq", return_value=client),
        patch("parse._ai_call_allowed", return_value=True),
    ):
        result = parse.parse_with_llm("synthetic transaction alert")

    assert result["reference"] == "REF1234567"
    kwargs = client.chat.completions.create.call_args.kwargs
    assert kwargs["model"] == "qwen/qwen3.8-27b"
    assert [call.kwargs["model"] for call in client.chat.completions.create.call_args_list] == [
        "llama-3.3-70b-versatile",
        "qwen/qwen3.8-27b",
    ]
    assert kwargs["max_completion_tokens"] == parse.LLM_MAX_TOKENS
    assert "max_tokens" not in kwargs
    assert kwargs["reasoning_effort"] == "none"


def test_text_parser_falls_back_when_configured_model_is_missing():
    client = Mock()
    client.chat.completions.create.side_effect = [
        Exception("model not found"),
        _completion('{"amount": 1000, "date": "2026-10-12", "time": "10:00", "channel": "pos", "bank": "GTBank", "reference": "REF1234567"}'),
    ]

    with (
        patch.dict("os.environ", {"GROQ_API_KEY": "test-key", "GROQ_TEXT_MODEL": "retired/model"}, clear=True),
        patch("parse.Groq", return_value=client),
        patch("parse._ai_call_allowed", return_value=True),
    ):
        result = parse.parse_with_llm("synthetic transaction alert")

    assert result["reference"] == "REF1234567"
    assert [call.kwargs["model"] for call in client.chat.completions.create.call_args_list] == [
        "retired/model",
        "qwen/qwen3.8-27b",
    ]

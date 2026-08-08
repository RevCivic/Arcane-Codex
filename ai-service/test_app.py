from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import app


class CallOllamaTests(unittest.TestCase):
    def setUp(self) -> None:
        self.response = MagicMock()
        self.response.raise_for_status.return_value = None
        self.client = MagicMock()
        self.client.__enter__.return_value.post.return_value = self.response

    def call(self) -> str:
        with patch.object(app, "OLLAMA_BASE_URL", "http://ollama:11434"), patch.object(
            app.httpx, "Client", return_value=self.client
        ):
            return app._call_ollama([{"role": "user", "content": "Hello"}])

    def test_disables_thinking_and_sends_context_window(self) -> None:
        self.response.json.return_value = {"message": {"content": "Hello back"}, "done": True}

        with patch.object(app, "OLLAMA_THINK", False), patch.object(app, "OLLAMA_NUM_CTX", 8192):
            result = self.call()

        self.assertEqual(result, "Hello back")
        payload = self.client.__enter__.return_value.post.call_args.kwargs["json"]
        self.assertIs(payload["think"], False)
        self.assertEqual(payload["options"]["num_ctx"], 8192)

    def test_empty_reasoning_response_has_actionable_diagnostics(self) -> None:
        self.response.json.return_value = {
            "message": {"content": "", "thinking": "unfinished reasoning"},
            "done": True,
            "done_reason": "length",
            "eval_count": 700,
        }

        with patch.object(app, "OLLAMA_BASE_URL", "http://ollama:11434"), patch.object(
            app.httpx, "Client", return_value=self.client
        ):
            with self.assertRaisesRegex(RuntimeError, "OLLAMA_THINK=false") as raised:
                app._call_ollama([{"role": "user", "content": "Hello"}])

        self.assertIn("done_reason='length'", str(raised.exception))
        self.assertIn("thinking_present=True", str(raised.exception))


if __name__ == "__main__":
    unittest.main()

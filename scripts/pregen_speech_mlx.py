#!/usr/bin/env python3
"""Kokoro on the Apple GPU (MLX), as the audio engine for scripts/pregen-speech.mjs.

The Node parent owns everything that has to match the app exactly — the word
list, the clip names, phonemizing (kokoro-js's own, so a recording sounds as
the in-browser Kokoro would), MP3 encoding and the S3 uploads. This only turns
phonemes into audio, ~3.4x faster than ONNX on the CPU.

Protocol, over stdin/stdout:
  in   one JSON object per line: {"id": 7, "phonemes": "lˈɪv"}
  out  one JSON header line, then the bytes it announces:
         {"id": 7, "samples": 19200, "rate": 24000}  + samples * 4 bytes (float32 LE)
         {"id": 7, "error": "…"}                      + nothing
  The first line out is {"ready": true}, once the model and voice are loaded.

Phonemes go to the model directly rather than through mlx-audio's text
pipeline, which needs misaki and would phonemize differently from the app.

Setup: npm run speech:setup-mlx (a pinned venv in ~/.cache/voca-mlx).
"""

import json
import sys

import mlx.core as mx
import numpy as np
from huggingface_hub import snapshot_download
from mlx_audio.tts.utils import load_model

REPO = "mlx-community/Kokoro-82M-bf16"
# The model's limit on one phoneme sequence (see mlx-audio's pipeline).
MAX_PHONEMES = 510


def main() -> None:
    voice = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
    model = load_model(REPO)
    voices = snapshot_download(REPO, allow_patterns=[f"voices/{voice}.safetensors"])
    # A voice file holds one style vector per input length.
    pack = next(iter(mx.load(f"{voices}/voices/{voice}.safetensors").values()))

    out = sys.stdout.buffer
    out.write(b'{"ready": true}\n')
    out.flush()

    for line in sys.stdin:
        if not line.strip():
            continue
        req = json.loads(line)
        try:
            ps = req["phonemes"]
            if not ps or len(ps) > MAX_PHONEMES:
                raise ValueError(f"phonemes must be 1-{MAX_PHONEMES} characters, got {len(ps)}")
            result = model(ps, pack[len(ps) - 1], 1.0, return_output=True)
            audio = np.asarray(result.audio, dtype="<f4").reshape(-1)
            header = {"id": req["id"], "samples": int(audio.shape[0]), "rate": 24000}
            out.write(json.dumps(header).encode() + b"\n")
            out.write(audio.tobytes())
        except Exception as err:  # one bad clip mustn't end the run
            out.write(json.dumps({"id": req.get("id"), "error": str(err)}).encode() + b"\n")
        out.flush()


if __name__ == "__main__":
    main()

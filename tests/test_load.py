import traceback
import torch
from transformers.modeling_rope_utils import ROPE_INIT_FUNCTIONS
try:
    from transformers.modeling_rope_utils import _init_default_rope
except ImportError:
    _init_default_rope = None

if "default" not in ROPE_INIT_FUNCTIONS:
    ROPE_INIT_FUNCTIONS["default"] = _init_default_rope or (lambda config, device, **kwargs: (None, None))

from transformers import AutoProcessor, AutoModelForCausalLM

model_path = "./models_storage/PaddleOCR-VL-1.6"

print("--- Step 1: Testing AutoProcessor ---")
try:
    proc = AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
    print("AutoProcessor loaded successfully!")
except Exception as e:
    print("AutoProcessor error:", e)
    traceback.print_exc()

print("\n--- Step 2: Testing AutoModelForCausalLM with patch ---")
try:
    model = AutoModelForCausalLM.from_pretrained(model_path, trust_remote_code=True, torch_dtype=torch.float32)
    print("AutoModelForCausalLM loaded SUCCESSFULLY!")
except Exception as e:
    print("AutoModelForCausalLM error:", e)
    traceback.print_exc()

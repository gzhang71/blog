"""Offline chat demo. Downloads the model on first run; requires a vLLM runtime."""
import argparse
import json
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")
    parser.add_argument("--tensor-parallel-size", type=int, default=1)
    args = parser.parse_args()
    if args.tensor_parallel_size < 1:
        parser.error("--tensor-parallel-size must be positive")
    from vllm import LLM, SamplingParams

    engine = LLM(model=args.model, tensor_parallel_size=args.tensor_parallel_size,
                 max_model_len=2048, gpu_memory_utilization=0.8)
    params = SamplingParams(temperature=0, max_tokens=128)
    conversations = [
        [{"role": "user", "content": "Explain DDP in three sentences."}],
        [{"role": "user", "content": "Explain what pin_memory changes."}],
    ]
    engine.chat(conversations[:1], sampling_params=params, use_tqdm=False)
    started = time.perf_counter()
    outputs = engine.chat(conversations, sampling_params=params, use_tqdm=False)
    elapsed = time.perf_counter() - started
    for index, output in enumerate(outputs):
        print(json.dumps({"input_index": index, "text": output.outputs[0].text,
                          "finish_reason": output.outputs[0].finish_reason}))
    tokens = sum(len(output.outputs[0].token_ids) for output in outputs)
    print(json.dumps({"elapsed_seconds": elapsed, "output_tokens": tokens,
                      "output_tokens_per_second": tokens / elapsed,
                      "note": "Tiny demo including prompt processing; not a serving benchmark"}))


if __name__ == "__main__":
    main()

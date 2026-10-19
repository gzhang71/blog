---
title: "A vLLM demo: offline chat, online serving, and what to measure"
date: 2026-10-18
summary: "Run multiple chat requests, serve a model over HTTP, and distinguish a working demo from a useful inference benchmark."
tags: [vllm, inference, demo]
---

A direct generation loop is useful for learning a model API. A serving engine has another job: schedule many variable-length requests without wasting GPU capacity when short requests finish early. vLLM provides offline generation and a long-lived serving interface around that problem.

The examples here target a supported Linux CUDA environment with enough GPU memory. The authoring Mac has no CUDA or vLLM installation, so these are target-runtime demos rather than locally measured inference results. Use a separate Python environment from the training demos because vLLM may need a different PyTorch build.

## Offline chat in one process

The complete CLI is `examples/vllm_demo.py`. Its central operation is:

```python
from vllm import LLM, SamplingParams

engine = LLM(
    model="Qwen/Qwen2.5-0.5B-Instruct",
    max_model_len=2048,
    gpu_memory_utilization=0.8,
)
conversations = [
    [{"role": "user", "content": "Explain DDP in three sentences."}],
    [{"role": "user", "content": "Explain what pin_memory changes."}],
]
outputs = engine.chat(
    conversations,
    sampling_params=SamplingParams(temperature=0, max_tokens=128),
)
for output in outputs:
    print(output.outputs[0].text)
```

`LLM.chat` applies the model's chat template to role/content messages. The first run downloads model artifacts unless already cached. A small model makes the demonstration easier to fit; its answers are not a quality baseline. [vLLM quickstart](https://docs.vllm.ai/en/stable/getting_started/quickstart/).

Run the complete example from the repo root:

```bash
python examples/vllm_demo.py
```

It warms one request, submits two conversations, prints outputs, and reports generated tokens divided by batch elapsed time. That denominator includes prompt processing. With two short inputs, the number is too sensitive to startup and request details to establish serving capacity.

## Serve the same model over HTTP

Start a long-lived server in the vLLM environment:

```bash
vllm serve Qwen/Qwen2.5-0.5B-Instruct \
  --host 127.0.0.1 --port 8000 \
  --max-model-len 2048 --gpu-memory-utilization 0.8
```

Then send a chat request from another terminal:

```bash
curl http://127.0.0.1:8000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "Qwen/Qwen2.5-0.5B-Instruct",
    "messages": [{"role": "user", "content": "Explain continuous batching."}],
    "temperature": 0,
    "max_tokens": 128,
    "stream": false
  }'
```

The online interface accepts requests independently of the process that loaded the weights. Streaming can expose partial output; it does not remove queueing or make an unbounded generation safe. [Online serving documentation](https://docs.vllm.ai/en/stable/serving/online_serving/).

## Offline does not mean fixed membership

Imagine three prompts that need 10, 100, and 1,000 output tokens. A fixed request group can leave completed slots unused while the longest sequence continues. Continuous batching lets the scheduler admit additional work as capacity becomes available. vLLM's offline tooling can use this scheduling too; offline describes how inputs are supplied, not a requirement that every sequence finish together. [Offline inference](https://docs.vllm.ai/en/stable/serving/offline_inference/).

For an hours-long dataset job, I would submit bounded chunks and persist results keyed by input ID and model/configuration version. A server running indefinitely and a single request generating indefinitely are different requirements. Prompt plus generated tokens must stay within the context budget; durable progress belongs in the surrounding job system.

## Add GPUs only for a reason

The companion accepts `--tensor-parallel-size`. Increasing it partitions model computation across devices; it is not DDP gradient synchronization. For a tiny model, communication may outweigh any benefit. Use a size that matches the available GPU count and the model's supported partitioning constraints, then compare under representative load.

A useful benchmark fixes model revision, vLLM version, prompt distribution, output-length policy, hardware, and sampling settings. Sweep concurrency and collect:

| Metric | Question |
| --- | --- |
| Time to first token | How long until the user sees progress? |
| Inter-token latency | Does generation continue smoothly? |
| End-to-end latency percentiles | What do typical and slow requests experience? |
| Completed requests and output tokens/s | How much useful work completes? |
| Error/cancellation rate | Is apparent throughput hiding failures? |

Compare throughput only at acceptable latency and failure rates. A configuration that maximizes aggregate tokens per second may create an unacceptable interactive queue. Long prompts, long outputs, and shared prefixes also change the workload substantially; a short uniform-prompt demo cannot stand in for all three.

For the memory side of this experiment, use the [KV-cache accounting note](/notes/llm/kv-cache-optimization). The question is how many active sequences fit, not just whether the model's weights load successfully.

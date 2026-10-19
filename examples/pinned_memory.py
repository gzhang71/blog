"""Synchronized H2D copy microbenchmark; requires CUDA, excludes pin allocation."""
import argparse
import json
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mib", type=int, default=64)
    parser.add_argument("--steps", type=int, default=50)
    args = parser.parse_args()
    if min(args.mib, args.steps) < 1:
        parser.error("--mib and --steps must be positive")
    import torch

    if not torch.cuda.is_available():
        raise SystemExit("This benchmark requires CUDA")
    source = torch.ones(args.mib * 2**20 // 4, dtype=torch.float32)
    pinned = source.pin_memory()
    destination = torch.empty_like(source, device="cuda")
    print(json.dumps({"torch": torch.__version__, "cuda": torch.version.cuda,
                      "gpu": torch.cuda.get_device_name(), "mib": args.mib}))
    for name, host, nonblocking in [
        ("pageable_blocking", source, False),
        ("pageable_nonblocking", source, True),
        ("pinned_nonblocking", pinned, True),
    ]:
        for _ in range(10):
            destination.copy_(host, non_blocking=nonblocking)
        torch.cuda.synchronize()
        started = time.perf_counter()
        for _ in range(args.steps):
            destination.copy_(host, non_blocking=nonblocking)
        torch.cuda.synchronize()
        seconds = time.perf_counter() - started
        torch.testing.assert_close(destination.cpu(), source)
        print(json.dumps({"case": name, "mean_copy_ms": seconds * 1000 / args.steps,
                          "gib_per_second": source.numel() * source.element_size() * args.steps / seconds / 2**30}))


if __name__ == "__main__":
    main()

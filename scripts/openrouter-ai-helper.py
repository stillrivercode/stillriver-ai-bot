#!/usr/bin/env python3
"""
OpenRouter AI Helper Script
Provides AI assistance via OpenRouter API for GitHub workflows
"""
import argparse
import os
import sys

from openai import OpenAI


def main():
    parser = argparse.ArgumentParser(description="OpenRouter AI Helper")
    parser.add_argument(
        "--prompt-file", required=True, help="File containing the prompt"
    )
    parser.add_argument(
        "--output-file", required=True, help="File to write the response"
    )
    parser.add_argument(
        "--model", default="anthropic/claude-3.5-sonnet", help="AI model to use"
    )
    parser.add_argument("--title", default="AI Assistant", help="Title for the request")

    args = parser.parse_args()

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("OPENROUTER_API_KEY environment variable not set")
        return 1

    # Read the prompt
    try:
        with open(args.prompt_file) as f:
            prompt = f.read()
    except FileNotFoundError:
        print(f"Prompt file not found: {args.prompt_file}")
        return 1

    client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)

    try:
        response = client.chat.completions.create(
            model=args.model,
            messages=[{"role": "user", "content": prompt}],
            extra_headers={"HTTP-Referer": "https://github.com", "X-Title": args.title},
        )

        # Write response to output file
        with open(args.output_file, "w") as f:
            f.write(response.choices[0].message.content)

        print(f"AI response written to {args.output_file}")
        return 0

    except Exception as e:
        with open(args.output_file, "w") as f:
            f.write(
                f"## ⚠️ AI Request Failed\n\nError: {str(e)}\n\nThis could be due to:\n- API rate limiting\n- Large input size\n- Temporary service issues\n\nPlease retry later or request manual assistance."
            )

        print(f"AI request failed: {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

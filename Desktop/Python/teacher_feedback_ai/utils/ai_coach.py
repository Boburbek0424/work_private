"""OpenAI-powered coaching helpers."""

from __future__ import annotations

from openai import OpenAI


SYSTEM_MESSAGE = (
    "You are a practical, supportive teaching coach. Give specific classroom "
    "advice based only on the feedback data provided. Be concise, realistic, "
    "and action-oriented."
)


def _client(api_key: str) -> OpenAI:
    if not api_key or not api_key.strip():
        raise ValueError("OpenAI API key is missing.")
    return OpenAI(api_key=api_key.strip())


def generate_progress_summary(
    api_key: str,
    feedback_context: str,
    latest_lesson: str,
    model: str = "gpt-4o-mini",
) -> str:
    """Generate an overall teaching progress summary."""
    prompt = f"""
Analyze this teacher observation feedback.

Recent feedback data as CSV:
{feedback_context}

Latest lesson:
{latest_lesson}

Return the answer with these headings:
1. Overall teaching progress summary
2. Main strengths
3. Main weaknesses
4. Three specific actions for the next lesson
5. Motivational but realistic coaching note
6. Latest lesson analysis
"""

    return _run_chat_completion(api_key, prompt, model=model)


def generate_topic_advice(
    api_key: str,
    feedback_context: str,
    next_topic: str,
    model: str = "gpt-4o-mini",
) -> str:
    """Generate advice for a planned lesson topic."""
    if not next_topic or not next_topic.strip():
        raise ValueError("Please enter the next lesson topic.")

    prompt = f"""
The teacher's recent feedback data is below.

Recent feedback data as CSV:
{feedback_context}

The next lesson topic is: {next_topic.strip()}

Give advice with these headings:
1. Mistakes to avoid
2. How to start the lesson
3. How to make students interact
4. How to check quiet students
5. Three teacher phrases to use in class
"""

    return _run_chat_completion(api_key, prompt, model=model)


def _run_chat_completion(api_key: str, prompt: str, model: str) -> str:
    client = _client(api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_MESSAGE},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )
    return response.choices[0].message.content or "No AI response was returned."

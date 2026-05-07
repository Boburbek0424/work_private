"""Analytics helpers for scores and written feedback themes."""

from __future__ import annotations

from collections import Counter

import pandas as pd

from .data_cleaning import SCORE_COLUMNS, TEXT_COLUMNS, existing_columns


WEAKNESS_THEMES = {
    "Unclear instructions": [
        "unclear instruction",
        "instructions unclear",
        "clear instruction",
        "not clear",
        "confusing",
        "explain task",
    ],
    "Low energy": ["low energy", "more energy", "enthusiasm", "monotone", "boring"],
    "Not checking all students": [
        "check all students",
        "not check",
        "quiet students",
        "monitor all",
        "only some students",
    ],
    "Weak interaction": [
        "interaction",
        "student talk",
        "teacher talking time",
        "more pair work",
        "engage students",
    ],
    "Classroom management": [
        "classroom management",
        "control",
        "noise",
        "discipline",
        "manage class",
    ],
    "Timing problems": ["timing", "time management", "too long", "rushed", "pace"],
    "Not enough examples": [
        "more examples",
        "not enough examples",
        "give examples",
        "model example",
    ],
}

STRENGTH_THEMES = {
    "Strong explanation": [
        "strong explanation",
        "clear explanation",
        "explained well",
        "good explanation",
    ],
    "Good examples": ["good examples", "clear examples", "useful examples"],
    "Good note-taking": ["note-taking", "notes", "good notes", "board work"],
    "Good guidance following": [
        "followed guidance",
        "good guidance",
        "follow instructions",
        "improved",
    ],
}

IMPROVEMENT_SUGGESTIONS = {
    "Unclear instructions": "Give instructions in short steps, model one example, then ask one student to repeat the task.",
    "Low energy": "Plan one energetic opening question and vary your voice during explanations.",
    "Not checking all students": "Use a quick checklist and ask at least two quiet students low-pressure questions.",
    "Weak interaction": "Add pair work or a 30-second turn-and-talk before whole-class answers.",
    "Classroom management": "Set the task, time limit, and expected noise level before students begin.",
    "Timing problems": "Write target minutes for each lesson stage and use a visible timer.",
    "Not enough examples": "Prepare two simple examples and one student-generated example for each key task.",
}


def get_score_columns(df: pd.DataFrame) -> list[str]:
    """Return score columns that are available in the loaded sheet."""
    return existing_columns(df, SCORE_COLUMNS)


def get_text_columns(df: pd.DataFrame) -> list[str]:
    """Return written feedback columns that are available in the loaded sheet."""
    return existing_columns(df, TEXT_COLUMNS)


def build_dashboard_metrics(df: pd.DataFrame) -> dict[str, object]:
    """Calculate summary metrics for the Streamlit dashboard."""
    score_columns = get_score_columns(df)
    category_columns = [column for column in score_columns if column != "OVR SCORE"]

    metrics: dict[str, object] = {
        "total_lessons": len(df),
        "average_ovr": None,
        "highest_ovr": None,
        "lowest_ovr": None,
        "latest_feedback": "No feedback available.",
        "best_category": "Not available",
        "weakest_category": "Not available",
    }

    if "OVR SCORE" in df.columns:
        ovr_scores = df["OVR SCORE"].dropna()
        if not ovr_scores.empty:
            metrics["average_ovr"] = round(float(ovr_scores.mean()), 2)
            metrics["highest_ovr"] = round(float(ovr_scores.max()), 2)
            metrics["lowest_ovr"] = round(float(ovr_scores.min()), 2)

    if category_columns:
        averages = df[category_columns].mean(numeric_only=True).dropna()
        if not averages.empty:
            metrics["best_category"] = f"{averages.idxmax()} ({averages.max():.2f})"
            metrics["weakest_category"] = f"{averages.idxmin()} ({averages.min():.2f})"

    latest_row = _latest_row(df)
    if latest_row is not None:
        latest_bits = []
        for column in get_text_columns(df):
            value = str(latest_row.get(column, "")).strip()
            if value:
                latest_bits.append(f"{column}: {value}")
        if latest_bits:
            metrics["latest_feedback"] = "\n\n".join(latest_bits)

    return metrics


def detect_feedback_themes(df: pd.DataFrame) -> dict[str, list[tuple[str, int]] | list[str]]:
    """Detect repeated strengths and weaknesses from feedback text."""
    text = " ".join(
        df[column].fillna("").astype(str).str.lower().str.cat(sep=" ")
        for column in get_text_columns(df)
    )

    weaknesses = _count_themes(text, WEAKNESS_THEMES)
    strengths = _count_themes(text, STRENGTH_THEMES)

    suggestions = [
        IMPROVEMENT_SUGGESTIONS[theme]
        for theme, _count in weaknesses[:5]
        if theme in IMPROVEMENT_SUGGESTIONS
    ]

    return {
        "weaknesses": weaknesses,
        "strengths": strengths,
        "suggestions": suggestions,
    }


def compact_feedback_context(df: pd.DataFrame, max_rows: int = 12) -> str:
    """Create a compact text summary of recent feedback for AI prompts."""
    selected_columns = existing_columns(
        df,
        ["Date", "Group", "Lesson", "Topic", *TEXT_COLUMNS, *SCORE_COLUMNS],
    )
    if not selected_columns:
        return "No usable feedback columns were found."

    recent_df = df.tail(max_rows)[selected_columns].copy()

    if "Date" in recent_df.columns:
        recent_df["Date"] = recent_df["Date"].dt.strftime("%Y-%m-%d").fillna("")

    return recent_df.fillna("").to_csv(index=False)


def latest_lesson_context(df: pd.DataFrame) -> str:
    """Return the latest lesson as readable text for the AI coach."""
    latest_row = _latest_row(df)
    if latest_row is None:
        return "No latest lesson found."

    parts = []
    for column in existing_columns(df, ["Date", "Group", "Lesson", "Topic", *TEXT_COLUMNS, *SCORE_COLUMNS]):
        value = latest_row.get(column, "")
        if pd.isna(value):
            continue
        if column == "Date" and hasattr(value, "strftime"):
            value = value.strftime("%Y-%m-%d")
        parts.append(f"{column}: {value}")

    return "\n".join(parts)


def _count_themes(text: str, theme_keywords: dict[str, list[str]]) -> list[tuple[str, int]]:
    counts = Counter()
    for theme, keywords in theme_keywords.items():
        for keyword in keywords:
            counts[theme] += text.count(keyword)

    return [(theme, count) for theme, count in counts.most_common() if count > 0]


def _latest_row(df: pd.DataFrame) -> pd.Series | None:
    if df.empty:
        return None

    if "Date" in df.columns and df["Date"].notna().any():
        return df.sort_values("Date", na_position="first").iloc[-1]

    return df.iloc[-1]

"""Data cleaning helpers for teaching observation feedback."""

from __future__ import annotations

import re
from typing import Iterable

import pandas as pd


EXPECTED_COLUMNS = [
    "Date",
    "Group",
    "Lesson",
    "Topic",
    "Starter",
    "Warm-up Questions",
    "Teacher Session 1",
    "Teacher Session 2",
    "TGC",
    "TA",
    "RF",
    "EF",
    "C",
    "SE",
    "OVR SCORE",
]

SCORE_COLUMNS = ["TGC", "TA", "RF", "EF", "C", "SE", "OVR SCORE"]
TEXT_COLUMNS = ["Starter", "Warm-up Questions", "Teacher Session 1", "Teacher Session 2"]


def _normalize_column_name(name: str) -> str:
    """Normalize a column name so small spelling/spacing differences still match."""
    text = str(name).strip().lower()
    text = text.translate(
        str.maketrans(
            {
                "а": "a",
                "е": "e",
                "о": "o",
                "р": "p",
                "с": "c",
                "у": "y",
                "х": "x",
            }
        )
    )
    return re.sub(r"[^a-z0-9]+", "", text)


def map_expected_columns(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Rename detected columns to the expected names and report missing columns."""
    normalized_to_actual = {
        _normalize_column_name(column): column for column in df.columns
    }

    rename_map = {}
    missing_columns = []

    for expected in EXPECTED_COLUMNS:
        normalized_expected = _normalize_column_name(expected)
        actual = normalized_to_actual.get(normalized_expected)
        if actual:
            rename_map[actual] = expected
        else:
            missing_columns.append(expected)

    return df.rename(columns=rename_map), missing_columns


def clean_feedback_data(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Prepare the feedback DataFrame for dashboarding and analysis."""
    cleaned_df, missing_columns = map_expected_columns(df.copy())

    if "Date" in cleaned_df.columns:
        cleaned_df["Date"] = pd.to_datetime(
            cleaned_df["Date"],
            errors="coerce",
            dayfirst=True,
        )

    for column in SCORE_COLUMNS:
        if column in cleaned_df.columns:
            cleaned_df[column] = pd.to_numeric(cleaned_df[column], errors="coerce")

    for column in TEXT_COLUMNS:
        if column in cleaned_df.columns:
            cleaned_df[column] = cleaned_df[column].fillna("").astype(str)

    if "Topic" in cleaned_df.columns:
        cleaned_df["Topic"] = cleaned_df["Topic"].fillna("").astype(str)

    if "Date" in cleaned_df.columns:
        cleaned_df = cleaned_df.sort_values("Date", na_position="last")

    return cleaned_df, missing_columns


def existing_columns(df: pd.DataFrame, candidates: Iterable[str]) -> list[str]:
    """Return only columns that exist in the DataFrame."""
    return [column for column in candidates if column in df.columns]

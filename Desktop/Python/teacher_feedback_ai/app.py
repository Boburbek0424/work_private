"""AI Teacher Feedback Progress Tracker.

Run with:
    streamlit run app.py
"""

from __future__ import annotations

import os

import pandas as pd
import plotly.express as px
import streamlit as st
from dotenv import load_dotenv

from utils.ai_coach import generate_progress_summary, generate_topic_advice
from utils.analytics import (
    build_dashboard_metrics,
    compact_feedback_context,
    detect_feedback_themes,
    get_score_columns,
    latest_lesson_context,
)
from utils.data_cleaning import SCORE_COLUMNS, clean_feedback_data
from utils.google_sheets import load_public_google_sheet


DEFAULT_SHEET_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "1KD7PwPWlHmzCpDKYDvX_wfLdJG3i1B2xNfq9EcgOW40/edit?usp=sharing"
)


load_dotenv()

st.set_page_config(
    page_title="AI Teacher Feedback Progress Tracker",
    page_icon="chart_with_upwards_trend",
    layout="wide",
)


def main() -> None:
    st.title("AI Teacher Feedback Progress Tracker")
    st.caption("Track observation scores, repeated feedback themes, and next-step coaching.")

    with st.sidebar:
        st.header("Settings")
        sheet_url = st.text_input("Google Sheet link", value=DEFAULT_SHEET_URL)
        openai_api_key = st.text_input(
            "OpenAI API key",
            value=os.getenv("OPENAI_API_KEY", ""),
            type="password",
            help="Your key is only used locally in this Streamlit session.",
        )
        model = st.selectbox(
            "OpenAI model",
            options=["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"],
            index=0,
        )
        load_button = st.button("Load feedback", type="primary")

    if not sheet_url:
        st.info("Paste your public Google Sheet link in the sidebar to begin.")
        return

    if load_button or "feedback_df" not in st.session_state:
        with st.spinner("Loading Google Sheet..."):
            try:
                raw_df = load_public_google_sheet(sheet_url)
                cleaned_df, missing_columns = clean_feedback_data(raw_df)
            except Exception as exc:
                st.error(str(exc))
                return

        st.session_state.feedback_df = cleaned_df
        st.session_state.missing_columns = missing_columns

    df = st.session_state.feedback_df
    missing_columns = st.session_state.missing_columns

    if missing_columns:
        st.warning("Missing expected columns: " + ", ".join(missing_columns))

    render_dashboard(df)
    render_charts(df)
    render_theme_analysis(df)
    render_ai_sections(df, openai_api_key, model)
    render_raw_data(df)


def render_dashboard(df: pd.DataFrame) -> None:
    st.subheader("Dashboard")
    metrics = build_dashboard_metrics(df)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Observed lessons", metrics["total_lessons"])
    col2.metric("Average OVR SCORE", _format_metric(metrics["average_ovr"]))
    col3.metric("Highest OVR SCORE", _format_metric(metrics["highest_ovr"]))
    col4.metric("Lowest OVR SCORE", _format_metric(metrics["lowest_ovr"]))

    col5, col6 = st.columns(2)
    col5.info(f"Best scoring category: {metrics['best_category']}")
    col6.info(f"Weakest scoring category: {metrics['weakest_category']}")

    with st.expander("Latest lesson feedback", expanded=True):
        st.write(metrics["latest_feedback"])


def render_charts(df: pd.DataFrame) -> None:
    st.subheader("Progress Line Charts")
    score_columns = get_score_columns(df)

    if "Date" not in df.columns:
        st.warning("The Date column is missing, so progress charts cannot be shown.")
        return

    chart_df = df.dropna(subset=["Date"]).copy()
    if chart_df.empty:
        st.warning("No valid dates found for charting.")
        return

    available_score_columns = [column for column in SCORE_COLUMNS if column in score_columns]
    if not available_score_columns:
        st.warning("No score columns were found for charting.")
        return

    tabs = st.tabs(["Combined", *available_score_columns])

    with tabs[0]:
        combined_df = chart_df.melt(
            id_vars=["Date"],
            value_vars=available_score_columns,
            var_name="Category",
            value_name="Score",
        ).dropna(subset=["Score"])
        fig = px.line(
            combined_df,
            x="Date",
            y="Score",
            color="Category",
            markers=True,
            title="All Score Columns Over Time",
        )
        st.plotly_chart(fig, width="stretch")

    for tab, column in zip(tabs[1:], available_score_columns):
        with tab:
            fig = px.line(
                chart_df,
                x="Date",
                y=column,
                markers=True,
                title=f"{column} Progress Over Time",
            )
            st.plotly_chart(fig, width="stretch")


def render_theme_analysis(df: pd.DataFrame) -> None:
    st.subheader("Strengths and Weaknesses")
    themes = detect_feedback_themes(df)

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**Top repeated strengths**")
        _render_theme_list(themes["strengths"], "No repeated strengths detected yet.")

    with col2:
        st.markdown("**Top repeated weaknesses**")
        _render_theme_list(themes["weaknesses"], "No repeated weaknesses detected yet.")

    st.markdown("**Practical improvement suggestions**")
    suggestions = themes["suggestions"]
    if suggestions:
        for suggestion in suggestions:
            st.write(f"- {suggestion}")
    else:
        st.write("No automatic suggestions yet. Add more feedback text or check column names.")


def render_ai_sections(df: pd.DataFrame, api_key: str, model: str) -> None:
    st.subheader("AI Coach")

    if not api_key:
        st.warning("Enter your OpenAI API key in the sidebar to use AI coaching features.")
        return

    feedback_context = compact_feedback_context(df)
    latest_context = latest_lesson_context(df)

    col1, col2 = st.columns(2)

    with col1:
        if st.button("Generate AI progress summary"):
            with st.spinner("The AI coach is reading your feedback..."):
                try:
                    summary = generate_progress_summary(
                        api_key,
                        feedback_context,
                        latest_context,
                        model=model,
                    )
                    st.markdown(summary)
                except Exception as exc:
                    st.error(f"AI summary failed: {exc}")

    with col2:
        next_topic = st.text_input("Enter next lesson topic")
        if st.button("Generate topic-based advice"):
            with st.spinner("Creating topic advice..."):
                try:
                    advice = generate_topic_advice(
                        api_key,
                        feedback_context,
                        next_topic,
                        model=model,
                    )
                    st.markdown(advice)
                except Exception as exc:
                    st.error(f"Topic advice failed: {exc}")


def render_raw_data(df: pd.DataFrame) -> None:
    st.subheader("Raw Data")
    st.dataframe(df, width="stretch")


def _render_theme_list(themes: list[tuple[str, int]], empty_message: str) -> None:
    if not themes:
        st.write(empty_message)
        return

    for theme, count in themes[:5]:
        st.write(f"- {theme}: {count} mention(s)")


def _format_metric(value: object) -> str:
    if value is None:
        return "N/A"
    return str(value)


if __name__ == "__main__":
    main()

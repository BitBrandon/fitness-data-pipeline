"""AI-powered wellness insight generation.

This module is intentionally small for now. The current pipeline still generates
summaries inside `src.etl.sync_hevy`; future work should move AI-specific logic
here once the metric layer is more structured.
"""

from src.ai.prompts import WELLNESS_SYSTEM_PROMPT


def build_wellness_messages(metrics_summary):
    """Build chat messages from precomputed wellness metrics."""
    return [
        {"role": "system", "content": WELLNESS_SYSTEM_PROMPT},
        {"role": "user", "content": str(metrics_summary)},
    ]

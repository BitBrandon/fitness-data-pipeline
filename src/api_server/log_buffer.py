# Kept for import compatibility — logging now uses RotatingFileHandler in main.py
import logging


class RingHandler(logging.Handler):
    def emit(self, record: logging.LogRecord):
        pass


def get_logs(n: int = 200) -> list:
    return []

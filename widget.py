import webview
import sqlite3
import ctypes
import sys
from datetime import date
from pathlib import Path

_FROZEN = getattr(sys, 'frozen', False)
_BASE   = Path(sys.executable).parent if _FROZEN else Path(__file__).parent
_ASSET  = Path(sys._MEIPASS) if _FROZEN else Path(__file__).parent

DB_PATH   = _BASE  / 'instance' / 'planner.db'
HTML_PATH = _ASSET / 'widget.html'

W, H = 300, 440


class Api:
    def __init__(self):
        self._win     = None
        self._drag_sx = 0
        self._drag_sy = 0
        self._drag_wx = 0
        self._drag_wy = 0

    def drag_start(self, screen_x, screen_y):
        self._drag_sx = screen_x
        self._drag_sy = screen_y
        self._drag_wx = self._win.x
        self._drag_wy = self._win.y

    def drag_move(self, screen_x, screen_y):
        dx = screen_x - self._drag_sx
        dy = screen_y - self._drag_sy
        self._win.move(self._drag_wx + dx, self._drag_wy + dy)

    def get_today(self):
        if not DB_PATH.exists():
            return []
        today = date.today().isoformat()
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                rows = conn.execute('''
                    SELECT title, start_time, end_time, importance, status, is_deadline
                    FROM   schedule
                    WHERE  start_date <= ? AND end_date >= ?
                      AND  status NOT IN ("완료", "취소")
                    ORDER  BY start_time
                ''', (today, today)).fetchall()
            return [dict(r) for r in rows]
        except Exception:
            return []

    def close(self):
        self._win.destroy()


def _screen_size():
    # SetProcessDPIAware 없이 호출해야 논리 픽셀(pywebview 좌표계)과 일치함
    user32 = ctypes.windll.user32
    return user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)


def main():
    api = Api()
    sw, sh = _screen_size()

    win = webview.create_window(
        title            = '오늘의 일정',
        url              = HTML_PATH.as_uri(),
        js_api           = api,
        width            = W,
        height           = H,
        x                = sw - W - 20,
        y                = sh - H - 60,
        frameless        = True,
        on_top           = True,
        background_color = '#f0f2f8',
        min_size         = (200, 300),
    )
    api._win = win
    webview.start()


if __name__ == '__main__':
    main()

from flask import Flask, render_template, jsonify
from threading import Timer
import subprocess, sys, os, webbrowser

from database import db
from managers.schedule_manager import ScheduleManager

# PyInstaller frozen 환경에서는 리소스 경로가 달라짐
_FROZEN = getattr(sys, 'frozen', False)
_ASSET  = sys._MEIPASS if _FROZEN else os.path.dirname(os.path.abspath(__file__))
_BASE   = os.path.dirname(sys.executable) if _FROZEN else os.path.dirname(os.path.abspath(__file__))

_INSTANCE = os.path.join(_BASE, 'instance')
os.makedirs(_INSTANCE, exist_ok=True)

app = Flask(__name__,
            template_folder=os.path.join(_ASSET, 'templates'),
            static_folder=os.path.join(_ASSET, 'static'))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(_INSTANCE, 'planner.db').replace('\\', '/')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
manager = ScheduleManager()

with app.app_context():
    db.create_all()
    # 기존 DB에 컬럼이 없으면 추가 (단순 마이그레이션)
    from sqlalchemy import inspect, text
    cols = [c['name'] for c in inspect(db.engine).get_columns('schedule')]
    if 'is_deadline' not in cols:
        db.session.execute(text('ALTER TABLE schedule ADD COLUMN is_deadline INTEGER NOT NULL DEFAULT 0'))
        db.session.commit()
    manager.load_from_db()

from routes.schedule_routes import schedule_bp
app.register_blueprint(schedule_bp)

@app.route("/")
def index():
    return render_template("base.html")

_widget_proc = None

@app.route("/api/widget", methods=["POST"])
def widget_launch():
    global _widget_proc
    if _widget_proc and _widget_proc.poll() is None:
        return jsonify({"ok": False, "error": "이미 실행 중입니다."})
    if _FROZEN:
        cmd = [os.path.join(_BASE, 'widget.exe')]
    else:
        cmd = [sys.executable, os.path.join(_BASE, 'widget.py')]
    _widget_proc = subprocess.Popen(
        cmd,
        cwd=_BASE,
        creationflags=subprocess.CREATE_NO_WINDOW,
    )
    return jsonify({"ok": True})

def open_browser():
    webbrowser.open("http://127.0.0.1:5000")

if __name__ == "__main__":
    if _FROZEN or os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        Timer(1, open_browser).start()
    app.run(debug=not _FROZEN, use_reloader=not _FROZEN)

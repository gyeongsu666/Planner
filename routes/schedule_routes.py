from flask import Blueprint, request, jsonify
from datetime import date, time
from models.schedule import Schedule
from models.status import Status

schedule_bp = Blueprint("schedule", __name__)

def get_manager():
    from app import manager
    return manager

@schedule_bp.route("/api/summary", methods=["GET"])
def get_summary():
    return jsonify(get_manager().get_summary())

@schedule_bp.route("/api/schedules", methods=["GET"])
def get_schedules():
    return jsonify(get_manager().get_all(sort=request.args.get("sort", "date")))

@schedule_bp.route("/api/schedules/today", methods=["GET"])
def get_today():
    return jsonify(get_manager().get_today())

@schedule_bp.route("/api/schedules/completed", methods=["GET"])
def get_completed():
    return jsonify(get_manager().get_completed())

@schedule_bp.route("/api/schedules/top", methods=["GET"])
def get_top():
    return jsonify(get_manager().get_top(int(request.args.get("n", 5))))

@schedule_bp.route("/api/schedules/search", methods=["GET"])
def search():
    keyword    = request.args.get("keyword")
    target     = request.args.get("date")
    start_date = request.args.get("start")
    end_date   = request.args.get("end")
    m = get_manager()
    if keyword:
        return jsonify(m.search_keyword(keyword))
    if target:
        return jsonify(m.search_date(date.fromisoformat(target)))
    if start_date and end_date:
        return jsonify(m.search_range(date.fromisoformat(start_date), date.fromisoformat(end_date)))
    return jsonify({"error": "검색 조건을 입력하세요."}), 400

def _validate_schedule_fields(start_date, end_date, start_time, end_time, importance):
    if start_date > end_date:
        return "종료 날짜는 시작 날짜 이후여야 합니다."
    if start_date == end_date and start_time >= end_time:
        return "종료 시간은 시작 시간 이후여야 합니다."
    if not (1 <= importance <= 5):
        return "중요도는 1~5 사이여야 합니다."
    return None

@schedule_bp.route("/api/schedules", methods=["POST"])
def add_schedule():
    d = request.json
    try:
        title       = d["title"].strip()
        is_deadline = bool(d.get("is_deadline", False))
        end_date    = date.fromisoformat(d["end_date"])
        start_date  = end_date if is_deadline else date.fromisoformat(d["start_date"])
        end_time    = time.fromisoformat(d["end_time"])
        start_time  = time(0, 0) if is_deadline else time.fromisoformat(d["start_time"])
        importance  = int(d["importance"])
    except (KeyError, ValueError) as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    if not title:
        return jsonify({"ok": False, "error": "제목을 입력해주세요."}), 400
    err = _validate_schedule_fields(start_date, end_date, start_time, end_time, importance)
    if err:
        return jsonify({"ok": False, "error": err}), 400
    s = Schedule(title=title, start_date=start_date, end_date=end_date,
                 start_time=start_time, end_time=end_time,
                 importance=importance, memo=d.get("memo", ""),
                 is_deadline=is_deadline)
    result = get_manager().add(s)
    return jsonify(result), 200 if result["ok"] else 409

@schedule_bp.route("/api/schedules/<int:sid>", methods=["PUT"])
def edit_schedule(sid):
    d = request.json
    try:
        kwargs = {}
        if "title"      in d: kwargs["title"]      = d["title"].strip()
        if "start_date" in d: kwargs["start_date"]  = date.fromisoformat(d["start_date"])
        if "end_date"   in d: kwargs["end_date"]    = date.fromisoformat(d["end_date"])
        if "start_time" in d: kwargs["start_time"]  = time.fromisoformat(d["start_time"])
        if "end_time"   in d: kwargs["end_time"]    = time.fromisoformat(d["end_time"])
        if "importance"   in d: kwargs["importance"]   = int(d["importance"])
        if "memo"         in d: kwargs["memo"]         = d["memo"]
        if "is_deadline"  in d: kwargs["is_deadline"]  = bool(d["is_deadline"])
    except ValueError as e:
        return jsonify({"ok": False, "error": str(e)}), 400
    if "title" in kwargs and not kwargs["title"]:
        return jsonify({"ok": False, "error": "제목을 입력해주세요."}), 400
    if "importance" in kwargs and not (1 <= kwargs["importance"] <= 5):
        return jsonify({"ok": False, "error": "중요도는 1~5 사이여야 합니다."}), 400
    result = get_manager().edit(sid, **kwargs)
    return jsonify(result), 200 if result["ok"] else 409

@schedule_bp.route("/api/schedules/<int:sid>", methods=["DELETE"])
def delete_schedule(sid):
    result = get_manager().delete(sid)
    return jsonify(result), 200 if result["ok"] else 404

@schedule_bp.route("/api/schedules/<int:sid>/status", methods=["PATCH"])
def change_status(sid):
    d = request.json
    try:
        new_status = {s.value: s for s in Status}[d["status"]]
    except KeyError:
        return jsonify({"ok": False, "error": "잘못된 상태값"}), 400
    result = get_manager().change_status(sid, new_status)
    return jsonify(result), 200 if result["ok"] else 404

@schedule_bp.route("/api/schedules/<int:sid>/uncomplete", methods=["PATCH"])
def uncomplete_schedule(sid):
    result = get_manager().uncomplete(sid)
    return jsonify(result), 200 if result["ok"] else 404

@schedule_bp.route("/api/stats", methods=["GET"])
def get_stats():
    from datetime import date as dt
    today = dt.today()
    year  = int(request.args.get("year",  today.year))
    month = int(request.args.get("month", today.month))
    return jsonify(get_manager().get_stats(year, month))

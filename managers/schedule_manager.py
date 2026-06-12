from datetime import date, datetime
from models.status import Status
from algorithms.merge_sort import sort_by_date, sort_by_importance, sort_by_combined
from algorithms.binary_search import search_by_date, search_by_date_range, search_by_keyword


class ScheduleManager:
    def __init__(self):
        self._schedules = []
        self._completed = []

    # ── DB 연동 ──────────────────────────────────────────────

    def load_from_db(self):
        """앱 시작 시 DB의 모든 일정을 메모리로 로드."""
        from database import ScheduleRow, row_to_schedule
        import models.schedule as sched_mod

        rows = db_query_all()
        if not rows:
            return

        max_id = 0
        for row in rows:
            s = row_to_schedule(row)
            if s.status in (Status.COMPLETED, Status.CANCELLED):
                self._completed.append(s)
            else:
                self._schedules.append(s)
            max_id = max(max_id, s.id)

        sched_mod._reset_counter(max_id + 1)

    def _db_insert(self, schedule):
        from database import db, schedule_to_row
        db.session.add(schedule_to_row(schedule))
        db.session.commit()

    def _db_update(self, schedule):
        from database import db, ScheduleRow
        row = db.session.get(ScheduleRow, schedule.id)
        if not row:
            return
        row.title        = schedule.title
        row.start_date   = schedule.start_date.isoformat()
        row.end_date     = schedule.end_date.isoformat()
        row.start_time   = schedule.start_time.strftime('%H:%M')
        row.end_time     = schedule.end_time.strftime('%H:%M')
        row.importance   = schedule.importance
        row.memo         = schedule.memo
        row.is_deadline  = schedule.is_deadline
        row.status       = schedule.status.value
        row.completed_at = schedule.completed_at.isoformat() if schedule.completed_at else None
        db.session.commit()

    def _db_delete(self, schedule_id):
        from database import db, ScheduleRow
        row = db.session.get(ScheduleRow, schedule_id)
        if row:
            db.session.delete(row)
            db.session.commit()

    # ── 내부 탐색 ─────────────────────────────────────────────

    def _find(self, schedule_id):
        for s in self._schedules:
            if s.id == schedule_id:
                return s
        return None

    def _all_active_sorted(self):
        return sort_by_date(self._schedules)

    # ── CRUD ─────────────────────────────────────────────────

    def add(self, schedule):
        self._schedules.append(schedule)
        self._db_insert(schedule)
        return {"ok": True, "schedule": schedule.to_dict()}

    def edit(self, schedule_id, **kwargs):
        s = self._find(schedule_id)
        if not s:
            return {"ok": False, "error": "일정을 찾을 수 없습니다."}
        for k, v in kwargs.items():
            setattr(s, k, v)
        self._db_update(s)
        return {"ok": True, "schedule": s.to_dict()}

    def delete(self, schedule_id):
        s = self._find(schedule_id)
        if s:
            self._schedules.remove(s)
            self._db_delete(schedule_id)
            return {"ok": True}
        for item in self._completed:
            if item.id == schedule_id:
                self._completed.remove(item)
                self._db_delete(schedule_id)
                return {"ok": True}
        return {"ok": False, "error": "일정을 찾을 수 없습니다."}

    def change_status(self, schedule_id, new_status: Status):
        s = self._find(schedule_id)
        if not s:
            return {"ok": False, "error": "일정을 찾을 수 없습니다."}
        s.status = new_status
        if new_status in (Status.COMPLETED, Status.CANCELLED):
            if new_status == Status.COMPLETED:
                s.completed_at = datetime.now()
            self._schedules.remove(s)
            self._completed.append(s)
        self._db_update(s)
        return {"ok": True, "schedule": s.to_dict()}

    def uncomplete(self, schedule_id):
        s = None
        for item in self._completed:
            if item.id == schedule_id:
                s = item
                break
        if not s:
            return {"ok": False, "error": "일정을 찾을 수 없습니다."}
        s.status = Status.PENDING
        s.completed_at = None
        self._completed.remove(s)
        self._schedules.append(s)
        self._db_update(s)
        return {"ok": True, "schedule": s.to_dict()}

    # ── 조회 ─────────────────────────────────────────────────

    def get_all(self, sort="date"):
        sorters = {"date": sort_by_date, "importance": sort_by_importance, "combined": sort_by_combined}
        return [s.to_dict() for s in sorters.get(sort, sort_by_date)(self._schedules)]

    def get_today(self):
        today = date.today()
        result = search_by_date(self._schedules, today)
        return [s.to_dict() for s in sort_by_date(result)]

    def get_completed(self):
        return [s.to_dict() for s in sort_by_date(self._completed)]

    def get_summary(self):
        from datetime import timedelta
        today      = date.today()
        today_list = search_by_date(self._schedules, today)
        all_s      = self._schedules + self._completed
        week_start = today - timedelta(days=today.weekday())
        week_end   = week_start + timedelta(days=6)
        week_all   = [s for s in all_s if week_start <= s.start_date <= week_end]
        week_done  = [s for s in week_all if s.status == Status.COMPLETED]
        week_rate  = round(len(week_done) / len(week_all) * 100) if week_all else 0
        return {
            "today_count"      : len(today_list),
            "in_progress_count": len([s for s in today_list if s.status == Status.IN_PROGRESS]),
            "pending_count"    : len([s for s in self._schedules if s.status == Status.PENDING]),
            "total_count"      : len(all_s),
            "completed_count"  : len([s for s in all_s if s.status == Status.COMPLETED]),
            "week_rate"        : week_rate,
            "week_done"        : len(week_done),
            "week_total"       : len(week_all),
        }

    def search_date(self, target_date: date):
        return [s.to_dict() for s in search_by_date(self._schedules, target_date)]

    def search_range(self, start: date, end: date):
        return [s.to_dict() for s in search_by_date_range(self._schedules, start, end)]

    def search_keyword(self, keyword: str):
        all_s  = self._schedules + self._completed
        result = search_by_keyword(all_s, keyword)
        return [s.to_dict() for s in sort_by_date(result)]

    def get_top(self, n=5):
        from algorithms.priority_queue import get_top_n
        return [s.to_dict() for s in get_top_n(self._schedules, n)]

    def get_stats(self, year, month):
        from utils.statistics import get_monthly_stats, get_importance_distribution
        all_s = self._schedules + self._completed
        return {
            "monthly"   : get_monthly_stats(all_s, year, month),
            "importance": get_importance_distribution(all_s),
        }


def db_query_all():
    from database import ScheduleRow
    return ScheduleRow.query.all()

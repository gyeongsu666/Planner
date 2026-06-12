# 통계 (Statistics) — 동적 프로그래밍
# build_completion_table: 날짜별 카운트를 O(n)으로 한 번 계산.
# 이후 월별·주별 쿼리는 테이블 조회만으로 O(days) 처리 — O(n) 반복 탐색 불필요.

import calendar
from collections import defaultdict
from datetime import date
from models.status import Status

def build_completion_table(all_schedules):
    """날짜별 완료/취소/전체 수 딕셔너리 O(n) 구성."""
    table = defaultdict(lambda: {"total": 0, "completed": 0, "cancelled": 0})
    for s in all_schedules:
        d = s.date.isoformat()
        table[d]["total"] += 1
        if s.status == Status.COMPLETED:
            table[d]["completed"] += 1
        elif s.status == Status.CANCELLED:
            table[d]["cancelled"] += 1
    return table

def get_monthly_stats(all_schedules, year, month):
    """특정 연도/월의 통계 — 완료 테이블 O(days) 쿼리."""
    table = build_completion_table(all_schedules)
    result = {"total": 0, "completed": 0, "cancelled": 0, "pending": 0}
    days_in_month = calendar.monthrange(year, month)[1]
    for day in range(1, days_in_month + 1):
        d = date(year, month, day).isoformat()
        if d in table:
            result["total"]     += table[d]["total"]
            result["completed"] += table[d]["completed"]
            result["cancelled"] += table[d]["cancelled"]
    result["pending"] = result["total"] - result["completed"] - result["cancelled"]
    result["rate"] = round(result["completed"] / result["total"] * 100, 1) if result["total"] else 0
    return result

def get_importance_distribution(all_schedules):
    """중요도별 완료/미완료 분포"""
    dist = {i: {"total": 0, "completed": 0} for i in range(1, 6)}
    for s in all_schedules:
        dist[s.importance]["total"] += 1
        if s.status == Status.COMPLETED:
            dist[s.importance]["completed"] += 1
    return dist


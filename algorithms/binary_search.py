# 이진 탐색 (Binary Search) — 축소정복 O(log n)
# search_by_date / search_by_date_range: 내부에서 날짜순 정렬 후 이진 탐색으로 후보 범위를 축소,
# 이후 end_date 필터만 선형으로 수행 → 전체 O(n log n) 중 탐색 부분 O(log n)

from datetime import date
from algorithms.merge_sort import sort_by_date

def _upper_bound(schedules, target_date):
    """start_date > target_date 인 첫 번째 인덱스 (즉 start_date <= target_date 인 마지막+1)"""
    lo, hi = 0, len(schedules)
    while lo < hi:
        mid = (lo + hi) // 2
        if schedules[mid].start_date <= target_date:
            lo = mid + 1
        else:
            hi = mid
    return lo

def search_by_date(schedules, target_date: date):
    """특정 날짜를 포함하는 일정 반환 (기간 일정 포함).
    이진 탐색으로 start_date > target_date 인 일정을 사전에 배제한 뒤
    나머지에서 end_date >= target_date 조건만 확인."""
    sorted_s = sort_by_date(schedules)
    hi = _upper_bound(sorted_s, target_date)          # start_date <= target_date 범위만
    return [s for s in sorted_s[:hi] if s.end_date >= target_date]

def search_by_date_range(schedules, start_date: date, end_date: date):
    """날짜 범위와 겹치는 일정 반환.
    이진 탐색으로 start_date > end_date 인 일정을 배제한 뒤
    end_date >= start_date 조건 확인."""
    sorted_s = sort_by_date(schedules)
    hi = _upper_bound(sorted_s, end_date)             # start_date <= end_date 범위만
    return [s for s in sorted_s[:hi] if s.end_date >= start_date]

# --- 키워드 검색 — 선형 탐색 O(n) ---
# 검색 대상: title + memo (대소문자 무시)

def search_by_keyword(schedules, keyword: str):
    keyword = keyword.strip().lower()
    if not keyword:
        return []
    result = []
    for s in schedules:
        if keyword in s.title.lower() or keyword in (s.memo or "").lower():
            result.append(s)
    return result

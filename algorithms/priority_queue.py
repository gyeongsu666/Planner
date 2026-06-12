# 우선순위 큐 (Priority Queue) — heapq 기반 O(log n)
# 가중치 = 중요도 × 10 + (날짜 임박도 보정)
# 최대 힙: Python heapq는 최소 힙이므로 가중치를 음수로 저장

import heapq
from datetime import date

def _weight(schedule):
    days_left = (schedule.date - date.today()).days
    # 날짜가 가까울수록 가중치 높게 (최대 5점 보정, 지난 일정은 0)
    urgency = max(0, 5 - days_left) if days_left >= 0 else 0
    return schedule.importance * 10 + urgency

def build_heap(schedules):
    """PENDING / IN_PROGRESS 일정으로 힙 구성"""
    from models.status import Status
    active = [s for s in schedules if s.status in (Status.PENDING, Status.IN_PROGRESS)]
    heap = [(-_weight(s), s.id, s) for s in active]
    heapq.heapify(heap)
    return heap

def get_top_n(schedules, n=5):
    """중요도 + 긴급도 기준 상위 n개 반환"""
    heap = build_heap(schedules)
    result = []
    for _ in range(min(n, len(heap))):
        _, _, s = heapq.heappop(heap)
        result.append(s)
    return result

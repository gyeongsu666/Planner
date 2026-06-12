# 병합 정렬 (Merge Sort) — 분할정복 O(n log n)
# key 함수를 인자로 받아 범용 정렬 지원

def merge_sort(arr, key=lambda x: x, reverse=False):
    if len(arr) <= 1:
        return arr

    mid = len(arr) // 2
    left  = merge_sort(arr[:mid], key, reverse)
    right = merge_sort(arr[mid:], key, reverse)
    return _merge(left, right, key, reverse)

def _merge(left, right, key, reverse):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        lv, rv = key(left[i]), key(right[j])
        if (lv <= rv) if not reverse else (lv >= rv):
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

# --- 정렬 기준 모음 ---

def sort_by_date(schedules):
    """시작 날짜순 → 시작 시간순"""
    return merge_sort(schedules, key=lambda s: (s.start_date, s.start_time))

def sort_by_importance(schedules):
    """중요도 높은 순 → 시작 날짜순"""
    return merge_sort(schedules, key=lambda s: (-s.importance, s.start_date))

def sort_by_combined(schedules):
    """시작 날짜순 → 중요도 높은 순 → 시작 시간순"""
    return merge_sort(schedules, key=lambda s: (s.start_date, -s.importance, s.start_time))

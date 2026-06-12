from dataclasses import dataclass, field
from datetime import date, time, datetime
from models.status import Status
import itertools

_id_counter = itertools.count(1)

def _next_id():
    return next(_id_counter)

def _reset_counter(start: int):
    """DB 로드 후 기존 최대 ID 이후부터 카운터 재시작."""
    global _id_counter
    _id_counter = itertools.count(start)

@dataclass
class Schedule:
    title      : str
    start_date : date
    end_date   : date
    start_time : time
    end_time   : time
    importance : int          # 1 ~ 5
    memo        : str = ""
    is_deadline : bool = False
    status      : Status = Status.PENDING
    id         : int = field(default_factory=_next_id)
    created_at : datetime = field(default_factory=datetime.now)
    completed_at: datetime | None = None

    @property
    def date(self):
        return self.start_date

    def is_multi_day(self):
        return self.start_date != self.end_date

    def to_dict(self):
        return {
            "id"          : self.id,
            "title"       : self.title,
            "start_date"  : self.start_date.isoformat(),
            "end_date"    : self.end_date.isoformat(),
            "start_time"  : self.start_time.strftime("%H:%M"),
            "end_time"    : self.end_time.strftime("%H:%M"),
            "importance"  : self.importance,
            "memo"        : self.memo,
            "is_deadline" : self.is_deadline,
            "status"      : self.status.value,
            "multi_day"   : self.is_multi_day(),
            "created_at"  : self.created_at.strftime("%Y-%m-%d %H:%M"),
            "completed_at": self.completed_at.strftime("%Y-%m-%d %H:%M") if self.completed_at else None,
        }

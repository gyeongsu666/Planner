from flask_sqlalchemy import SQLAlchemy
from datetime import date, time, datetime
from models.status import Status

db = SQLAlchemy()


class ScheduleRow(db.Model):
    __tablename__ = 'schedule'

    id           = db.Column(db.Integer, primary_key=True, autoincrement=False)
    title        = db.Column(db.String(200), nullable=False)
    start_date   = db.Column(db.String(10),  nullable=False)
    end_date     = db.Column(db.String(10),  nullable=False)
    start_time   = db.Column(db.String(5),   nullable=False)
    end_time     = db.Column(db.String(5),   nullable=False)
    importance   = db.Column(db.Integer,     nullable=False)
    memo         = db.Column(db.Text,        default='')
    is_deadline  = db.Column(db.Boolean,     nullable=False, default=False, server_default='0')
    status       = db.Column(db.String(20),  nullable=False, default='대기')
    created_at   = db.Column(db.String(26),  nullable=False)
    completed_at = db.Column(db.String(26),  nullable=True)


def row_to_schedule(row):
    """DB 행 → Schedule 데이터클래스 변환."""
    from models.schedule import Schedule
    return Schedule(
        id           = row.id,
        title        = row.title,
        start_date   = date.fromisoformat(row.start_date),
        end_date     = date.fromisoformat(row.end_date),
        start_time   = time.fromisoformat(row.start_time),
        end_time     = time.fromisoformat(row.end_time),
        importance   = row.importance,
        memo         = row.memo or '',
        is_deadline  = bool(row.is_deadline),
        status       = Status(row.status),
        created_at   = datetime.fromisoformat(row.created_at),
        completed_at = datetime.fromisoformat(row.completed_at) if row.completed_at else None,
    )


def schedule_to_row(s):
    """Schedule 데이터클래스 → DB 행 변환."""
    return ScheduleRow(
        id           = s.id,
        title        = s.title,
        start_date   = s.start_date.isoformat(),
        end_date     = s.end_date.isoformat(),
        start_time   = s.start_time.strftime('%H:%M'),
        end_time     = s.end_time.strftime('%H:%M'),
        importance   = s.importance,
        memo         = s.memo,
        is_deadline  = s.is_deadline,
        status       = s.status.value,
        created_at   = s.created_at.isoformat(),
        completed_at = s.completed_at.isoformat() if s.completed_at else None,
    )

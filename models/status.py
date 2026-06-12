from enum import Enum

class Status(Enum):
    PENDING     = "대기"
    IN_PROGRESS = "진행중"
    COMPLETED   = "완료"
    CANCELLED   = "취소"

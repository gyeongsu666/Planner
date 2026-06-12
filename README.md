# 플래너 (Planner)

일정 관리 데스크톱 앱 — 알고리즘 과목 프로젝트 (223701 김경수)

Flask 웹 UI 기반의 일정 관리 프로그램입니다. 일정 CRUD·상태 관리·검색·통계 기능과
바탕화면에 오늘의 일정을 띄워주는 위젯(pywebview)을 제공합니다.

## 주요 기능

- 일정 추가 / 수정 / 삭제, 상태 관리 (대기 · 진행중 · 완료 · 취소)
- 기간 일정 및 마감(데드라인) 일정 지원
- 정렬: 날짜순 / 중요도순 / 복합(날짜→중요도→시간)
- 검색: 키워드 / 특정 날짜 / 기간
- 우선순위 Top N (중요도 + 마감 임박도)
- 월별 완료율 · 중요도별 분포 통계
- 데스크톱 위젯: 오늘의 일정 표시 (항상 위, 드래그 이동)

## 사용 알고리즘

| 알고리즘 | 위치 | 용도 | 복잡도 |
|---|---|---|---|
| 병합 정렬 (분할정복) | `algorithms/merge_sort.py` | 날짜·중요도·복합 정렬 | O(n log n) |
| 이진 탐색 (축소정복) | `algorithms/binary_search.py` | 날짜·기간 검색 후보 축소 | O(log n) |
| 우선순위 큐 (힙) | `algorithms/priority_queue.py` | 중요도×10+긴급도 가중치 Top N | O(log n) |
| 완료 테이블 (DP) | `utils/statistics.py` | 날짜별 집계 테이블 구성 후 월별 조회 | O(n) 구성 / O(days) 조회 |

## 프로젝트 구조

```
app.py                  # Flask 앱 진입점, DB 초기화, 위젯 실행 API
widget.py               # 데스크톱 위젯 (pywebview)
database.py             # SQLAlchemy 모델 및 변환 함수
models/                 # Schedule 데이터클래스, Status 열거형
managers/               # ScheduleManager — CRUD·조회 비즈니스 로직
algorithms/             # 병합 정렬, 이진 탐색, 우선순위 큐
utils/                  # 통계 (완료 테이블)
routes/                 # REST API 블루프린트
templates/, static/     # 웹 UI (HTML/CSS/JS)
```

## 실행 방법

```bash
pip install -r requirements.txt
python app.py     # 브라우저가 자동으로 열립니다 (http://127.0.0.1:5000)
```

위젯은 메인 화면의 위젯 버튼으로 실행하거나 `python widget.py`로 단독 실행할 수 있습니다.

## 배포 빌드

1. `build.bat` 실행 — PyInstaller로 `dist/planner`, `dist/widget` 생성 (Python 3.13 필요)
2. Inno Setup에서 `installer.iss` 컴파일 — `installer_output/플래너_설치.exe` 생성
   (WebView2 런타임 미설치 시 자동 설치 포함)

# DB設計図（現行スキーマ全体）

対象: compass-lms / DB: PostgreSQL (Neon) / 最終更新: 2026-07-19（マルチテナント化後）
※これは `prisma/schema.prisma` の現状を人間向けに図解したもの。正は常にschema.prisma。

## テナント分離の原則

すべての業務データは **Tenant → StudentProfile** の系統でテナントに属する。
アクセス制御は必ず認可ヘルパー（`assertMentor` / `assertStudentAccess` / `assertActiveTenant` / `assertOperator`）を通す。
`QuestionBank` だけは `tenantId = null` で「全テナント共通問題」を表現できる例外。

```mermaid
flowchart TB
    T["Tenant<br/>status: PENDING/ACTIVE/SUSPENDED"]
    T --> U["User<br/>role: STUDENT/MENTOR<br/>isOperator"]
    T --> SP["StudentProfile"]
    U -. "1:1 生徒ログイン" .- SP
    SP --> BIZ["生徒に紐づく全データ<br/>(志望校/タスク/書類/演習/共有トークン…)"]
    OP["運営者 (isOperator)"] -. "/admin 横断・読み取り" .-> T
    QB["QuestionBank<br/>tenantId=null は共通問題"] -. 参照 .-> PR["PracticeRecord"]
```

## 全体ER図

```mermaid
erDiagram
    Tenant ||--o{ User : ""
    Tenant ||--o{ StudentProfile : ""
    Tenant ||--o{ TaskTemplate : ""
    Tenant ||--o{ ActivityLog : ""
    User ||--o| StudentProfile : "生徒ログイン(1:1)"

    StudentProfile ||--o{ University : ""
    StudentProfile ||--o{ Task : ""
    StudentProfile ||--o{ Milestone : ""
    StudentProfile ||--o{ Document : ""
    StudentProfile ||--o{ PracticeRecord : ""
    StudentProfile ||--o{ StepAnswer : ""
    StudentProfile ||--o{ ActivityLog : ""
    StudentProfile ||--o{ SharedAccessToken : ""

    University ||--o{ Task : ""
    University ||--o{ Milestone : ""
    Task ||--o{ TaskComment : ""
    Task }o--o| QuestionBank : "課題割当"
    TaskTemplate ||--o{ TemplateItem : ""

    QuestionBank ||--o{ PracticeRecord : "解いた問題"
    PracticeRecord ||--o{ PracticeRecord : "面接の深掘り(親子)"

    Course ||--o{ Lesson : ""
    Lesson ||--o{ LessonStep : ""
    LessonStep ||--o{ StepAnswer : ""
    StepAnswer ||--o{ AIFeedback : ""

    Tenant {
        string id PK
        string name
        string status "PENDING/ACTIVE/SUSPENDED"
        datetime approvedAt
        string approvedByUserId
    }
    User {
        string id PK
        string clerkId UK
        string tenantId FK
        string role "STUDENT/MENTOR"
        boolean isOperator
        string name
        string email UK
    }
    StudentProfile {
        string id PK
        string tenantId FK
        string userId FK "生徒ログイン(nullable)"
        string name
        string phase
        string status "ACTIVE/ARCHIVED"
        string highSchool
        string grade
        string phone
        string parentEmail
        string studentEmail UK
        string driveFolderUrl
    }
    University {
        string id PK
        string studentProfileId FK
        string name
        string department
        string method
    }
    Task {
        string id PK
        string studentProfileId FK
        string universityId FK
        string questionBankId FK "演習課題(nullable)"
        string title
        datetime dueDate
        boolean completed
        string type "DOCUMENT/TODO"
        int progress
        boolean isSelfCreated
    }
    TaskComment {
        string id PK
        string taskId FK
        string content
        string authorId
        string authorRole "STUDENT/MENTOR"
    }
    Milestone {
        string id PK
        string studentProfileId FK
        string universityId FK
        string title
        datetime date
        string status "TODO/DONE"
        string type
    }
    Document {
        string id PK
        string studentProfileId FK
        string title
        string type
        string url
        text content
        datetime dueDate
        boolean isInternal
        boolean isArchived
        string status "DRAFT/SUBMITTED/REVIEWING/DONE"
    }
    PracticeRecord {
        string id PK
        string studentProfileId FK
        string questionBankId FK "nullable"
        string parentRecordId FK "深掘り親(nullable)"
        string type
        text prompt
        text answer
        int score
        text feedback "構造化JSON(スナップショット)"
        boolean isArchived
    }
    QuestionBank {
        string id PK
        string tenantId FK "null=全テナント共通"
        string category
        string title
        text prompt
        string source "MANUAL/AI_GENERATED/NOTEBOOKLM/CUSTOM"
        string status "ACTIVE/PENDING/ARCHIVED"
        string fieldCategory "系統ラベル"
        string university
        text followUpQuestions "面接の深掘り"
        string difficulty
        text modelAnswer
        string createdByUserId
    }
    SharedAccessToken {
        string id PK
        string token UK "推測不能ランダム"
        string studentProfileId FK
        string createdByUserId
        datetime expiresAt
        datetime revokedAt
    }
    TaskTemplate {
        string id PK
        string tenantId FK
        string name
    }
    TemplateItem {
        string id PK
        string templateId FK
        string title
        string type
        int daysOffset
    }
    ActivityLog {
        string id PK
        string tenantId FK
        string studentProfileId FK "nullable"
        string action "…/OPERATOR(監査)"
        string details
    }
    Course {
        string id PK
        string title
        int order
    }
    Lesson {
        string id PK
        string courseId FK
        text content
        int order
    }
    LessonStep {
        string id PK
        string lessonId FK
        text prompt
        text goodExample
        text badExample
        int order
    }
    StepAnswer {
        string id PK
        string stepId FK
        string studentProfileId FK
        text content
    }
    AIFeedback {
        string id PK
        string stepAnswerId FK
        text content
        int score
    }
```

## モデル分類（役割別）

| グループ | モデル | 役割 |
|---|---|---|
| **テナンシー** | Tenant, User, StudentProfile | 塾・ログインアカウント・生徒。すべての分離の起点 |
| **指導管理** | University, Task, TaskComment, Milestone, Document | 志望校・タスク・面談コメント・日程・書類 |
| **テンプレート** | TaskTemplate, TemplateItem | タスクの雛形（塾ごと） |
| **演習・採点** | QuestionBank, PracticeRecord | 問題バンク（共通/塾別）と添削記録。Taskへ課題割当も |
| **共有** | SharedAccessToken | 保護者向け閲覧専用リンク |
| **監査** | ActivityLog | 操作履歴。運営者の横断アクセスも`action=OPERATOR`で記録 |
| **教材LMS** | Course, Lesson, LessonStep, StepAnswer, AIFeedback | ステップ式教材（テナント非依存の共通教材） |

## 設計上の注意（意図的な例外）

1. **`QuestionBank.tenantId = null`** … 運営提供の共通問題。全テナントから参照可（読み取りのみ）。
2. **`PracticeRecord.feedback` に構造化JSONを保存** … 採点基準を後から変えても過去の添削を当時のまま再現するためのスナップショット。検索・集計は独立カラム（score/type/questionBankId）で行う。
3. **`PracticeRecord.parentRecordId`** … 面接の深掘りチェーン（自己参照）。挑戦回数・問題バンク紐付けの集計からは除外。
4. **Course/Lesson系はテナント非依存** … 現状は全塾共通の教材。塾別に分けたくなったらtenantId追加（追加のみ）で対応可能。
5. **論理削除**（`isArchived` / `status=ARCHIVED`）を採用し、指導履歴・演習記録は物理削除しない。
6. **ID命名** … 業務データは接頭辞付き（`student-`/`task-`/`prac-`/`doc-`/`log-`/`univ-`等）で人が追える。QuestionBank/一部は`cuid()`。

## 今後テナント別に分けうる候補（現状は共通）

- Course/Lesson/LessonStep（塾ごとに独自教材を持たせる場合）
- 将来のAI利用計測テーブル（テナント別カウンタ・課金の土台。multi-tenant-plan.md P4）

# DocRender API Reference

Краткий справочник по типам, интерфейсам и функциям.

---

## Types (`src/shared/types.ts`)

```typescript
// Документ в IndexedDB
interface StoredDocument {
  id: string
  filename: string
  originalUrl: string
  data: ArrayBuffer
  mimeType: string
  size: number
  createdAt: number
  lastAccessedAt: number
}

// Метаданные документа (без бинарных данных)
interface DocumentMeta {
  id: string
  filename: string
  originalUrl: string
  mimeType: string
  size: number
  createdAt: number
}

// Результат парсинга
interface ParsedDocument {
  html: string
  warnings: string[]
}

// Состояние документа в viewer
type DocumentState =
  | { status: 'loading' }
  | { status: 'parsing' }
  | { status: 'success'; document: ParsedDocument; meta: DocumentMeta }
  | { status: 'error'; message: string }
```

---

## Constants (`src/shared/constants.ts`)

```typescript
const SUPPORTED_EXTENSIONS = ['.docx']
const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
const DB_NAME = 'DocRenderDB'
const DB_VERSION = 1
const STORE_NAME = 'documents'
const MAX_DOCUMENT_AGE_MS = 24 * 60 * 60 * 1000  // 24 часа
```

---

## Storage API (`src/background/storage.ts`)

```typescript
// Сохранить документ
saveDocument(document: StoredDocument): Promise<void>

// Получить документ по ID
getDocument(id: string): Promise<StoredDocument | undefined>

// Удалить документ
deleteDocument(id: string): Promise<void>

// Получить все документы
getAllDocuments(): Promise<StoredDocument[]>

// Удалить документы старше MAX_DOCUMENT_AGE_MS
cleanupOldDocuments(): Promise<number>
```

---

## Mammoth API (`src/lib/mammoth.ts`)

```typescript
// Конвертировать .docx в HTML
convertDocxToHtml(arrayBuffer: ArrayBuffer): Promise<ParsedDocument>

// Извлечь текст без форматирования
extractRawText(arrayBuffer: ArrayBuffer): Promise<string>
```

---

## Utils (`src/lib/utils.ts`)

```typescript
// Объединение классов (clsx + tailwind-merge)
cn(...inputs: ClassValue[]): string

// Форматирование размера файла
formatFileSize(bytes: number): string
// Примеры: "0 B", "1.5 KB", "2.3 MB"

// Форматирование даты
formatDate(timestamp: number): string
// Пример: "27 янв. 2026 г., 16:30"
```

---

## React Hooks

### `useDocument` (`src/viewer/hooks/useDocument.ts`)

```typescript
function useDocument(documentId: string | null): {
  state: DocumentState
  retry: () => void
}
```

**Использование:**
```tsx
const { state, retry } = useDocument(documentId)

if (state.status === 'loading') return <LoadingState />
if (state.status === 'error') return <ErrorState message={state.message} onRetry={retry} />
if (state.status === 'success') return <DocumentViewer document={state.document} />
```

---

## Chrome Message API

### Отправка сообщений

```typescript
// Из popup/viewer в background
chrome.runtime.sendMessage(
  { type: 'MESSAGE_TYPE', ...payload },
  (response) => { /* handle response */ }
)

// Асинхронная версия
const response = await new Promise((resolve) => {
  chrome.runtime.sendMessage(message, resolve)
})
```

### Message Types

| Type | Direction | Описание |
|------|-----------|----------|
| `GET_DOCUMENT` | popup/viewer → background | Получить документ по ID |
| `GET_ALL_DOCUMENTS` | popup → background | Список всех документов |
| `SAVE_LOCAL_DOCUMENT` | popup → background | Сохранить файл с ПК |
| `DELETE_DOCUMENT` | popup → background | Удалить документ |
| `CLEANUP_OLD` | any → background | Запустить очистку |

---

## CSS Classes

### Glassmorphism

```css
.glass-panel        /* Полупрозрачная панель с blur */
.glass-panel-solid  /* Менее прозрачная панель */
.glass-dark         /* Тёмная версия */
```

### Document Content

```css
.document-content      /* Контейнер для HTML из mammoth */
.document-content h1   /* Заголовки */
.document-content h2
.document-content h3
.document-content p    /* Параграфы */
.document-content ul   /* Списки */
.document-content ol
.document-content table /* Таблицы */
.document-content blockquote /* Цитаты */
```

---

## File Extensions

| Расширение | MIME Type | Статус |
|------------|-----------|--------|
| `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | Поддерживается |
| `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Планируется |
| `.pdf` | `application/pdf` | Планируется |

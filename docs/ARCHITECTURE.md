# DocRender - Техническая документация

## Оглавление

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Структура проекта](#структура-проекта)
3. [Компоненты системы](#компоненты-системы)
4. [Поток данных](#поток-данных)
5. [API и сообщения](#api-и-сообщения)
6. [Хранилище данных](#хранилище-данных)
7. [Парсинг документов](#парсинг-документов)
8. [UI компоненты](#ui-компоненты)
9. [Сборка и развёртывание](#сборка-и-развёртывание)
10. [Расширение функционала](#расширение-функционала)

---

## Обзор архитектуры

DocRender — Chrome расширение для просмотра `.docx` документов в браузере. Построено на **Manifest V3** с использованием **React**, **TypeScript** и **Vite**.

### Ключевые принципы

- **Отсутствие серверной части** — всё работает локально в браузере
- **IndexedDB как хранилище** — документы хранятся в браузере между сессиями
- **Message passing** — коммуникация между компонентами через `chrome.runtime.sendMessage`
- **ArrayBuffer для бинарных данных** — файлы передаются как массивы байт

### Архитектурная диаграмма

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Chrome Browser                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    chrome.runtime     ┌──────────────────────┐   │
│  │    Popup     │◄──────────────────────►│  Background Service  │   │
│  │   (React)    │      .sendMessage      │      Worker          │   │
│  └──────┬───────┘                        └──────────┬───────────┘   │
│         │                                           │               │
│         │ File input                                │               │
│         │ Drag & Drop                               │               │
│         ▼                                           ▼               │
│  ┌──────────────┐                        ┌──────────────────────┐   │
│  │  FileReader  │                        │     IndexedDB        │   │
│  │  ArrayBuffer │───────────────────────►│   (documents DB)     │   │
│  └──────────────┘                        └──────────┬───────────┘   │
│                                                     │               │
│                                                     │               │
│  ┌──────────────────────────────────────────────────┼───────────┐   │
│  │                    Viewer Page                   │           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────▼────────┐  │   │
│  │  │   Header    │  │  useDocument│  │   mammoth.js        │  │   │
│  │  │  (React)    │  │    hook     │◄─┤   .docx → HTML      │  │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │   │
│  │                          │                                   │   │
│  │                          ▼                                   │   │
│  │                 ┌─────────────────┐                         │   │
│  │                 │ DocumentViewer  │                         │   │
│  │                 │   (rendered     │                         │   │
│  │                 │    HTML)        │                         │   │
│  │                 └─────────────────┘                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Структура проекта

```
DocRender/
├── dist/                      # Собранное расширение (gitignore)
├── docs/                      # Документация
│   └── ARCHITECTURE.md        # Этот файл
├── public/
│   └── icons/                 # Иконки расширения
├── src/
│   ├── background/            # Service Worker
│   │   ├── index.ts           # Entry point, message handlers
│   │   ├── downloadInterceptor.ts  # Перехват загрузок
│   │   └── storage.ts         # IndexedDB операции
│   ├── viewer/                # Страница просмотра документа
│   │   ├── index.html         # HTML entry
│   │   ├── main.tsx           # React entry
│   │   ├── App.tsx            # Root компонент
│   │   ├── components/
│   │   │   ├── layout/        # Header, GlassContainer
│   │   │   └── viewer/        # DocumentViewer, LoadingState, ErrorState
│   │   └── hooks/
│   │       └── useDocument.ts # Хук загрузки документа
│   ├── popup/                 # Popup расширения
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── Popup.tsx          # Drag & drop UI
│   ├── lib/
│   │   ├── mammoth.ts         # Обёртка над mammoth.js
│   │   └── utils.ts           # Утилиты (cn, formatFileSize, formatDate)
│   ├── shared/
│   │   ├── constants.ts       # Константы (MIME types, DB config)
│   │   └── types.ts           # TypeScript типы
│   └── index.css              # Глобальные стили + Tailwind
├── manifest.json              # Chrome Extension manifest
├── vite.config.ts             # Vite + CRXJS конфигурация
├── tailwind.config.js         # Tailwind конфигурация
├── tsconfig.json              # TypeScript конфигурация
└── package.json
```

---

## Компоненты системы

### 1. Background Service Worker (`src/background/`)

**Роль:** Центральный координатор, работает в фоне.

**Ответственности:**
- Перехват загрузок `.docx` файлов
- Хранение документов в IndexedDB
- Обработка сообщений от popup и viewer
- Периодическая очистка старых документов

**Файлы:**

| Файл | Описание |
|------|----------|
| `index.ts` | Entry point, регистрация message handlers, alarms |
| `downloadInterceptor.ts` | Логика перехвата `chrome.downloads.onCreated` |
| `storage.ts` | CRUD операции для IndexedDB |

**Жизненный цикл:**
```
Extension installed
       │
       ▼
Service Worker starts
       │
       ├─► initDownloadInterceptor()
       │
       ├─► Register message listeners
       │
       └─► Create cleanup alarm (6 hours)
```

### 2. Popup (`src/popup/`)

**Роль:** Точка входа для пользователя, UI для загрузки файлов.

**Ответственности:**
- Drag & drop зона для файлов
- File picker через `<input type="file">`
- Отображение списка последних документов
- Открытие/удаление документов

**Состояния:**
```typescript
const [documents, setDocuments] = useState([])  // Список документов
const [loading, setLoading] = useState(true)    // Загрузка списка
const [isDragging, setIsDragging] = useState(false)  // Drag over
const [isProcessing, setIsProcessing] = useState(false)  // Обработка файла
const [error, setError] = useState(null)        // Ошибка
```

### 3. Viewer Page (`src/viewer/`)

**Роль:** Отображение содержимого документа.

**Ответственности:**
- Загрузка документа из IndexedDB по `documentId`
- Парсинг `.docx` через mammoth.js
- Рендеринг HTML с применением стилей
- Отображение состояний loading/error

**URL формат:**
```
chrome-extension://<extension-id>/src/viewer/index.html?documentId=<uuid>
```

---

## Поток данных

### Сценарий 1: Загрузка файла через Popup

```
1. Пользователь перетаскивает .docx файл в popup
                    │
                    ▼
2. handleDrop() / handleFileSelect()
   - Валидация расширения файла
                    │
                    ▼
3. file.arrayBuffer()
   - FileReader читает файл в ArrayBuffer
                    │
                    ▼
4. Array.from(new Uint8Array(arrayBuffer))
   - Конвертация для передачи через message
                    │
                    ▼
5. chrome.runtime.sendMessage({ type: 'SAVE_LOCAL_DOCUMENT', ... })
   - Отправка в background
                    │
                    ▼
6. Background: saveDocument()
   - Генерация UUID
   - Сохранение в IndexedDB
                    │
                    ▼
7. sendResponse({ success: true, documentId })
   - Возврат ID документа
                    │
                    ▼
8. chrome.tabs.create({ url: viewer?documentId=... })
   - Открытие viewer в новой вкладке
```

### Сценарий 2: Перехват загрузки из интернета

```
1. Пользователь кликает на .docx ссылку
                    │
                    ▼
2. chrome.downloads.onCreated срабатывает
                    │
                    ▼
3. isSupportedDownload() проверяет MIME/расширение
                    │
                    ▼
4. chrome.downloads.cancel() отменяет загрузку
                    │
                    ▼
5. fetch(url) скачивает файл
                    │
                    ▼
6. saveDocument() сохраняет в IndexedDB
                    │
                    ▼
7. chrome.tabs.create() открывает viewer
```

### Сценарий 3: Просмотр документа в Viewer

```
1. Viewer page загружается
                    │
                    ▼
2. useDocument(documentId) hook запускается
                    │
                    ▼
3. chrome.runtime.sendMessage({ type: 'GET_DOCUMENT', documentId })
                    │
                    ▼
4. Background: getDocument() из IndexedDB
   - Обновляет lastAccessedAt
                    │
                    ▼
5. sendResponse({ document: { ...meta, data: number[] } })
   - data передаётся как массив чисел
                    │
                    ▼
6. new Uint8Array(data).buffer
   - Восстановление ArrayBuffer
                    │
                    ▼
7. mammoth.convertToHtml({ arrayBuffer })
   - Парсинг .docx в HTML
                    │
                    ▼
8. <DocumentViewer document={parsed} />
   - Рендеринг HTML
```

---

## API и сообщения

### Message Types

Все сообщения передаются через `chrome.runtime.sendMessage()`.

#### `GET_DOCUMENT`

Получение документа по ID.

```typescript
// Request
{
  type: 'GET_DOCUMENT',
  documentId: string
}

// Response (success)
{
  success: true,
  document: {
    id: string,
    filename: string,
    originalUrl: string,
    data: number[],      // ArrayBuffer как массив
    mimeType: string,
    size: number,
    createdAt: number,
    lastAccessedAt: number
  }
}

// Response (error)
{
  success: false,
  error: string
}
```

#### `GET_ALL_DOCUMENTS`

Получение списка всех документов (без бинарных данных).

```typescript
// Request
{ type: 'GET_ALL_DOCUMENTS' }

// Response
{
  success: true,
  documents: Array<{
    id: string,
    filename: string,
    originalUrl: string,
    mimeType: string,
    size: number,
    createdAt: number,
    lastAccessedAt: number
  }>
}
```

#### `SAVE_LOCAL_DOCUMENT`

Сохранение файла, загруженного через popup.

```typescript
// Request
{
  type: 'SAVE_LOCAL_DOCUMENT',
  filename: string,
  data: number[],        // ArrayBuffer как массив
  mimeType: string,
  size: number
}

// Response
{
  success: true,
  documentId: string
}
```

#### `DELETE_DOCUMENT`

Удаление документа.

```typescript
// Request
{
  type: 'DELETE_DOCUMENT',
  documentId: string
}

// Response
{ success: true }
```

#### `CLEANUP_OLD`

Ручной запуск очистки старых документов.

```typescript
// Request
{ type: 'CLEANUP_OLD' }

// Response
{
  success: true,
  deletedCount: number
}
```

---

## Хранилище данных

### IndexedDB Schema

**Database:** `DocRenderDB`
**Version:** `1`
**Object Store:** `documents`

```typescript
interface StoredDocument {
  id: string              // Primary key, UUID v4
  filename: string        // Имя файла
  originalUrl: string     // URL источника или "local://filename"
  data: ArrayBuffer       // Бинарные данные файла
  mimeType: string        // MIME type
  size: number            // Размер в байтах
  createdAt: number       // Timestamp создания
  lastAccessedAt: number  // Timestamp последнего доступа
}

// Indexes
'by-date': createdAt      // Для cleanup запросов
```

### Операции хранилища (`storage.ts`)

```typescript
// Сохранение документа
saveDocument(document: StoredDocument): Promise<void>

// Получение документа (обновляет lastAccessedAt)
getDocument(id: string): Promise<StoredDocument | undefined>

// Удаление документа
deleteDocument(id: string): Promise<void>

// Получение всех документов
getAllDocuments(): Promise<StoredDocument[]>

// Очистка документов старше MAX_DOCUMENT_AGE_MS (24 часа)
cleanupOldDocuments(): Promise<number>
```

### Автоматическая очистка

- **Периодичность:** каждые 6 часов (`chrome.alarms`)
- **Критерий:** документы старше 24 часов по `createdAt`
- **Запуск:** также при старте Service Worker

---

## Парсинг документов

### mammoth.js конфигурация (`lib/mammoth.ts`)

```typescript
const styleMap = [
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Quote'] => blockquote:fresh",
  "b => strong",
  "i => em",
  "u => u",
  "strike => s"
]
```

### Обработка изображений

Изображения конвертируются в base64 data URLs:

```typescript
convertImage: mammoth.images.imgElement((image) => {
  return image.read('base64').then((imageBuffer) => ({
    src: `data:${image.contentType};base64,${imageBuffer}`
  }))
})
```

### Результат парсинга

```typescript
interface ParsedDocument {
  html: string      // HTML строка для рендеринга
  warnings: string[] // Предупреждения от mammoth.js
}
```

---

## UI компоненты

### Glassmorphism стили

Определены в `index.css`:

```css
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.glass-panel-solid {
  background: rgba(255, 255, 255, 0.85);
  /* ... */
}
```

### Компонентная иерархия Viewer

```
App
├── Header (meta?)
│   ├── Logo + filename
│   └── Actions (Download, Original, Close)
└── GlassContainer
    ├── LoadingState (status === 'loading' | 'parsing')
    ├── ErrorState (status === 'error')
    └── DocumentViewer (status === 'success')
        └── .document-content (dangerouslySetInnerHTML)
```

### Компонентная иерархия Popup

```
Popup
├── Header (logo + title)
├── DropZone
│   ├── <input type="file" hidden>
│   └── Upload icon + text
├── ErrorMessage (AnimatePresence)
└── RecentDocuments
    └── DocumentItem[] (map)
        ├── Icon
        ├── Filename + size
        └── Actions (Open, Delete)
```

---

## Сборка и развёртывание

### Команды

```bash
# Разработка с HMR
npm run dev

# Production сборка
npm run build

# Предпросмотр сборки
npm run preview
```

### Vite + CRXJS

`vite.config.ts`:

```typescript
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  }
})
```

### Manifest V3 permissions

```json
{
  "permissions": [
    "downloads",        // Перехват загрузок
    "storage",          // chrome.storage API
    "unlimitedStorage", // Большие файлы в IndexedDB
    "alarms"            // Периодическая очистка
  ]
}
```

### Установка в Chrome

1. `npm run build`
2. Открыть `chrome://extensions`
3. Включить "Developer mode"
4. "Load unpacked" → выбрать папку `dist/`

---

## Расширение функционала

### Добавление нового формата

1. **Добавить константы** в `shared/constants.ts`:
```typescript
export const SUPPORTED_EXTENSIONS = ['.docx', '.xlsx'] as const
export const SUPPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
] as const
```

2. **Создать парсер** в `lib/`:
```typescript
// lib/xlsx.ts
import * as XLSX from 'xlsx'

export async function convertXlsxToHtml(arrayBuffer: ArrayBuffer) {
  const workbook = XLSX.read(arrayBuffer)
  // ... конвертация в HTML таблицы
}
```

3. **Обновить useDocument hook** для выбора парсера по mimeType

4. **Обновить стили** в `index.css` для нового контента

### Добавление настроек

1. Создать `src/options/` страницу
2. Добавить в `manifest.json`:
```json
{
  "options_page": "src/options/index.html"
}
```
3. Использовать `chrome.storage.sync` для хранения настроек

### Интернационализация

1. Создать `_locales/` директорию
2. Добавить `default_locale` в manifest
3. Использовать `chrome.i18n.getMessage()`

---

## Известные ограничения

1. **Service Worker lifetime** — SW может быть остановлен браузером, поэтому все данные в IndexedDB, а не в памяти

2. **Message size limit** — Chrome имеет лимит на размер сообщений (~64MB), очень большие файлы могут вызвать проблемы

3. **CORS при перехвате** — некоторые сайты могут блокировать fetch с других origins

4. **Сложное форматирование** — mammoth.js упрощает стили Word, некоторые элементы могут отображаться не идеально

---

## Отладка

### Консоль Service Worker
```
chrome://extensions → DocRender → "service worker" link
```

### Консоль Popup
```
Right-click on popup → Inspect
```

### Консоль Viewer
```
Standard DevTools (F12) on viewer tab
```

### Полезные логи
```javascript
// Background
console.log('[DocRender] ...')

// Все сообщения логируются с префиксом [DocRender]
```

import { openDB, type DBSchema, type IDBPDatabase, type IDBPObjectStore } from 'idb'
import { DB_NAME, DB_VERSION, STORE_NAME, MAX_DOCUMENT_AGE_MS } from '@/shared/constants'
import type { StoredDocument } from '@/shared/types'

interface DocRenderDB extends DBSchema {
  [STORE_NAME]: {
    key: string
    value: StoredDocument
    indexes: { 'by-date': number; 'by-accessed': number }
  }
}

let dbPromise: Promise<IDBPDatabase<DocRenderDB>> | null = null

function getDB(): Promise<IDBPDatabase<DocRenderDB>> {
  if (!dbPromise) {
    dbPromise = openDB<DocRenderDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        const store = (db.objectStoreNames.contains(STORE_NAME)
          ? transaction.objectStore(STORE_NAME)
          : db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        ) as IDBPObjectStore<DocRenderDB, [typeof STORE_NAME], typeof STORE_NAME, 'versionchange'>

        if (!store.indexNames.contains('by-date')) {
          store.createIndex('by-date', 'createdAt')
        }

        if (!store.indexNames.contains('by-accessed')) {
          store.createIndex('by-accessed', 'lastAccessedAt')
        }
      }
    })
  }
  return dbPromise
}

export async function saveDocument(document: StoredDocument): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, document)
}

export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  const db = await getDB()
  const doc = await db.get(STORE_NAME, id)

  if (doc) {
    // Update last accessed time
    await db.put(STORE_NAME, {
      ...doc,
      lastAccessedAt: Date.now()
    })
  }

  return doc
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const db = await getDB()
  return db.getAll(STORE_NAME)
}

export async function cleanupOldDocuments(): Promise<number> {
  const db = await getDB()
  const now = Date.now()
  const cutoff = now - MAX_DOCUMENT_AGE_MS

  const tx = db.transaction(STORE_NAME, 'readwrite')
  const index = tx.store.index('by-accessed')

  let deletedCount = 0
  let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff))

  while (cursor) {
    await cursor.delete()
    deletedCount++
    cursor = await cursor.continue()
  }

  await tx.done
  return deletedCount
}

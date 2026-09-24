import { and, eq, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import {
  DEFAULT_SRS_STATE,
  SrsScheduler,
  type SrsDeck,
  type SrsGrade,
  type SrsItemState
} from '@shared/domain/srs'
import { getDb } from '../index'
import { srsCards, srsDeckCards, srsDecks } from '../schema'

/** deckId -> (cardId -> state). A missing inner entry = new card in that deck. */
export function getStateMap(): Record<string, Record<string, SrsItemState>> {
  const rows = getDb().select().from(srsCards).all()
  const out: Record<string, Record<string, SrsItemState>> = {}
  for (const row of rows) {
    const deck = (out[row.deckId] ??= {})
    deck[row.cardId] = {
      ease: row.ease,
      intervalDays: row.intervalDays,
      dueEpochMs: row.dueEpochMs,
      lapses: row.lapses
    }
  }
  return out
}

export function listSrsDecks(): SrsDeck[] {
  return getDb()
    .select()
    .from(srsDecks)
    .orderBy(srsDecks.createdAt)
    .all()
    .map((row) => ({ id: row.id, name: row.name, createdAt: row.createdAt }))
}

/**
 * Cards due for review across all decks: members with no scheduling row
 * (new) plus members whose due time has passed. Mirrors the renderer's
 * `dueCards` semantics.
 */
export function countDueCards(now: number): number {
  const db = getDb()
  const total =
    (db.select({ n: sql<number>`count(*)` }).from(srsDeckCards).get() as { n: number } | undefined)
      ?.n ?? 0
  const notDue =
    (
      db
        .select({ n: sql<number>`count(*)` })
        .from(srsDeckCards)
        .innerJoin(
          srsCards,
          and(eq(srsDeckCards.deckId, srsCards.deckId), eq(srsDeckCards.cardId, srsCards.cardId))
        )
        .where(sql`${srsCards.dueEpochMs} > ${now}`)
        .get() as { n: number } | undefined
    )?.n ?? 0
  return Math.max(0, total - notDue)
}

/** deckId -> cardIds (a card may be in several decks). */
export function getMembership(): Record<string, string[]> {
  const rows = getDb().select().from(srsDeckCards).all()
  const out: Record<string, string[]> = {}
  for (const row of rows) {
    ;(out[row.deckId] ??= []).push(row.cardId)
  }
  return out
}

export function gradeCard(deckId: string, cardId: string, grade: SrsGrade): void {
  const existing = getDb()
    .select()
    .from(srsCards)
    .where(and(eq(srsCards.deckId, deckId), eq(srsCards.cardId, cardId)))
    .get()
  const base: SrsItemState = existing
    ? {
        ease: existing.ease,
        intervalDays: existing.intervalDays,
        dueEpochMs: existing.dueEpochMs,
        lapses: existing.lapses
      }
    : DEFAULT_SRS_STATE
  const next = SrsScheduler.apply(base, grade, Date.now())
  const values = { deckId, cardId, ...next }
  getDb()
    .insert(srsCards)
    .values(values)
    .onConflictDoUpdate({
      target: [srsCards.deckId, srsCards.cardId],
      set: { ease: next.ease, intervalDays: next.intervalDays, dueEpochMs: next.dueEpochMs, lapses: next.lapses }
    })
    .run()
}

/** Returns null when a deck with that name already exists (case-insensitive). */
export function createSrsDeck(name: string): SrsDeck | null {
  const trimmed = name.trim()
  if (trimmed === '') return null
  const existing = listSrsDecks().find((deck) => deck.name.toLowerCase() === trimmed.toLowerCase())
  if (existing) return null
  const deck: SrsDeck = { id: randomUUID(), name: trimmed, createdAt: Date.now() }
  getDb().insert(srsDecks).values(deck).run()
  return deck
}

/** Returns false when the new name collides with another deck (case-insensitive). */
export function renameSrsDeck(id: string, name: string): boolean {
  const trimmed = name.trim()
  if (trimmed === '') return false
  const collision = listSrsDecks().find(
    (deck) => deck.name.toLowerCase() === trimmed.toLowerCase() && deck.id !== id
  )
  if (collision) return false
  getDb().update(srsDecks).set({ name: trimmed }).where(eq(srsDecks.id, id)).run()
  return true
}

/** Delete a deck (cascade removes membership) and purge cards left in no deck. */
export function deleteSrsDeck(id: string): void {
  const db = getDb()
  db.delete(srsDecks).where(eq(srsDecks.id, id)).run()
  db.delete(srsDeckCards).where(eq(srsDeckCards.deckId, id)).run()
  purgeOrphanedCards()
}

/** Idempotent add; a card may belong to several decks. */
export function addCardsToDeck(deckId: string, cardIds: string[]): void {
  const unique = [...new Set(cardIds.filter((id) => id !== ''))]
  if (unique.length === 0) return
  getDb()
    .insert(srsDeckCards)
    .values(unique.map((cardId) => ({ deckId, cardId })))
    .onConflictDoNothing()
    .run()
}

/** Drop a card from all decks and delete its SRS state (saved item removed). */
export function removeCardEverywhere(cardId: string): void {
  const db = getDb()
  db.delete(srsDeckCards).where(eq(srsDeckCards.cardId, cardId)).run()
  db.delete(srsCards).where(eq(srsCards.cardId, cardId)).run()
}

/** Remove a card from one deck: membership + that deck's state. */
export function removeCardFromDeck(deckId: string, cardId: string): void {
  const db = getDb()
  db.delete(srsDeckCards)
    .where(and(eq(srsDeckCards.deckId, deckId), eq(srsDeckCards.cardId, cardId)))
    .run()
  db.delete(srsCards).where(and(eq(srsCards.deckId, deckId), eq(srsCards.cardId, cardId))).run()
}

/** Delete SRS state for cards that are no longer in any deck. */
export function purgeOrphanedCards(): void {
  const db = getDb()
  const members = new Set(db.select().from(srsDeckCards).all().map((row) => `${row.deckId}::${row.cardId}`))
  const cards = db.select().from(srsCards).all()
  for (const card of cards) {
    if (!members.has(`${card.deckId}::${card.cardId}`)) {
      db.delete(srsCards)
        .where(and(eq(srsCards.deckId, card.deckId), eq(srsCards.cardId, card.cardId)))
        .run()
    }
  }
}

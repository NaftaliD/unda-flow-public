import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useUpdateLesson } from '@/data/mutations/lessons'
import { useLesson } from '@/data/queries/lessons'
import { useExercises } from '@/data/queries/library'
import { formatDuration } from '@/domain/lesson'
import { blockStarts, moveStep, teachSteps } from '@/domain/teach'

/** Keep the screen awake while teaching, where the browser allows it. Released on leaving. */
function useWakeLock() {
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> }
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<Sentinel> }
    }
    if (!nav.wakeLock) return
    let sentinel: Sentinel | undefined
    let active = true
    const acquire = () => {
      nav.wakeLock?.request('screen').then(
        (s) => {
          if (active) sentinel = s
          else void s.release()
        },
        () => undefined, // refused (e.g. low battery): teaching works without it
      )
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [])
}

const storageKey = (id: string) => `unda-teach-step:${id}`
function readStep(id: string): number {
  try {
    const n = Number.parseInt(sessionStorage.getItem(storageKey(id)) ?? '', 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
  } catch {
    return 0
  }
}

/**
 * Read-only "teach view" of a class: one exercise at a time in large type, to follow on a phone
 * during a lesson. Previous/next buttons, left/right arrow keys and a swipe all move through it;
 * the place is remembered if the page reloads.
 */
export function TeachPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams({ strict: false }) as { id: string }
  const lesson = useLesson(id)
  const exercises = useExercises()
  const update = useUpdateLesson(id)
  const [index, setIndex] = useState(() => readStep(id))
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const rtl = i18n.dir() === 'rtl'
  useWakeLock()

  const steps = useMemo(() => teachSteps(lesson.data?.slots ?? []), [lesson.data])
  const starts = useMemo(() => blockStarts(steps), [steps])
  const exerciseById = useMemo(
    () => new Map((exercises.data ?? []).map((e) => [e.id, e])),
    [exercises.data],
  )
  const clamped = Math.min(index, steps.length)

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(id), String(clamped))
    } catch {
      /* the place is just not remembered */
    }
  }, [id, clamped])

  const go = (delta: number) => setIndex(moveStep(clamped, delta, steps.length))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))
        return
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight'
      const back = rtl ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === forward) setIndex((i) => moveStep(i, 1, steps.length))
      else if (e.key === back) setIndex((i) => moveStep(i, -1, steps.length))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rtl, steps.length])

  if (lesson.isPending || exercises.isPending) {
    return <p className="p-6 text-lg text-muted-foreground">{t('lessons.loading')}</p>
  }
  if (!lesson.data) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
        <p role="alert">{t('lessons.notFound')}</p>
        <Link to="/" className="text-sm font-semibold underline">
          {t('lessons.back')}
        </Link>
      </section>
    )
  }
  const l = lesson.data
  const step = steps[clamped]

  function onPointerDown(e: PointerEvent) {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  function onPointerUp(e: PointerEvent) {
    const s = swipe.current
    swipe.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    // A clear horizontal swipe; in right-to-left languages the direction is mirrored.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go((dx < 0 ? 1 : -1) * (rtl ? -1 : 1))
    }
  }

  const header = (
    <header className="flex items-center justify-between gap-3">
      <Link
        to="/lessons/$id"
        params={{ id: l.id }}
        className="inline-flex h-11 items-center gap-2 rounded-pill border border-border px-4 text-sm font-semibold hover:bg-muted"
      >
        <X className="size-4" aria-hidden />
        {t('teach.exit')}
      </Link>
      {starts.length > 1 && step && (
        <Select
          aria-label={t('teach.jump')}
          className="max-w-56"
          value={step.slotId}
          onChange={(e) => {
            const target = starts.find((s) => s.slotId === e.target.value)
            if (target) setIndex(target.index)
          }}
        >
          {starts.map((s) => (
            <option key={s.slotId} value={s.slotId}>
              {s.label}
            </option>
          ))}
        </Select>
      )}
    </header>
  )

  if (steps.length === 0) {
    return (
      <section className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
        {header}
        <h1 className="text-3xl font-semibold">{l.title}</h1>
        <p className="text-lg text-muted-foreground">{t('teach.empty')}</p>
      </section>
    )
  }

  if (!step) {
    return (
      <section className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          <h1 className="text-4xl font-semibold">{t('teach.doneTitle')}</h1>
          <p className="text-lg text-muted-foreground">{l.title}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {l.status !== 'taught' && (
              <Button
                className="h-14 px-8 text-base"
                disabled={update.isPending}
                onClick={() => update.mutate({ status: 'taught' })}
              >
                {t('teach.markTaught')}
              </Button>
            )}
            {l.status === 'taught' && (
              <p role="status" className="self-center text-base font-semibold">
                {t('teach.markedTaught')}
              </p>
            )}
            <Button variant="outline" className="h-14 px-8 text-base" onClick={() => go(-1)}>
              {t('teach.back')}
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const ex = exerciseById.get(step.exerciseId)
  const seconds = step.durationSec ?? ex?.defaultDurationSec ?? null
  const facts = [
    step.reps !== null ? t('teach.reps', { count: step.reps }) : null,
    seconds !== null ? formatDuration(seconds) : null,
    step.springs,
  ].filter((x): x is string => Boolean(x))

  return (
    <section
      className="mx-auto flex min-h-dvh w-full max-w-3xl touch-pan-y flex-col gap-5 p-4 sm:p-6"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
    >
      {header}

      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label={t('teach.progress')}
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={clamped + 1}
          aria-valuetext={t('teach.stepOf', { current: clamped + 1, total: steps.length })}
          className="h-2 w-full overflow-hidden rounded-pill bg-muted"
        >
          <div
            className="h-full rounded-pill bg-primary"
            style={{ width: `${((clamped + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('teach.stepOf', { current: clamped + 1, total: steps.length })}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        <p dir="auto" className="label-caps text-base text-muted-foreground">
          {step.blockLabel} ·{' '}
          {t('teach.inBlock', { current: step.indexInBlock + 1, total: step.countInBlock })}
        </p>
        {(step.blockHint || step.blockNotes) && (
          <div dir="auto" className="rounded-3xl bg-card p-4 text-lg text-card-foreground">
            {step.blockHint && <p>{step.blockHint}</p>}
            {step.blockNotes && <p className="whitespace-pre-line">{step.blockNotes}</p>}
          </div>
        )}
        <h1 dir="auto" className="text-5xl leading-tight font-semibold break-words">
          {ex?.name ?? t('lessons.builder.unknownExercise')}
        </h1>
        {facts.length > 0 && (
          <ul className="flex flex-wrap gap-3" aria-label={t('teach.facts')}>
            {facts.map((f) => (
              <li
                key={f}
                dir="auto"
                className="rounded-pill bg-card px-5 py-2 text-3xl font-semibold text-card-foreground"
              >
                {f}
              </li>
            ))}
          </ul>
        )}
        {step.notes && (
          <p dir="auto" className="text-2xl whitespace-pre-line">
            {step.notes}
          </p>
        )}
        {ex?.cues && (
          <p dir="auto" className="text-xl text-muted-foreground">
            {ex.cues}
          </p>
        )}
      </div>

      <nav
        aria-label={t('teach.steps')}
        className="sticky bottom-0 grid grid-cols-2 gap-3 bg-background py-3"
      >
        <Button
          variant="outline"
          className="h-16 text-lg"
          disabled={clamped === 0}
          onClick={() => go(-1)}
        >
          {rtl ? (
            <ArrowRight className="size-5" aria-hidden />
          ) : (
            <ArrowLeft className="size-5" aria-hidden />
          )}
          {t('teach.previous')}
        </Button>
        <Button className="h-16 text-lg" onClick={() => go(1)}>
          {clamped === steps.length - 1 ? t('teach.finish') : t('teach.next')}
          {rtl ? (
            <ArrowLeft className="size-5" aria-hidden />
          ) : (
            <ArrowRight className="size-5" aria-hidden />
          )}
        </Button>
      </nav>
    </section>
  )
}

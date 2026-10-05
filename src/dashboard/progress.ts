import type { Invitation } from '../types'
import { countPhotos } from './context'

export interface Task {
  id: string
  label: string
  /** Shown by the assistant while the task is open. */
  tip: string
  doneTip: string
  tab: string
  weight: number
  done: boolean
}

export function computeTasks(inv: Invitation): Task[] {
  const photos = countPhotos(inv)
  const events = inv.events.filter((e) => e.name && e.date)
  return [
    {
      id: 'names',
      label: 'Add both names',
      tip: 'Add the bride’s and groom’s names to complete the Couple section.',
      doneTip: 'Your names look wonderful.',
      tab: 'couple',
      weight: 10,
      done: !!inv.couple.bride.name.trim() && !!inv.couple.groom.name.trim(),
    },
    {
      id: 'date',
      label: 'Set your wedding date',
      tip: 'Choose your wedding date so the countdown can start ticking.',
      doneTip: 'Countdown is ready.',
      tab: 'countdown',
      weight: 10,
      done: !!inv.weddingDate,
    },
    {
      id: 'hero',
      label: 'Add a couple photo',
      tip: 'Add a photo of the two of you — it is the first thing guests see.',
      doneTip: 'A lovely opening photo.',
      tab: 'couple',
      weight: 10,
      done: !!inv.heroPhoto,
    },
    {
      id: 'portraits',
      label: 'Add portraits & bios',
      tip: 'Add a portrait and a short bio for each of you to make the Couple section personal.',
      doneTip: 'Guests will love getting to know you.',
      tab: 'couple',
      weight: 10,
      done: !!inv.couple.bride.photo && !!inv.couple.groom.photo && !!inv.couple.bride.bio && !!inv.couple.groom.bio,
    },
    {
      id: 'events',
      label: 'Add your events',
      tip: 'Add at least one event with a date and time — for example the ceremony.',
      doneTip: 'Your events are scheduled.',
      tab: 'events',
      weight: 12,
      done: events.length > 0,
    },
    {
      id: 'venue',
      label: 'Add your wedding venue',
      tip: 'Add your wedding venue to complete the Events section.',
      doneTip: 'Guests can find you easily.',
      tab: 'venue',
      weight: 12,
      done: inv.events.some((e) => e.venue.trim() && e.address.trim()),
    },
    {
      id: 'story',
      label: 'Tell your love story',
      tip: 'Add a few milestones to your love story — guests adore this section.',
      doneTip: 'Your love story is beautiful.',
      tab: 'story',
      weight: 10,
      done: inv.story.length > 0,
    },
    {
      id: 'gallery',
      label: 'Fill your photo gallery',
      tip: photos > 0 ? 'Add a few more photos — three or more makes the gallery shine.' : 'Upload your first photos to bring the gallery to life.',
      doneTip: 'Your photo gallery looks great!',
      tab: 'photos',
      weight: 10,
      done: photos >= 3,
    },
    {
      id: 'family',
      label: 'Honour your families',
      tip: 'Add your parents’ names to the Family section.',
      doneTip: 'Your families are honoured.',
      tab: 'family',
      weight: 6,
      done: !!inv.family.brideParents || !!inv.family.groomParents || inv.family.members.length > 0,
    },
    {
      id: 'publish',
      label: 'Publish your invitation',
      tip: 'Everything looks good — publish your invitation to get a shareable link.',
      doneTip: 'Your invitation is live.',
      tab: 'share',
      weight: 10,
      done: inv.published,
    },
  ]
}

export function computeProgress(tasks: Task[]): number {
  const total = tasks.reduce((n, t) => n + t.weight, 0)
  return Math.round((tasks.filter((t) => t.done).reduce((n, t) => n + t.weight, 0) / total) * 100)
}

export const nextTask = (tasks: Task[]) => tasks.find((t) => !t.done)

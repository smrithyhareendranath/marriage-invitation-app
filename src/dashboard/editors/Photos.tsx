import { useState } from 'react'
import type { Album, Photo } from '../../types'
import { Icon } from '../../components/Icon'
import { Img } from '../../components/Img'
import { Lightbox } from '../../components/Lightbox'
import { Modal } from '../../components/Modal'
import { ai } from '../../lib/ai'
import { ALBUM_SUGGESTIONS } from '../../data/demo'
import { loadBlob, removeMedia, saveImage } from '../../lib/media'
import type { CropRect } from '../../lib/media'
import { uid } from '../../lib/util'
import { useToast } from '../../context'
import { Card, ConfirmButton, EmptyState, Field, PageHead, UpgradeNote, useSortable } from '../ui'
import { ImageEditor, MultiUploader } from '../Uploader'
import { AiButton } from './Basics'
import { useBuilder } from '../context'

export function PhotosEditor() {
  const { inv, update, limits, photoCount, go } = useBuilder()
  const toast = useToast()
  const [activeId, setActiveId] = useState(inv.albums[0]?.id ?? '')
  const album = inv.albums.find((a) => a.id === activeId) ?? inv.albums[0]
  const [viewer, setViewer] = useState<number | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ photo: Photo; blob: Blob } | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const remaining = Number.isFinite(limits.photos) ? Math.max(0, limits.photos - photoCount) : 9999

  const patchAlbum = (id: string, fn: (a: Album) => Album) =>
    update((i) => ({ ...i, albums: i.albums.map((a) => (a.id === id ? fn(a) : a)) }))

  const sortable = useSortable(album?.photos ?? [], (photos) => album && patchAlbum(album.id, (a) => ({ ...a, photos })))

  const addAlbum = (name: string) => {
    const n = name.trim()
    if (!n) return
    const a: Album = { id: uid('alb'), name: n, cover: '', photos: [] }
    update((i) => ({ ...i, albums: [...i.albums, a] }))
    setActiveId(a.id)
    setAdding(false)
    setNewName('')
  }

  const removeAlbum = (a: Album) => {
    a.photos.forEach((p) => void removeMedia(p.src))
    update((i) => ({ ...i, albums: i.albums.filter((x) => x.id !== a.id) }))
    setActiveId(inv.albums.find((x) => x.id !== a.id)?.id ?? '')
  }

  const removePhoto = (a: Album, p: Photo) => {
    void removeMedia(p.src)
    patchAlbum(a.id, (x) => ({ ...x, photos: x.photos.filter((y) => y.id !== p.id), cover: x.cover === p.src ? '' : x.cover }))
  }

  const saveEdit = async (r: { rotate: 0 | 90 | 180 | 270; crop: CropRect }) => {
    if (!editing || !album) return
    const { photo, blob } = editing
    setEditing(null)
    try {
      const ref = await saveImage(blob, { rotate: r.rotate, crop: r.crop })
      void removeMedia(photo.src)
      patchAlbum(album.id, (a) => ({
        ...a,
        cover: a.cover === photo.src ? ref : a.cover,
        photos: a.photos.map((p) => (p.id === photo.id ? { ...p, src: ref } : p)),
      }))
      toast('Photo updated')
    } catch {
      toast('Could not edit that photo.', 'error')
    }
  }

  const detailPhoto = album?.photos.find((p) => p.id === detail)

  return (
    <>
      <PageHead title="Photo album" desc="Upload, arrange and organise the photos guests will see in your gallery." />

      {!Number.isFinite(limits.photos) ? null : (
        <UpgradeNote>
          Free plan: {photoCount} / {limits.photos} photos used.{' '}
          <button className="link" onClick={() => go('settings')}>Upgrade for unlimited photos</button>
        </UpgradeNote>
      )}

      <Card className="albums-card">
        <div className="album-tabs" role="tablist" aria-label="Albums">
          {inv.albums.map((a) => (
            <button key={a.id} role="tab" aria-selected={a.id === album?.id} className={`chip ${a.id === album?.id ? 'on' : ''}`} onClick={() => setActiveId(a.id)}>
              {a.name || 'Untitled'} <small>{a.photos.length}</small>
            </button>
          ))}
          <button className="chip add" onClick={() => setAdding(true)}>
            <Icon name="plus" size={14} /> New album
          </button>
        </div>
      </Card>

      {!album ? (
        <EmptyState icon="image" title="Create your first album" action={<button className="btn btn-primary" onClick={() => setAdding(true)}>New album</button>}>
          Albums help you group photos — Pre-Wedding, Engagement, Family and more.
        </EmptyState>
      ) : (
        <>
          <Card
            title="Album settings"
            actions={<ConfirmButton onConfirm={() => removeAlbum(album)} label="Delete album" confirmLabel="Delete album and photos?" />}
          >
            <div className="two-col">
              <Field label="Album name" htmlFor="alb-name">
                <input id="alb-name" value={album.name} onChange={(e) => patchAlbum(album.id, (a) => ({ ...a, name: e.target.value }))} />
              </Field>
              <Field label="Cover photo" hint="Tap the star on any photo to make it the cover.">
                <div className="cover-chip">
                  <Img src={album.cover || album.photos[0]?.src || ''} alt="Album cover" thumb className="cover-thumb" />
                  <span>{album.cover ? 'Custom cover' : album.photos.length ? 'First photo' : 'No photos yet'}</span>
                </div>
              </Field>
            </div>
          </Card>

          <Card title="Add photos">
            <MultiUploader
              remaining={remaining}
              onUploaded={(files) => {
                patchAlbum(album.id, (a) => ({
                  ...a,
                  photos: [
                    ...a.photos,
                    ...files.map((f) => ({ id: uid('ph'), src: f.src, alt: '', caption: '' })),
                  ],
                  cover: a.cover || files[0].src,
                }))
                toast(`${files.length} photo${files.length > 1 ? 's' : ''} added`)
              }}
            />
          </Card>

          <Card title={`Photos (${album.photos.length})`} hint="Drag to reorder on desktop, or use the arrows. Tap a photo to view it full screen.">
            {album.photos.length === 0 ? (
              <EmptyState icon="image" title="No photos in this album yet">Add photos above — they appear here instantly.</EmptyState>
            ) : (
              <div className="photo-grid">
                {album.photos.map((p, i) => (
                  <div key={p.id} className={`photo-tile ${sortable.over === i ? 'over' : ''}`} {...sortable.props(i)}>
                    <button className="pt-img" onClick={() => setViewer(i)} aria-label={`View photo ${i + 1} full screen`}>
                      <Img src={p.src} alt={p.alt || `Photo ${i + 1}`} thumb />
                    </button>
                    {album.cover === p.src && <span className="cover-badge"><Icon name="star" size={12} filled /> Cover</span>}
                    <div className="pt-bar">
                      <button className="icon-btn sm" onClick={() => patchAlbum(album.id, (a) => ({ ...a, cover: p.src }))} aria-label="Set as cover photo" title="Set as cover">
                        <Icon name="star" size={15} filled={album.cover === p.src} />
                      </button>
                      <button className="icon-btn sm" onClick={async () => { const b = await loadBlob(p.src); if (b) setEditing({ photo: p, blob: b }); else toast('Could not open this photo for editing.', 'error') }} aria-label="Crop or rotate" title="Crop / rotate">
                        <Icon name="crop" size={15} />
                      </button>
                      <button className="icon-btn sm" onClick={() => setDetail(p.id)} aria-label="Edit caption" title="Caption & alt text">
                        <Icon name="edit" size={15} />
                      </button>
                      <button className="icon-btn sm" disabled={i === 0} onClick={() => sortable.move(i, -1)} aria-label="Move earlier">
                        <Icon name="left" size={15} />
                      </button>
                      <button className="icon-btn sm" disabled={i === album.photos.length - 1} onClick={() => sortable.move(i, 1)} aria-label="Move later">
                        <Icon name="right" size={15} />
                      </button>
                      <button className="icon-btn sm danger" onClick={() => removePhoto(album, p)} aria-label="Delete photo" title="Delete">
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {adding && (
        <Modal
          title="New album"
          onClose={() => setAdding(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => addAlbum(newName)} disabled={!newName.trim()}>Create album</button>
            </>
          }
        >
          <Field label="Album name" htmlFor="new-alb">
            <input id="new-alb" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Pre-Wedding" onKeyDown={(e) => e.key === 'Enter' && addAlbum(newName)} />
          </Field>
          <div className="chips-row">
            {ALBUM_SUGGESTIONS.filter((s) => !inv.albums.some((a) => a.name === s)).map((s) => (
              <button key={s} className="chip" onClick={() => addAlbum(s)}>{s}</button>
            ))}
          </div>
        </Modal>
      )}

      {detailPhoto && album && (
        <Modal
          title="Photo details"
          onClose={() => setDetail(null)}
          footer={<button className="btn btn-primary" onClick={() => setDetail(null)}>Done</button>}
        >
          <div className="detail-photo"><Img src={detailPhoto.src} alt={detailPhoto.alt} thumb /></div>
          <Field label="Caption" hint="Shown under the photo in the gallery.">
            <input value={detailPhoto.caption} onChange={(e) => patchAlbum(album.id, (a) => ({ ...a, photos: a.photos.map((p) => (p.id === detailPhoto.id ? { ...p, caption: e.target.value } : p)) }))} maxLength={120} />
          </Field>
          <Field label="Alt text" tip="Describes the photo for guests using screen readers." hint="e.g. “Arjun and Anjali laughing at the beach”">
            <input value={detailPhoto.alt} onChange={(e) => patchAlbum(album.id, (a) => ({ ...a, photos: a.photos.map((p) => (p.id === detailPhoto.id ? { ...p, alt: e.target.value } : p)) }))} maxLength={160} />
          </Field>
          <AiButton
            label="Suggest a caption"
            onRun={async () => {
              const c = await ai.caption({ alt: detailPhoto.alt, album: album.name })
              patchAlbum(album.id, (a) => ({ ...a, photos: a.photos.map((p) => (p.id === detailPhoto.id ? { ...p, caption: c } : p)) }))
            }}
          />
        </Modal>
      )}

      {editing && <ImageEditor source={editing.blob} aspect={null} title="Crop / rotate photo" onCancel={() => setEditing(null)} onDone={saveEdit} />}
      {viewer !== null && album && <Lightbox photos={album.photos} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />}
    </>
  )
}

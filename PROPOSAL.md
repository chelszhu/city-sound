# VISAP'26 Artwork Proposal

## General Information

**Title:** *City Sound: A Listening Instrument for the Places We Share*

**Year:** 2026

**Authors & Roles:**
- **Chenxi Zhu** — concept, interaction & visual design, full-stack development, sound design
- **Katie Han** — UI/UX design

**Medium:** Interactive, browser-based data artwork — a participatory sound map with a generative audiovisual "studio." Combines crowd-sourced field recordings, geospatial and temporal data visualization, in-browser machine-listening (audio classification), and real-time generative music synthesis.

**Dimensions:** Responsive and scale-independent. Gallery presentation: one large display or touchscreen (recommended 27"–55") with stereo audio, plus an optional projection of the polar "generate" view (recommended ≥ 2 × 2 m). Also fully self-contained as a single URL for virtual exhibition. No fixed physical footprint; scales from a phone in the hand to a wall.

---

## Description

*City Sound* is a listening instrument disguised as a map. Anyone can record an eight-second clip of the sound around them — a siren, a dawn chorus, a subway platform, a fountain, a stranger's radio — and pin it to the exact spot and moment it was captured. Over time, these fragments accumulate into a living acoustic archive of a city: not a dataset of decibels, but a collective memory of what a place *sounds like* to the people who live inside it.

The heart of the piece is the **"generate" studio**, a single view that folds together three ways of reading the archive:

- **A polar clock.** Every recording is drawn as its own real waveform, positioned by two data dimensions at once. The **angle** encodes the hour it was captured — midnight at the top, noon at the bottom — so the day becomes a face of the clock and you can *see* the city's circadian rhythm: birds and church bells clustered in the morning arc, sirens and music in the evening. The **radius** encodes **distance from a point the visitor chooses** — they drag a marker on a small inset map to anywhere in the city, and the rings instantly re-sort every sound by how far it was recorded from *their* chosen spot. Stand the marker on your own block and the inner rings become your neighborhood; move it to the harbor and the whole archive re-orders around the water. Distance is not a fixed authored quantity — it is an act the visitor performs.

- **A brushing interaction.** Clicking a concentric ring selects that distance band ("2–4 km from your point"); the selection washes across the polar field and filters the archive. A timeframe control along the top brushes the temporal dimension in parallel (last hour → all time). Together they are a two-dimensional query — *when* and *how near* — expressed entirely through gesture.

- **A skyline strip and a generated track.** The current selection "unrolls" beneath the clock as a single continuous line running **west → east across the city**, each recording erupting into its actual waveform at its longitude — the city rendered as one horizontal signal. From there, one button composes a **124-BPM house track built from the selected recordings themselves**: a four-on-the-floor kick and swung hats set the grid; the longest clip becomes a low-pass-filtered atmosphere that *pumps* with the kick (sidechain compression); the others are sliced at their loudest onsets and triggered on the beat, each panned to the stereo field by the longitude where it was recorded; a bassline follows the pitch detected in the clips. Every render is dealt fresh — tempo, swing, pattern, and the featured atmosphere all vary — so the same corner of the city yields a different song each time.

Two smaller gestures carry the ethic of the piece. When a visitor contributes a recording, an **in-browser neural network (Google's YAMNet, trained on AudioSet's 521 sound classes) listens to the clip and proposes tags** — *dog, siren, chimes, rain* — which the contributor is free to accept, remove, or overwrite. Machine listening here is a collaborator, never an authority. And whenever a visitor plays back a sound, a quiet line of text answers it — *"a siren passes through every life in this city; notice where yours crosses it,"* or *"the birds start before the traffic does — when did you last hear the first one?"* Every interaction ends by pointing away from the screen and back toward the real, unrepeatable soundscape the visitor is standing in.

### Relationship to this year's theme: Amplification

*City Sound* is, quite literally, an instrument of amplification. Its raw material is exactly the kind of signal the theme names as at risk of going unheard: not the loud, official data streams of a city — traffic counts, crime stats, air-quality sensors — but the *quiet* ones. A dawn chorus before the traffic starts. A pigeon on a windowsill. Wind chimes on a fire escape. Kids on a playground. None of this is captured by any civic dataset, yet it is what most people would actually call "what my neighborhood sounds like." The work turns up the signal on this overlooked acoustic commons by giving it the same instruments usually reserved for "serious" data — coordinate systems, brushing, filtering, drill-down — and by treating an eight-second recording from anyone, anywhere, as data worth visualizing at all.

The amplification is also literal and technical, not just metaphorical. The "generate" studio takes the quiet fragments a visitor has selected and *amplifies them into music*: it isolates their loudest onsets, sidechains them to a kick, pans them across the stereo field by where they were recorded, and renders a track that could not exist without those specific, otherwise-overlooked sounds. A stranger's radio, a subway platform, a fountain — signals that would normally pass unnoticed — become the audible, danceable center of the piece. And because the archive is authored by no single expert but grows from whoever chooses to contribute a moment of where they live, the work also amplifies *whose* listening counts: it distributes the authority to say "this is worth recording" across an entire public, rather than reserving it for an institution's sensors. In an era of headphones and noise-cancellation as private withdrawal, *City Sound* proposes listening — and being heard — as a public, relational act.

### Relationship to information visualization, scientific visualization, and visual analytics

The work is a genuine **visual-analytics instrument** wearing the skin of an artwork. It encodes a multivariate spatiotemporal dataset (time-of-day, geolocation, distance, tags, and the raw acoustic waveform) in a **polar coordinate system** that maps two continuous variables — cyclical time to angle, geographic distance to radius — while preserving each record's full signal as a small-multiple waveform *in situ*. Visitors perform classic analytic operations — **brushing and linking, filtering, drill-down, detail-on-demand** — across both the temporal and the spatial axis, then pivot from an overview (the clock) to a linear comparison (the skyline) to the individual record (playback). It draws on **scientific visualization** of audio (waveform and onset representation) and on **in-browser machine learning** (YAMNet/AudioSet classification running client-side via TensorFlow.js) as an interpretive layer. Finally it closes the loop from analysis back to **sonification and generative synthesis**, letting the visitor not only see the structure of the data but *hear the city recomposed from its own evidence*. The whole is an argument that analytic rigor and poetic, embodied experience are not opposites.

### Reception at previous exhibitions

*City Sound* has **not been previously exhibited**; VISAP'26 would be its exhibition premiere. It currently exists as a **live, publicly deployed web instance** seeded with real, Creative-Commons-licensed field recordings, and has been developed and tested as a working interactive system (see Supporting Material). It was conceived partly in dialogue with *The Fire We Share* (VISAP 2025), whose framing of data as a "living, wounded archive" rather than a set of metrics directly shaped this project's commitment to sound-as-memory over sound-as-measurement.

---

## Technical Requirements

**Core system.** The entire work runs in a modern web browser (Chrome/Firefox/Safari). It is a single self-contained web application — a lightweight Python/Flask server for storage plus a client that handles all visualization, machine listening, and audio synthesis locally via the Web Audio API and TensorFlow.js. There are **no proprietary dependencies, no VR/AR hardware, and no cloud GPU** requirements; it runs comfortably on a single laptop or mini-PC.

**Gallery presentation (physical).** The ideal installation is a **listening station**:
- One **large touchscreen or display (27"–55")** running the app full-screen, on a plinth or wall mount, letting visitors move the "your point" marker, brush time and distance, click individual sounds, and generate tracks.
- **Stereo speakers** (near-field monitors or a small pair on stands) *or* a **pair of good over-ear headphones** on a tether. Stereo is important: the generated tracks and playback pan sounds by geographic longitude, so left/right placement is part of the data encoding. A headphone station suits a busy, sound-sensitive gallery; open speakers suit a dedicated alcove.
- Optional: a **second surface (projection ≥ 2 × 2 m)** mirroring the polar "generate" view as an ambient centerpiece, while the touchscreen serves as the control surface.
- Optional but recommended: a **"contribute your city" corner** — a wall QR code and short prompt inviting visitors to open the same URL on their phones and record eight seconds of the gallery, the street outside, their hometown. New recordings appear live in the archive, so the piece *grows over the run of the exhibition*.

**Interaction.** The work is **live and hands-on**; there is no passive video mode required, though it can idle on a slow auto-rotating demo (cycling anchor points and generating tracks) when unattended.

**Lighting and environment.** Screen-based, so it prefers **moderate ambient light** (no strict darkness needed, but avoid direct glare on the display). Its only real environmental need is a **tolerance for sound** — either an acoustically softer alcove for open speakers, or the headphone option in a live room.

**Space and setup.** Minimal: power, a table/plinth or wall mount, and internet (or a local network — the app can run entirely offline on the gallery machine, seeded with a curated recording set for the host city). Setup is under an hour. We can **re-seed the archive with recordings of the exhibition's own city** so the piece speaks in a local accent.

**Virtual exhibition.** Because it is already a URL, *City Sound* integrates into a **virtual exhibition with zero adaptation** — visitors anywhere interact with the identical instrument and can contribute recordings of their own cities, making the online version a genuinely global, growing archive rather than a documentation of the physical one. The same build serves both contexts.

**Accessibility & data ethics.** All seeded demo audio is Creative-Commons/public-domain with full attribution (a credits file ships with the work). Contributed recordings are eight seconds, geo- and time-stamped but not identity-linked. The visual language is high-contrast monochrome; the machine-generated tags and the reflective text prompts also give a non-visual, describable account of each sound for screen-reader narration.

---

## Supporting Material

- **Live interactive work:** https://citysound.onrender.com
  *(Note: hosted on a free tier — the first load after idle may take ~30 seconds to wake.)*
- **Source code:** https://github.com/chelszhu/city-sound
- **High-resolution stills** *(to be provided):* the "generate" studio (polar clock with the movable "your point" inset), the west→east skyline strip, the contribution flow with auto-generated tags, and the map view with its per-block sound grid.
- **Screen-capture video walkthrough** *(to be provided, ~90 s):* choosing a point on the city, watching the rings re-sort, brushing a time window, selecting a distance band, playing an individual recording with its reflective prompt, and generating a house track from the selection.
- **Audio examples** *(to be provided):* two or three exported tracks generated from different neighborhoods and times of day, demonstrating how the same city yields different music from different vantage points.

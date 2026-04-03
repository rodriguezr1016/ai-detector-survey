# Research Form

This is a Next.js study application for showing videos in groups of 10, collecting questionnaire data, and saving participant results into MongoDB.

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Create `.env.local` from `.env.example` and set your MongoDB connection values.

4. Open [http://localhost:3000](http://localhost:3000).

## Video setup

Put your `.mp4` files in [public/videos](/Users/renerodriguez/Desktop/projects/research-form/public/videos).

Edit [data/videos.json](/Users/renerodriguez/Desktop/projects/research-form/data/videos.json).

Each item should point to a local file in `/public/videos` or another direct video URL:

```json
[
  {
    "id": "clip-01",
    "label": "Clip 01",
    "url": "/videos/clip-01.mp4",
    "correctAnswer": "real"
  },
  {
    "id": "clip-02",
    "label": "Clip 02",
    "url": "/videos/clip-02.mp4",
    "correctAnswer": "ai"
  }
]
```

`correctAnswer` is used only on the server for hidden scoring. It is not shown to participants.

## Saved results

Each participant session is stored in MongoDB in a `sessions` collection.

Each session document records:

- questionnaire answers
- the assigned batch number
- each video answer
- why the participant chose AI or Real
- elapsed decision time
- hidden correctness for each answer
- final score summary for the session

Each session also stores a `markdownReport` field so you still have a single text-style record for review or export.

Shared batch usage is stored in the `study_state` collection.

## Notes

- The app keeps the first batch of 10 videos active until 3 full surveys are completed for that batch.
- After 3 completed surveys for a batch, the next 10-video batch becomes active.
- After every configured batch has reached 3 completed surveys, the batch counters reset and the study starts again from the first batch.
- Completion counts are tracked separately in MongoDB.
- The order is randomized within the assigned batch for each participant.
- This implementation is designed for shared, cross-device persistence through MongoDB.
- Local project-hosted videos are recommended for reliable playback and timer sync.

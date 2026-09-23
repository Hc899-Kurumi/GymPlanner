# GymPlanner

GymPlanner is a mobile-first, installable workout tracker inspired by the simplicity of Strong. It comes preloaded with Hang's weekly routine and stores workout data locally on the device.

## Included in this MVP

- Six reusable weekly routines
- Custom routines and exercises
- Active workout logging for weight, reps, and RPE
- Set completion and a 90-second rest timer
- Warm-up weight calculator
- Workout history and total-volume summaries
- Personal-record detection
- Progress chart and muscle activity heat map
- Body measurement tracking
- CSV workout export
- Dark/light themes
- Offline PWA support and iPhone Home Screen installation

## Run locally

This version has no dependencies or build step.

```bash
python -m http.server 8080
```

Open `http://localhost:8080`.

## Install on iPhone

1. Deploy the folder to any HTTPS host such as GitHub Pages or Firebase Hosting.
2. Open the deployed URL in Safari.
3. Tap **Share → Add to Home Screen**.

## Data and privacy

Workout information is saved in browser `localStorage`. Nothing is uploaded to a server in this MVP. Clearing site data removes workout history, so export a CSV backup periodically.

## Next phase

- Firebase Authentication and Firestore synchronization
- Editable routine ordering and supersets
- Cloud backup and CSV import
- Notifications and calendar integration
- Richer exercise analytics

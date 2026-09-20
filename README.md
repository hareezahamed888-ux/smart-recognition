# Face Attendance Manager (Smart Recognition)

A browser-based face recognition attendance system that works as a responsive website and app-style interface.

**Live Demo:** [https://smart-recognition.vercel.app](https://smart-recognition.vercel.app)

## Features

- Camera-based face recognition using **face-api.js**
- Enroll face profiles with a name and photo
- Automatic attendance logging
- CSV export and in-browser persistence (`localStorage`)
- Mobile-friendly layout for app-style use

## Tech Stack

- HTML / CSS / JavaScript
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) (TensorFlow.js models)
- Deployed on Vercel

## Usage

1. Open the [live site](https://smart-recognition.vercel.app) or run locally:
   ```bash
   npx serve .
   ```
2. Click **Start Camera** and allow camera permission.
3. Enroll one or more users with a name and a clear frontal photo.
4. Click **Start Recognition** and show enrolled faces to the camera.
5. Export attendance records or clear the log as needed.

## Notes

- Face profiles and attendance logs are stored in `localStorage`.
- Recognition works best with clear frontal photos and good lighting.
- Runs entirely in the browser — no backend server required.

---

Built by [Hareez Ahamed Z](https://github.com/hareezahamed888-ux)

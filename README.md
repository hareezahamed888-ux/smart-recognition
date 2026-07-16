# Face Attendance Manager

A browser-based face recognition attendance system that works as a responsive website and app-style interface.

## Features

- Camera-based face recognition using `face-api.js`
- Enroll face profiles with a name and photo
- Automatic attendance logging
- CSV export and in-browser persistence
- Mobile-friendly layout for app-style use

## Usage

1. Open `index.html` in Chrome, Edge, or any browser with camera access.
2. Click **Start Camera** and allow camera permission.
3. Enroll one or more users with a name and a clear photo.
4. Click **Start Recognition** and show enrolled faces to the camera.
5. Export attendance records or clear the log as needed.

## Notes

- Face profiles and attendance logs are stored in `localStorage`.
- Recognition works best with clear frontal photos and good lighting.
- This example runs entirely in the browser and does not require a backend server.

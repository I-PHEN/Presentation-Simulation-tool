/* eslint-disable @typescript-eslint/no-require-imports */
const text = "Hello, and welcome. We're excited to hear your presentation today. Whenever you're ready, feel free to share your screen, turn on your microphone, and begin.";
const voiceId = "d46abd1d-2d02-43e8-819f-51fb652c1c61";

fetch('http://localhost:3000/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, voiceId })
})
  .then(res => res.arrayBuffer())
  .then(buffer => {
    require('fs').writeFileSync('public/intro.mp3', Buffer.from(buffer));
    console.log("Saved public/intro.mp3 successfully.");
  })
  .catch(err => console.error(err));

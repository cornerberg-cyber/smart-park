const apiKey = 'AIzaSyDFSWIiO2_gxz42TFXZIq8AiPxXPdDn40M';
const models = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-3-flash-preview'
];

async function test() {
  for (const m of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
      });
      const data = await res.json();
      console.log(m, res.status, data.error ? data.error.message : 'OK');
    } catch(e) {
      console.log(m, 'Error:', e.message);
    }
  }
}
test();

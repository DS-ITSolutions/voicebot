// ===============================
// AI Voicebot – Schweizer Version (Railway-Stable)
// ===============================

import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";

const VoiceResponse = twilio.twiml.VoiceResponse;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// --- Logging ---
app.use((req, res, next) => {
  console.log(`📞 ${req.method} ${req.url}`);
  next();
});

// --- Eingehender Anruf ---
app.post("/twilio/voice", (req, res) => {
  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    input: "speech",
    action: "/twilio/process-speech",
    language: "de-DE"
  });
  gather.say("Hoi! Willkomme im Fitnessstudio. Worum geit’s?");
  res.type("text/xml");
  res.send(twiml.toString());
  console.log("✅ /twilio/voice ausgeliefert");
});

// --- Verarbeitung Sprache ---
app.post("/twilio/process-speech", (req, res) => {
  const speechText = req.body.SpeechResult || "";
  const twiml = new VoiceResponse();

  console.log(`🗣️ Benutzer sagte: "${speechText}"`);

  let antwort = "Ich han das nid genau verstande. Chasch das bitte wiederhole?";
  if (speechText.toLowerCase().includes("termin")) {
    antwort = "Okay, für wele Tag wotsch du en Termin?";
  } else if (speechText.toLowerCase().includes("zeit")) {
    antwort = "Mir hei offe vo 8 bis 20 Uhr, Montag bis Friitig.";
  }

  twiml.say({ language: "de-DE" }, antwort);
  twiml.redirect("/twilio/voice");

  res.type("text/xml");
  res.send(twiml.toString());
  console.log("✅ Antwort geschickt:", antwort);
});

// --- Root-Route ---
app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! Twilio-Endpoint: /twilio/voice");
});

// --- Server starten ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Voicebot läuft auf Port ${PORT}`);
});

// --- Railway Keep Alive ---
setInterval(() => {
  console.log("⏳ Keep-alive ping 🟢");
}, 1000 * 60 * 5);

// --- Dummy HTTP-Ping an sich selbst (Railway erkennt so Aktivität) ---
import http from "http";
setInterval(() => {
  http.get(`http://localhost:${PORT}`, (res) => {
    console.log("🌍 Self-ping:", res.statusCode);
  }).on("error", (err) => {
    console.error("❌ Ping-Fehler:", err.message);
  });
}, 1000 * 60 * 2); // alle 2 Minuten

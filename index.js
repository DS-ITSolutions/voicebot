// ===============================
// AI Voicebot – Schweizer Version
// ===============================

import express from "express"; // Webserver
import bodyParser from "body-parser"; // POST-Daten lesen
import twilio from "twilio"; // Twilio SDK

const VoiceResponse = twilio.twiml.VoiceResponse;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// --- Logging, um Twilio Requests zu sehen ---
app.use((req, res, next) => {
  console.log(`📞 ${req.method} ${req.url}`);
  next();
});

// 1️⃣ Eingehender Anruf
app.post("/twilio/voice", (req, res) => {
  try {
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
  } catch (error) {
    console.error("❌ Fehler in /twilio/voice:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 2️⃣ Verarbeitung der gesprochenen Antwort
app.post("/twilio/process-speech", (req, res) => {
  try {
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
  } catch (error) {
    console.error("❌ Fehler in /twilio/process-speech:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 3️⃣ Root-Route (zum Test im Browser)
app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! – Twilio Endpoint: /twilio/voice");
});

// 4️⃣ Server starten (Railway kompatibel)
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Voicebot läuft auf Port ${PORT}`);
});

// 5️⃣ Keep Alive, damit Railway den Container nicht stoppt
setInterval(() => {
  console.log("⏳ Keep-alive ping 🟢");
}, 1000 * 60 * 5); // alle 5 Minuten

import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const VoiceResponse = twilio.twiml.VoiceResponse;

// Logging aller Requests
app.use((req, res, next) => {
  console.log(`📞 ${req.method} ${req.url}`);
  next();
});

// Eingehender Anruf
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
  console.log("✅ Voice endpoint triggered");
});

// Sprachverarbeitung
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

// Root-Test
app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! Twilio-Endpoint: /twilio/voice");
});

// ---- Serverstart (Railway-kompatibel) ----
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Voicebot läuft auf Port ${PORT}`);
});

// ---- Keep Alive ----
setInterval(() => {
  console.log("⏳ Keep-alive ping 🟢");
}, 1000 * 60 * 5);

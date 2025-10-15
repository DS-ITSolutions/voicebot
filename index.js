import express from "express"; // Webserver
import bodyParser from "body-parser"; // damit wir POST-Daten lesen können
import twilio from "twilio"; // Twilio SDK für Voice / SMS

const VoiceResponse = twilio.twiml.VoiceResponse;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// 1️⃣ Route für eingehende Anrufe
app.post("/twilio/voice", (req, res) => {
  const twiml = new VoiceResponse();

  // Spracherkennung aktivieren
  const gather = twiml.gather({
    input: "speech", // Spracheingabe
    action: "/twilio/process-speech", // Weiterverarbeitung
    language: "de-DE" // Hochdeutsch für Start
  });

  // Begrüßung
  gather.say("Hoi! Willkomme im Fitnessstudio. Worum geit’s?");

  res.type("text/xml");
  res.send(twiml.toString());
});

// 2️⃣ Route für die Verarbeitung der gesprochenen Antwort
app.post("/twilio/process-speech", (req, res) => {
  const speechText = req.body.SpeechResult || "";
  const twiml = new VoiceResponse();

  let antwort = "Ich han das nid genau verstande. Chasch das bitte wiederhole?";

  // Einfache Logik für Termin-Anfragen
  if (speechText.includes("Termin")) {
    antwort = "Okay, für wele Tag wotsch du en Termin?";
  }

  twiml.say({ language: "de-DE" }, antwort);
  twiml.redirect("/twilio/voice"); // zurück zur Hauptroute

  res.type("text/xml");
  res.send(twiml.toString());
});

// Server starten auf Port 3000
app.listen(3000, () => console.log("Bot läuft auf Port 3000"));

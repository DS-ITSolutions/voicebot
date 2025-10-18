import express from "express"; // Webserver
import bodyParser from "body-parser"; // POST-Daten lesen
import twilio from "twilio"; // Twilio SDK

const VoiceResponse = twilio.twiml.VoiceResponse;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// 1️⃣ Route für eingehende Anrufe
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
  } catch (error) {
    console.error("Fehler in /twilio/voice:", error);
    res.status(500).send("Internal Server Error");
  }
});

// 2️⃣ Route für Verarbeitung der gesprochenen Antwort
app.post("/twilio/process-speech", (req, res) => {
  try {
    const speechText = req.body.SpeechResult || "";
    const twiml = new VoiceResponse();

    let antwort = "Ich han das nid genau verstande. Chasch das bitte wiederhole?";

    if (speechText.toLowerCase().includes("termin")) {
      antwort = "Okay, für wele Tag wotsch du en Termin?";
    }

    twiml.say({ language: "de-DE" }, antwort);
    twiml.redirect("/twilio/voice");

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (error) {
    console.error("Fehler in /twilio/process-speech:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot läuft auf Port ${PORT}`));

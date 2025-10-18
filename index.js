import express from "express";
import bodyParser from "body-parser";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const VoiceResponse = twilio.twiml.VoiceResponse;
const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 Funktion: GPT antwortet intelligent (Versteht Schweizerdeutsch)
async function askGPT(prompt, lang = "de") {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Du bist ein professioneller Telefonassistent in der Schweiz. " +
          "Verstehe Schweizerdeutsch, Hochdeutsch und Englisch. " +
          "Antworte höflich, klar und kurz. " +
          "Wenn der Anrufer Englisch spricht, antworte auf Englisch."
      },
      { role: "user", content: prompt }
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.8,
        max_tokens: 150
      })
    });

    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content || "Entschuldigung, das habe ich nicht verstanden.";
    console.log("🧠 GPT:", answer);
    return answer;
  } catch (err) {
    console.error("❌ GPT Fehler:", err);
    return "Entschuldigung, ich habe gerade Verbindungsprobleme.";
  }
}

// 📞 Haupt-Webhook für Twilio Voice
app.post("/twilio/voice", async (req, res) => {
  const twiml = new VoiceResponse();
  const speech = req.body.SpeechResult || "";
  console.log("📞 Neuer Anruf erkannt. SpeechResult:", speech);

  try {
    // Wenn kein Text erkannt wurde → Begrüssung
    if (!speech) {
      const gather = twiml.gather({
        input: "speech",
        action: "/twilio/voice",
        method: "POST",
        speechTimeout: "auto",
        language: "de-CH"
      });
      gather.say(
        { voice: "Polly.Vicki-Neural", language: "de-DE" },
        "Grüezi! Ich bin der virtuelle Assistent. Wie kann ich Ihnen helfen?"
      );
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // Sprache erkennen
    const isEnglish = /\b(hello|hi|appointment|english|book|meeting|schedule)\b/i.test(speech);

    // GPT um Antwort bitten
    const gptReply = await askGPT(speech, isEnglish ? "en" : "de");

    // Antwort sprechen
    twiml.say(
      { voice: isEnglish ? "Polly.Matthew-Neural" : "Polly.Vicki-Neural", language: isEnglish ? "en-US" : "de-DE" },
      gptReply
    );

    // Weitere Eingabe abwarten
    const gather = twiml.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST",
      speechTimeout: "auto",
      language: "de-CH"
    });
    gather.say(
      { voice: isEnglish ? "Polly.Matthew-Neural" : "Polly.Vicki-Neural", language: isEnglish ? "en-US" : "de-DE" },
      isEnglish ? "What else can I do for you?" : "Möchten Sie noch etwas hinzufügen?"
    );

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (err) {
    console.error("⚠️ Voice Fehler:", err);
    twiml.say("Entschuldigung, ich habe gerade ein technisches Problem.");
    res.type("text/xml");
    res.send(twiml.toString());
  }
});

// 🌍 Health Check (damit Railway nicht einschläft)
app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! Endpoint: /twilio/voice");
});

app.listen(PORT, () => {
  console.log(`🚀 Voicebot läuft auf Port ${PORT} – Twilio Webhook: /twilio/voice`);
});

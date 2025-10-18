// index.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import twilio from "twilio";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const VoiceResponse = twilio.twiml.VoiceResponse;
const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 GPT-Funktion für Textgenerierung
async function askGPT(prompt, lang = "de") {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Du bist ein freundlicher Telefonassistent in der Schweiz. " +
          "Du verstehst Schweizerdeutsch, Hochdeutsch und Englisch. " +
          "Antworte höflich, ruhig und kurz in der passenden Sprache. " +
          "Wenn jemand Englisch spricht, antworte auf Englisch. " +
          "Wenn jemand Schweizerdeutsch spricht, antworte in Hochdeutsch, aber freundlich."
      },
      { role: "user", content: prompt }
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    const data = await res.json();

    if (!data?.choices?.[0]) {
      console.error("❌ GPT error:", data);
      return "Entschuldigung, ich habe dich nicht verstanden.";
    }

    const answer = data.choices[0].message.content.trim();
    console.log("🧠 GPT Antwort:", answer);
    return answer;
  } catch (err) {
    console.error("❌ Fehler in askGPT:", err);
    return "Es tut mir leid, ich habe gerade Verbindungsprobleme.";
  }
}

// 📞 Twilio Voice Webhook
app.post("/twilio/voice", async (req, res) => {
  const twiml = new VoiceResponse();
  const speech = req.body.SpeechResult || "";

  console.log("📞 Eingehender Anruf. Gesprochen:", speech);

  try {
    // Begrüssung beim ersten Anruf
    if (!speech) {
      const gather = twiml.gather({
        input: "speech",
        action: "/twilio/voice",
        method: "POST",
        speechTimeout: "auto",
        language: "de-CH",
      });

      gather.say(
        {
          voice: "Polly.Vicki-Neural",
          language: "de-DE",
        },
        "Grüezi! Ich bin der digitale Assistent. Wie kann ich Ihnen helfen?"
      );

      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // Sprachlogik erkennen
    const isEnglish = /\b(hello|hi|appointment|english|book|schedule|meeting)\b/i.test(speech);
    const gptReply = await askGPT(speech, isEnglish ? "en" : "de");

    // Antwort sprechen
    twiml.say(
      {
        voice: isEnglish ? "Polly.Matthew-Neural" : "Polly.Vicki-Neural",
        language: isEnglish ? "en-US" : "de-DE",
      },
      gptReply
    );

    // Weitere Eingabe erwarten
    const gather = twiml.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST",
      speechTimeout: "auto",
      language: "de-CH",
    });

    gather.say(
      {
        voice: isEnglish ? "Polly.Matthew-Neural" : "Polly.Vicki-Neural",
        language: isEnglish ? "en-US" : "de-DE",
      },
      isEnglish ? "What else can I help you with?" : "Kann ich sonst noch etwas für Sie tun?"
    );

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (err) {
    console.error("⚠️ Fehler im Voice Handler:", err);
    twiml.say("Entschuldigung, es gab ein Problem mit der Verbindung.");
    res.type("text/xml");
    res.send(twiml.toString());
  }
});

// 🌍 Healthcheck für Railway
app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! Endpoint: /twilio/voice");
});

app.listen(PORT, () => {
  console.log(`🚀 Voicebot aktiv auf Port ${PORT}`);
});

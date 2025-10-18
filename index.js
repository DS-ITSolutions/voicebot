import express from "express";
import fetch from "node-fetch";
import twilio from "twilio";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const VoiceResponse = twilio.twiml.VoiceResponse;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 GPT-Antwort abrufen
async function askGPT(prompt, lang = "de") {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Du bist ein freundlicher Telefonassistent für Kunden in der Schweiz. " +
          "Verstehe Schweizerdeutsch, Hochdeutsch und Englisch. " +
          "Antworte normalerweise auf Hochdeutsch, ausser der Anrufer spricht Englisch."
      },
      { role: "user", content: prompt }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.8,
        max_tokens: 150
      })
    });

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Entschuldigung, das habe ich nicht verstanden.";
    console.log("🧠 GPT Antwort:", answer);
    return answer;
  } catch (error) {
    console.error("⚠️ GPT Fehler:", error);
    return "Entschuldigung, da ist etwas schiefgelaufen.";
  }
}

// 📞 Voice Endpoint
app.post("/twilio/voice", async (req, res) => {
  const twiml = new VoiceResponse();
  const speech = req.body.SpeechResult || "";

  console.log("📞 Eingehender Call");
  console.log("🎙️ SpeechResult:", speech);

  // Wenn noch keine Spracheingabe da ist
  if (!speech) {
    const gather = twiml.gather({
      input: "speech",
      language: "de-CH",
      speechTimeout: "auto",
      action: "/twilio/voice",
      method: "POST"
    });
    gather.say(
      { voice: "Polly.Vicki-Neural", language: "de-DE" },
      "Hallo! Ich bin dein digitaler Assistent. Wie kann ich dir helfen?"
    );
    res.type("text/xml");
    return res.send(twiml.toString());
  }

  // Sprache erkennen (Deutsch oder Englisch)
  const isEnglish = /\b(hi|hello|appointment|english|speak english|book|meeting)\b/i.test(speech);

  const gptReply = await askGPT(speech, isEnglish ? "en" : "de");

  // Antwort laut vorlesen
  twiml.say(
    { voice: isEnglish ? "Polly.Matthew-Neural" : "Polly.Vicki-Neural", language: isEnglish ? "en-US" : "de-DE" },
    gptReply
  );

  // Nächste Eingabe erlauben
  const gather = twiml.gather({
    input: "speech",
    language: "de-CH",
    speechTimeout: "auto",
    action: "/twilio/voice",
    method: "POST"
  });
  gather.say(
    { voice: isEnglish ? "Polly.Matthew-Neural" : "Polly.Vicki-Neural", language: isEnglish ? "en-US" : "de-DE" },
    isEnglish ? "What else can I do for you?" : "Möchtest du noch etwas fragen?"
  );

  res.type("text/xml");
  res.send(twiml.toString());
});

// 🌐 Serverstart
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🤖 Voicebot läuft! Twilio-Endpoint: /twilio/voice auf Port ${PORT}`);
});

import express from "express";
import fetch from "node-fetch";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));

const { VoiceResponse } = twilio;

// Dein OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 GPT-Anfrage
async function askGPT(question) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Du bisch en hilfsbereite, sympathische Assistentin, wo im Schwiizerdütsch redt. Antworte natürlich, kurz und freundlich.",
        },
        { role: "user", content: question },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Ich ha di nöd verstande. Chasch das bitte nomal säge?";
}

// 🎧 Voice-Webhook
app.post("/twilio/voice", async (req, res) => {
  const twiml = new VoiceResponse();
  const speechResult = req.body.SpeechResult;
  const isNewCall = !speechResult;

  if (isNewCall) {
    // 🗣️ Begrüssung beim Start
    const gather = twiml.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST",
      language: "de-DE", // besseres Deutsch-Recognition
      timeout: 5,
    });
    gather.say(
      { voice: "Polly.Vicki" },
      "Grüezi! Ich bi dä Voicebot vo dim Gschäft. Wie cha ich Ihne hälfe?"
    );
  } else {
    // 🎙️ Antwort mit GPT
    const gptReply = await askGPT(speechResult);

    const gather = twiml.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST",
      language: "de-DE",
      timeout: 5,
    });
    gather.say(
      { voice: "Polly.Marlene" },
      gptReply
    );
  }

  res.type("text/xml");
  res.send(twiml.toString());
});

app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! Twilio Endpoint: /twilio/voice");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Voicebot läuft auf Port ${PORT}`));

import express from "express";
import twilio from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));

const { VoiceResponse } = twilio;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// GPT-Funktion (mit eingebautem fetch von Node.js 18+)
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
            "Du bisch en hilfsbereite, sympathische Assistentin, wo im Schwiizerdütsch redt. Sprich natürlich, kurz und freundlich.",
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

  try {
    if (isNewCall) {
      const gather = twiml.gather({
        input: "speech",
        action: "/twilio/voice",
        method: "POST",
        language: "de-DE",
        timeout: 5,
      });
      gather.say({ voice: "Polly.Vicki" }, "Grüezi! Ich bi dä Voicebot vo dim Gschäft. Wie cha ich Ihne hälfe?");
    } else {
      const gptReply = await askGPT(speechResult);
      const gather = twiml.gather({
        input: "speech",
        action: "/twilio/voice",
        method: "POST",
        language: "de-DE",
        timeout: 5,
      });
      gather.say({ voice: "Polly.Marlene" }, gptReply);
    }

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (err) {
    console.error("❌ Fehler:", err);
    const twimlError = new VoiceResponse();
    twimlError.say(
      { voice: "Polly.Vicki" },
      "Oh nei, es isch öppis schief gloffe. Bitte probiers nomal spöter."
    );
    res.type("text/xml");
    res.send(twimlError.toString());
  }
});

app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! Twilio Endpoint: /twilio/voice");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Voicebot läuft auf Port ${PORT}`));

import express from "express";
import twilio from "twilio";
import fetch from "node-fetch"; // Wichtig, falls Railway Node 16 verwendet!

const app = express();
app.use(express.urlencoded({ extended: false }));

const { VoiceResponse } = twilio;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 GPT-Funktion (Schweizerdeutsch, freundlich & natürlich)
async function askGPT(question) {
  try {
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
              "Du bisch en hilfsbereiti, sympathischi Assistentin, wo im Schwiizerdütsch redt. Sprich natürlich, locker und nöd wie e Roboter.",
          },
          { role: "user", content: question },
        ],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Ich ha di nöd verstande, chasch das bitte nomal säge?";
  } catch (err) {
    console.error("Fehler bi GPT:", err);
    return "Oh nei, öppis isch schief gloffe. Probier bitte nomal.";
  }
}

// 🎧 Voice-Webhook (Twilio)
app.post("/twilio/voice", async (req, res) => {
  const twiml = new VoiceResponse();
  const speechResult = req.body.SpeechResult;
  const isNewCall = !speechResult;

  try {
    if (isNewCall) {
      // 👋 Begrüssung beim Anruf
      const gather = twiml.gather({
        input: "speech",
        action: "/twilio/voice",
        method: "POST",
        language: "de-DE",
        timeout: 5,
      });
      gather.say({ voice: "Polly.Vicki" }, "Grüezi! Ich bi dä digitale Assistent. Wie cha ich Ihne hälfe?");
    } else {
      // 🧠 GPT-Antwort holen
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
    console.error("❌ Fehler im Voice-Webhook:", err);
    const errorTwiml = new VoiceResponse();
    errorTwiml.say(
      { voice: "Polly.Vicki" },
      "Oh nei, es isch öppis schief gloffe. Bitte probiers nomal spöter."
    );
    res.type("text/xml");
    res.send(errorTwiml.toString());
  }
});

// 🌍 Test-Route für Browser
app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! Twilio Endpoint: /twilio/voice");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Voicebot läuft auf Port ${PORT}`));

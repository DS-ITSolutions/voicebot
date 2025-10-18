import express from "express";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: false }));

const { VoiceResponse } = twilio;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🧠 GPT-Funktion (versteht Schweizerdeutsch)
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
              "Du bisch en hilfsbereiti, sympathischi Assistentin im Schwiizerdütsch. Versteh au Dialäkt, und red locker und professionell. Wenn dä User e Termin oder Information will, frag gnau nach und bestätig’s.",
          },
          { role: "user", content: question },
        ],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Ich ha di nöd verstande, chasch das bitte nomal säge?";
  } catch (err) {
    console.error("❌ GPT Fehler:", err);
    return "Oh nei, öppis isch schief gloffe. Probier bitte nomal.";
  }
}

// 🎧 Twilio Voice Webhook
app.post("/twilio/voice", async (req, res) => {
  const twiml = new VoiceResponse();
  const speechResult = req.body.SpeechResult;
  const isNewCall = !speechResult;

  try {
    if (isNewCall) {
      // Begrüssung
      const gather = twiml.gather({
        input: "speech",
        action: "/twilio/voice",
        method: "POST",
        language: "de-CH", // 🇨🇭 Schweizerdeutsch besser erkannt
        timeout: 7,
      });
      gather.say({ voice: "Polly.Marlene" }, "Grüezi mitenand! Ich bi dä digitale Assistent. Wie cha ich Ihne hälfe?");
    } else {
      const gptReply = await askGPT(speechResult);

      const gather = twiml.gather({
        input: "speech",
        action: "/twilio/voice",
        method: "POST",
        language: "de-CH",
        timeout: 7,
      });
      gather.say({ voice: "Polly.Marlene" }, gptReply);
    }

    res.type("text/xml");
    res.send(twiml.toString());
  } catch (err) {
    console.error("❌ Voice Fehler:", err);
    const errorTwiml = new VoiceResponse();
    errorTwiml.say(
      { voice: "Polly.Marlene" },
      "Oh nei, es isch öppis schief gloffe. Bitte probiers nomal spöter."
    );
    res.type("text/xml");
    res.send(errorTwiml.toString());
  }
});

// 🌍 Test Route
app.get("/", (req, res) => {
  res.send("🤖 Voicebot läuft! Endpoint: /twilio/voice");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Voicebot läuft uf Port ${PORT}`));

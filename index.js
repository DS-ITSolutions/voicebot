import express from "express";
import twilio from "twilio";
import fetch from "node-fetch";

const app = express();
app.use(express.urlencoded({ extended: false }));

// === OpenAI API Key aus Railway Environment ===
const openai_api_key = process.env.OPENAI_API_KEY;

// === Twilio Voice Webhook ===
app.post("/twilio/voice", async (req, res) => {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  try {
    // Wenn Twilio Sprache erkannt hat
    const speech = req.body.SpeechResult || "Hallo!";

    console.log("📞 Eingabe erkannt:", speech);

    // === Anfrage an ChatGPT ===
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openai_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
              Du bist ein freundlicher, professioneller Schweizer KI-Assistent.
              Du sprichst in Schweizer Hochdeutsch, aber mit leichtem schweizerischem Ausdruck.
              Halte die Antworten kurz, natürlich und angenehm im Tonfall.
            `
          },
          { role: "user", content: speech }
        ],
      }),
    });

    const data = await gptResponse.json();
    const antwort = data.choices?.[0]?.message?.content?.trim() || "Ich ha di nöd verstande, chasch das bitte nomal säge?";

    console.log("🤖 Antwort von GPT:", antwort);

    // === Sprachausgabe (Text-to-Speech) ===
    twiml.say(
      { language: "de-CH", voice: "Polly.Marlene" },
      antwort
    );

    // Optional: Nach der Antwort erneut zuhören
    twiml.gather({
      input: "speech",
      action: "/twilio/voice",
      method: "POST",
      language: "de-CH"
    });

    res.type("text/xml");
    res.send(twiml.toString());

  } catch (err) {
    console.error("❌ Fehler:", err);
    twiml.say(
      { language: "de-CH", voice: "Polly.Marlene" },
      "Entschuldigung, es isch öppis schief gloffe."
    );
    res.type("text/xml");
    res.send(twiml.toString());
  }
});

app.get("/", (req, res) => {
  res.send("🎙️ Voicebot läuft! Twilio Endpoint: /twilio/voice");
});

// Railway Port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Voicebot läuft auf Port ${PORT}`));

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Healthcare Email Analyzer is running!' });
});

app.post('/', async (req, res) => {
  try {
    const { subject, from, body } = req.body;
    
    if (!subject || !from || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subject, from, body'
      });
    }
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `You are a medical triage assistant. Analyze this patient email and provide a structured summary.

Email Details:
From: ${from}
Subject: ${subject}
Body: ${body}

Provide a JSON response with:
{
  "summary": "Brief 2-3 sentence summary",
  "conditions": ["list", "of", "conditions"],
  "patientIntent": "What patient wants (appointment, refill, etc)",
  "concerningInfo": "Any red flags or null if none",
  "urgencyLevel": "low|medium|high|critical",
  "urgencyReason": "Brief explanation"
}

Urgency levels:
- critical: Life-threatening, severe pain, suicidal ideation
- high: Urgent, needs same-day attention
- medium: Address within 1-3 days
- low: Routine, can wait

Respond ONLY with valid JSON.`
      }]
    });
    
    // Extract and clean the response
    let responseText = message.content[0].text;
    
    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Trim whitespace
    responseText = responseText.trim();
    
    // Parse JSON
    const analysis = JSON.parse(responseText);
    
    res.json({ success: true, analysis });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAiService {
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async generate(prompt: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o', // Cambiado de gpt-4o-mini a gpt-4o (más inteligente)
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en cine y televisión con conocimiento enciclopédico actualizado. REGLAS CRÍTICAS: 1) Si el usuario especifica un AÑO, SOLO recomienda títulos de ese año exacto. 2) Si pide SERIES, SOLO series (mediaType: tv). 3) Si pide PELÍCULAS, SOLO películas (mediaType: movie). 4) Siempre respondes con exactamente 8 títulos DIFERENTES, uno por línea, sin numeración ni descripciones. 5) Prioriza PRECISIÓN sobre popularidad.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7, // Balance entre creatividad y precisión
      max_tokens: 500,
      presence_penalty: 0.3, // Reduce repetición de temas
      frequency_penalty: 0.2, // Reduce repetición de palabras
    });

    const response = completion.choices[0].message.content?.trim() ?? '';
    console.log('🤖 OpenAI response length:', response.length, 'tokens used:', completion.usage?.total_tokens);
    return response;
  }
}

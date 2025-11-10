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
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un recomendador experto de películas y series. Siempre respondes con exactamente 5 títulos, uno por línea, sin numeración ni descripciones.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8, // Un poco más de creatividad
      max_tokens: 500, // Aumentado para permitir 5 títulos completos
    });

    const response = completion.choices[0].message.content?.trim() ?? '';
    console.log('🤖 OpenAI response length:', response.length, 'tokens used:', completion.usage?.total_tokens);
    return response;
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { OpenAiService } from '../../infrastructure/ai/openai.service';
import { USER_DATA_REPOSITORY, UserDataRepository } from '../ports/user-data.repository';

@Injectable()
export class GenerateRecommendationsUseCase {
  constructor(
    private readonly openAi: OpenAiService,
    @Inject(USER_DATA_REPOSITORY)
    private readonly userDataRepo: UserDataRepository,
  ) {}

  async execute(userId: string): Promise<string[]> {
    const [seen, favorites, ratings] = await Promise.all([
      this.userDataRepo.getSeenItems(userId),
      this.userDataRepo.getFavorites(userId),
      this.userDataRepo.getRatings(userId),
    ]);

    const prompt = `Soy un recomendador de películas y series. Basado en lo siguiente:

    🎬 Vistos: ${seen.map((s) => s.title).join(', ')}
    ⭐ Favoritos: ${favorites.map((f) => f.title).join(', ')}
    📝 Puntuaciones: ${ratings.map((r) => `${r.title} (${r.rating}/5)`).join(', ')}

    Recomienda 5 películas o series que podrían gustarle. Solo nombres, separados por coma o numerados.`;

    const rawResponse = await this.openAi.generate(prompt);

    return this.parseRecommendations(rawResponse);
  }

  private parseRecommendations(rawResponse: string): string[] {
    const fullText = Array.isArray(rawResponse) ? rawResponse.join('\n') : rawResponse;

    const matches = fullText.match(/\d+\.\s+[^\n]+/g);

    if (!matches) return [];

    return matches.map(line =>
      line.replace(/^\d+\.\s*/, '').trim()
    );
  }
}

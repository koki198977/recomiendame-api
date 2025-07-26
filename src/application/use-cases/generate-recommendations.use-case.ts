import { Inject, Injectable } from '@nestjs/common';
import { OpenAiService } from '../../infrastructure/ai/openai.service';
import { USER_DATA_REPOSITORY, UserDataRepository } from '../ports/user-data.repository';
import { RECOMMENDATION_REPOSITORY, RecommendationRepository } from '../ports/recommendation.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { Recommendation } from 'src/domain/entities/recommendation';
import { ActivityLog } from 'src/domain/entities/activity-log';
import { TmdbService } from 'src/infrastructure/tmdb/tmdb.service';
import cuid from 'cuid';

@Injectable()
export class GenerateRecommendationsUseCase {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly tmdb: TmdbService,
    @Inject(USER_DATA_REPOSITORY)
    private readonly userDataRepo: UserDataRepository,
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepo: RecommendationRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepo: ActivityLogRepository,
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
    const parsed = this.parseRecommendations(rawResponse);

    await Promise.all(
      parsed.map(async (title) => {
        const searchResult = await this.tmdb.search(title);
        const firstMatch = searchResult[0];

        const tmdbId = firstMatch?.id ?? 0;
        const reason = `Recomendado por similitud con tus gustos`;

        // Persistir recomendación
        await this.recommendationRepo.save(
          new Recommendation(cuid(), userId, tmdbId, title, reason, new Date())
        );

        // Registrar en actividad
        await this.activityLogRepo.log(
          new ActivityLog(
            undefined,
            userId,
            'recommended',
            tmdbId,
            title,
            undefined,
            reason,
            new Date(),
          )
        );
      })
    );

    return parsed;
  }

  private parseRecommendations(rawResponse: string): string[] {
    const fullText = Array.isArray(rawResponse) ? rawResponse.join('\n') : rawResponse;
    const matches = fullText.match(/\d+\.\s+[^\n]+/g);
    if (!matches) return [];
    return matches.map(line => line.replace(/^\d+\.\s*/, '').trim());
  }
}

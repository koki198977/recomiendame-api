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
    const [seen, favorites, ratings, previous] = await Promise.all([
      this.userDataRepo.getSeenItems(userId),
      this.userDataRepo.getFavorites(userId),
      this.userDataRepo.getRatings(userId),
      this.recommendationRepo.findLatestByUser(userId, 10),
    ]);

    const previouslyRecommendedTitles = previous.map((r) => r.title.toLowerCase());
    const prompt = `Eres un recomendador de películas y series. 
      Recomienda exactamente 5 títulos que aún NO hayan sido vistos, favoritos ni recomendados previamente. 
      NO repitas títulos.

      Basado en los siguientes gustos del usuario:

      🎬 Vistos: ${seen.map((s) => s.title).join(', ')}
      ⭐ Favoritos: ${favorites.map((f) => f.title).join(', ')}
      📝 Puntuaciones: ${ratings.map((r) => `${r.title} (${r.rating}/5)`).join(', ')}
      ❌ Ya recomendadas: ${previouslyRecommendedTitles.join(', ')}

      Devuelve solo los nombres de las películas o series, separados por coma o numerados.`;

    const rawResponse = await this.openAi.generate(prompt);
    const parsed = this.parseRecommendations(rawResponse);

    await Promise.all(
      parsed.map(async (title) => {
        const searchResult = await this.tmdb.search(title);
        const firstMatch = searchResult[0];

        const tmdbId = firstMatch?.id ?? 0;
        const reason = `Recomendado por similitud con tus gustos`;
        try{
          const genreIds = Array.isArray(firstMatch.genreIds) ? firstMatch.genreIds : [];

          // Persistir recomendación
          await this.recommendationRepo.save(
            new Recommendation(
              cuid(),
              userId,
              tmdbId,
              firstMatch.title,
              reason,
              new Date(),
              firstMatch.posterUrl,
              firstMatch.overview,
              firstMatch.releaseDate ? new Date(firstMatch.releaseDate) : null,
              firstMatch.genreIds || [],
              firstMatch.popularity,
              firstMatch.voteAverage,
              firstMatch.mediaType,
            )
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
        } catch (error) {
          if (this.isUniqueConstraintError(error)) {
            console.log(`🔁 Ya se había recomendado: ${title} (tmdbId: ${tmdbId})`);
          } else {
            throw error;
          }
        }
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

  isUniqueConstraintError(error: any): boolean {
    return error?.code === 'P2002'; // código de Prisma para "Unique constraint failed"
  }

}

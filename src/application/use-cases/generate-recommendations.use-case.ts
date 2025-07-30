import { Inject, Injectable } from '@nestjs/common';
import { OpenAiService } from '../../infrastructure/ai/openai.service';
import { USER_DATA_REPOSITORY, UserDataRepository } from '../ports/user-data.repository';
import { RECOMMENDATION_REPOSITORY, RecommendationRepository } from '../ports/recommendation.repository';
import { ACTIVITY_LOG_REPOSITORY, ActivityLogRepository } from '../ports/activity-log.repository';
import { USER_REPOSITORY, UserRepository } from '../ports/user.repository';
import { Recommendation } from 'src/domain/entities/recommendation';
import { ActivityLog } from 'src/domain/entities/activity-log';
import { TmdbService } from 'src/infrastructure/tmdb/tmdb.service';
import cuid from 'cuid';
import { TMDB_REPOSITORY, TmdbRepository } from '../ports/tmdb.repository';
import { Tmdb } from 'src/domain/entities/tmdb';

@Injectable()
export class GenerateRecommendationsUseCase {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly tmdb: TmdbService,
    @Inject(USER_DATA_REPOSITORY)
    private readonly userDataRepo: UserDataRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendationRepo: RecommendationRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY)
    private readonly activityLogRepo: ActivityLogRepository,
    @Inject(TMDB_REPOSITORY)
    private readonly tmdbRepository: TmdbRepository,
  ) {}

  async execute(userId: string): Promise<Recommendation[]> {
    const [seen, favorites, ratings, previous, user] = await Promise.all([
      this.userDataRepo.getSeenItems(userId),
      this.userDataRepo.getFavorites(userId),
      this.userDataRepo.getRatings(userId),
      this.recommendationRepo.findLatestByUser(userId, 10),
      this.userRepo.findById(userId),
    ]);

    const previouslyRecommendedTitles = previous.map((r) => r.tmdb?.title.toLowerCase());
    const favoriteGenres = user?.favoriteGenres || [];

    const prompt = `Eres un recomendador de películas y series.
        Recomienda exactamente 5 títulos que aún NO hayan sido vistos, favoritos ni recomendados previamente.
        NO repitas títulos y prioriza los siguientes géneros favoritos del usuario: ${favoriteGenres.join(', ') || 'ninguno'}.

        🎬 Vistos: ${seen.map((s) => s.tmdb?.title).join(', ') || 'ninguno'}
        ⭐ Favoritos: ${favorites.map((f) => f.tmdb?.title).join(', ') || 'ninguno'}
        📝 Puntuaciones: ${ratings.map((r) => `${r.tmdb?.title} (${r.rating}/5)`).join(', ') || 'ninguna'}
        ❌ Ya recomendadas: ${previouslyRecommendedTitles.join(', ') || 'ninguna'}

        Devuelve solo los nombres de las películas o series, separados por coma o numerados.`;
    

    const rawResponse = await this.openAi.generate(prompt);
    const parsed = this.parseRecommendations(rawResponse);

    const savedRecommendations: Recommendation[] = [];

    await Promise.all(
      parsed.map(async (title) => {
        const searchResult = await this.tmdb.search(title);
        const firstMatch = searchResult[0];

        if (!firstMatch) {
          console.warn(`🔍 No se encontró resultado para: "${title}"`);
          return;
        }

        const tmdbId = firstMatch.id;
        const reason = `Recomendado por similitud con tus gustos`;

        try {
          const genreIds = Array.isArray(firstMatch.genreIds) ? firstMatch.genreIds : [];
          const popularity = typeof firstMatch.popularity === 'number' ? firstMatch.popularity : 0;
          const voteAverage = typeof firstMatch.voteAverage === 'number' ? firstMatch.voteAverage : 0;
          const mediaType = firstMatch.mediaType ?? 'movie';

          await this.tmdbRepository.save(
            new Tmdb(
              tmdbId,
              firstMatch.title,
              new Date(),
              firstMatch.posterUrl ?? undefined,
              firstMatch.overview ?? undefined,
              firstMatch.releaseDate ? new Date(firstMatch.releaseDate) : undefined,
              genreIds,
              popularity,
              voteAverage,
              mediaType,
              firstMatch.platforms ?? [],
              firstMatch.trailerUrl ?? undefined,
            )
          );

          const recommendation = new Recommendation(
            cuid(),
            userId,
            tmdbId,
            reason,
            new Date(),
          );

          await this.recommendationRepo.save(recommendation);
          savedRecommendations.push(recommendation);

          await this.activityLogRepo.log(
            new ActivityLog(
              undefined,
              userId,
              'recommended',
              tmdbId,
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


    return savedRecommendations;
  }

  private parseRecommendations(rawResponse: string): string[] {
    const fullText = Array.isArray(rawResponse) ? rawResponse.join('\n') : rawResponse;

    const matches = fullText.match(/\d+\.\s+[^\n]+/g);
    let titles: string[] = [];

    if (matches) {
      titles = matches.map((line) => line.replace(/^\d+\.\s*/, '').trim());
    } else {
      titles = fullText
        .split(',')
        .map((title) => title.trim())
        .filter((title) => title.length > 0);
    }

    return titles.map((t) => {
      const match = t.match(/"(.+?)"/);
      return match ? match[1] : t;
    });
  }


  isUniqueConstraintError(error: any): boolean {
    return error?.code === 'P2002';
  }
}

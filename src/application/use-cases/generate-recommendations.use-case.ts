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

  async execute(userId: string, feedback?: string, tmdbId?: number): Promise<Recommendation[]> {
    // 1. Obtengo todos los datos
    const [seen, favorites, ratings, previous, user] = await Promise.all([
      this.userDataRepo.getSeenItems(userId),
      this.userDataRepo.getFavorites(userId),
      this.userDataRepo.getRatings(userId),
      this.recommendationRepo.findLatestByUser(userId, 10),
      this.userRepo.findById(userId),
    ]);

    const favoriteGenres = user?.favoriteGenres || [];

    // 2. Saco sólo los últimos 5 de cada uno
    const last5 = <T>(arr: T[]) => arr.slice(-5);
    const seen5    = last5(seen.map(s => s.tmdb?.title).filter(Boolean) as string[]);
    const fav5     = last5(favorites.map(f => f.tmdb?.title).filter(Boolean) as string[]);
    const ratings5 = last5(ratings.map(r => `${r.tmdb?.title} (${r.rating}/5)`).filter(Boolean) as string[]);
    const prev5    = last5(previous.map(r => r.tmdb?.title.toLowerCase()).filter(Boolean) as string[]);

    // 3. Construyo dinámicamente las secciones del prompt
    const sections: string[] = [];

    // Encabezado según feedback o no
    if (feedback) {
      sections.push(
        'Eres un recomendador personalizado de películas y series. A partir del siguiente texto del usuario, genera 5 títulos relevantes sin repetir anteriores.'
      );
      sections.push(`🧠 Feedback del usuario: ${feedback}`);
    } else {
      sections.push(
        'Eres un recomendador de películas y series. Recomienda exactamente 5 títulos que aún NO hayan sido vistos, favoritos ni recomendados previamente.'
      );
      if (favoriteGenres.length) {
        sections.push(
          `Prioriza los géneros favoritos del usuario: ${favoriteGenres.join(', ')}`
        );
      }
    }

    // Añadir cada sección sólo si hay datos
    if (seen5.length)    sections.push(`🎬 Vistos (últ. 5): ${seen5.join(', ')}`);
    if (fav5.length)     sections.push(`⭐ Favoritas (últ. 5): ${fav5.join(', ')}`);
    if (ratings5.length) sections.push(`📝 Puntuaciones (últ. 5): ${ratings5.join(', ')}`);
    if (prev5.length)    sections.push(`❌ Ya recomendadas (últ. 5): ${prev5.join(', ')}`);

    // Si hay un título “gustado” específico
    if (tmdbId) {
      const liked = await this.tmdbRepository.findById(tmdbId);
      if (liked?.title) {
        sections.push(`👍 Le gustó: ${liked.title}`);
      }
    }

    // 4. Instrucción final: sólo títulos
    sections.push(
      '⚠️ Importante: responde únicamente con los nombres de las películas o series, uno por línea, sin numeración, sin comillas ni descripciones.'
    );

    // 5. Uno todo en un solo string
    const prompt = sections.join('\n').trim();
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

        const tmdbIdMatch = firstMatch.id;
        const reason = `Recomendado por similitud con tus gustos`;

        try {
          const genreIds   = Array.isArray(firstMatch.genreIds) ? firstMatch.genreIds : [];
          const popularity = typeof firstMatch.popularity === 'number' ? firstMatch.popularity : 0;
          const voteAvg    = typeof firstMatch.voteAverage === 'number' ? firstMatch.voteAverage : 0;
          const mediaType  = firstMatch.mediaType ?? 'movie';

          await this.tmdbRepository.save(
            new Tmdb(
              tmdbIdMatch,
              firstMatch.title,
              new Date(),
              firstMatch.posterUrl ?? undefined,
              firstMatch.overview ?? undefined,
              firstMatch.releaseDate ? new Date(firstMatch.releaseDate) : undefined,
              genreIds,
              popularity,
              voteAvg,
              mediaType,
              firstMatch.platforms ?? [],
              firstMatch.trailerUrl ?? undefined,
            )
          );

          const recommendation = new Recommendation(
            cuid(),
            userId,
            tmdbIdMatch,
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
              tmdbIdMatch,
              reason,
              new Date(),
            )
          );
        } catch (error) {
          if (this.isUniqueConstraintError(error)) {
            console.log(`🔁 Ya se había recomendado: ${title} (tmdbId: ${tmdbIdMatch})`);
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
    return fullText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  private isUniqueConstraintError(error: any): boolean {
    return error?.code === 'P2002';
  }
}

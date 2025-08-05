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
import { RecommendationResponse } from 'src/domain/entities/recommendation.response';

@Injectable()
export class GenerateRecommendationsUseCase {
  constructor(
    private readonly openAi: OpenAiService,
    private readonly tmdbService: TmdbService,
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

  async execute(
    userId: string,
    feedback?: string,
    tmdbId?: number
  ): Promise<RecommendationResponse[]> {
    // 1) Cargar datos en paralelo
    const [
      seenItems,
      favorites,
      ratings,
      recentRecs,
      allRecs,
      user
    ] = await Promise.all([
      this.userDataRepo.getSeenItems(userId),
      this.userDataRepo.getFavorites(userId),
      this.userDataRepo.getRatings(userId),
      this.recommendationRepo.findLatestByUser(userId, 10),
      this.recommendationRepo.findAllByUser(userId),
      this.userRepo.findById(userId),
    ]);

    const favoriteGenres    = user?.favoriteGenres || [];
    const favoriteMediaText = user?.favoriteMedia?.trim() || '';
    const recentTitles = new Set(
      recentRecs.filter(r => !!r.tmdb).map(r => r.tmdb!.title.toLowerCase())
    );
    const allPrevIds   = new Set(allRecs.map(r => r.tmdbId));

    const last5 = <T>(arr: T[]) => arr.slice(-5);
    const seen5    = last5(seenItems.filter(i => !!i.tmdb).map(i => i.tmdb!.title));
    const fav5     = last5(favorites.filter(f => !!f.tmdb).map(f => f.tmdb!.title));
    const ratings5 = last5(
      ratings
        .filter(r => !!r.tmdb)
        .map(r => `${r.tmdb!.title} (${r.rating}/5)`)
    );

    const sections: string[] = [];
    if (feedback) {
      sections.push('Eres un recomendador personalizado de películas y series. A partir del siguiente texto del usuario, genera 5 títulos relevantes sin repetir anteriores.');
      sections.push(`🧠 Feedback del usuario: ${feedback}`);
    } else {
      sections.push('Eres un recomendador de películas y series. Recomienda exactamente 5 títulos que aún NO hayan sido vistos, favoritos ni recomendados previamente.');
      if (favoriteGenres.length) {
        sections.push(`Prioriza los géneros favoritos del usuario: ${favoriteGenres.join(', ')}`);
      }
    }
    if (!recentRecs.length && favoriteMediaText) {
      sections.push(`📝 Sobre sus gustos: ${favoriteMediaText}`);
    }
    if (seen5.length)    sections.push(`🎬 Vistos (últ. 5): ${seen5.join(', ')}`);
    if (fav5.length)     sections.push(`⭐ Favoritas (últ. 5): ${fav5.join(', ')}`);
    if (ratings5.length) sections.push(`📝 Puntuaciones (últ. 5): ${ratings5.join(', ')}`);
    if (recentRecs.length) {
      const prev5 = last5(
        recentRecs
          .filter(r => !!r.tmdb)
          .map(r => r.tmdb!.title.toLowerCase())
      );
      sections.push(`❌ Ya recomendadas (últ. 5): ${prev5.join(', ')}`);
    }
    sections.push('⚠️ Si no puedes generar los 5 nuevos, completa con populares según la crítica.');
    sections.push('⚠️ Responde únicamente con los nombres, uno por línea, sin numeración ni descripciones.');

    const prompt = sections.join('\n');
    const raw    = await this.openAi.generate(prompt);
    const parsed = this.parseRecommendations(raw);

    const unique = Array.from(new Set(parsed))
      .filter(title => !recentTitles.has(title.toLowerCase()));

    let finalTitles = unique.slice(0, 5);
    if (finalTitles.length < 5) {
      const need = 5 - finalTitles.length;
      const trendingItems = await this.tmdbService.getTrending(need);
      for (const t of trendingItems) {
        if (finalTitles.length >= 5) break;
        if (!finalTitles.includes(t.title)) {
          finalTitles.push(t.title);
        }
      }
    }

    const tmdbResults = await Promise.all(finalTitles.map(t => this.tmdbService.search(t)));

    const newTmdbs: Tmdb[] = [];
    const newRecs: Recommendation[] = [];
    const newLogs: ActivityLog[] = [];
    const entities: Recommendation[] = [];

    for (const results of tmdbResults) {
      const first = results[0];
      if (!first) continue;
      const isNew = !allPrevIds.has(first.id);

      if (isNew) {
        newTmdbs.push(new Tmdb(
          first.id,
          first.title,
          new Date(),
          first.posterUrl,
          first.overview,
          first.releaseDate ? new Date(first.releaseDate) : undefined,
          first.genreIds || [],
          first.popularity || 0,
          first.voteAverage || 0,
          first.mediaType,
          first.platforms || [],
          first.trailerUrl,
        ));
      }

      const recEntity = new Recommendation(
        cuid(),
        userId,
        first.id,
        'Recomendado por IA',
        new Date(),
        first,
      );
      entities.push(recEntity);

      if (isNew) {
        newRecs.push(recEntity);
        newLogs.push(new ActivityLog(
          undefined,
          userId,
          'recommended',
          first.id,
          'Recomendado por IA',
          new Date(),
        ));
      }
    }

    await Promise.all([
      ...newTmdbs.map(t => this.tmdbRepository.save(t)),
      ...newRecs.map(r => this.recommendationRepo.save(r)),
      ...newLogs.map(l => this.activityLogRepo.log(l)),
    ]);

    return entities.map(e => {
      const md = e.tmdb!;
      const releaseDate =
        typeof md.releaseDate === 'string'
          ? new Date(md.releaseDate).toISOString()
          : md.releaseDate!.toISOString();

      return {
        id:           e.id,
        tmdbId:       e.tmdbId,
        reason:       e.reason,
        createdAt:    e.createdAt.toISOString(),
        title:        md.title,
        posterUrl:    md.posterUrl!,
        overview:     md.overview!,
        releaseDate,
        voteAverage:  md.voteAverage,
        mediaType:    md.mediaType,
        popularity:   md.popularity,
        platforms:    md.platforms,
        trailerUrl:   md.trailerUrl,
        genreIds:     md.genreIds,
      };
    });
  }

  private parseRecommendations(raw: string | string[]): string[] {
    const text = Array.isArray(raw) ? raw.join('\n') : raw;
    return text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }
}

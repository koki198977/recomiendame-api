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
    // 1) Cargar datos
    const [
      seenItems,
      favorites,
      ratings,
      recentRecs,
      allRecs,
      user,
      wishlist
    ] = await Promise.all([
      this.userDataRepo.getSeenItems(userId),
      this.userDataRepo.getFavorites(userId),
      this.userDataRepo.getRatings(userId),
      this.recommendationRepo.findLatestByUser(userId, 10),
      this.recommendationRepo.findAllByUser(userId),
      this.userRepo.findById(userId),
      this.userDataRepo.getWishlist(userId),
    ]);

    const favoriteGenres    = user?.favoriteGenres || [];
    const favoriteMediaText = user?.favoriteMedia?.trim();

    // build sets
    const recentTitles = new Set(
      recentRecs.map(r => r.tmdb?.title.toLowerCase()).filter(Boolean)
    );
    const allPrevIds = new Set(allRecs.map(r => r.tmdbId));

    // last 5 of seen/fav/ratings
    const last5 = <T>(arr: T[]) => arr.slice(-5);
    const seen5 = last5(seenItems.map(i => i.tmdb?.title).filter(Boolean) as string[]);
    const fav5  = last5(favorites.map(f => f.tmdb?.title).filter(Boolean) as string[]);
    const wish5 = last5(wishlist.map(w => w.tmdb?.title).filter(Boolean) as string[]);
    const ratings5 = last5(
      ratings
        .map(r => `${r.tmdb?.title} (${r.rating}/5)`)
        .filter(Boolean) as string[]
    );

    // construct prompt
    const sections: string[] = [];

    if (feedback) {
      sections.push(
        'Eres un recomendador personalizado de películas y series. A partir del siguiente texto del usuario, genera 5 títulos relevantes sin repetir anteriores.'
      );
      sections.push(`Feedback del usuario: ${feedback}`);
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

    if (recentRecs.length === 0 && favoriteMediaText) {
      sections.push(`Sobre sus gustos: ${favoriteMediaText}`);
    }

    if (seen5.length)    sections.push(`Vistos (últ. 5): ${seen5.join(', ')}`);
    if (fav5.length)     sections.push(`Favoritas (últ. 5): ${fav5.join(', ')}`);
    if (wish5.length)    sections.push(`Deseados (últ. 5): ${wish5.join(', ')}`);
    if (ratings5.length) sections.push(`Puntuaciones (últ. 5): ${ratings5.join(', ')}`);
    if (recentRecs.length) {
      const prev5 = last5(
        recentRecs.map(r => r.tmdb?.title.toLowerCase()).filter(Boolean) as string[]
      );
      sections.push(`Ya recomendadas (últ. 5): ${prev5.join(', ')}`);
    }

    sections.push(
      'Si no puedes generar exactamente 5 títulos nuevos (que no estén en tu historial ni en recomendaciones previas), completa la lista con las películas o series más populares según la crítica.'
    );
    sections.push(
      'Responde únicamente con los nombres de las películas o series, uno por línea, sin numeración ni descripciones.'
    );

    const prompt = sections.join('\n');
    const raw   = await this.openAi.generate(prompt);


    const parsed = this.parseRecommendations(raw);
   

    // filter out any titles seen in recent recs
    const unique = Array.from(new Set(parsed))
      .filter(title => !recentTitles.has(title.toLowerCase()));

    // complete with trending if fewer than 5
    let finalTitles = unique.slice(0, 5);
    if (finalTitles.length < 5) {
      const needed = 5 - finalTitles.length;
      const trending = await this.tmdbService.getTrending(needed);
      for (const t of trending) {
        if (finalTitles.length >= 5) break;
        if (!finalTitles.includes(t.title)) {
          finalTitles.push(t.title);
        }
      }
    }


    
    const entities: Recommendation[] = [];

    for (const title of finalTitles) {
      const results = await this.tmdbService.search(title);
      const first = results[0];
      if (!first) continue;

      if (!allPrevIds.has(first.id)) {
        await this.tmdbRepository.save(
          new Tmdb(
            first.id,
            first.title,
            new Date(),
            first.posterUrl ?? undefined,
            first.overview ?? undefined,
            first.releaseDate ? new Date(first.releaseDate) : undefined,
            first.genreIds || [],
            first.popularity || 0,
            first.voteAverage || 0,
            first.mediaType || 'movie',
            first.platforms ?? [],
            first.trailerUrl ?? undefined,
          )
        );
      }

      // create a Recommendation entity that always includes metadata
      const recEntity = new Recommendation(
        cuid(),
        userId,
        first.id,
        'Recomendado por IA',
        new Date(),
        first, // metadata, ensures recEntity.tmdb is defined
      );

      // persist recommendation & activity log if new
      if (!allPrevIds.has(first.id)) {
        await this.recommendationRepo.save(recEntity);
        await this.activityLogRepo.log(
          new ActivityLog(
            undefined,
            userId,
            'recommended',
            first.id,
            'Recomendado por IA',
            new Date(),
          )
        );
      }

      entities.push(recEntity);
    }



    // map to DTO
    const dtos: RecommendationResponse[] = entities.map(rec => {
      const rd = rec.tmdb!;
      const release = typeof rd.releaseDate === 'string'
        ? new Date(rd.releaseDate).toISOString()
        : rd.releaseDate!.toISOString();

      return {
        id:           rec.id,
        tmdbId:       rec.tmdbId,
        reason:       rec.reason,
        createdAt:    rec.createdAt.toISOString(),
        title:        rd.title,
        posterUrl:    rd.posterUrl!,
        overview:     rd.overview!,
        releaseDate:  release,
        voteAverage:  rd.voteAverage,
        mediaType:    rd.mediaType,
        popularity:   rd.popularity,
        platforms:    rd.platforms,
        trailerUrl:   rd.trailerUrl,
        genreIds:     rd.genreIds,
      };
    });

    return dtos;
  }

  private parseRecommendations(raw: string | string[]): string[] {
    const text = Array.isArray(raw) ? raw.join('\n') : raw;
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }
}

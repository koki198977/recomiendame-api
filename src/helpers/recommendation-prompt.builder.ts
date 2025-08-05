import { Injectable } from '@nestjs/common';
import { Tmdb } from 'src/domain/entities/tmdb';
import { Recommendation } from 'src/domain/entities/recommendation';

export interface PromptParams {
  user: {
    favoriteGenres?: string[];
    favoriteMedia?: string;
  };
  seenItems: Array<{ tmdb?: Tmdb }>;
  favorites: Array<{ tmdb?: Tmdb }>;
  ratings: Array<{ tmdb?: Tmdb; rating: number }>;
  recentRecs: Array<Recommendation>;
  feedback?: string;
  likedTmdbId?: number;
}

@Injectable()
export class RecommendationPromptBuilder {
  build(params: PromptParams): string {
    const {
      user,
      seenItems,
      favorites,
      ratings,
      recentRecs,
      feedback,
      likedTmdbId,
    } = params;

    const favoriteGenres = user.favoriteGenres || [];
    const favoriteMediaText = user.favoriteMedia?.trim();

    // Extraer títulos
    const lastTitles = <T>(arr: Array<{ tmdb?: T }>, mapFn: (i: T) => string): string[] =>
      arr
        .map(i => (i.tmdb ? mapFn(i.tmdb) : null))
        .filter((t): t is string => Boolean(t))
        .slice(-5);

    const seen5 = lastTitles(seenItems, tmdb => (tmdb as any).title);
    const fav5 = lastTitles(favorites, tmdb => (tmdb as any).title);
    const ratings5 = ratings
      .map(r => {
        const title = r.tmdb?.title;
        return title ? `${title} (${r.rating}/5)` : null;
      })
      .filter((l): l is string => Boolean(l))
      .slice(-5);

    const prev5 = recentRecs
      .slice(-5)
      .map(r => r.tmdb?.title.toLowerCase())
      .filter((t): t is string => Boolean(t));

    const sections: string[] = [];

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

    if (!recentRecs.length && favoriteMediaText) {
      sections.push(`📝 Sobre sus gustos: ${favoriteMediaText}`);
    }

    if (seen5.length) sections.push(`🎬 Vistos (últ. 5): ${seen5.join(', ')}`);
    if (fav5.length) sections.push(`⭐ Favoritas (últ. 5): ${fav5.join(', ')}`);
    if (ratings5.length)
      sections.push(`📝 Puntuaciones (últ. 5): ${ratings5.join(', ')}`);
    if (prev5.length)
      sections.push(`❌ Ya recomendadas (últ. 5): ${prev5.join(', ')}`);

    if (likedTmdbId) {
      sections.push(`👍 Le gustó: ID ${likedTmdbId}`);
    }

    sections.push(
      '⚠️ Si no puedes generar exactamente 5 títulos nuevos (que no estén en tu historial ni en recomendaciones previas), completa la lista con las películas o series más populares según la crítica.'
    );
    sections.push(
      '⚠️ Responde únicamente con los nombres de las películas o series, uno por línea, sin numeración ni descripciones.'
    );

    return sections.join('\n');
  }
}

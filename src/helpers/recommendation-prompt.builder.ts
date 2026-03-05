import { User } from 'src/domain/entities/user';
import { SeenItem } from 'src/domain/entities/seen-item';
import { Favorite } from 'src/domain/entities/favorite';
import { Rating } from 'src/domain/entities/rating';
import { Recommendation } from 'src/domain/entities/recommendation';

interface UserPreferences {
  favoriteGenres: string[];
  favoriteMedia?: string;
  avgRating?: number;
  preferredMediaType?: 'movie' | 'series' | 'both';
  preferredDecade?: string;
}

export class RecommendationPromptBuilder {
  private seenItems: SeenItem[] = [];
  private favorites: Favorite[] = [];
  private ratings: Rating[] = [];
  private recentRecs: Recommendation[] = [];
  private wishlist: Array<{ tmdbId: number; tmdb?: { title?: string } }> = [];
  private user?: User;
  private feedback?: string;

  withSeenItems(items: SeenItem[]): this {
    this.seenItems = items;
    return this;
  }

  withFavorites(items: Favorite[]): this {
    this.favorites = items;
    return this;
  }

  withRatings(items: Rating[]): this {
    this.ratings = items;
    return this;
  }

  withRecentRecommendations(items: Recommendation[]): this {
    this.recentRecs = items;
    return this;
  }

  withWishlist(items: Array<{ tmdbId: number; tmdb?: { title?: string } }>): this {
    this.wishlist = items;
    return this;
  }

  withUser(user: User): this {
    this.user = user;
    return this;
  }

  withFeedback(feedback: string): this {
    this.feedback = feedback;
    return this;
  }

  build(): string {
    const sections: string[] = [];

    // Si hay feedback del usuario, ESO es lo principal
    if (this.feedback) {
      sections.push('## SOLICITUD DEL USUARIO');
      sections.push(this.feedback);
      sections.push('');
      sections.push('🚨 CRÍTICO: Debes responder EXACTAMENTE a lo que el usuario pidió.');
      sections.push('');
      
      // Detectar criterios específicos en el feedback
      const lower = this.feedback.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove accents
      
      // Detectar año específico
      const yearMatch = lower.match(/\b(202[0-9]|201[0-9])\b/);
      if (yearMatch) {
        sections.push(`⚠️ AÑO ESPECÍFICO: Solo títulos del año ${yearMatch[1]}`);
        sections.push(`NO incluyas títulos de otros años (ni ${parseInt(yearMatch[1]) - 1}, ni ${parseInt(yearMatch[1]) + 1})`);
        sections.push('');
      }
      
      // Detectar tipo de contenido - MEJORADO con más variaciones
      const seriesPatterns = [
        /\bseries?\b/,
        /\bserie\b/,
        /\bshows?\b/,
        /\bshow\b/,
        /\btv\b/,
        /\bteleserie/,
        /\bminiserie/
      ];
      
      const moviePatterns = [
        /\bpeliculas?\b/,
        /\bpelicula\b/,
        /\bpelis?\b/,
        /\bpeli\b/,
        /\bfilms?\b/,
        /\bfilm\b/,
        /\bmovies?\b/,
        /\bmovie\b/,
        /\bcine\b/
      ];
      
      const hasSeries = seriesPatterns.some(pattern => pattern.test(lower));
      const hasMovies = moviePatterns.some(pattern => pattern.test(lower));
      
      // Solo marcar tipo si menciona uno pero no el otro
      if (hasSeries && !hasMovies) {
        sections.push('⚠️ TIPO: Solo SERIES (TV Shows)');
        sections.push('NO incluyas películas');
        sections.push('');
      } else if (hasMovies && !hasSeries) {
        sections.push('⚠️ TIPO: Solo PELÍCULAS');
        sections.push('NO incluyas series');
        sections.push('');
      }
      
      sections.push('No te limites por el historial del usuario. Enfócate ÚNICAMENTE en cumplir estos criterios.');
      sections.push('');
    } else {
      // Solo si no hay feedback, usar el enfoque tradicional con análisis inteligente
      sections.push('Eres un experto curador de contenido. Analiza el perfil del usuario y recomienda títulos que realmente le encantarán.\n');
      
      const preferences = this.analyzePreferences();
      sections.push('## PERFIL DEL USUARIO');
      sections.push(this.buildPreferencesSection(preferences));
      sections.push('\n## HISTORIAL DEL USUARIO');
      sections.push(this.buildHistorySection());
      
      // Agregar análisis de patrones
      const patterns = this.analyzePatterns();
      if (patterns) {
        sections.push('\n## PATRONES DETECTADOS');
        sections.push(patterns);
      }
    }

    // Restricciones mínimas
    sections.push('\n## RESTRICCIONES');
    
    // Excluir wishlist (ya los conoce) - solo si no hay feedback específico
    if (!this.feedback) {
      const wishTitles = this.wishlist
        .map(w => w.tmdb?.title)
        .filter(Boolean);

      if (wishTitles.length > 0) {
        sections.push(`NO recomiendes estos títulos (ya están en su lista de deseos):`);
        sections.push(wishTitles.join(', '));
        sections.push('');
      }
    }

    // Formato de respuesta
    sections.push('## FORMATO DE RESPUESTA');
    sections.push('Responde con EXACTAMENTE 8 títulos, uno por línea, sin números ni descripciones.');
    sections.push('Solo nombres de películas/series, nada más.');
    sections.push('');
    sections.push('Ejemplo:');
    sections.push('The Shawshank Redemption');
    sections.push('Breaking Bad');
    sections.push('Inception');
    sections.push('The Wire');
    sections.push('Parasite');
    sections.push('The Dark Knight');
    sections.push('Game of Thrones');
    sections.push('Pulp Fiction');

    return sections.join('\n');
  }

  private analyzePreferences(): UserPreferences {
    const prefs: UserPreferences = {
      favoriteGenres: this.user?.favoriteGenres || [],
      favoriteMedia: this.user?.favoriteMedia,
    };

    // Calculate average rating
    if (this.ratings.length > 0) {
      const sum = this.ratings.reduce((acc, r) => acc + r.rating, 0);
      prefs.avgRating = sum / this.ratings.length;
    }

    // Detect preferred media type - but be more conservative
    const movieCount = this.favorites.filter(f => f.tmdb?.mediaType === 'movie').length;
    const seriesCount = this.favorites.filter(f => f.tmdb?.mediaType === 'tv').length;
    
    // Only set preference if there's a STRONG bias (2x or more)
    if (movieCount > seriesCount * 2) {
      prefs.preferredMediaType = 'movie';
    } else if (seriesCount > movieCount * 2) {
      prefs.preferredMediaType = 'series';
    } else {
      // Default to both for balanced recommendations
      prefs.preferredMediaType = 'both';
    }

    return prefs;
  }

  private buildPreferencesSection(prefs: UserPreferences): string {
    const lines: string[] = [];

    // Comentamos los géneros favoritos para permitir más variedad
    // if (prefs.favoriteGenres.length > 0) {
    //   lines.push(`- Géneros favoritos: ${prefs.favoriteGenres.join(', ')}`);
    // }

    if (prefs.favoriteMedia) {
      lines.push(`- Gustos declarados: ${prefs.favoriteMedia}`);
    }

    if (prefs.avgRating) {
      const standard = prefs.avgRating >= 4 ? 'altos' : prefs.avgRating >= 3 ? 'moderados' : 'variados';
      lines.push(`- Estándares de calidad: ${standard} (promedio: ${prefs.avgRating.toFixed(1)}/5)`);
    }

    // Only show preference if it's strong (not 'both')
    if (prefs.preferredMediaType === 'movie') {
      lines.push(`- Preferencia marcada: películas (pero también considera series)`);
    } else if (prefs.preferredMediaType === 'series') {
      lines.push(`- Preferencia marcada: series (pero también considera películas)`);
    } else {
      lines.push(`- Le gustan tanto películas como series por igual`);
    }

    return lines.length > 0 ? lines.join('\n') : '- Sin preferencias definidas aún';
  }

  private buildHistorySection(): string {
    const sections: string[] = [];

    // High-rated items (4+ stars) - MOST IMPORTANT
    const highRated = this.ratings
      .filter(r => r.rating >= 4)
      .slice(-15) // Aumentado de 8 a 15
      .map(r => `${r.tmdb?.title} (⭐${r.rating}/5)`)
      .filter(Boolean);

    if (highRated.length > 0) {
      sections.push(`✅ LE ENCANTARON (recomienda similar):\n${highRated.join(', ')}`);
    }

    // Low-rated items (3 or less) - AVOID SIMILAR
    const lowRated = this.ratings
      .filter(r => r.rating <= 3)
      .slice(-8) // Aumentado de 5 a 8
      .map(r => `${r.tmdb?.title} (${r.rating}/5)`)
      .filter(Boolean);

    if (lowRated.length > 0) {
      sections.push(`❌ NO le gustaron (evita similar):\n${lowRated.join(', ')}`);
    }

    // Favorites - TODOS los favoritos (sin límite)
    const favTitles = this.favorites
      .map(f => f.tmdb?.title)
      .filter(Boolean);

    if (favTitles.length > 0) {
      sections.push(`❤️ Favoritos (${favTitles.length}):\n${favTitles.join(', ')}`);
    }

    // Wishlist - Todos (sin límite, son importantes para excluir)
    const wishTitles = this.wishlist
      .map(w => w.tmdb?.title)
      .filter(Boolean);

    if (wishTitles.length > 0) {
      sections.push(`📝 En lista de deseos (${wishTitles.length}):\n${wishTitles.join(', ')}`);
    }

    // Recently seen (to avoid recommending again immediately)
    const seenTitles = this.seenItems
      .slice(-10) // Aumentado de 5 a 10
      .map(s => s.tmdb?.title)
      .filter(Boolean);

    if (seenTitles.length > 0) {
      sections.push(`👁️ Ya vio (últimos ${seenTitles.length}):\n${seenTitles.join(', ')}`);
    }

    return sections.length > 0 ? sections.join('\n\n') : 'Sin historial previo';
  }

  private analyzePatterns(): string | null {
    const insights: string[] = [];

    // Analizar si hay preferencia por contenido complejo/intelectual
    const complexTitles = [
      'dark', 'mr robot', 'westworld', 'black mirror', 'mindhunter', 
      'true detective', 'fargo', 'the wire', 'breaking bad', 'better call saul',
      'succession', 'mad men', 'the leftovers', 'twin peaks', 'severance'
    ];
    
    const hasComplexPreference = this.favorites.some(f => 
      complexTitles.some(title => f.tmdb?.title?.toLowerCase().includes(title))
    ) || this.ratings.some(r => 
      r.rating >= 4 && complexTitles.some(title => r.tmdb?.title?.toLowerCase().includes(title))
    );

    if (hasComplexPreference) {
      insights.push('✨ Le gustan narrativas complejas, con capas y profundidad psicológica');
    }

    // Analizar si prefiere contenido reciente vs clásico
    const recentCount = this.favorites.filter(f => {
      const year = f.tmdb?.releaseDate ? new Date(f.tmdb.releaseDate).getFullYear() : 0;
      return year >= 2020;
    }).length;

    const classicCount = this.favorites.filter(f => {
      const year = f.tmdb?.releaseDate ? new Date(f.tmdb.releaseDate).getFullYear() : 0;
      return year < 2010 && year > 1970;
    }).length;

    if (recentCount > classicCount * 2) {
      insights.push('📅 Prefiere contenido reciente y contemporáneo');
    } else if (classicCount > recentCount) {
      insights.push('🎬 Aprecia clásicos y contenido atemporal');
    }

    // Analizar consistencia en ratings
    if (this.ratings.length >= 5) {
      const highRatings = this.ratings.filter(r => r.rating >= 4).length;
      const percentage = (highRatings / this.ratings.length) * 100;
      
      if (percentage > 70) {
        insights.push('⭐ Usuario selectivo - solo ve contenido que le interesa mucho');
      } else if (percentage < 30) {
        insights.push('🎲 Usuario explorador - prueba contenido variado');
      }
    }

    // Analizar diversidad de géneros en favoritos
    if (this.favorites.length >= 5) {
      const uniqueGenres = new Set<number>();
      this.favorites.forEach(f => {
        f.tmdb?.genreIds?.forEach(id => uniqueGenres.add(id));
      });
      
      if (uniqueGenres.size >= 8) {
        insights.push('🌈 Gustos eclécticos - disfruta de múltiples géneros');
      } else if (uniqueGenres.size <= 3) {
        insights.push('🎯 Gustos específicos - prefiere mantenerse en géneros conocidos');
      }
    }

    return insights.length > 0 ? insights.join('\n') : null;
  }

}

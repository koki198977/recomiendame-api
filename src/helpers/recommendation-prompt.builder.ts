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
    const preferences = this.analyzePreferences();
    const sections: string[] = [];

    // System role
    sections.push(
      'Eres un experto recomendador de películas y series con profundo conocimiento cinematográfico.'
    );
    sections.push('Tu objetivo es generar recomendaciones personalizadas y relevantes.\n');

    // User context
    if (this.feedback) {
      sections.push('## SOLICITUD ESPECÍFICA DEL USUARIO (MÁXIMA PRIORIDAD)');
      sections.push(this.feedback);
      sections.push('');
      sections.push('⚠️ CRÍTICO: Esta solicitud es LO MÁS IMPORTANTE. TODAS las recomendaciones deben estar directamente relacionadas.');
      sections.push('- Si pide "humor" o "comedia" → SOLO comedias');
      sections.push('- Si pide "tipo Dark" → Series/películas con misterio, ciencia ficción, viajes en el tiempo');
      sections.push('- Si pide "informática" → Contenido sobre tecnología, hackers, programación');
      sections.push('- Si pide "terror" → SOLO contenido de terror/horror');
      sections.push('');
      sections.push('NO ignores esta solicitud. NO recomiendes contenido que no coincida con lo pedido.');
      sections.push('');
    }

    // Preferences analysis
    sections.push('## PERFIL DEL USUARIO');
    sections.push(this.buildPreferencesSection(preferences));

    // User history
    sections.push('\n## HISTORIAL DEL USUARIO');
    sections.push(this.buildHistorySection());

    // Constraints
    sections.push('\n## RESTRICCIONES');
    sections.push(this.buildConstraintsSection());

    // Output format - MÁS EXPLÍCITO
    sections.push('\n## FORMATO DE RESPUESTA OBLIGATORIO');
    sections.push('Debes responder con EXACTAMENTE 5 títulos de películas o series.');
    sections.push('Formato: Un título por línea, sin números, sin guiones, sin descripciones.');
    sections.push('');
    sections.push('Ejemplo correcto:');
    sections.push('The Shawshank Redemption');
    sections.push('Breaking Bad');
    sections.push('Inception');
    sections.push('The Wire');
    sections.push('Parasite');
    sections.push('');
    sections.push('NO hagas esto:');
    sections.push('1. The Shawshank Redemption - Una historia sobre...');
    sections.push('- Breaking Bad (Serie de drama)');
    sections.push('');
    sections.push('RESPONDE AHORA CON 5 TÍTULOS:');

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

    if (prefs.favoriteGenres.length > 0) {
      lines.push(`- Géneros favoritos: ${prefs.favoriteGenres.join(', ')}`);
    }

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

    // High-rated items (4+ stars)
    const highRated = this.ratings
      .filter(r => r.rating >= 4)
      .slice(-5)
      .map(r => `${r.tmdb?.title} (${r.rating}/5)`)
      .filter(Boolean);

    if (highRated.length > 0) {
      sections.push(`Títulos mejor valorados:\n${highRated.join(', ')}`);
    }

    // Favorites
    const favTitles = this.favorites
      .slice(-5)
      .map(f => f.tmdb?.title)
      .filter(Boolean);

    if (favTitles.length > 0) {
      sections.push(`Favoritos recientes:\n${favTitles.join(', ')}`);
    }

    // Wishlist
    const wishTitles = this.wishlist
      .slice(-5)
      .map(w => w.tmdb?.title)
      .filter(Boolean);

    if (wishTitles.length > 0) {
      sections.push(`En lista de deseos:\n${wishTitles.join(', ')}`);
    }

    // Recently seen
    const seenTitles = this.seenItems
      .slice(-8)
      .map(s => s.tmdb?.title)
      .filter(Boolean);

    if (seenTitles.length > 0) {
      sections.push(`Vistos recientemente:\n${seenTitles.join(', ')}`);
    }

    return sections.length > 0 ? sections.join('\n\n') : 'Sin historial previo';
  }

  private buildConstraintsSection(): string {
    const constraints: string[] = [];

    constraints.push('1. Genera EXACTAMENTE 5 recomendaciones DIFERENTES');
    constraints.push('2. NO repitas títulos que el usuario ya haya visto, marcado como favorito o estén en su wishlist');
    
    if (this.recentRecs.length > 0) {
      const recentTitles = this.recentRecs
        .slice(-20) // Aumentado de 10 a 20 para evitar más repeticiones
        .map(r => r.tmdb?.title)
        .filter(Boolean)
        .join(', ');
      constraints.push(`3. CRÍTICO: NO repitas NINGUNA de estas recomendaciones previas: ${recentTitles}`);
    }

    constraints.push('4. Prioriza títulos de calidad reconocida (crítica o audiencia)');
    constraints.push('5. Balancea entre títulos populares y joyas ocultas');
    constraints.push('6. IMPORTANTE: Incluye un MIX de películas Y series (al menos 2 de cada tipo si es posible)');
    constraints.push('7. SÉ CREATIVO: Busca títulos menos obvios pero de alta calidad');
    
    if (this.feedback) {
      constraints.push('8. IMPORTANTE: Las recomendaciones deben estar directamente relacionadas con la solicitud del usuario');
      constraints.push('9. Si el usuario pide un tema específico (ej: informática, tecnología), TODAS las recomendaciones deben ser sobre ese tema');
    }

    return constraints.join('\n');
  }
}

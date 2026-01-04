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

      // Analizar la solicitud para extraer criterios específicos
      const criteria = this.extractCriteria(this.feedback);
      if (criteria.hasSpecificCriteria) {
        sections.push('⚠️ CRÍTICO: DEBES CUMPLIR EXACTAMENTE CON ESTOS CRITERIOS:');
        
        if (criteria.year) {
          sections.push(`- AÑO: Solo películas/series del año ${criteria.year}`);
        }
        
        if (criteria.yearRange) {
          sections.push(`- PERÍODO: Solo películas/series de ${criteria.yearRange}`);
        }
        
        if (criteria.genre) {
          sections.push(`- GÉNERO: Solo del género ${criteria.genre}`);
        }
        
        if (criteria.mediaType) {
          sections.push(`- TIPO: Solo ${criteria.mediaType}`);
        }
        
        if (criteria.platform) {
          sections.push(`- PLATAFORMA: Solo disponibles en ${criteria.platform}`);
        }
        
        if (criteria.language) {
          sections.push(`- IDIOMA: Solo en ${criteria.language}`);
        }
        
        sections.push('');
        sections.push('🚨 NO IGNORES ESTOS CRITERIOS. Si no hay suficiente contenido que cumpla exactamente, di "No hay suficientes títulos que cumplan estos criterios específicos"');
        sections.push('');
      }

      // Detectar si es una consulta objetiva (mejores de todos los tiempos, etc.)
      const isObjective = this.isObjectiveQuery(this.feedback);
      if (isObjective && !criteria.hasSpecificCriteria) {
        sections.push('⚠️ IMPORTANTE: Esta es una consulta OBJETIVA.');
        sections.push('Debes responder con las películas/series MÁS ICÓNICAS, LEGENDARIAS y ACLAMADAS UNIVERSALMENTE.');
        sections.push('Piensa en: The Godfather, The Shawshank Redemption, Breaking Bad, The Wire, etc.');
        sections.push('NO des películas "buenas" - da las MEJORES DE LA HISTORIA según crítica y audiencia.');
        sections.push('');
      }
    } else {
      // Solo si no hay feedback, usar el enfoque tradicional
      sections.push('Recomienda películas y series de alta calidad basándote en el perfil del usuario.\n');
      
      const preferences = this.analyzePreferences();
      sections.push('## PERFIL DEL USUARIO');
      sections.push(this.buildPreferencesSection(preferences));
      sections.push('\n## HISTORIAL DEL USUARIO');
      sections.push(this.buildHistorySection());
    }

    // Restricciones mínimas
    sections.push('## RESTRICCIONES');
    
    // Excluir wishlist (ya los conoce)
    const wishTitles = this.wishlist
      .map(w => w.tmdb?.title)
      .filter(Boolean);

    if (wishTitles.length > 0) {
      sections.push(`NO recomiendes estos títulos (ya están en su lista de deseos):`);
      sections.push(wishTitles.join(', '));
      sections.push('');
    }

    // Formato de respuesta
    sections.push('## FORMATO DE RESPUESTA');
    sections.push('Responde con EXACTAMENTE 8 títulos, uno por línea, sin números ni descripciones.');
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

  private extractCriteria(feedback: string): {
    hasSpecificCriteria: boolean;
    year?: string;
    yearRange?: string;
    genre?: string;
    mediaType?: string;
    platform?: string;
    language?: string;
  } {
    const lower = feedback.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove accents
    
    const criteria: any = { hasSpecificCriteria: false };

    // Detectar año específico (2020, 2021, 2022, etc.)
    const yearMatch = lower.match(/\b(20\d{2}|19\d{2})\b/);
    if (yearMatch) {
      criteria.year = yearMatch[1];
      criteria.hasSpecificCriteria = true;
    }

    // Detectar rangos de años (2020-2023, años 90, década de los 80, etc.)
    const decadePatterns = [
      { pattern: /años?\s*90|decada\s*de\s*los?\s*90|90s?/, range: '1990-1999' },
      { pattern: /años?\s*80|decada\s*de\s*los?\s*80|80s?/, range: '1980-1989' },
      { pattern: /años?\s*2000|decada\s*de\s*los?\s*2000|2000s?/, range: '2000-2009' },
      { pattern: /años?\s*2010|decada\s*de\s*los?\s*2010|2010s?/, range: '2010-2019' },
      { pattern: /años?\s*2020|decada\s*de\s*los?\s*2020|2020s?/, range: '2020-2029' },
    ];

    for (const { pattern, range } of decadePatterns) {
      if (pattern.test(lower)) {
        criteria.yearRange = range;
        criteria.hasSpecificCriteria = true;
        break;
      }
    }

    // Detectar géneros específicos
    const genrePatterns = [
      { pattern: /\b(terror|horror|miedo)\b/, genre: 'terror' },
      { pattern: /\b(comedia|comicas|graciosas|divertidas)\b/, genre: 'comedia' },
      { pattern: /\b(accion|acción)\b/, genre: 'acción' },
      { pattern: /\b(drama|dramaticas)\b/, genre: 'drama' },
      { pattern: /\b(ciencia\s*ficcion|sci-?fi|futuristas)\b/, genre: 'ciencia ficción' },
      { pattern: /\b(romance|romanticas|amor)\b/, genre: 'romance' },
      { pattern: /\b(thriller|suspenso)\b/, genre: 'thriller' },
      { pattern: /\b(animacion|animadas|anime)\b/, genre: 'animación' },
      { pattern: /\b(documental|documentales)\b/, genre: 'documental' },
      { pattern: /\b(fantasia|fantasticas|magicas)\b/, genre: 'fantasía' },
      { pattern: /\b(crimen|criminales|policiacas)\b/, genre: 'crimen' },
    ];

    for (const { pattern, genre } of genrePatterns) {
      if (pattern.test(lower)) {
        criteria.genre = genre;
        criteria.hasSpecificCriteria = true;
        break;
      }
    }

    // Detectar tipo de media específico
    if (/\b(peliculas?|films?|movies?)\b/.test(lower) && !/\b(series?|shows?)\b/.test(lower)) {
      criteria.mediaType = 'películas';
      criteria.hasSpecificCriteria = true;
    } else if (/\b(series?|shows?)\b/.test(lower) && !/\b(peliculas?|films?|movies?)\b/.test(lower)) {
      criteria.mediaType = 'series';
      criteria.hasSpecificCriteria = true;
    }

    // Detectar plataformas específicas
    const platformPatterns = [
      { pattern: /\b(netflix)\b/, platform: 'Netflix' },
      { pattern: /\b(amazon\s*prime|prime\s*video)\b/, platform: 'Amazon Prime' },
      { pattern: /\b(disney\s*plus|disney\+)\b/, platform: 'Disney+' },
      { pattern: /\b(hbo\s*max|hbo)\b/, platform: 'HBO Max' },
      { pattern: /\b(apple\s*tv)\b/, platform: 'Apple TV+' },
    ];

    for (const { pattern, platform } of platformPatterns) {
      if (pattern.test(lower)) {
        criteria.platform = platform;
        criteria.hasSpecificCriteria = true;
        break;
      }
    }

    // Detectar idiomas específicos
    const languagePatterns = [
      { pattern: /\b(español|castellano|en\s*español)\b/, language: 'español' },
      { pattern: /\b(ingles|english|en\s*ingles)\b/, language: 'inglés' },
      { pattern: /\b(coreanas?|k-?dramas?|corea)\b/, language: 'coreano' },
      { pattern: /\b(japonesas?|anime|japon)\b/, language: 'japonés' },
      { pattern: /\b(francesas?|francia|frances)\b/, language: 'francés' },
      { pattern: /\b(alemanas?|alemania|aleman)\b/, language: 'alemán' },
    ];

    for (const { pattern, language } of languagePatterns) {
      if (pattern.test(lower)) {
        criteria.language = language;
        criteria.hasSpecificCriteria = true;
        break;
      }
    }

    return criteria;
  }

  private isObjectiveQuery(feedback: string): boolean {
    const lower = feedback.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove accents
    
    // Patterns that indicate objective/universal queries
    const objectivePatterns = [
      'mejores.*todos los tiempos',
      'mejores.*historia',
      'mejores peliculas',
      'mejores series',
      'top.*peliculas',
      'top.*series',
      'clasicos',
      'obras maestras',
      'imprescindibles',
      'que hay que ver',
      'mas aclamadas',
      'mejor valoradas',
      'ganadoras de oscar',
      'ganadoras de emmy',
      'peliculas legendarias',
      'series legendarias',
    ];

    return objectivePatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(lower);
    });
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
      .slice(-8)
      .map(r => `${r.tmdb?.title} (⭐${r.rating}/5)`)
      .filter(Boolean);

    if (highRated.length > 0) {
      sections.push(`✅ LE ENCANTARON (recomienda similar):\n${highRated.join(', ')}`);
    }

    // Low-rated items (3 or less) - AVOID SIMILAR
    const lowRated = this.ratings
      .filter(r => r.rating <= 3)
      .slice(-5)
      .map(r => `${r.tmdb?.title} (${r.rating}/5)`)
      .filter(Boolean);

    if (lowRated.length > 0) {
      sections.push(`❌ NO le gustaron (evita similar):\n${lowRated.join(', ')}`);
    }

    // Favorites
    const favTitles = this.favorites
      .slice(-5)
      .map(f => f.tmdb?.title)
      .filter(Boolean);

    if (favTitles.length > 0) {
      sections.push(`❤️ Favoritos:\n${favTitles.join(', ')}`);
    }

    // Wishlist
    const wishTitles = this.wishlist
      .slice(-5)
      .map(w => w.tmdb?.title)
      .filter(Boolean);

    if (wishTitles.length > 0) {
      sections.push(`📝 En lista de deseos:\n${wishTitles.join(', ')}`);
    }

    // Recently seen (to avoid recommending again immediately)
    const seenTitles = this.seenItems
      .slice(-5)
      .map(s => s.tmdb?.title)
      .filter(Boolean);

    if (seenTitles.length > 0) {
      sections.push(`👁️ Ya vio:\n${seenTitles.join(', ')}`);
    }

    return sections.length > 0 ? sections.join('\n\n') : 'Sin historial previo';
  }

  private buildConstraintsSection(): string {
    const constraints: string[] = [];
    const isObjective = this.feedback ? this.isObjectiveQuery(this.feedback) : false;

    constraints.push('1. Genera EXACTAMENTE 8 recomendaciones de ALTA CALIDAD');
    
    if (isObjective) {
      // Para consultas objetivas (mejores de todos los tiempos, etc.)
      constraints.push('2. PRIORIZA reconocimiento crítico universal y calidad objetiva');
      constraints.push('3. Incluye clásicos y títulos icónicos aunque el usuario ya los conozca');
      constraints.push('4. Balancea entre diferentes épocas y estilos');
    } else {
      // Para recomendaciones personalizadas
      constraints.push('2. PRIORIZA títulos similares a los que le ENCANTARON (⭐4-5)');
      constraints.push('3. EVITA títulos similares a los que NO le gustaron (❌)');
      constraints.push('4. NO repitas títulos que ya vio (👁️)');
      constraints.push('5. NO recomiendes títulos que ya están en su lista de deseos (📝) - ya los conoce');
      
      if (this.recentRecs.length > 0) {
        const veryRecentTitles = this.recentRecs
          .slice(-5)
          .map(r => r.tmdb?.title)
          .filter(Boolean)
          .join(', ');
        constraints.push(`6. Evita recomendar de nuevo (muy reciente): ${veryRecentTitles}`);
      }

      constraints.push('7. Balancea entre títulos populares y joyas ocultas');
      constraints.push('8. Incluye un MIX de películas Y series (al menos 2 de cada tipo)');
      constraints.push('9. Prioriza VARIEDAD - diferentes géneros, épocas, estilos');
    }
    
    if (this.feedback) {
      constraints.push(`${isObjective ? '5' : '10'}. CRÍTICO: Las recomendaciones deben coincidir con la solicitud del usuario`);
    }

    return constraints.join('\n');
  }
}

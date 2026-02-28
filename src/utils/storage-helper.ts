/**
 * Storage Helper com fallback para Safari iOS
 * 
 * Tenta localStorage primeiro, usa cookies como fallback
 * Resolve problema de localStorage bloqueado no Safari iOS modo privado
 */

export class StorageHelper {
  /**
   * Verifica se localStorage está disponível
   * Safari iOS modo privado bloqueia localStorage
   */
  private static isLocalStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Salva item no storage
   * Tenta localStorage primeiro, fallback para cookie
   * 
   * @param key - Chave do item
   * @param value - Valor a salvar
   * @param maxAge - Tempo de vida em segundos (padrão: 3600 = 1 hora)
   */
  static setItem(key: string, value: string, maxAge: number = 3600): void {
    // Tentar localStorage primeiro
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn('localStorage.setItem falhou, usando cookie:', e);
      }
    }
    
    // Fallback para cookie
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
  }

  /**
   * Recupera item do storage
   * Tenta localStorage primeiro, fallback para cookie
   * 
   * @param key - Chave do item
   * @returns Valor ou null se não encontrado
   */
  static getItem(key: string): string | null {
    // Tentar localStorage primeiro
    if (this.isLocalStorageAvailable()) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) return value;
      } catch (e) {
        console.warn('localStorage.getItem falhou:', e);
      }
    }
    
    // Fallback para cookie
    const name = key + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    
    return null;
  }

  /**
   * Remove item do storage
   * Remove tanto do localStorage quanto dos cookies
   * 
   * @param key - Chave do item
   */
  static removeItem(key: string): void {
    // Remover do localStorage
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage.removeItem falhou:', e);
      }
    }
    
    // Remover cookie
    document.cookie = `${key}=; path=/; max-age=0`;
  }

  /**
   * Limpa todos os itens do storage
   * Útil para logout completo
   */
  static clear(): void {
    // Limpar localStorage
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('localStorage.clear falhou:', e);
      }
    }
    
    // Limpar todos os cookies
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = name + '=; path=/; max-age=0';
    }
  }
}

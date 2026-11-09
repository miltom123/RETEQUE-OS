// Sin SDK ni dependencias: la transacción vive en la función SQL, no en HTTP.
class SupabaseRpc {
  constructor(options = {}) {
    const url = options.url || process.env.SUPABASE_URL;
    this.key = options.key || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !this.key) throw new Error('Define SUPABASE_URL y SUPABASE_SECRET_KEY en el servidor.');
    if (this.key.startsWith('sb_publishable_')) throw new Error('El backend necesita una clave secreta, no una clave pública.');
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('SUPABASE_URL inválida.'); }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
    if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/' ||
        (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:'))) {
      throw new Error('SUPABASE_URL debe ser el origen HTTPS del proyecto (HTTP solo en localhost).');
    }
    this.url = parsed.origin;
    this.fetch = options.fetch || globalThis.fetch;
  }

  async call(name, args = {}) {
    let response;
    try {
      const headers = { apikey: this.key, 'Content-Type': 'application/json' };
      // Las claves opacas actuales no son JWT. El gateway las traduce a service_role.
      if (!this.key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${this.key}`;
      response = await this.fetch(`${this.url}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args), signal: AbortSignal.timeout(60000), redirect: 'error'
      });
    } catch {
      // No reintentar escrituras: un timeout puede ocurrir después del COMMIT.
      throw new Error('No se pudo confirmar la operación con PostgreSQL. Consulta su estado antes de reintentar.');
    }
    if (!response.ok) {
      let failure; try { failure = await response.json(); } catch {}
      if (failure?.code === '23505') {
        const error = new Error('El registro ya existe.'); error.code = '23505'; throw error;
      }
      if (failure?.code === 'RT001') {
        const error = new Error('La verificación de la importación falló; se revirtió la transacción.');
        // Solo nombres de colecciones permitidos, nunca mensajes o valores de filas.
        try {
          const differences = JSON.parse(failure.details);
          if (Array.isArray(differences) && differences.every(x=>['products','orders','users','config'].includes(x))) error.differences = differences;
        } catch {}
        throw error;
      }
      // Los detalles de PostgREST pueden contener datos de filas o credenciales: no propagarlos.
      throw new Error('PostgreSQL rechazó la operación. Revisa la configuración y los datos.');
    }
    try { return await response.json(); }
    catch { throw new Error('PostgreSQL devolvió una respuesta inválida.'); }
  }

  operation(operation, payload = {}) {
    return this.call('rtq_repository', { p_operation: operation, p_payload: payload });
  }
}
module.exports = { SupabaseRpc };

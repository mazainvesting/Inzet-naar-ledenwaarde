declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ALLOW_PLATFORM_SETUP?: string;
    SETUP_KEY?: string;
    BUCKET?: R2Bucket;
  }
}

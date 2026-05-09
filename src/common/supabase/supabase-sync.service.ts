import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class SupabaseSyncService implements OnModuleDestroy {
  private readonly logger = new Logger(SupabaseSyncService.name);
  private readonly pool: Pool | null;

  constructor() {
    const url = process.env.SUPABASE_DATABASE_URL;
    if (!url) {
      this.logger.warn('SUPABASE_DATABASE_URL not set — product sync to Supabase disabled');
      this.pool = null;
      return;
    }
    this.pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async upsertProductMin(productId: string, sellerId: string, salesPageUrl: string | null): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO product_min (product_id, seller_id, sales_page_url, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (product_id) DO UPDATE
           SET seller_id      = EXCLUDED.seller_id,
               sales_page_url = EXCLUDED.sales_page_url,
               updated_at     = NOW()`,
        [productId, sellerId, salesPageUrl ?? null],
      );
    } catch (err) {
      this.logger.error(`Failed to upsert product_min for product ${productId}: ${err}`);
    }
  }

  async deleteProductMin(productId: string): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query('DELETE FROM product_min WHERE product_id = $1', [productId]);
    } catch (err) {
      this.logger.error(`Failed to delete product_min for product ${productId}: ${err}`);
    }
  }
}
